---
name: pp-live-meeting
version: 1.1.0
description: Facilitate a LIVE meeting. A control-bar GUI (from the companion ai-meeting-tool project) captures audio and streams it to Deepgram; this skill reads the live transcript via the `meeting` MCP server and drives the pp-devteam — taking notes, surfacing recommendations, (in copilot/autopilot) editing code, and capturing screenshots LIBERALLY whenever something visual comes up. Four per-meeting modes: copilot (propose), autopilot (apply), on_demand (act when asked), notes_only (transcript + notes). Invoke as `/pp-live-meeting [start <mode>|stop|tick]`; for hands-off operation wrap a tick in `/loop` (e.g. `/loop 60s /pp-live-meeting`). Trigger examples: "start the meeting", "listen to this call", "live meeting notes", "have the team join this meeting", "transcribe and recommend live", "screenshot the demo", "stop the meeting".
author: Dennis Newcomb
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task, Skill, AskUserQuestion, mcp__meeting__start_meeting, mcp__meeting__stop_meeting, mcp__meeting__get_transcript_since, mcp__meeting__get_full_transcript, mcp__meeting__meeting_status, mcp__meeting__set_speaker_name, mcp__meeting__capture_screenshot
---

# Live meeting copilot for the Power Platform team

This skill bridges a live meeting transcript to the pp-devteam subagents. The
**control-bar GUI** (`meeting_gui.py` in the companion **ai-meeting-tool**
project) owns audio capture + Deepgram streaming + transcript writing and shows
the user a live view, speaker-name fields, and the screenshots you take. This
skill reads that transcript through the **`meeting`** MCP server (tools
`mcp__meeting__*`) and acts on it. All reasoning runs here in Claude Code on the
user's subscription; the only paid service is Deepgram. It is a facilitation
skill — no agent of its own; it drives the seven role agents.

## Prerequisite — the `meeting` MCP server + control bar
The `meeting` MCP server must be connected (it provides `mcp__meeting__*`). The
control bar is launched for the user by `start_meeting`, or they can open it
themselves (`run_gui.bat` / `python meeting_gui.py`). `DEEPGRAM_API_KEY` must be
set (env or the key file). If `meeting_status()` shows `running: false`, no
meeting is live yet.

## Operating modes (per meeting)
- **copilot** — proactive; surface recommendations and **propose** code/skill/MCP
  actions, but do not apply without the user's OK.
- **autopilot** — proactive; **apply** edits / run skills immediately.
- **on_demand** — act only when the user directly asks (e.g. "@data-architect…").
- **notes_only** — only maintain `meeting-notes.md`; no agent dispatch, no edits.

Screenshots are taken in **every** mode (a capture is observation, not an action).
Read the current mode from `meeting_status()`.

## Commands (the argument to this skill)
- `start <mode>` — call `mcp__meeting__start_meeting(mode=<mode>)`. This opens (or
  signals) the control bar and begins capture. Tell the user, reset the cursor
  file to `0`, then suggest `/loop 60s /pp-live-meeting` for hands-off ticking.
- `stop` — `mcp__meeting__stop_meeting()`, do one final tick, then write a
  `## Wrap-up` to `meeting-notes.md` (summary, decisions, action items w/ owners,
  open questions). Remind the user to end any `/loop`.
- `tick` (or no argument) — the per-iteration routine below.

## Per-tick routine
1. **Read state.** Read the cursor from `.claude/meeting-cursor.txt` (int; default
   `0`). Call `mcp__meeting__get_transcript_since(cursor)` (names already applied).
2. **Advance cursor.** Write the returned `cursor` back. If `count == 0`, you may
   still take a periodic screenshot (below), otherwise stop for this tick.
3. **Screenshot liberally (all modes).** See the next section — capture whenever
   the dialogue references anything visual, and at least every few minutes.
4. **Update notes.** Merge new substance into `meeting-notes.md` in the session
   dir: running **Summary**, **Decisions**, **Action items** (owner if stated),
   **Open questions**. Summarize — don't paste the raw transcript.
5. **Route (skip in notes_only / on_demand).** Dispatch the right specialist as a
   subagent (Task tool, `subagent_type`), giving it the new lines + relevant notes
   + a crisp ask. One targeted dispatch per tick beats many.
   | Trigger in the conversation | Dispatch |
   |---|---|
   | Scope, requirements, user stories, "what do we need" | `pp-business-analyst` |
   | Data entities, tables, fields, relationships, schema | `pp-data-architect` |
   | Screens, forms, navigation, "what should it look like" | `pp-ui-designer` |
   | "Let's build / implement / add this" | `pp-app-builder` |
   | Acceptance criteria, testing, "does it work" | `pp-qa-tester` |
   | Deploy, environments, solution, promotion | `pp-alm-engineer` |
   | Cross-cutting / unsure / overall direction | `pp-orchestrator` |
6. **Act by mode.** copilot → post recommendations, **propose** changes and ask
   before applying. autopilot → let the agent apply, then report.
7. **Stay quiet when there's nothing useful** — don't interrupt a live call with
   low-value chatter.

## Screenshots — capture LIBERALLY
Call `mcp__meeting__capture_screenshot()` generously; the control bar flashes and
logs each one and the PNG is saved with the session. Err on the side of MORE.
Capture when someone:
- shares/refers to a screen, slide, diagram, dashboard, mockup, or document
  ("as you can see", "this slide", "look at", "on my screen", "here's the demo");
- shows an error, a config screen, a data model, or a UI;
- demos an app or walks through steps;
- and at least once every ~2–3 minutes during active discussion as a baseline.
A screenshot is cheap and non-intrusive — when in doubt, take it.

## Speaker names
Transcript lines already have names applied (the user types them in the control
bar; the MCP reader maps `Speaker N` → name). If the conversation clearly reveals
who a speaker is, you may set it with `mcp__meeting__set_speaker_name("Speaker 2",
"Dana")`; otherwise leave naming to the user. Don't invent names.

## Context hygiene (long meetings)
Every ~10–15 min, fold older detail into `meeting-notes.md` and rely on the cursor
+ notes rather than re-reading everything. Use `get_full_transcript()` only when
you truly need the whole record (e.g. the wrap-up).

## Notes & guardrails
- The `meeting` server is **pull-based** — you see new dialogue only when you call
  `get_transcript_since`. Real-time behavior comes from `/loop`, which runs only
  while this Claude Code session is open.
- In **copilot**, propose — don't apply. Reserve **autopilot** for low-stakes or
  explicitly authorized changes.
- Reads the shared `.claude/project-profile.md` (from `pp-orchestrator`) when
  present so dispatched roles stay aligned to the stack.
