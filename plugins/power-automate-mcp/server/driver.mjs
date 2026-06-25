#!/usr/bin/env node
/**
 * Driver / smoke harness for the power-automate MCP server.
 *
 * Three stages:
 *   1. BUILD     — `npm run build` (fails fast on tsc errors).
 *   2. SMOKE     — spawn `node build/index.js` over stdio, run an MCP
 *                  initialize + tools/list handshake, assert every expected
 *                  tool is present with an inputSchema. NO auth required.
 *   3. LIVE      — if a Flow token mints (or PA_MCP_LIVE=1), call
 *                  list_live_environments and print the result. SKIPPED (not
 *                  failed) when `az login` is missing.
 *
 * Exit 0 iff BUILD + SMOKE pass. LIVE is informational.
 *
 * Usage:  node driver.mjs [--json] [--no-build] [--no-live]
 */
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");

const EXPECTED_TOOLS = [
  // discover
  "list_live_environments",
  "list_live_flows",
  "get_live_flow",
  "list_live_connections",
  // build
  "update_live_flow",
  "add_live_flow_to_solution",
  // debug
  "get_live_flow_runs",
  "get_live_flow_run_error",
  "get_live_flow_run_action_outputs",
  // run control
  "resubmit_live_flow_run",
  "cancel_live_flow_run",
  "trigger_live_flow",
  "set_live_flow_state",
  // connectors
  "describe_live_connector",
  "get_live_dynamic_options",
  "get_live_dynamic_properties",
];

const report = { build: null, smoke: null, live: null, tools: {}, missing: [], extra: [] };
const log = (s = "") => process.stdout.write(s + "\n");

// ----- Stage 1: build -------------------------------------------------------
function build() {
  if (args.has("--no-build")) return true;
  log("▶ build: npm run build");
  // Single command string + empty args avoids the DEP0190 (args+shell) warning,
  // and `shell:true` is required on Windows where npm is a .cmd shim.
  const r = spawnSync("npm run build", [], { cwd: HERE, shell: true, encoding: "utf8" });
  if (r.status !== 0) {
    log(r.stdout || "");
    log(r.stderr || "");
    report.build = "FAIL";
    return false;
  }
  report.build = "PASS";
  log("  ✓ tsc clean\n");
  return true;
}

// ----- MCP stdio client (newline-delimited JSON-RPC) ------------------------
function mcpClient() {
  const child = spawn("node", [join(HERE, "build", "index.js")], {
    cwd: HERE,
    stdio: ["pipe", "pipe", "inherit"],
    env: process.env,
  });
  let buf = "";
  const waiters = new Map();
  child.stdout.on("data", (d) => {
    buf += d.toString();
    let nl;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      if (msg.id != null && waiters.has(msg.id)) {
        waiters.get(msg.id)(msg);
        waiters.delete(msg.id);
      }
    }
  });
  let id = 0;
  const send = (method, params) =>
    new Promise((resolve, reject) => {
      const myId = ++id;
      waiters.set(myId, resolve);
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: myId, method, params }) + "\n");
      setTimeout(() => {
        if (waiters.has(myId)) {
          waiters.delete(myId);
          reject(new Error(`timeout waiting for ${method}`));
        }
      }, 60000);
    });
  const notify = (method, params) =>
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
  return { child, send, notify };
}

// ----- Stage 2 + 3 ----------------------------------------------------------
async function run() {
  const { child, send, notify } = mcpClient();
  let ok = true;
  try {
    await send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "pa-mcp-driver", version: "0.1.0" },
    });
    notify("notifications/initialized", {});

    // ---- tools/list smoke ----
    log("▶ smoke: tools/list");
    const listed = await send("tools/list", {});
    const tools = listed?.result?.tools ?? [];
    const byName = new Map(tools.map((t) => [t.name, t]));
    for (const name of EXPECTED_TOOLS) {
      const t = byName.get(name);
      const hasSchema = !!t && !!t.inputSchema && typeof t.inputSchema === "object";
      report.tools[name] = t ? (hasSchema ? "ok" : "no-schema") : "MISSING";
      if (!t) report.missing.push(name);
      log(`  ${t ? (hasSchema ? "✓" : "⚠") : "✗"} ${name}${t ? "" : "  (missing)"}`);
    }
    for (const t of tools) if (!EXPECTED_TOOLS.includes(t.name)) report.extra.push(t.name);
    const smokeOk = report.missing.length === 0 && Object.values(report.tools).every((v) => v === "ok");
    report.smoke = smokeOk ? "PASS" : "FAIL";
    ok = ok && smokeOk;
    log(`  → ${tools.length} tools, ${report.missing.length} missing${report.extra.length ? `, extra: ${report.extra.join(",")}` : ""}`);
    log(`  smoke: ${report.smoke}\n`);

    // ---- live env check ----
    if (args.has("--no-live")) {
      report.live = "SKIPPED (--no-live)";
    } else {
      log("▶ live: list_live_environments");
      const res = await send("tools/call", { name: "list_live_environments", arguments: {} });
      const text = res?.result?.content?.[0]?.text ?? "{}";
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { error: { code: "ParseError", message: text.slice(0, 200) } };
      }
      if (Array.isArray(payload) || (payload && payload.error == null)) {
        const envs = Array.isArray(payload) ? payload : [];
        report.live = `PASS (${envs.length} environments)`;
        log(`  ✓ ${envs.length} environment(s):`);
        for (const e of envs.slice(0, 10)) log(`    - ${e.displayName}  [${e.id}]`);
      } else {
        report.live = `SKIPPED (${payload?.error?.code ?? "no auth"})`;
        log(`  ⊘ ${payload?.error?.message ?? "auth unavailable"}`);
        log(`    (run \`az login\` to enable the live check; this is not a failure)`);
      }
      log("");
    }
  } catch (e) {
    log(`  ✗ ${e.message}`);
    report.smoke = report.smoke ?? "FAIL";
    ok = false;
  } finally {
    child.kill();
  }
  return ok;
}

// ----- main -----------------------------------------------------------------
(async () => {
  const buildOk = build();
  let ok = buildOk;
  if (buildOk) ok = (await run()) && ok;

  log("──────────────────────────────────────────");
  log(`build: ${report.build}   smoke: ${report.smoke}   live: ${report.live}`);
  log(ok ? "RESULT: PASS" : "RESULT: FAIL");

  if (asJson) {
    const out = join(HERE, "driver-report.json");
    writeFileSync(out, JSON.stringify(report, null, 2));
    log(`report → ${out}`);
  }
  process.exit(ok ? 0 : 1);
})();
