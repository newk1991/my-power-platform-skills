# AGENTS.md — pp-devteam Plugin

This file provides guidance to AI agents when working with the **pp-devteam** plugin.

## What This Plugin Is

A full AI development team for Power Platform projects. The same seven roles are provided in
two complementary forms:

- **Skills** (`skills/<name>/SKILL.md`) — user-invocable via slash commands (`/pp-orchestrator`)
- **Agents** (`agents/<name>.md`) — Task-invocable subagents for orchestrated / parallel work

Both forms read a shared **project profile** (`.claude/project-profile.md`) that the Orchestrator
writes on first run, so every team member always knows the stack. Nothing is hardcoded to a
specific project — all context flows through the profile and the `.claude/artifacts/` files.

## Architecture

```
.claude-plugin/plugin.json      <- Plugin metadata
AGENTS.md                       <- Plugin guidance for AI agents (this file)
CLAUDE.md                       <- Points to AGENTS.md
README.md                       <- Human-facing overview
agents/
  pp-orchestrator.md            <- Subagent personas (Task-invocable)
  pp-business-analyst.md
  pp-data-architect.md
  pp-ui-designer.md
  pp-app-builder.md
  pp-qa-tester.md
  pp-alm-engineer.md
skills/
  pp-orchestrator/SKILL.md      <- Slash-command skills (user-invocable)
  pp-business-analyst/SKILL.md
  pp-data-architect/SKILL.md
  pp-ui-designer/SKILL.md
  pp-app-builder/SKILL.md
  pp-qa-tester/SKILL.md
  pp-alm-engineer/SKILL.md
  pp-live-meeting/SKILL.md      <- Facilitation skill (skill-only; drives the roles live)
```

## When to Use Skills vs. Agents

- **Skills** — direct, interactive use. The user types `/pp-business-analyst` and the skill runs
  in the main conversation (asks questions, writes artifacts).
- **Agents** — delegated or parallel use. An orchestrating skill or the main agent invokes a
  subagent via the Task tool when work should run in its own context (e.g. Data Architect and
  UI Designer in parallel after the BA finishes).

Both forms implement the same role and read/write the same project profile and artifacts.

## Roles

| Role | Skill | Agent | Invoke when... |
|------|-------|-------|----------------|
| Orchestrator | `/pp-orchestrator` | `pp-orchestrator` | Starting any project — detect stack, write profile, route work |
| Business Analyst | `/pp-business-analyst` | `pp-business-analyst` | Gathering requirements, user stories, process flows |
| Data Architect | `/pp-data-architect` | `pp-data-architect` | Designing/building the data model |
| UI Designer | `/pp-ui-designer` | `pp-ui-designer` | Designing screens, pages, layouts, specs |
| App Builder | `/pp-app-builder` | `pp-app-builder` | Implementing the application |
| QA Tester | `/pp-qa-tester` | `pp-qa-tester` | Validating against requirements |
| ALM Engineer | `/pp-alm-engineer` | `pp-alm-engineer` | Packaging, pipelines, deployment |

## Live meeting facilitation

`pp-live-meeting` (skill-only — no agent) drives the seven roles **live** from a real-time
meeting transcript. It polls the `meeting` MCP server (tools `mcp__meeting__*`, provided by the
companion **ai-meeting-tool** project) and dispatches the role agents as the conversation
unfolds. Modes: copilot (propose), autopilot (apply), on_demand, notes_only.

## Shared Project Profile

All roles read `.claude/project-profile.md` (written by the Orchestrator):
- frontendType, dataBackend, environmentUrl, solutionName
- customConnectors, complianceNotes, targetUsers, projectName, description

## Artifact Outputs (all in `.claude/artifacts/`)

| Artifact | Produced by |
|----------|------------|
| requirements.md | Business Analyst |
| user-stories.md | Business Analyst |
| process-flows.md | Business Analyst |
| data-entity-map.md | Business Analyst |
| ui-brief.md | Business Analyst |
| data-model.md | Data Architect |
| ui-design-spec.md | UI Designer |
| test-results.md | QA Tester |
| alm-plan.md | ALM Engineer |

## Dependency

Delegates implementation to the Microsoft `power-platform-skills` and `dataverse` skills
(e.g. `canvas-apps:canvas-app`, `dataverse:dv-metadata`, `power-pages:create-site`,
`model-apps:genpage`, `code-apps-preview:create-code-app`). Those marketplace plugins must be
installed for the App Builder, Data Architect, and ALM Engineer to function fully.

## Out of Scope
- Custom connectors (future Postman-based skill)
- Power BI (separate workstream)
