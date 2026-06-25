# power-automate-mcp

A free, self-hosted **MCP server + skills** that give Claude full, action-level visibility into
**Microsoft Power Automate cloud flows** — list/build/debug flows, inspect run history down to
per-action inputs/outputs and loop iterations, and trigger / resubmit / cancel / start / stop runs.

It **reuses your Azure CLI login** (`az login`) and talks directly to the Power Automate REST API the
maker portal uses — **no subscription, no API key**. It's a drop-in replacement for the paid hosted
*FlowStudio MCP* service: identical tool names and response shapes.

## What's in this plugin

```
power-automate-mcp/
  .mcp.json            ← auto-registers the local stdio server when the plugin is enabled
  server/              ← the MCP server (Node.js + TypeScript, stdio, 16 live tools)
  skills/
    power-automate-mcp/         ← foundation: connect, auth, tool reference
    power-automate-build/       ← author / scaffold / deploy flows
    power-automate-debug/       ← root-cause failing runs (action-level I/O)
    power-automate-monitoring/  ← tenant health (needs hosted store_* tools — not in this server)
    power-automate-governance/  ← tag / audit / classify (needs hosted store_* tools)
    run-power-automate-mcp/     ← build, launch, and smoke-test the server
```

## One-time setup

The bundled server is TypeScript and must be built once after the plugin is installed.

1. **Prerequisites:** Node.js 18+ and the **Azure CLI** (`az`), signed in:
   ```bash
   az login                 # or: az login --tenant <tenant-id> for a specific tenant
   ```
2. **Build the server** (in this plugin's directory — `${CLAUDE_PLUGIN_ROOT}`):
   ```bash
   cd server
   npm install
   npm run build            # → server/build/index.js
   ```
3. **Restart Claude Code.** The bundled `.mcp.json` registers the `power-automate` server
   automatically (it points at `${CLAUDE_PLUGIN_ROOT}/server/build/index.js`).

Verify with `claude mcp list` → `power-automate … ✔ Connected`, or run the smoke test:
```bash
node server/driver.mjs       # build + tools/list + a live list_live_environments check
```

## Tools (v1 — live)

| Family | Tools |
|---|---|
| Discover | `list_live_environments`, `list_live_flows`, `get_live_flow`, `list_live_connections` |
| Build | `update_live_flow`, `add_live_flow_to_solution`¹ |
| Debug | `get_live_flow_runs`, `get_live_flow_run_error`, `get_live_flow_run_action_outputs` |
| Run control | `resubmit_live_flow_run`, `cancel_live_flow_run`, `trigger_live_flow`, `set_live_flow_state` |
| Connectors | `describe_live_connector`, `get_live_dynamic_options`¹, `get_live_dynamic_properties`¹ |

¹ Ships as a documented `NotImplemented` stub in v1. The other 13 are fully live. The
`power-automate-monitoring` / `-governance` skills additionally rely on cached `store_*` tools that
this free server does not provide (they were the paid FlowStudio Pro+ surface).

See [`server/README.md`](server/README.md) for configuration (`PA_MCP_AUTH`, device-code fallback,
tenant handling) and troubleshooting.
