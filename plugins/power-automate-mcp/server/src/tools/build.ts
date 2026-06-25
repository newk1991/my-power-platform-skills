import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineTool, type ToolContext } from "../register.js";
import { FlowError } from "../errors.js";
import { makeFlowKey } from "../regions.js";
import type { UpdateLiveFlowResult } from "../types.js";

const PS = "/providers/Microsoft.ProcessSimple";

/**
 * Build/author tools: create or update a flow definition, and add a flow to a
 * solution.
 */
export function registerBuildTools(server: McpServer, ctx: ToolContext): void {
  defineTool(server, ctx, {
    name: "update_live_flow",
    description:
      "Create a new flow (omit flowName) or update an existing one (provide flowName). Pass the " +
      "full workflow `definition` and optional `connectionReferences` and `displayName`. Does NOT " +
      "change run state — use set_live_flow_state for that.",
    inputSchema: {
      environmentName: z.string(),
      flowName: z.string().optional().describe("Omit to CREATE a new flow; provide to UPDATE."),
      definition: z.unknown().describe("The workflow definition object (triggers/actions/parameters)."),
      connectionReferences: z.unknown().optional(),
      displayName: z.string().optional(),
    },
    run: async (args, ctx): Promise<UpdateLiveFlowResult> => {
      const env = args.environmentName as string;
      const flowName = args.flowName as string | undefined;
      const definition = args.definition;
      const connectionReferences = args.connectionReferences;
      const displayName = args.displayName as string | undefined;

      if (definition === undefined || definition === null) {
        throw new FlowError("InvalidArgument", "definition is required");
      }

      const updated: string[] = ["definition"];
      if (connectionReferences !== undefined) updated.push("connectionReferences");
      if (displayName !== undefined) updated.push("displayName");

      let created: string | false;
      let resp: { name?: string; properties?: { displayName?: string; state?: string; definition?: unknown } };

      if (flowName === undefined) {
        // CREATE
        if (displayName === undefined) {
          throw new FlowError("InvalidArgument", "displayName is required when creating a flow");
        }
        resp = await ctx.api.post(`${PS}/environments/${env}/flows`, {
          body: {
            properties: {
              displayName,
              definition,
              ...(connectionReferences !== undefined ? { connectionReferences } : {}),
            },
          },
        });
        created = resp.name ?? "";
      } else {
        // UPDATE
        resp = await ctx.api.patch(`${PS}/environments/${env}/flows/${flowName}`, {
          body: {
            properties: {
              ...(displayName !== undefined ? { displayName } : {}),
              definition,
              ...(connectionReferences !== undefined ? { connectionReferences } : {}),
            },
          },
        });
        created = false;
      }

      const flowId = created === false ? (flowName as string) : created;
      return {
        created,
        flowKey: makeFlowKey(env, flowId),
        updated,
        displayName: resp.properties?.displayName ?? displayName ?? "",
        state: resp.properties?.state ?? "",
        definition: resp.properties?.definition ?? definition,
      };
    },
  });

  defineTool(server, ctx, {
    name: "add_live_flow_to_solution",
    description:
      "Add an existing non-solution flow into a Dataverse solution. Pass solutionId for the target " +
      "(unmanaged) solution. Changes solution membership only.",
    inputSchema: {
      environmentName: z.string(),
      flowName: z.string(),
      solutionId: z.string().optional(),
    },
    run: async () => {
      throw new FlowError(
        "NotImplemented",
        "add_live_flow_to_solution is not implemented in v1 — add the flow to a solution via the " +
          "Power Apps maker portal, or use the Dataverse AddSolutionComponent action.",
      );
    },
  });
}
