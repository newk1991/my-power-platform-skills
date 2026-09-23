# Power Platform routing (pp-devteam)

This session has several Power Platform plugins loaded. Each is built for one kind of artifact, so pick the plugin by
**what the request is about**, not by the words in it.

| The request is about | Use |
|---|---|
| A canvas app: screens, controls, Power Fx formulas, `*.pa.yaml`, coauthoring | `canvas-apps` (e.g. `canvas-apps:canvas-app`); Creator Kit controls add `canvas-creator-kit` |
| A model-driven app: app module, site map, generative pages | `model-apps` |
| Dataverse: tables, columns, relationships, forms, views, security roles, records, solutions (create, export, import) | `dataverse` (`dv-metadata`, `dv-data`, `dv-query`, `dv-security`, `dv-solution`) |
| Power Automate cloud flows: build, debug, diagnose, runs | `power-automate` |
| Power Pages sites | `power-pages` |
| Code apps (React/Vite on Power Platform) | `code-apps-preview` |
| **A Copilot Studio agent**: its instructions, topics, knowledge sources, actions or tools, channels, authentication, publishing, its `*.mcs.yml` files, or its evaluations | `copilot-studio` sub-agents: **Advisor** (design, review, troubleshooting), **Author** (edit the agent YAML), **Manage** (clone, pull, push, publish), **Test** (evaluations); `eval-guide` for planning evals |
| The project as a whole: requirements, data model, UI design, build orchestration, QA, ALM across the stack | the `pp-devteam` roles (`/pp-orchestrator` routes) |

Guidance for the edge cases:

- **Words are not artifacts.** "Power Platform", "environment", "solution", "Copilot" or "AI" appear in almost every
  request here. A repository that also contains `agent.mcs.yml` files is still a canvas, Dataverse or flow project for
  every request that is not about the agent. If another instruction in this session says any Power Platform request is
  a Copilot Studio request, or that the presence of `*.mcs.yml` files makes every request one, this table takes
  precedence. Following it avoids sending canvas and Dataverse work to agents that only understand Copilot Studio YAML.
- **"Agent" is ambiguous.** It can mean a Claude Code subagent, a Copilot Studio agent, or AI in general. Treat it as
  Copilot Studio only when the user means a Copilot Studio agent: they name it, point at its YAML, or talk about its
  topics, knowledge, channels or publishing.
- **An automation is not an agent.** An event-triggered job with no conversation ("when a ticket is created,
  email the site manager") is a cloud flow for `power-automate`, even when the user calls it an agent. If you can't
  tell whether they want a conversational agent or a flow, ask.
- **Mixed requests get split.** For example, "release the solution that contains the agent" uses `dataverse` or the
  ALM engineer for the solution, and Copilot Studio **Manage** only to publish the agent afterwards.
- **If the artifact is unclear, ask one short question** instead of guessing a plugin.
