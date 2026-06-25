---
name: power-automate-mcp
description: >-
  Foundation skill for Power Automate via a free, local Power Automate MCP
  server — build it once, sign in with the Azure CLI (`az login`), register it
  with your MCP client, and call its tools natively. No subscription, no API
  key, no hosted endpoint. Load this skill first when connecting an agent to
  Power Automate. For specialized workflows, load `power-automate-build`,
  `power-automate-debug`, `power-automate-monitoring` (Pro+ store tools — not in
  v1), or `power-automate-governance` (Pro+ store tools — not in v1) — each
  contains the workflow narrative, this skill provides the setup they all rely on.
---

# Power Automate via the Local MCP Server — Foundation

This skill is the **setup layer**. It gives an AI agent a reliable way to talk
to the free, local Power Automate MCP server, understand how its tools are
exposed, and handle the responses cleanly. The actual workflow narratives live
in four specialized skills that all build on this one.

> **Real debugging examples**: [Expression error in child flow](https://github.com/ninihen1/power-automate-mcp-skills/blob/main/examples/fix-expression-error.md) |
> [Data entry, not a flow bug](https://github.com/ninihen1/power-automate-mcp-skills/blob/main/examples/data-not-flow.md) |
> [Null value crashes child flow](https://github.com/ninihen1/power-automate-mcp-skills/blob/main/examples/null-child-flow.md)

> **Requires:** The local MCP server in this repo (`server/`) — free, runs over
> stdio, and reuses your Azure CLI login. No subscription and no API key. You
> will need:
> - Node.js (to build and run `server/build/index.js`)
> - The Azure CLI signed in: run `az login` once
> - A Power Platform environment name (e.g. `Default-<tenant-guid>`) — discover
>   it via `list_live_environments` or any `list_live_flows` response

---

## Which Skill to Use When

Skills are organized by **use-case intent**, not by which tools they call.
Multiple skills reuse the same underlying tools — pick by what the user is
trying to accomplish.

| The user wants to… | Load this skill |
|---|---|
| Make or change a flow (build new, modify existing, fix a bug, deploy) | **`power-automate-build`** |
| Diagnose why a flow failed (root cause analysis on a failing run) | **`power-automate-debug`** |
| See tenant-wide flow health, failure rates, asset inventory | **`power-automate-monitoring`** *(Pro+ store tools — not in the free v1 server)* |
| Tag, audit, classify, score, or offboard flows | **`power-automate-governance`** *(Pro+ store tools — not in the free v1 server)* |
| Just connect, set up auth, register the server | this skill (foundation) |

**Same tools, different lenses.** `power-automate-build` and `power-automate-debug`
both call `update_live_flow`, `get_live_flow`, and the run-error tools — they
differ in *direction* (forward vs backward) and *intent* (compose vs diagnose).
`power-automate-monitoring` and `power-automate-governance` both rely on the
`store_*` cached-store tools — those are **not** part of the free local server's
v1 (which ships the 16 live tools only). Don't try to memorize "which tools
belong to which skill"; pick the skill by what the user is doing.

---

## Source of Truth

| Priority | Source | Covers |
|----------|--------|--------|
| 1 | **Real API response** | Always trust what the server actually returns |
| 2 | **Native tool schemas (`tools/list`)** | Authoritative tool schemas, parameter names, types, required flags — your MCP client lists these |
| 3 | **SKILL docs & reference files** | Workflow narrative, response shapes, non-obvious behaviors |

If documentation disagrees with a real API response, the API wins. Tool schemas
in this skill (or any other) may lag the server — inspect the tool's native
schema in your MCP client before invoking a tool you haven't used recently.

---

## How Agents Discover Tools

There is **no meta-tool layer**. The local server exposes its tools as ordinary
MCP tools, so the MCP client lists all of them natively (`tools/list`) and the
agent calls each one directly through the normal tool interface — no
`list_skills`, no `tool_search`, no bundle to load first.

v1 ships **16 live tools**, all always present:

| Group | Tools |
|---|---|
| Discovery | `list_live_environments`, `list_live_flows`, `get_live_flow`, `list_live_connections`, `describe_live_connector` |
| Build / deploy | `update_live_flow`, `add_live_flow_to_solution` *(stub)*, `get_live_dynamic_options` *(stub)*, `get_live_dynamic_properties` *(stub)* |
| Runs / debug | `get_live_flow_runs`, `get_live_flow_run_error`, `get_live_flow_run_action_outputs`, `resubmit_live_flow_run`, `cancel_live_flow_run` |
| Control | `trigger_live_flow`, `set_live_flow_state` |

> The Pro+ `store_*` cached-store tools (used by `power-automate-monitoring` and
> `power-automate-governance`) are **not** in the free local server's v1.

---

## Calling Tools

Tools are **native MCP tools** — call them directly through your MCP client's
normal tool interface. There is no HTTP helper, no JSON-RPC envelope to hand-roll,
no `x-api-key` header, and no double-parse of `result.content[0].text`. Pass the
documented arguments and read the response object the tool returns.

Throughout this skill family, tool calls are written as
`tool_name(arg=value, ...)` shorthand for "invoke this native MCP tool with
these arguments." Whatever language your agent runs in, that maps to a single
native tool invocation — not an HTTP request you build yourself.

The `error` field convention is preserved:

- Object-returning tools carry `error: null` on success; a non-null `error` means
  failure. **Check the `error` field; `null` = success.**
- Array-returning tools (e.g. `get_live_flow_runs`) return a **bare array** —
  there is no wrapper to unwrap.

---

## Verify the Connection

Once the server is built, signed in (`az login`), and registered (see below),
confirm it works by listing environments — a cheap, read-only call:

```text
list_live_environments()
→ [{ "name": "Default-<tenant-guid>", "displayName": "...", ... }, ...]
```

If the call returns environments, the server, your Azure login, and the
registration are all working. If it fails, see **Auth & Connection Notes** below.
On success, hand off to the workflow skill matching the user's intent.

---

## Handling Oversized Responses

Some MCP tool responses are large enough to overflow the agent's context window:

| Tool | Typical size | Cause |
|---|---|---|
| `describe_live_connector` | 100-600 KB | Full Swagger spec for a connector |
| `get_live_dynamic_properties` | 50-500 KB | Dynamic connector field schemas such as SharePoint list columns |
| `get_live_flow_run_action_outputs` (no `actionName`) | 50 KB – several MB | Top-level action outputs; with an action in a foreach, every repetition can be returned |
| `get_live_flow` (large flows) | 50-500 KB | Deeply nested branches |
| `list_live_flows` (large tenants) | 50-200 KB | Hundreds of flow records |

### When the harness spills to a file

Agent harnesses (Claude Code, VS Code Copilot, etc.) save oversized native tool
responses to a temp file and return the path instead of the inline JSON. The
file holds the tool's normal response object/array — read it and parse it once
as JSON; there is no extra envelope to unwrap.

```python
import json
with open(path) as f:
    payload = json.loads(f.read())
```

```powershell
$payload = Get-Content $path -Raw | ConvertFrom-Json
```

### Rules of thumb

1. **Extract, don't echo.** Pull the specific field(s) you need (one `operationId`, one action's outputs) and discard the rest before reasoning about it.
2. **Always pass `actionName` to `get_live_flow_run_action_outputs`.** Omitting it fetches all top-level actions. For actions inside a foreach, passing `actionName` without `iterationIndex` can return every repetition of that action.
3. **Reuse the spill file within a session.** Refetching the same connector swagger costs 30+ seconds and produces another spill — cache the path.
4. **Summarize tool output to the user.** Echo `name + state + trigger` for flow lists and `actionName + status + code` for run errors — not raw JSON, unless asked.

```text
# Good — drill into one operation in a connector swagger
conn = describe_live_connector(environmentName=ENV, connectorName="shared_sharepointonline")
op   = conn["properties"]["swagger"]["paths"]["/datasets/{dataset}/tables/{table}/items"]["get"]
→ report op["operationId"] + op.get("summary")

# Bad — keeping the whole 500 KB swagger in context
```

---

## Prerequisites, Build & Registration

The server lives in this repo at `server/`. Set it up once.

### 1. Build the server

```bash
cd server
npm install
npm run build      # emits server/build/index.js
```

### 2. Sign in with the Azure CLI

The server reuses your Azure CLI login and mints a Power Automate token
automatically (audience `https://service.flow.microsoft.com/`). Sign in once:

```bash
az login
```

To target a specific tenant:

```bash
az login --tenant <tenant-id>
```

**Fallback** — if the Azure CLI is unavailable or blocked, set the environment
variable `PA_MCP_AUTH=devicecode` for the server process to use device-code auth
instead.

### 3. Register the server with your MCP client

**Claude Code (stdio):**

```bash
claude mcp add power-automate -- node <ABSOLUTE-PATH>/power-automate-mcp-skills/server/build/index.js
```

**Project `.mcp.json`** at the repo root (works for Claude Code; VS Code / Codex
use the same `command` + `args`):

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

Once registered, the 16 live tools appear natively in the client's tool list.

---

## Auth & Connection Notes

| Field | Value |
|---|---|
| Auth | Azure CLI login (`az login`) — the server mints the Power Automate token (audience `https://service.flow.microsoft.com/`). No API key, no Bearer header to manage. |
| Tenant | `az login --tenant <tenant-id>` to target a specific tenant |
| Fallback auth | `PA_MCP_AUTH=devicecode` if the Azure CLI is unavailable/blocked |
| `error` field | Object responses carry `error: null` on success; a non-null `error` = failure. Array-returning tools return a bare array. |
| Environment name | `Default-<tenant-guid>` (find it via `list_live_environments` or any `list_live_flows` response) |

**Common failures:**

- `list_live_environments` returns nothing / auth error → run `az login` (or
  `az login --tenant <tenant-id>`); confirm the signed-in account has Power
  Automate access in the target tenant.
- Server won't start → re-run `npm install && npm run build` in `server/` and
  confirm the registered path points at `server/build/index.js`.
- Wrong tenant's data → re-run `az login --tenant <tenant-id>`.

---

## Reference Files

- [MCP-BOOTSTRAP.md](references/MCP-BOOTSTRAP.md) — build, `az login`, registration, native tool calls (read this first)
- [tool-reference.md](references/tool-reference.md) — response shapes and behavioral notes
- [action-types.md](references/action-types.md) — Power Automate action type patterns
- [connection-references.md](references/connection-references.md) — connector reference guide
