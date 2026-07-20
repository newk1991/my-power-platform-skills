# pp-devteam

A full AI development team for **Power Platform** projects, delivered as a Claude Code plugin.

Seven specialized roles take a project from raw requirements through data modeling, UI design,
implementation, testing, and deployment. Each role ships in **two forms**:

- **Skills** — user-invocable via slash commands (e.g. `/pp-orchestrator`)
- **Agents** — Task-invocable subagents with the same role, for orchestrated/parallel work

Everything is **project-agnostic**: all project context flows through a shared
`.claude/project-profile.md` that the Orchestrator writes on first run. Copy the plugin to any
Power Platform project and start with the Orchestrator.

## The Team

| Role | Skill | Agent | Responsibility |
|------|-------|-------|----------------|
| Orchestrator | `/pp-orchestrator` | `pp-orchestrator` | Detect the stack, write the project profile, route work |
| Business Analyst | `/pp-business-analyst` | `pp-business-analyst` | Requirements, user stories, process flows, entity map, UI brief |
| Data Architect | `/pp-data-architect` | `pp-data-architect` | Data model — Dataverse, Azure SQL, or SharePoint |
| UI Designer | `/pp-ui-designer` | `pp-ui-designer` | Screens, mockups, `ui-design-spec.md` |
| App Builder | `/pp-app-builder` | `pp-app-builder` | Implementation — routes to the right skill stack |
| QA Tester | `/pp-qa-tester` | `pp-qa-tester` | Validate against user stories, PASS/FAIL/BLOCKED report |
| ALM Engineer | `/pp-alm-engineer` | `pp-alm-engineer` | Solutions, pipelines, dev → test → prod promotion |

## Live meeting facilitation

`/pp-live-meeting` turns the team into a **real-time meeting copilot**: it streams a live,
speaker-labeled transcript into Claude Code and routes what's said to the right role as the
conversation happens — taking notes, surfacing recommendations, and (optionally) editing code.
Pick a mode per meeting: `copilot` (propose), `autopilot` (apply), `on_demand` (act when asked),
or `notes_only`.

```
/pp-live-meeting start copilot     # begin capture
/loop 60s /pp-live-meeting         # hands-off: poll + act every 60s
/pp-live-meeting stop              # end + wrap-up notes
```

> **Prerequisite:** the `meeting` MCP server (from the companion **ai-meeting-tool** project)
> must be connected and `DEEPGRAM_API_KEY` set — it provides the real-time speech-to-text.
> Reasoning runs in Claude Code on your subscription (no Anthropic API key).

## Supported Stacks

Works with any combination of:

- **Frontend:** Canvas App · Power Pages · Model-Driven App · Code App (React/Vite)
- **Backend:** Dataverse · Azure SQL · SharePoint
- **Automation:** Power Automate cloud flows — via Microsoft's official **power-automate** plugin

It invokes the underlying Microsoft `power-platform-skills` and `dataverse` skills (e.g.
`canvas-apps:canvas-app`, `dataverse:dv-metadata`, `power-pages:create-site`,
`model-apps:genpage`, `code-apps-preview:create-code-app`) rather than reimplementing them. For
Power Automate cloud flows it routes to Microsoft's official **power-automate** plugin
(`power-automate:build-flow`, `power-automate:create-flow`, `power-automate:debug-flow`,
`power-automate:diagnose-flow`, `power-automate:manage-flows`, `power-automate:browse-flows`).

> **Prerequisite:** the Microsoft `power-platform-skills` marketplace plugins must also be
> installed, since the App Builder, Data Architect, and ALM Engineer delegate to those skills.
> For Power Automate flow work, also install Microsoft's official **power-automate** plugin and
> run `power-automate:setup` once — the Orchestrator routes flow build/debug/diagnose to its skills.

## Typical Workflow

```
/pp-orchestrator       -> detect stack, write project-profile.md
/pp-business-analyst   -> interview, write 5 artifact files
/pp-data-architect  ]  (run in parallel after the BA finishes)
/pp-ui-designer     ]
/pp-app-builder        -> implement from spec + data model
/pp-qa-tester          -> validate against user stories
/pp-alm-engineer       -> package + deploy
```

## Artifacts (written to `.claude/artifacts/`)

`requirements.md` · `user-stories.md` · `process-flows.md` · `data-entity-map.md` ·
`ui-brief.md` (Business Analyst) · `data-model.md` (Data Architect) ·
`ui-design-spec.md` (UI Designer) · `test-results.md` (QA Tester) · `alm-plan.md` (ALM Engineer)

## Out of Scope

- **Custom connectors** — flagged as a future Postman-based skill
- **Power BI** — separate workstream
