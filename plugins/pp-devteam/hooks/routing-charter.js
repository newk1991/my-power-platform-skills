// SessionStart hook for pp-devteam: inject the Power Platform routing charter, but only in projects that
// look like Power Platform work. pp-devteam is usually enabled for the whole user profile, and a routing table
// is noise in an unrelated repository.
//
// The scan is bounded (depth and entry count) so a large repository does not slow session start down.
// Any failure exits quietly: a routing hint is never worth breaking a session over.
"use strict";
const fs = require("fs");
const path = require("path");

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const charterPath = path.join(__dirname, "routing-charter.md");

const MARKERS = [
  /\.pa\.ya?ml$/i,            // canvas app source
  /^solution\.xml$/i,         // unpacked Dataverse solution
  /\.cdsproj$/i,              // solution project
  /\.mcs\.ya?ml$/i,           // Copilot Studio agent YAML
  /^powerpages\.config\.json$/i,
  /^project-profile\.md$/i,   // written by /pp-orchestrator
  /^power\.config\.json$/i,   // code apps
];
const SKIP = new Set(["node_modules", ".git", "bin", "obj", "dist", "build", "out", ".venv", "__pycache__"]);
const MAX_DEPTH = 5;
const MAX_ENTRIES = 4000;

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

try {
  if (looksLikePowerPlatform(root)) {
    const text = fs.readFileSync(charterPath, "utf8");
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: text } }));
  }
} catch (e) {
  // stay silent
}
