import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineTool, type ToolContext } from "../register.js";
import type {
  ActionOutput,
  ActionStatus,
  FailedAction,
  GetRunErrorResult,
  LiveRun,
} from "../types.js";

const PS = "/providers/Microsoft.ProcessSimple";

/** Size cap for SAS-fetched action payloads (25 MiB). */
const CAP = 25 * 1024 * 1024;

/**
 * Debug/run-history tools: list runs, derive a structured run error, and fetch
 * action-level inputs/outputs (via SAS links + foreach repetitions).
 */
export function registerDebugTools(server: McpServer, ctx: ToolContext): void {
  defineTool(server, ctx, {
    name: "get_live_flow_runs",
    description:
      "List run history for a flow, newest first. The run id is the `name` field — pass it as " +
      "`runName` to other tools. `top` defaults to 30 and auto-paginates for higher values.",
    inputSchema: {
      environmentName: z.string(),
      flowName: z.string(),
      top: z.number().int().positive().default(30),
    },
    run: async (args, { api }): Promise<LiveRun[]> => {
      const { environmentName, flowName, top } = args as {
        environmentName: string;
        flowName: string;
        top: number;
      };
      const runs = await api.getAllPages(
        `${PS}/environments/${environmentName}/flows/${flowName}/runs`,
        { query: { $top: top } },
        top,
      );
      return runs.map((r: any): LiveRun => {
        const p = r.properties ?? {};
        return {
          name: r.name,
          status: p.status ?? "",
          startTime: p.startTime ?? null,
          endTime: p.endTime ?? null,
          triggerName: p.trigger?.name ?? null,
        };
      });
    },
  });

  defineTool(server, ctx, {
    name: "get_live_flow_run_error",
    description:
      "Structured error breakdown for a failed run: `failedActions` (ordered outer→inner; the LAST " +
      "entry is the root cause) plus `allActions` status summary.",
    inputSchema: {
      environmentName: z.string(),
      flowName: z.string(),
      runName: z.string(),
    },
    run: async (args, { api }): Promise<GetRunErrorResult> => {
      const { environmentName, flowName, runName } = args as {
        environmentName: string;
        flowName: string;
        runName: string;
      };
      const actions = await api.getAllPages(
        `${PS}/environments/${environmentName}/flows/${flowName}/runs/${runName}/actions`,
      );

      const allActions: ActionStatus[] = actions.map((a: any): ActionStatus => ({
        actionName: a.name,
        status: a.properties?.status ?? "",
      }));

      // Preserve API order (outer→inner). The LAST failed entry is the root cause.
      const failedActions: FailedAction[] = actions
        .filter((a: any) => a.properties?.status === "Failed")
        .map((a: any): FailedAction => {
          const p = a.properties ?? {};
          return {
            actionName: a.name,
            status: p.status ?? "",
            error: p.error ?? undefined,
            code: p.code ?? null,
            startTime: p.startTime ?? null,
            endTime: p.endTime ?? null,
          };
        });

      return { runName, failedActions, allActions };
    },
  });

  defineTool(server, ctx, {
    name: "get_live_flow_run_action_outputs",
    description:
      "Action-level inputs and outputs for a run. Omit `actionName` for top-level actions, or pass " +
      "one to drill in. For actions inside a foreach, returns every repetition; pass `iterationIndex` " +
      "to pin to one zero-based iteration. Large payloads are size-capped.",
    inputSchema: {
      environmentName: z.string(),
      flowName: z.string(),
      runName: z.string(),
      actionName: z.string().optional(),
      iterationIndex: z.number().int().nonnegative().optional(),
    },
    run: async (args, ctx2): Promise<ActionOutput[]> => {
      const { environmentName, flowName, runName, actionName, iterationIndex } = args as {
        environmentName: string;
        flowName: string;
        runName: string;
        actionName?: string;
        iterationIndex?: number;
      };
      const { api } = ctx2;
      const runPath = `${PS}/environments/${environmentName}/flows/${flowName}/runs/${runName}`;

      const actions = await api.getAllPages(`${runPath}/actions`);
      const selected = actionName
        ? actions.filter((a: any) => a.name === actionName)
        : actions;

      // FOREACH: only attempt repetitions when a single action is targeted.
      if (actionName) {
        const reps = await tryGetRepetitions(api, runPath, actionName);
        if (reps.length > 0) {
          const chosen =
            iterationIndex !== undefined
              ? reps.filter(
                  (_r: any, i: number) => i === iterationIndex,
                )
              : reps;
          return Promise.all(
            chosen.map((rep: any) => buildRepetitionOutput(api, actionName, rep)),
          );
        }
        // No repetitions (non-iterated action): fall through to top-level result.
      }

      return Promise.all(selected.map((a: any) => buildActionOutput(api, a)));
    },
  });
}

/**
 * Probe the repetitions endpoint for an action. A non-iterated action 404s (or
 * returns an empty value array); either way we return [] so the caller falls
 * back to the single top-level action. A failed probe must NOT fail the call.
 */
async function tryGetRepetitions(
  api: ToolContext["api"],
  runPath: string,
  actionName: string,
): Promise<any[]> {
  try {
    return await api.getAllPages(`${runPath}/actions/${actionName}/repetitions`);
  } catch {
    return [];
  }
}

/** Resolve an inline value or a SAS link into a payload, capturing truncation. */
async function resolvePayload(
  api: ToolContext["api"],
  inline: unknown,
  link: { uri?: string } | undefined,
): Promise<{ value: unknown; truncated?: boolean; sizeBytes?: number }> {
  if (inline !== undefined) return { value: inline };
  const uri = link?.uri;
  if (!uri) return { value: null };
  const fetched = await api.fetchSas(uri, CAP);
  if (fetched.truncated) {
    return { value: fetched.value, truncated: true, sizeBytes: fetched.sizeBytes };
  }
  return { value: fetched.value };
}

/** Build an ActionOutput for a top-level action. */
async function buildActionOutput(api: ToolContext["api"], a: any): Promise<ActionOutput> {
  const p = a.properties ?? {};
  const [inputs, outputs] = await Promise.all([
    resolvePayload(api, p.inputs, p.inputsLink),
    resolvePayload(api, p.outputs, p.outputsLink),
  ]);
  const out: ActionOutput = {
    actionName: a.name,
    status: p.status ?? "",
    startTime: p.startTime ?? null,
    endTime: p.endTime ?? null,
    error: p.error ?? null,
    inputs: inputs.value,
    outputs: outputs.value,
  };
  applyTruncation(out, inputs, outputs);
  return out;
}

/** Build an ActionOutput for a single foreach repetition. */
async function buildRepetitionOutput(
  api: ToolContext["api"],
  actionName: string,
  rep: any,
): Promise<ActionOutput> {
  const p = rep.properties ?? {};
  const [inputs, outputs] = await Promise.all([
    resolvePayload(api, p.inputs, p.inputsLink),
    resolvePayload(api, p.outputs, p.outputsLink),
  ]);
  const out: ActionOutput = {
    actionName,
    status: p.status ?? "",
    startTime: p.startTime ?? null,
    endTime: p.endTime ?? null,
    error: p.error ?? null,
    inputs: inputs.value,
    outputs: outputs.value,
    repetitionIndexes: p.repetitionIndexes,
  };
  applyTruncation(out, inputs, outputs);
  return out;
}

/** Surface truncation/size metadata from either payload onto the result. */
function applyTruncation(
  out: ActionOutput,
  inputs: { truncated?: boolean; sizeBytes?: number },
  outputs: { truncated?: boolean; sizeBytes?: number },
): void {
  if (inputs.truncated || outputs.truncated) {
    out.truncated = true;
    const sizes = [inputs.sizeBytes, outputs.sizeBytes].filter(
      (n): n is number => typeof n === "number",
    );
    if (sizes.length > 0) out.sizeBytes = Math.max(...sizes);
  }
}
