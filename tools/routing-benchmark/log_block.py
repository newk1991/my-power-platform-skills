"""PreToolUse hook for the routing tests: log every tool call, let reads through, block the rest.

Default mode: only read tools and clearly read-only shell commands pass. The first blocked call is the routing decision.
HOOK_MODE=permissive (orchestrator tests): shell commands pass unless they could change something (delete, move,
redirect into a file, git push/commit, pac import/publish/push, network calls, installs). Skill, Agent, MCP, Write
and Edit calls are always blocked, so nothing outside the scratch fixture can change.
"""
import json
import os
import re
import sys

READ_ONLY = {"Read", "Glob", "Grep", "LS", "ToolSearch", "TodoWrite", "TaskCreate", "TaskUpdate", "TaskList"}
SAFE_CMDS = {"ls", "dir", "find", "pwd", "cat", "head", "tail", "grep", "rg", "wc", "tree", "echo", "cd", "type",
             "stat", "file", "sort", "uniq", "basename", "dirname", "realpath", "cygpath", "true", "test"}
FIND_WRITES = re.compile(r"-(delete|exec|execdir|ok|fprint)(\s|$)")
REDIRECT = re.compile(r"(?<![0-9&])>(?!&)")
WRITERS = re.compile(r"(^|[\s;&|(])(rm|mv|cp|del|rmdir|mkdir|touch|tee|chmod|chown|ln)(\s|$)")
DENY = re.compile(
    r"(^|[\s;&|(])(rm|mv|del|rmdir|tee|curl|wget|npm|pip|dotnet|az)(\s|$)"
    r"|git\s+(push|commit|reset|checkout|clean)"
    r"|sed\s+-i"
    r"|Invoke-|Remove-Item|Set-Content|Out-File"
    r"|pac\s+(solution\s+(import|delete|publish|upgrade|export)|copilot\s+(push|publish|create|clone)|admin|env\s+(select|create|delete)|auth)",
    re.I)


def strip_harmless(cmd):
    return cmd.replace("2>/dev/null", "").replace("2>&1", "").replace("2>nul", "")


def read_only_shell(cmd):
    c = strip_harmless(cmd)
    if FIND_WRITES.search(c) or REDIRECT.search(c) or WRITERS.search(c) or DENY.search(c):
        return False
    for seg in re.split(r"\|\||&&|;|\|", c):
        words = seg.strip().split()
        if words and words[0] not in SAFE_CMDS:
            return False
    return True


def permissive_shell(cmd):
    c = strip_harmless(cmd)
    return not (FIND_WRITES.search(c) or REDIRECT.search(c) or DENY.search(c))


data = json.load(sys.stdin)
name = data.get("tool_name", "")
inp = data.get("tool_input", {}) or {}
rec = {"tool": name}
for k in ("skill", "subagent_type", "command", "file_path", "description", "questions"):
    if k in inp:
        rec[k] = json.dumps(inp[k])[:1500] if k == "questions" else str(inp[k])[:300]
if name == "Bash":
    cmd = str(inp.get("command", ""))
    allowed = permissive_shell(cmd) if os.environ.get("HOOK_MODE") == "permissive" else read_only_shell(cmd)
else:
    allowed = name in READ_ONLY
rec["allowed"] = allowed
log = os.environ.get("ROUTE_LOG")
if log:
    with open(log, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec) + "\n")
if allowed:
    sys.exit(0)
sys.stderr.write("DRY RUN: '%s' is blocked in this routing test. Say in one sentence what you would do next, then stop.\n" % name)
sys.exit(2)
