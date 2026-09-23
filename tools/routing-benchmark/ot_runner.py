"""Does /pp-orchestrator ask the build track first? New pp-devteam (local clone) vs the installed 1.4.0.

Each run is a real `claude -p` session in a fixture copy. log_block.py logs every tool call (including the questions
of AskUserQuestion) and blocks everything but reads, so nothing is written.

  python ot_runner.py run [--reps 2]   |   python ot_runner.py grade
"""
import argparse, json, os, re, subprocess, time
from concurrent.futures import ThreadPoolExecutor

W = os.path.dirname(os.path.abspath(__file__))
NEW_PPD = os.path.abspath(os.path.join(W, "..", "..", "plugins", "pp-devteam"))   # the working copy under test
CASES = [
    {"id": "fresh-mixed", "dir": "ot-fresh", "prompt": "/pp-devteam:pp-orchestrator", "expect": "ask", "recommend": "both"},
    {"id": "fresh-traditional", "dir": "ot-trad", "prompt": "/pp-devteam:pp-orchestrator", "expect": "ask", "recommend": "traditional"},
    {"id": "profile-no-track", "dir": "ot-notrack", "prompt": "/pp-devteam:pp-orchestrator", "expect": "ask-track-only", "recommend": "both"},
    {"id": "track-in-arguments", "dir": "ot-csonly",
     "prompt": "/pp-devteam:pp-orchestrator this is a Copilot Studio agent project; the agent Ops Help lives in agents/ops-help",
     "expect": "no-track-question", "recommend": ""},
    {"id": "add-track", "dir": "ot-tradprofile",
     "prompt": "/pp-devteam:pp-orchestrator add a Copilot Studio agent to this project: it answers HR policy questions for plant staff from our SharePoint HR site",
     "expect": "add-track", "recommend": ""},
    {"id": "empty-repo", "dir": "ot-empty", "prompt": "/pp-devteam:pp-orchestrator", "expect": "ask", "recommend": ""},
]
OT_DIR = os.environ.get("OT_DIR", "ot")
CONFIGS = {"new": ["--plugin-dir", NEW_PPD], "old": []} if os.environ.get("OT_OLD") else {"new": ["--plugin-dir", NEW_PPD]}
TRACK = re.compile(r"traditional", re.I)
CS = re.compile(r"copilot studio", re.I)


def run_one(cfg, case, rep):
    out = os.path.join(W, "runs", OT_DIR, "%s__%s__r%d" % (cfg, case["id"], rep))
    os.makedirs(out, exist_ok=True)
    if os.path.exists(os.path.join(out, "done.json")):
        return out
    env = dict(os.environ, ROUTE_LOG=os.path.join(out, "route.jsonl"), HOOK_MODE="permissive")
    cmd = ["claude", "-p", case["prompt"], "--output-format", "stream-json", "--verbose", "--max-turns", "10"] + CONFIGS[cfg]
    t0 = time.time()
    with open(os.path.join(out, "stream.jsonl"), "w", encoding="utf-8") as so, open(os.path.join(out, "stderr.txt"), "w", encoding="utf-8") as se:
        try:
            rc = subprocess.run(cmd, cwd=os.path.join(W, case["dir"]), env=env, stdout=so, stderr=se,
                                stdin=subprocess.DEVNULL, timeout=600).returncode
        except subprocess.TimeoutExpired:
            rc = "timeout"
    json.dump({"rc": rc, "seconds": round(time.time() - t0, 1)}, open(os.path.join(out, "done.json"), "w"))
    return out


def grade():
    root = os.path.join(W, "runs", OT_DIR)
    cases = {c["id"]: c for c in CASES}
    rows = []
    for d in sorted(x for x in os.listdir(root) if x.count("__") == 2):
        cfg, cid, rep = d.split("__")
        c = cases[cid]
        p = os.path.join(root, d)
        calls = [json.loads(l) for l in open(os.path.join(p, "route.jsonl"), encoding="utf-8")] if os.path.exists(os.path.join(p, "route.jsonl")) else []
        asks = [x for x in calls if x["tool"] == "AskUserQuestion"]
        skills = [x.get("skill") for x in calls if x["tool"] == "Skill"]
        text = ""
        for line in open(os.path.join(p, "stream.jsonl"), encoding="utf-8"):
            try:
                e = json.loads(line)
            except Exception:
                continue
            if e.get("type") == "assistant":
                for part in e["message"]["content"]:
                    if part.get("type") == "text":
                        text += part["text"] + "\n"
        first_q = asks[0].get("questions", "") if asks else ""
        # the "question" is either the first AskUserQuestion or, if the tool is unavailable in -p mode, the text
        probe = first_q or text
        asked_track = bool(TRACK.search(probe) and CS.search(probe) and re.search(r"both|separate", probe, re.I))
        first_label = ""
        if first_q:
            try:
                qs = json.loads(first_q)
                first_label = qs[0]["options"][0]["label"] if qs and qs[0].get("options") else ""
                first_is_track = bool(TRACK.search(json.dumps(qs[0])) and CS.search(json.dumps(qs[0])))
                extra_trad = any(re.search(r"frontend|data backend", json.dumps(q), re.I) for q in qs)
            except Exception:
                first_is_track, extra_trad = asked_track, False
        else:
            first_is_track = asked_track
            extra_trad = bool(re.search(r"frontend type|data backend", text, re.I))
        if c["expect"] == "ask":
            ok = asked_track and first_is_track
        elif c["expect"] == "ask-track-only":
            ok = asked_track and first_is_track and not extra_trad
        elif c["expect"] == "add-track":
            ok = bool(re.search(r"\bboth\b", text, re.I) and re.search(r"knowledge|channel|sign-in|authenticat", text, re.I))
        else:
            ok = not asked_track
        rec_ok = (c["recommend"] in first_label.lower()) if (c["recommend"] and first_label) else None
        rows.append({"cfg": cfg, "case": cid, "rep": rep, "pass": ok, "asked_track": asked_track, "via": "AskUserQuestion" if first_q else "text",
                     "first_option": first_label, "recommend_ok": rec_ok, "skills": skills, "text": text[:400]})
    json.dump(rows, open(os.path.join(root, "grading.json"), "w"), indent=1)
    for cfg in CONFIGS:
        r = [x for x in rows if x["cfg"] == cfg]
        print("%-4s pass %d/%d" % (cfg, sum(1 for x in r if x["pass"]), len(r)))
    for x in rows:
        print("%s %-4s %-19s via=%-15s track=%-5s first_option=%-40s rec_ok=%s skills=%s" % (
            "ok " if x["pass"] else "BAD", x["cfg"], x["case"], x["via"], x["asked_track"], x["first_option"][:40], x["recommend_ok"], x["skills"]))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["run", "grade"])
    ap.add_argument("--reps", type=int, default=2)
    ap.add_argument("--jobs", type=int, default=5)
    a = ap.parse_args()
    if a.cmd == "run":
        only = [x for x in os.environ.get("OT_CASES", "").split(",") if x]
        cases = [c for c in CASES if not only or c["id"] in only]
        jobs = [(cfg, c, r) for r in range(1, a.reps + 1) for c in cases for cfg in CONFIGS]
        print("runs:", len(jobs), flush=True)
        with ThreadPoolExecutor(a.jobs) as ex:
            for i, out in enumerate(ex.map(lambda j: run_one(*j), jobs), 1):
                print("%d/%d %s" % (i, len(jobs), os.path.basename(out)), flush=True)
    grade()
