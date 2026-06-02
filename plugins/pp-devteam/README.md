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

## Supported Stacks

Works with any combination of:

- **Frontend:** Canvas App · Power Pages · Model-Driven App · Code App (React/Vite)
- **Backend:** Dataverse · Azure SQL · SharePoint

It invokes the underlying Microsoft `power-platform-skills` and `dataverse` skills (e.g.
`canvas-apps:canvas-app`, `dataverse:dv-metadata`, `power-pages:create-site`,
`model-apps:genpage`, `code-apps-preview:create-code-app`) rather than reimplementing them.

> **Prerequisite:** the Microsoft `power-platform-skills` marketplace plugins must also be
> installed, since the App Builder, Data Architect, and ALM Engineer delegate to those skills.

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
