"""Summarise the start of a stream-json run: plugins, Copilot Studio skills/agents, and every hook's output."""
import json, sys
for line in open(sys.argv[1], encoding="utf-8"):
    try:
        e = json.loads(line)
    except Exception:
        continue
    t, st = e.get("type"), e.get("subtype")
    if t == "system" and st == "hook_response":
        out = (e.get("output") or "")
        print("HOOK", e.get("hook_name"), "| len", len(out), "|", out[:160].replace("\n", " "))
    elif t == "system" and st == "init":
        print("PLUGINS", [p.get("name") for p in e.get("plugins", [])])
        print("CS SKILLS", len([s for s in e.get("skills", []) if s.startswith("copilot-studio:")]),
              [s for s in e.get("skills", []) if s.startswith("copilot-studio:")][:6])
        print("CS AGENTS", [a for a in e.get("agents", []) if "opilot" in a])
