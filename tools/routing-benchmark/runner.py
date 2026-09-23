"""Routing benchmark: which plugin does Claude reach for first, per plugin configuration?

Every run is a real `claude -p` session in a copy of the fixture project. A PreToolUse hook (log_block.py) logs each
tool call and blocks everything except reads, so nothing executes. The first non-read call is the routing decision.

  python setup.py                                   # once: variants/, fx-*/ and ot-*/ copies
  python runner.py run  [--reps N] [--only v0,v1] [--jobs 5] [--iteration 1]
  python runner.py grade [--iteration 1]
"""
import argparse, json, os, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

W = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(W, "..", ".."))
PPD = os.path.join(REPO, "plugins", "pp-devteam")   # the working copy under test
CSU = os.path.join(W, "variants", "cs-upstream")
OLD_PPD = os.path.join(W, "variants", "old", "plugins", "pp-devteam")   # pp-devteam 1.3.1: no routing charter
VARIANTS = {
    "v0": {"dir": "fx-v0", "args": ["--plugin-dir", CSU, "--plugin-dir", OLD_PPD], "label": "BEFORE: Microsoft copilot-studio as shipped + pp-devteam 1.3.1"},
    "v1": {"dir": "fx-v1", "args": ["--plugin-dir", OLD_PPD], "label": "scoped copilot-studio (installed) + pp-devteam 1.3.1"},
    "v2": {"dir": "fx-v2", "args": [], "label": "AFTER: scoped copilot-studio + pp-devteam 1.4.0 charter (installed config)"},
    "v3": {"dir": "fx-v3", "args": ["--plugin-dir", PPD], "label": "NEW: scoped copilot-studio + pp-devteam 1.5.0 (profile: Both)"},
    "v4": {"dir": "fx-v4", "args": ["--plugin-dir", PPD], "label": "NEW: pp-devteam 1.5.0 (profile: Traditional, no agent)"},
    "c":  {"dir": "fx-c", "args": ["--plugin-dir", OLD_PPD], "label": "control: no copilot-studio, pp-devteam 1.3.1"},
}
READ_ONLY = {"Read", "Glob", "Grep", "LS", "ToolSearch", "TodoWrite", "TaskCreate", "TaskUpdate", "TaskList"}


def run_one(it, variant, ev, rep):
    out = os.path.join(W, "runs", "iteration-%d" % it, "%s__%02d-%s__r%d" % (variant, ev["id"], ev["name"], rep))
    os.makedirs(out, exist_ok=True)
    if os.path.exists(os.path.join(out, "done.json")):
        return out
    log = os.path.join(out, "route.jsonl")
    if os.path.exists(log):
        os.remove(log)
    env = dict(os.environ, ROUTE_LOG=log)
    cmd = ["claude", "-p", ev["prompt"], "--output-format", "stream-json", "--verbose", "--max-turns", "12"] + VARIANTS[variant]["args"]
    t0 = time.time()
    with open(os.path.join(out, "stream.jsonl"), "w", encoding="utf-8") as so, open(os.path.join(out, "stderr.txt"), "w", encoding="utf-8") as se:
        try:
            rc = subprocess.run(cmd, cwd=os.path.join(W, VARIANTS[variant]["dir"]), env=env, stdout=so, stderr=se,
                                stdin=subprocess.DEVNULL, timeout=600, shell=False).returncode
        except subprocess.TimeoutExpired:
            rc = "timeout"
    json.dump({"rc": rc, "seconds": round(time.time() - t0, 1)}, open(os.path.join(out, "done.json"), "w"))
    return out


def classify(call):
    tool = call["tool"]
    data = call
    if tool == "Skill":
        name = str(data.get("skill") or data.get("name") or "")
        fam = name.split(":")[0] if ":" in name else name
        return ("CS" if fam in ("copilot-studio", "eval-guide") else "PP"), "Skill " + name
    if tool in ("Agent", "Task"):
        st = str(data.get("subagent_type") or "")
        return ("CS" if "opilot" in st and "Studio" in st or st.startswith("copilot-studio") else "PP"), "Agent " + st
    if tool.startswith("mcp__"):
        return "PP", tool
    return "PP", tool + (" " + str(data.get("command", ""))[:80] if tool == "Bash" else "")


def grade(it):
    evals = {e["id"]: e for e in json.load(open(os.path.join(W, "evals.json")))["evals"]}
    root = os.path.join(W, "runs", "iteration-%d" % it)
    rows = []
    for d in sorted(x for x in os.listdir(root) if x.count("__") == 2):
        variant, rest, rep = d.split("__")
        eid = int(rest.split("-")[0])
        ev = evals[eid]
        p = os.path.join(root, d)
        calls = []
        if os.path.exists(os.path.join(p, "route.jsonl")):
            calls = [json.loads(l) for l in open(os.path.join(p, "route.jsonl"), encoding="utf-8") if l.strip()]
        routed = [c for c in calls if not c.get("allowed", c["tool"] in READ_ONLY)]
        text, err = "", ""
        for line in open(os.path.join(p, "stream.jsonl"), encoding="utf-8"):
            try:
                e = json.loads(line)
            except Exception:
                continue
            if e.get("type") == "result":
                text = (e.get("result") or "")[:300]
                if e.get("is_error"):
                    err = text
        if "Failed to authenticate" in text or "401" in err:
            cls, first = "ERR", "auth error"
        elif routed:
            cls, first = classify(routed[0])
        else:
            cls, first = "NONE", "no tool (answered in text)"
        if cls == "ERR":
            ok = None
        elif ev["cs"]:
            ok = cls == "CS"
        else:
            ok = cls != "CS"
        rows.append({"variant": variant, "eval": ev["id"], "name": ev["name"], "rep": rep, "cs_expected": ev["cs"],
                     "class": cls, "first": first, "pass": ok, "reads": len(calls) - len(routed), "text": text[:160]})
    json.dump(rows, open(os.path.join(root, "grading.json"), "w"), indent=1)
    # summary
    print("%-4s %-9s %-9s %-9s  %s" % ("var", "non-CS ok", "CS ok", "overall", "label"))
    for v, meta in VARIANTS.items():
        r = [x for x in rows if x["variant"] == v and x["pass"] is not None]
        if not r:
            continue
        n1 = [x for x in r if not x["cs_expected"]]; n2 = [x for x in r if x["cs_expected"]]
        f = lambda xs: "%d/%d" % (sum(1 for x in xs if x["pass"]), len(xs))
        print("%-4s %-9s %-9s %-9s  %s" % (v, f(n1), f(n2), f(r), meta["label"]))
    print()
    for x in rows:
        mark = {True: "ok ", False: "BAD", None: "err"}[x["pass"]]
        print("%s %-3s %02d %-34s %-4s %s" % (mark, x["variant"], x["eval"], x["name"][:34], x["class"], x["first"][:90]))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["run", "grade"])
    ap.add_argument("--reps", type=int, default=1)
    ap.add_argument("--only", default="")
    ap.add_argument("--evals", default="")
    ap.add_argument("--jobs", type=int, default=5)
    ap.add_argument("--iteration", type=int, default=1)
    a = ap.parse_args()
    if a.cmd == "grade":
        grade(a.iteration)
        sys.exit(0)
    evs = json.load(open(os.path.join(W, "evals.json")))["evals"]
    if a.evals:
        keep = {int(x) for x in a.evals.split(",")}
        evs = [e for e in evs if e["id"] in keep]
    vs = [v for v in VARIANTS if not a.only or v in a.only.split(",")]
    jobs = [(a.iteration, v, e, r) for r in range(1, a.reps + 1) for e in evs for v in vs]
    print("runs:", len(jobs), flush=True)
    with ThreadPoolExecutor(a.jobs) as ex:
        for i, out in enumerate(ex.map(lambda j: run_one(*j), jobs), 1):
            print("%d/%d %s" % (i, len(jobs), os.path.basename(out)), flush=True)
    grade(a.iteration)
