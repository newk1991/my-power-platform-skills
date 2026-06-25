---
name: run-power-automate-mcp
description: Build, launch, smoke-test, and drive the local Power Automate MCP server in server/. Use when asked to run, start, build, register, smoke-test, or verify the Power Automate MCP server, check its tools list, or confirm the Azure CLI (az login) connection to Power Automate works.
---

# Run the Power Automate MCP server

This repo ships a **local, free MCP server** (`server/`, Node.js + TypeScript, **stdio**) that drives
Microsoft Power Automate cloud flows by reusing your **Azure CLI login** — no subscription, no API
key. It replaces the paid hosted *FlowStudio MCP* service while keeping the same tool names and
response shapes.

The server is **not** a GUI — you drive it with `server/driver.mjs`, which builds it, spawns it over
stdio, verifies the tool surface, and does a live environments call. That driver is the primary path
for an agent; this skill is its man page.

> Paths below are relative to the repo root (`power-automate-mcp-skills/`).

## Prerequisites

- **Node.js 18+** (verified on Node 26) and **npm**.
- **Azure CLI** (`az`) installed and signed in:
  ```bash
  az login                       # or: az login --tenant <tenant-id>
  az account show                # confirm you're in the tenant that owns your flows
  ```
  The signed-in account must be able to see the Power Platform environments/flows you want.

## Build

```bash
cd server
npm install
npm run build          # → server/build/index.js
```

## Run (agent path) — the driver

From the repo root:

```bash
node server/driver.mjs
```

What it does and the expected output:

```
▶ build: npm run build
  ✓ tsc clean
▶ smoke: tools/list
  ✓ list_live_environments
  ✓ list_live_flows
  ... (16 tools total)
  → 16 tools, 0 missing
  smoke: PASS
▶ live: list_live_environments
  ✓ 3 environment(s):
    - Organics_Ops_Prod  [08b32026-...]
    - Waste Management Inc. (default) (Upgrade)  [Default-d7bf8bae-...]
    - Organics_Ops_Dev  [f4d5c99e-...]
──────────────────────────────────────────
build: PASS   smoke: PASS   live: PASS (3 environments)
RESULT: PASS
```

- **build + smoke** need no auth — they prove the server starts and exposes all 16 tools with input
  schemas. Exit code is 0 iff these pass.
- **live** calls `list_live_environments` if a token mints. If you are not logged in it prints
  `SKIPPED` with an `az login` hint and is **not** a failure.
- `node server/driver.mjs --json` also writes `server/driver-report.json`.
- `node server/driver.mjs --no-live` runs build + smoke only (CI-friendly, no Azure needed).

## Register it with Claude Code

```bash
claude mcp add power-automate -- node /ABS/PATH/power-automate-mcp-skills/server/build/index.js
claude mcp list        # → power-automate: ... ✔ Connected
```

A project `.mcp.json` at the repo root does the same (`command: node`, `args: ["server/build/index.js"]`).

## Drive individual tools over stdio

To exercise one tool without a full MCP client, speak newline-delimited JSON-RPC to the built server.
This pattern (used to verify the server this session) calls a tool and prints its result:

```bash
node --input-type=module -e '
import { spawn } from "node:child_process";
const child = spawn("node", ["server/build/index.js"], { stdio: ["pipe", "pipe", "inherit"] });
let buf = "", id = 0; const w = new Map();
child.stdout.on("data", d => { buf += d; let i;
  while ((i = buf.indexOf("\n")) !== -1) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
    if (!l) continue; let m; try { m = JSON.parse(l); } catch { continue; }
    if (m.id != null && w.has(m.id)) { w.get(m.id)(m); w.delete(m.id); } } });
const rpc = (method, params) => new Promise(r => { const k = ++id; w.set(k, r);
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: k, method, params }) + "\n"); });
await rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "t", version: "1" } });
child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
const res = await rpc("tools/call", { name: "list_live_flows", arguments: { environmentName: "<ENV_ID>", mode: "owner" } });
console.log(res.result.content[0].text);
child.kill();
'
```

Swap in any tool name + arguments. The debug round-trip that proves the headline capability is:
`get_live_flow_runs` → `get_live_flow_run_error` → `get_live_flow_run_action_outputs` (the last
returns per-action **inputs and outputs**, fetched from the run's SAS links).

## Gotchas (battle scars from building this)

- **`az` is a `.cmd` shim on Windows.** Node's `execFile` refuses to run `.cmd`/`.bat` without a
  shell (CVE-2024-27980 hardening) and throws `spawn EINVAL`. The server runs `az` through a shell on
  win32 to fix this. If you override `PA_MCP_AZ_BIN`, point it at `az.cmd` on Windows.
- **Array tools must stay arrays.** `list_live_environments`, `get_live_flow_runs`, and
  `get_live_flow_run_action_outputs` return a **bare JSON array**; the others return an object with an
  `error` field. Do not assume every response is an object.
- **SAS links are pre-authorized.** Action `inputsLink`/`outputsLink` URLs are fetched with **no**
  `Authorization` header — adding one causes a 403. The server already handles this.
- **Tenant mismatch is the #1 "it returns nothing" cause.** `az` may be logged into a different
  tenant than the one holding your flows. Check `az account show`; re-run `az login --tenant <id>`.
- **`list_live_connections` can legitimately return 0** for an environment that has no explicit
  connections — that is not an error.
- **Connector swagger is large.** `describe_live_connector` fetches it with `$expand=swagger` and
  returns a *narrowed* slice (search / catalog / single-operation), never the 100–600 KB blob.
- **`get_live_dynamic_options/_properties` and `add_live_flow_to_solution` are stubs** in v1 — they
  return `{"error":{"code":"NotImplemented", ...}}`. The skills tolerate the `error` field, so
  build/debug flows still work.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Driver `smoke: FAIL`, a tool missing | `npm run build` failed or a `tools/*.ts` file did not register — re-run `cd server && npm run build` and read the tsc error. |
| `live: SKIPPED (AuthError)` | `az login` (and `az login --tenant <id>`). Re-run the driver. |
| `live: PASS (0 environments)` | Wrong tenant — `az account show`, then `az login --tenant <id>`. |
| `spawn EINVAL` | You're on Windows with `PA_MCP_AZ_BIN` set to `az`; set it to `az.cmd` or unset it. |
| `claude mcp list` shows ✘ / failed | Confirm the absolute path to `server/build/index.js` exists (build first). |
