# MCP Bootstrap — Quick Reference

Everything an agent needs to start calling the free, local Power Automate MCP
server. It runs over **stdio**, reuses your **Azure CLI** login, and exposes its
tools as **native MCP tools** — no hosted endpoint, no API key, no JSON-RPC
framing to hand-roll.

```
Server:    server/build/index.js  (in this repo)
Transport: stdio (launched by your MCP client)
Auth:      Azure CLI login — az login  (no API key, no Bearer header)
Tools:     16 native MCP tools, always listed by tools/list
```

## Step 1 — Build the server

```bash
cd server
npm install
npm run build      # emits server/build/index.js
```

## Step 2 — Sign in with the Azure CLI

The server mints a Power Automate token automatically (audience
`https://service.flow.microsoft.com/`) from your Azure CLI session.

```bash
az login
# Target a specific tenant:
az login --tenant <tenant-id>
```

**Fallback:** if the Azure CLI is unavailable or blocked, set
`PA_MCP_AUTH=devicecode` for the server process to use device-code auth.

## Step 3 — Register the server

**Claude Code (stdio):**

```bash
claude mcp add power-automate -- node <ABSOLUTE-PATH>/power-automate-mcp-skills/server/build/index.js
```

**Project `.mcp.json`** at the repo root (Claude Code; VS Code / Codex use the
same `command` + `args`):

```json
{
  "mcpServers": {
    "power-automate": {
      "command": "node",
      "args": ["server/build/index.js"]
    }
  }
}
```

## Step 4 — Call tools natively

All 16 tools are always present in the client's native `tools/list` — there is
**no** `list_skills` / `tool_search` meta-tool layer and no bundle to load. Call
each tool directly through your MCP client's normal tool interface with the
documented arguments.

Cheap connectivity check (read-only):

```text
list_live_environments()
→ [{ "name": "Default-<tenant-guid>", "displayName": "...", ... }, ...]
```

## Response Shape

Tools return their result object/array **directly** — there is no MCP
text-envelope to parse and no double-parse step.

- **Object-returning tools** carry an `error` field: `null` = success, a non-null
  object = failure. **Check the `error` field; `null` = success.**
- **Array-returning tools** (e.g. `list_live_flows`' inner `flows`,
  `get_live_flow_runs`) return a **bare array** with no wrapper.

## Key Tips

- Tools are native — invoke them directly; do **not** build JSON-RPC requests or
  send an `x-api-key` header.
- `environmentName` is required for most tools, but **not** for
  `list_live_environments` and `list_live_connections`.
- When in doubt about a tool's arguments, inspect its native schema in your MCP
  client's tool list.
- The `store_*` cached-store tools are **not** in this free v1 server (live tools
  only).
