# power-automate-mcp (local, free)

A self-hosted [Model Context Protocol](https://modelcontextprotocol.io) server that gives an AI
agent full, action-level visibility into **Microsoft Power Automate cloud flows** — list/build/debug
flows, inspect run history down to per-action inputs/outputs and loop iterations, and trigger /
resubmit / cancel / start / stop runs.

It is a **free, drop-in replacement** for the paid hosted *FlowStudio MCP* service: same tool names
and response shapes, but it talks **directly** to the Power Automate REST API the maker portal uses
and **reuses your existing Azure CLI login** — no subscription, no API key, no hosted endpoint.

## How it works

- **Transport:** stdio (a local process your MCP client spawns).
- **Auth:** shells out to `az account get-access-token` for the Power Automate audience
  (`https://service.flow.microsoft.com/`), caches the token in memory, and re-mints before expiry.
  No secrets are written to disk.
- **API:** the `*.api.flow.microsoft.com` "ProcessSimple" endpoints (`api-version=2016-11-01`),
  including the Logic-Apps-style `/runs/{run}/actions` links that expose action inputs/outputs.

## Prerequisites

- **Node.js 18+** (developed and verified on Node 26).
- **Azure CLI** (`az`) installed and signed in: `az login`. The signed-in account must be able to
  see the Power Platform environments/flows you want to work with.
  - To work in a specific tenant: `az login --tenant <tenant-id>`.

## Build

```bash
cd server
npm install
npm run build      # → server/build/index.js
```

## Register with your MCP client

**Claude Code (stdio):**

```bash
claude mcp add power-automate -- node /ABS/PATH/power-automate-mcp-skills/server/build/index.js
```

**Project `.mcp.json`** (already provided at the repo root):

```json
{
  "mcpServers": {
    "power-automate": { "command": "node", "args": ["server/build/index.js"], "env": { "PA_MCP_AUTH": "azcli" } }
  }
}
```

Verify it connected: `claude mcp list` → `power-automate: … ✔ Connected`.

## Smoke test (the driver)

```bash
node server/driver.mjs
```

The driver builds the server, spawns it over stdio, asserts all 16 tools are present with input
schemas (no auth needed), and — if `az` is logged in — calls `list_live_environments` and prints
your environments. Exit 0 means build + tool surface are good. See
[`../skills/run-power-automate-mcp/SKILL.md`](../skills/run-power-automate-mcp/SKILL.md) for the full
run skill.

## Tools (v1 — live tools)

| Family | Tools |
|---|---|
| Discover | `list_live_environments`, `list_live_flows`, `get_live_flow`, `list_live_connections` |
| Build | `update_live_flow`, `add_live_flow_to_solution`¹ |
| Debug | `get_live_flow_runs`, `get_live_flow_run_error`, `get_live_flow_run_action_outputs` |
| Run control | `resubmit_live_flow_run`, `cancel_live_flow_run`, `trigger_live_flow`, `set_live_flow_state` |
| Connectors | `describe_live_connector`, `get_live_dynamic_options`¹, `get_live_dynamic_properties`¹ |

¹ Ships as a documented `NotImplemented` stub in v1 (see Limitations). The other 13 are fully live.

Tool arguments and response shapes match the catalog in
[`../skills/power-automate-mcp/references/tool-reference.md`](../skills/power-automate-mcp/references/tool-reference.md).
Every object response carries an `error` field (`null` on success); the direct-array tools
(`list_live_environments`, `get_live_flow_runs`, `get_live_flow_run_action_outputs`) return a bare
array.

## Configuration (env vars — all optional)

| Var | Default | Purpose |
|---|---|---|
| `PA_MCP_AUTH` | `azcli` | `azcli` (reuse `az login`) or `devicecode` (MSAL device-code fallback) |
| `PA_MCP_AZ_BIN` | `az` | Override the Azure CLI binary name/path |
| `PA_MCP_CLIENT_ID` / `PA_MCP_TENANT_ID` | — | Your own Entra app for the device-code fallback |
| `PA_MCP_LOG` | `error` | `error` \| `info` \| `debug` (written to **stderr** only) |

## Limitations (v1)

- **`get_live_dynamic_options` / `get_live_dynamic_properties`** are stubs — resolving a connector's
  live dropdown/field metadata requires an authorized connection to invoke. Use
  `describe_live_connector` (which surfaces each parameter's `x-ms-dynamic-*` metadata) and pick ids
  from the maker portal for now.
- **`add_live_flow_to_solution`** is a stub — add flows to a solution via the maker portal or the
  Dataverse `AddSolutionComponent` action.
- **No `store_*` / monitoring / governance tools** — those were FlowStudio's cached Pro+ surface and
  are out of scope for v1 (live tools only).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `AuthError: Not logged in to Azure CLI` | Run `az login` (and `az login --tenant <id>` for the right tenant). |
| `AuthError: Azure CLI not found on PATH` | Install the Azure CLI (https://aka.ms/azcli), or set `PA_MCP_AUTH=devicecode`. |
| Live calls return 0 environments/flows | Your `az` context is a different tenant than your flows. `az login --tenant <id>`, then `az account show` to confirm. |
| `spawn EINVAL` minting a token (Windows) | Handled internally (az is a `.cmd` shim; the server runs it through a shell). If you customized `PA_MCP_AZ_BIN`, point it at `az.cmd`. |
| The tenant blocks the Azure CLI client for the Flow resource (`AADSTS500011`) | Set `PA_MCP_AUTH=devicecode` (optionally with `PA_MCP_CLIENT_ID`/`PA_MCP_TENANT_ID` for your own Entra app). |
