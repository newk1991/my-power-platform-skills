#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLogger } from "./log.js";
import { createTokenProvider } from "./auth.js";
import { FlowApi } from "./flowApi.js";
import type { ToolContext } from "./register.js";
import { registerDiscoverTools } from "./tools/discover.js";
import { registerBuildTools } from "./tools/build.js";
import { registerDebugTools } from "./tools/debug.js";
import { registerRunControlTools } from "./tools/runControl.js";
import { registerConnectorTools } from "./tools/connectors.js";

async function main(): Promise<void> {
  const log = createLogger();
  const auth = createTokenProvider(log);
  const api = new FlowApi(auth, log);
  const ctx: ToolContext = { api, auth, log };

  const server = new McpServer({
    name: "power-automate-mcp",
    version: "0.1.0",
  });

  registerDiscoverTools(server, ctx);
  registerBuildTools(server, ctx);
  registerDebugTools(server, ctx);
  registerRunControlTools(server, ctx);
  registerConnectorTools(server, ctx);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info("power-automate-mcp server connected over stdio");
}

main().catch((e) => {
  process.stderr.write(`[pa-mcp:fatal] ${(e as Error).stack ?? String(e)}\n`);
  process.exit(1);
});
