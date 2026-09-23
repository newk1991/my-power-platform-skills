"""Prepare the routing benchmark: upstream copy, baseline pp-devteam, and one fixture copy per configuration.

  python setup.py [--baseline-ref 14731c7]

Needs Microsoft's official copilot-studio@skills-for-copilot-studio installed at user scope.
- variants/old         : plugins/pp-devteam at --baseline-ref (default 14731c7 = pp-devteam 1.3.1, no routing charter)
- fx-*/ and ot-*/      : copies of fixture/ with the logging hook and, where needed, a project profile
Everything created here is git-ignored.
"""
import argparse
import io
import json
import os
import shutil
import subprocess

W = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(W, "..", ".."))

BOTH = """# Project Profile
- **projectName**: Ops Downtime Tracker
- **description**: Downtime reporting for Contoso recycling plants.
- **buildTrack**: Both
- **frontendType**: Canvas App, Model-Driven App
- **dataBackend**: Dataverse
- **environmentUrl**: https://org00000000.crm.dynamics.com
- **solutionName**: OpsModel
- **publisher**: Contoso (con)
- **agents**:
  - Ops Help | solution OpsHelpAgent | workspace agents/ops-help | harness standard | knowledge SharePoint SitePages, Documentation | actions none | channels Teams, SharePoint | auth Authenticate with Microsoft
- **customConnectors**: none
- **automation**: Power Automate cloud flows
- **complianceNotes**: none
- **targetUsers**: plant supervisors, office staff
- **lastUpdated**: 2026-09-23
"""
TRADITIONAL = (BOTH.replace("- **buildTrack**: Both", "- **buildTrack**: Traditional").split("- **agents**:")[0]
               + "- **agents**: none\n- **customConnectors**: none\n- **automation**: Power Automate cloud flows\n"
                 "- **complianceNotes**: none\n- **targetUsers**: plant supervisors, office staff\n- **lastUpdated**: 2026-09-23\n")
NO_TRACK = "\n".join(l for l in TRADITIONAL.splitlines() if "buildTrack" not in l and "agents" not in l) + "\n"

# name: (profile text or None, keep agents/ folder, extra settings)
COPIES = {
    "fx-v0": (None, True, {}), "fx-v2": (None, True, {}),
    "fx-c": (None, True, {"enabledPlugins": {"copilot-studio@skills-for-copilot-studio": False, "eval-guide@eval-guide": False}}),
    "fx-v3": (BOTH, True, {}), "fx-v4": (TRADITIONAL, False, {}),
    "ot-fresh": (None, True, {}), "ot-trad": (None, False, {}), "ot-notrack": (NO_TRACK, True, {}),
    "ot-tradprofile": (TRADITIONAL, False, {}),
}


def hook_settings(extra):
    cmd = 'python "%s"' % os.path.join(W, "log_block.py").replace("\\", "/")
    d = {"hooks": {"PreToolUse": [{"matcher": "*", "hooks": [{"type": "command", "command": cmd}]}]}}
    d.update(extra)
    return d


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--baseline-ref", default="14731c7")
    a = ap.parse_args()
    old = os.path.join(W, "variants", "old")
    shutil.rmtree(old, ignore_errors=True)
    os.makedirs(old)
    tar = subprocess.run(["git", "-C", REPO, "archive", a.baseline_ref, "plugins/pp-devteam"], check=True, capture_output=True).stdout
    subprocess.run(["tar", "-x", "-C", old], input=tar, check=True)

    fixture = os.path.join(W, "fixture")
    for name, (profile, keep_agents, extra) in COPIES.items():
        dest = os.path.join(W, name)
        shutil.rmtree(dest, ignore_errors=True)
        shutil.copytree(fixture, dest)
        if not keep_agents:
            shutil.rmtree(os.path.join(dest, "agents"), ignore_errors=True)
        os.makedirs(os.path.join(dest, ".claude"), exist_ok=True)
        json.dump(hook_settings(extra), open(os.path.join(dest, ".claude", "settings.json"), "w"), indent=2)
        if profile:
            io.open(os.path.join(dest, ".claude", "project-profile.md"), "w", encoding="utf-8").write(profile)
    # Copilot-Studio-only and empty projects for the orchestrator test
    cso = os.path.join(W, "ot-csonly")
    shutil.rmtree(cso, ignore_errors=True)
    os.makedirs(os.path.join(cso, ".claude"))
    shutil.copytree(os.path.join(fixture, "agents"), os.path.join(cso, "agents"))
    json.dump(hook_settings({}), open(os.path.join(cso, ".claude", "settings.json"), "w"), indent=2)
    io.open(os.path.join(cso, "README.md"), "w").write("# Ops Help\nA knowledge-only Copilot Studio agent (agents/ops-help).\n")
    emp = os.path.join(W, "ot-empty")
    shutil.rmtree(emp, ignore_errors=True)
    os.makedirs(os.path.join(emp, ".claude"))
    json.dump(hook_settings({}), open(os.path.join(emp, ".claude", "settings.json"), "w"), indent=2)
    print("ready: variants/, %d fixture copies" % (len(COPIES) + 2))


if __name__ == "__main__":
    main()
