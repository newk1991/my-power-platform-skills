---
name: pp-live-meeting
version: 1.0.0
description: Power Platform live-meeting facilitator. Bridges a real-time, speaker-labeled meeting transcript (from the `meeting` MCP server — Deepgram Nova-3 speech-to-text) into Claude Code so the pp-devteam acts live — taking notes, surfacing recommendations, and (in copilot/autopilot) editing code as the conversation happens. Four per-meeting modes:  copilot (propose changes), autopilot (apply changes), on_demand (act only when asked), notes_only (transcript + notes). Invoke as `/pp-live-meeting [start <mode>|stop|tick]`; for hands-off operation wrap a tick in `/loop` (e.g. `/loop 60s /pp-live-meeting`). Requires the `meeting` MCP server (from the companion ai-meeting-tool project) to be connected. Trigger examples: "start the meeting", "listen to this call", "live meeting notes", "have the team join this meeting", "transcribe and recommend live", "stop the meeting".
author: Dennis Newcomb
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task, Skill, AskUserQuestion, mcp__meeting__start_meeting, mcp__meeting__stop_meeting, mcp__meeting__get_transcript_since, mcp__meeting__get_full_transcript, mcp__meeting__meeting_status, mcp__meeting__capture_screenshot
---

# Live meeting copilot for the Power Platform team

This skill bridges a live meeting transcript (from the **`meeting`** MCP server,
tools `mcp__meeting__*`) to the pp-devteam subagents. All reasoning runs here in
Claude Code on the user's subscription; the only paid external service is the
Deepgram transcription behind the MCP server. It is a facilitation skill — it has
no agent counterpart of its own; it *drives* the seven role agents.

## Prerequisite — the `meeting` MCP server
This skill does nothing without the `meeting` server connected (it provides the
`mcp__meeting__*` tools). That server lives in the companion **ai-meeting-tool**
project. Register it once at **user scope** so it's available in any project:

```
claude mcp add -s user meeting -- python "C:/Users/DennisNewcomb/GIT_REPO/ai meeting tool/meeting_mcp.py"
```

(adjust the path to wherever you cloned ai-meeting-tool) and set `DEEPGRAM_API_KEY`
in your environment. If `meeting_status()` errors or returns nothing, the server
isn't connected — fix that before starting.

## Operating modes (chosen per meeting, in `start_meeting`)
- **copilot** — proactive. Each tick, surface recommendations and **propose**
  code/skill/MCP actions, but **do not apply** them without the user's OK.
- **autopilot** — proactive. Same as copilot but **apply** edits / run skills
  immediately (no approval step). Use only when the user explicitly chose it.
- **on_demand** — reactive. Do **not** dispatch agents on a tick; just keep the
  notes current. Act only when the user directly asks (e.g. "@data-architect…").
- **notes_only** — passive. Only maintain `meeting-notes.md`. Never dispatch
  agents and never change code.

Always read the current mode from `meeting_status()` — never assume it.

## Commands (the argument to this skill)
- `start <mode>` — call `mcp__meeting__start_meeting(mode=<mode>)`. Tell the user
  the session dir, then (for copilot/autopilot/notes_only) instruct them to run
  `/loop 60s /pp-live-meeting` to begin hands-off ticking. Reset the cursor file
  to `0`.
- `stop` — call `mcp__meeting__stop_meeting()`, do one final tick to flush notes,
  then write a closing `## Wrap-up` to `meeting-notes.md` (summary, decisions,
  action items with owners, open questions). Remind the user to end any `/loop`.
- `tick` (or no argument) — the per-iteration routine below.

## Per-tick routine
1. **Read state.** Read the cursor from `.claude/meeting-cursor.txt` (an integer;
   default `0` if missing). Call `mcp__meeting__get_transcript_since(cursor)`.
2. **Advance cursor.** Write the returned `cursor` back to
   `.claude/meeting-cursor.txt`. If `count == 0`, stop (nothing new this tick).
3. **Update notes.** Append/merge the new lines' substance into `meeting-notes.md`
   in the session dir: keep a running **Summary**, **Decisions**, **Action items**
   (with owner if stated), and **Open questions**. Keep it tight — summarize, do
   not paste the raw transcript.
4. **Route (skip entirely in notes_only / on_demand).** Decide if the new content
   warrants a specialist and dispatch it as a subagent (Task tool, `subagent_type`
   below). Give the agent: the new transcript lines, the relevant slice of
   `meeting-notes.md`, and a crisp ask. Prefer one targeted dispatch per tick over
   many.
   | Trigger in the conversation | Dispatch |
   |---|---|
   | Unclear scope, requirements, user stories, "what do we need" | `pp-business-analyst` |
   | Data entities, tables, fields, relationships, schema | `pp-data-architect` |
   | Screens, forms, navigation, "what should it look like" | `pp-ui-designer` |
   | "Let's build / implement / add this" | `pp-app-builder` |
   | Acceptance criteria, "does it work", testing | `pp-qa-tester` |
   | Deploy, environments, solution, promotion | `pp-alm-engineer` |
   | Cross-cutting / unsure which / overall direction | `pp-orchestrator` (it routes) |
5. **Act on results by mode.**
   - **copilot** — post the agent's recommendation to the user concisely. If it
     implies a code edit, skill run, or MCP call, **describe the proposed action
     and ask for approval** before doing it.
   - **autopilot** — let the agent carry out the edit / skill / MCP call directly,
     then report what it did.
6. **Stay quiet when there's nothing useful.** Not every tick needs output. Avoid
   interrupting with low-value chatter during a live call.

## Context hygiene (long meetings)
Every ~10–15 minutes (or when the conversation grows large), fold older detail
into `meeting-notes.md` and rely on the cursor + notes rather than re-reading the
whole transcript. Use `get_full_transcript()` only when you genuinely need the
complete record (e.g. the wrap-up).

## Notes & guardrails
- The `meeting` MCP server is **pull-based** — you only see new dialogue when you
  call `get_transcript_since`. Real-time behavior comes from `/loop`; it runs only
  while this Claude Code session is open.
- Map speakers as the transcript already labels them: `Me` (the user) and
  `Speaker 1/2/3` (far-end, from Deepgram diarization). Don't invent names unless
  the conversation reveals them.
- In **copilot** keep a hand on the wheel: propose, don't apply. Reserve
  **autopilot** for low-stakes or explicitly authorized changes.
- Use `mcp__meeting__capture_screenshot()` when someone shares a slide/diagram
  worth capturing alongside the transcript.
- This skill reads the shared `.claude/project-profile.md` (written by
  `pp-orchestrator`) when present, so dispatched roles stay aligned to the stack.
