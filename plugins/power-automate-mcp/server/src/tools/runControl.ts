import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineTool, type ToolContext } from "../register.js";
import { FlowError } from "../errors.js";
import { makeFlowKey } from "../regions.js";
import type {
  ResubmitResult,
  CancelResult,
  TriggerResult,
  SetStateResult,
} from "../types.js";

const PS = "/providers/Microsoft.ProcessSimple";

/**
 * Run-control tools: resubmit/cancel a run, trigger an HTTP flow, start/stop a
 * flow.
 */
export function registerRunControlTools(server: McpServer, ctx: ToolContext): void {
  defineTool(server, ctx, {
    name: "resubmit_live_flow_run",
    description:
      "Replay a previous run with its original trigger inputs. Works for ANY trigger type — the " +
      "primary way to re-test a fix without manually re-triggering.",
    inputSchema: {
      environmentName: z.string(),
      flowName: z.string(),
      runName: z.string(),
    },
    run: async (args, c): Promise<ResubmitResult> => {
      const env = args.environmentName as string;
      const flow = args.flowName as string;
      const runName = args.runName as string;

      // 1. Read the run to discover the trigger it was fired with.
      const run = await c.api.get(`${PS}/environments/${env}/flows/${flow}/runs/${runName}`);
      const triggerName: unknown = run?.properties?.trigger?.name;
      if (typeof triggerName !== "string" || triggerName.length === 0) {
        throw new FlowError(
          "TriggerNotFound",
          `Could not determine the trigger for run ${runName}; properties.trigger.name was missing.`,
        );
      }

      // 2. Resubmit against that trigger's history entry (202/empty).
      await c.api.post(
        `${PS}/environments/${env}/flows/${flow}/triggers/${triggerName}/histories/${runName}/resubmit`,
        { noBody: true },
      );

      return { flowKey: makeFlowKey(env, flow), resubmitted: true, runName, triggerName };
    },
  });

  defineTool(server, ctx, {
    name: "cancel_live_flow_run",
    description:
      "Cancel a Running flow run. Do NOT cancel runs that are waiting on an adaptive-card/approval " +
      "response — 'Running' is normal while a card awaits input.",
    inputSchema: {
      environmentName: z.string(),
      flowName: z.string(),
      runName: z.string(),
    },
    run: async (args, c): Promise<CancelResult> => {
      const env = args.environmentName as string;
      const flow = args.flowName as string;
      const runName = args.runName as string;

      await c.api.post(
        `${PS}/environments/${env}/flows/${flow}/runs/${runName}/cancel`,
        { noBody: true },
      );

      return { flowKey: makeFlowKey(env, flow), cancelled: true, runName };
    },
  });

  defineTool(server, ctx, {
    name: "trigger_live_flow",
    description:
      "Invoke an HTTP Request-triggered flow with an optional body. Only works for `Request` " +
      "triggers (errors for Recurrence/connector triggers). Returns the flow's Response output.",
    inputSchema: {
      environmentName: z.string(),
      flowName: z.string(),
      body: z.unknown().optional(),
    },
    run: async (args, c): Promise<TriggerResult> => {
      const env = args.environmentName as string;
      const flow = args.flowName as string;
      const body: unknown = args.body;

      // 1. Find the manual/Request (HTTP) trigger in the flow definition.
      const def = await c.api.get(`${PS}/environments/${env}/flows/${flow}`);
      const triggers: unknown = def?.properties?.definition?.triggers;
      let triggerName: string | undefined;
      if (triggers && typeof triggers === "object") {
        for (const [key, value] of Object.entries(triggers as Record<string, unknown>)) {
          if (value && typeof value === "object" && (value as { type?: unknown }).type === "Request") {
            triggerName = key;
            break;
          }
        }
      }
      if (!triggerName) {
        throw new FlowError("NotHttpTrigger", "only HTTP Request triggers can be invoked via this tool");
      }

      // 2. Resolve the callback URL. Response can be { response: { value } },
      //    { value }, or a bare string.
      const callback = await c.api.post(
        `${PS}/environments/${env}/flows/${flow}/triggers/${triggerName}/listCallbackUrl`,
      );
      let triggerUrl: string | undefined;
      if (typeof callback === "string") {
        triggerUrl = callback;
      } else if (callback && typeof callback === "object") {
        const cb = callback as { value?: unknown; response?: { value?: unknown } };
        if (typeof cb.response?.value === "string") {
          triggerUrl = cb.response.value;
        } else if (typeof cb.value === "string") {
          triggerUrl = cb.value;
        }
      }
      if (!triggerUrl) {
        throw new FlowError(
          "CallbackUrlUnavailable",
          `Could not resolve a callback URL for trigger ${triggerName}.`,
        );
      }

      // A SAS-signed URL carries a `sig=` query param; AAD-protected endpoints do not.
      const hasSas = new URL(triggerUrl).searchParams.has("sig");
      const requiresAadAuth = !hasSas;
      const authType = requiresAadAuth ? "AAD" : "Sas";

      // 3. Invoke the trigger directly (outside the ProcessSimple base host).
      const headers: Record<string, string> = {};
      let payload: string | undefined;
      if (body !== undefined) {
        headers["Content-Type"] = "application/octet-stream";
        payload = JSON.stringify(body);
      }
      if (requiresAadAuth) {
        headers["Authorization"] = `Bearer ${await c.auth.getToken()}`;
      }

      const res = await fetch(triggerUrl, { method: "POST", headers, body: payload });
      const responseStatus = res.status;
      const text = await res.text();
      let responseBody: unknown = text;
      if (text) {
        try {
          responseBody = JSON.parse(text);
        } catch {
          /* keep raw text */
        }
      } else {
        responseBody = null;
      }

      return {
        flowKey: makeFlowKey(env, flow),
        triggerName,
        triggerUrl,
        requiresAadAuth,
        authType,
        responseStatus,
        responseBody,
      };
    },
  });

  defineTool(server, ctx, {
    name: "set_live_flow_state",
    description:
      "Start or stop a flow. Reads current state first and only issues the change if needed. Use " +
      "THIS (not update_live_flow) to change run state.",
    inputSchema: {
      environmentName: z.string(),
      flowName: z.string(),
      state: z.enum(["Started", "Stopped"]),
    },
    run: async (args, c): Promise<SetStateResult> => {
      const env = args.environmentName as string;
      const flow = args.flowName as string;
      const state = args.state as "Started" | "Stopped";

      // 1. Read current state.
      const before = await c.api.get(`${PS}/environments/${env}/flows/${flow}`);
      const currentState: unknown = before?.properties?.state;

      // 2. Only issue the change when it actually differs.
      if (currentState !== state) {
        const action = state === "Started" ? "start" : "stop";
        await c.api.post(`${PS}/environments/${env}/flows/${flow}/${action}`, { noBody: true });
      }

      // 3. Re-read to report the authoritative state after the operation.
      const after = await c.api.get(`${PS}/environments/${env}/flows/${flow}`);
      const actualState: unknown = after?.properties?.state;

      return {
        flowName: flow,
        environmentName: env,
        requestedState: state,
        actualState: typeof actualState === "string" ? actualState : String(actualState ?? ""),
      };
    },
  });
}
