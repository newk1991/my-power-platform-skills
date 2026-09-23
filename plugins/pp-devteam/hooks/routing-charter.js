// SessionStart hook for pp-devteam: inject the Power Platform routing charter, but only in projects that
// look like Power Platform work. pp-devteam is usually enabled for the whole user profile, and a routing table
// is noise in an unrelated repository.
//
// When the project has a profile written by /pp-orchestrator (.claude/project-profile.md), the build track it
// records (Traditional, Copilot Studio, or Both) is appended, so routing is sharpened for this project.
//
// Rules this file keeps: bounded work (one stat for the profile, a capped scan otherwise, at most 64 KB read),
// bounded output (each field capped), and silence on any failure - a routing hint never breaks a session.
"use strict";
const fs = require("fs");
const path = require("path");

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const charterPath = path.join(__dirname, "routing-charter.md");
const profilePath = path.join(root, ".claude", "project-profile.md");

const MARKERS = [
  /\.pa\.ya?ml$/i,            // canvas app source
  /^solution\.xml$/i,         // unpacked Dataverse solution
  /\.cdsproj$/i,              // solution project
  /\.mcs\.ya?ml$/i,           // Copilot Studio agent YAML
  /^powerpages\.config\.json$/i,
  /^power\.config\.json$/i,   // code apps
];
const SKIP = new Set(["node_modules", ".git", "bin", "obj", "dist", "build", "out", ".venv", "__pycache__"]);
const MAX_DEPTH = 5;
const MAX_ENTRIES = 4000;
const MAX_PROFILE_BYTES = 64 * 1024;
const MAX_FIELD = 400;

function looksLikePowerPlatform(dir) {
  let seen = 0;
  const queue = [[dir, 0]];
  while (queue.length) {
    const [current, depth] = queue.shift();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (e) {
      continue;
    }
    for (const entry of entries) {
      if (++seen > MAX_ENTRIES) return false;
      if (entry.isDirectory()) {
        if (depth < MAX_DEPTH && !SKIP.has(entry.name)) queue.push([path.join(current, entry.name), depth + 1]);
      } else if (MARKERS.some((re) => re.test(entry.name))) {
        return true;
      }
    }
  }
  return false;
}

function readProfile() {
  let fd;
  try {
    fd = fs.openSync(profilePath, "r");
    const buf = Buffer.alloc(MAX_PROFILE_BYTES);
    const n = fs.readSync(fd, buf, 0, MAX_PROFILE_BYTES, 0);
    const b = buf.subarray(0, n);
    if (b.length >= 2 && b[0] === 0xff && b[1] === 0xfe) return b.subarray(2).toString("utf16le");
    return b.toString("utf8").replace(/^﻿/, "");
  } catch (e) {
    return null;
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch (e) { /* ignore */ }
  }
}

// Strip markdown emphasis, quotes and control characters, and cap the length.
function clean(v) {
  v = String(v || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/[*_`"']/g, "").replace(/\s+/g, " ").trim();
  return v.length > MAX_FIELD ? v.slice(0, MAX_FIELD) + " ..." : v;
}

function isNone(v) {
  return /^(n\/a|na|none)\b/i.test(v);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// One field, on one line. Accepts "- **name**: v", "- **name:** v", "name: v" and a table row "| name | v |".
function field(lines, name) {
  const n = escapeRe(name);
  const forms = [
    new RegExp("^[ \\t]*[-*+]?[ \\t]*\\*\\*" + n + "\\*\\*[ \\t]*:[ \\t]*(.*)$", "i"),
    new RegExp("^[ \\t]*[-*+]?[ \\t]*\\*\\*" + n + ":\\*\\*[ \\t]*(.*)$", "i"),
    new RegExp("^[ \\t]*[-*+]?[ \\t]*" + n + "[ \\t]*:[ \\t]*(.*)$", "i"),
    new RegExp("^[ \\t]*\\|[ \\t]*\\**" + n + "\\**[ \\t]*\\|[ \\t]*(.*?)[ \\t]*\\|", "i"),
  ];
  for (let i = 0; i < lines.length; i++) {
    for (const re of forms) {
      const m = lines[i].match(re);
      if (m) return { value: clean(m[1]), index: i };
    }
  }
  return { value: "", index: -1 };
}

// agents: the value on its line, plus indented "- ..." lines that follow it.
function agentsField(lines) {
  const f = field(lines, "agents");
  if (f.index < 0) return "";
  const items = f.value ? [f.value] : [];
  for (let i = f.index + 1; i < lines.length && items.length < 20; i++) {
    const m = lines[i].match(/^[ \t]+[-*+][ \t]+(.*)$/);
    if (!m) break;
    items.push(clean(m[1]));
  }
  const joined = items.filter(Boolean).join("; ");
  return joined.length > MAX_FIELD * 3 ? joined.slice(0, MAX_FIELD * 3) + " ..." : joined;
}

function classify(track) {
  if (!track || track.includes("|") || /<.*>/.test(track)) return "unset";
  const t = track.toLowerCase();
  if (/\bboth\b/.test(t) || (/traditional/.test(t) && /copilot/.test(t))) return "both";
  if (/copilot/.test(t)) return "copilot";
  if (/traditional/.test(t)) return "traditional";
  return "unknown";
}

const FLOW_RULE = "An event-triggered automation with no conversation (\"when a ticket is created, email the site " +
  "manager\") is a cloud flow even if the user calls it an agent: route it to `power-automate`. If it is unclear " +
  "whether the user wants a conversational agent or a flow, ask one short question.";

function profileBlock() {
  const text = readProfile();
  const lines = ["", "## This project", ""];
  if (text === null) {
    lines.push("No project profile yet. `/pp-orchestrator` records the build track (Traditional, Copilot Studio, or",
      "Both) the first time it runs. Until then, route by artifact as above.");
    return lines.join("\n") + "\n";
  }
  const rows = text.split(/\r?\n/);
  const trackRaw = field(rows, "buildTrack").value;
  const solution = field(rows, "solutionName").value;
  const agents = agentsField(rows);
  const kind = classify(trackRaw);
  const sol = solution && !isNone(solution) ? " (`" + solution + "`)" : "";
  if (kind === "unset") {
    lines.push("The project profile has no build track yet. Suggest running `/pp-orchestrator` to record it",
      "(Traditional, Copilot Studio, or Both).");
    return lines.join("\n") + "\n";
  }
  if (kind === "unknown") {
    lines.push("The profile's build track (\"" + trackRaw + "\") is not one of Traditional, Copilot Studio or Both.",
      "Route by artifact, and suggest re-running `/pp-orchestrator` to fix it.");
    return lines.join("\n") + "\n";
  }
  lines.push("Build track, from `.claude/project-profile.md`: **" + trackRaw + "**.");
  if (kind === "traditional") {
    lines.push("This is a traditional solution" + sol + ". The Copilot Studio sub-agents are not part of this " +
      "project. A request for a conversational agent (it answers questions from knowledge such as SharePoint, or " +
      "has topics or channels) is Copilot Studio work: say so and offer to add the Copilot Studio track with " +
      "`/pp-orchestrator` (the track becomes Both), rather than routing it silently. \"Agent\" can also mean a " +
      "Claude Code subagent.");
  } else if (kind === "copilot") {
    lines.push("This project builds a Copilot Studio agent in its own solution. Agent work goes to the " +
      "`copilot-studio` sub-agents (Advisor, Author, Manage, Test). The flows the agent calls live in its solution.");
  } else {
    lines.push("This project has a traditional solution" + sol + " and Copilot Studio agent work in separate " +
      "solutions. Route each request by the artifact it is about.");
  }
  lines.push(FLOW_RULE);
  if (agents && !isNone(agents)) lines.push("Agents: " + agents);
  if (kind !== "traditional") {
    lines.push("Keep solutions apart: an agent's solution holds the agent and what only it uses; app components, and " +
      "anything shared with the app, stay in the traditional solution.");
  }
  return lines.join("\n") + "\n";
}

try {
  let hasProfile = false;
  try { hasProfile = fs.statSync(profilePath).isFile(); } catch (e) { hasProfile = false; }
  if (hasProfile || looksLikePowerPlatform(root)) {
    const text = fs.readFileSync(charterPath, "utf8") + profileBlock();
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: text } }));
  }
} catch (e) {
  // stay silent
}
