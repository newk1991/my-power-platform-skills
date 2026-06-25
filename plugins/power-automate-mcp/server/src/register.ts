import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { FlowApi } from "./flowApi.js";
import type { TokenProvider } from "./auth.js";
import type { Logger } from "./log.js";
import { toErrorField } from "./errors.js";

/** Shared dependencies handed to every tool module. */
export interface ToolContext {
  api: FlowApi;
  auth: TokenProvider;
  log: Logger;
}

export interface ToolSpec {
  name: string;
  description: string;
  /** Zod raw shape — the SDK converts it to the tool's JSON inputSchema. */
  inputSchema: ZodRawShape;
  /** Returns the success payload (WITHOUT the error field; it is added here). */
  run: (args: any, ctx: ToolContext) => Promise<unknown>;
}

function jsonResult(data: unknown, isError = false): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], ...(isError ? { isError: true } : {}) };
}

/**
 * Register a tool on the MCP server with the uniform response contract:
 * success payloads gain `error: null`; thrown errors become
 * `{ error: { code, message, details? } }` with isError set, so callers can
 * always branch on `result.error != null` (matching the skill docs).
 */
export function defineTool(server: McpServer, ctx: ToolContext, spec: ToolSpec): void {
  server.registerTool(
    spec.name,
    { description: spec.description, inputSchema: spec.inputSchema },
    async (args: unknown): Promise<CallToolResult> => {
      try {
        const payload = await spec.run(args ?? {}, ctx);
        // Direct-array responses (e.g. list_live_environments, get_live_flow_runs)
        // must stay arrays — do NOT spread them into an object. Object responses
        // gain the uniform `error: null` field.
        if (Array.isArray(payload)) {
          return jsonResult(payload);
        }
        if (payload && typeof payload === "object") {
          return jsonResult({ ...(payload as object), error: null });
        }
        return jsonResult({ value: payload, error: null });
      } catch (e) {
        ctx.log.error(`${spec.name}: ${(e as Error).message}`);
        return jsonResult({ error: toErrorField(e) }, true);
      }
    },
  );
}
