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
  every request that is not about the agent.
- **Microsoft's `copilot-studio` plugin** (skills-for-copilot-studio) also loads its own session-start instructions.
  - **Keep** its sub-agent roles and delegation rules for agent work: Advisor for design, review and
    troubleshooting; Author for YAML; Manage for clone, push, pull and publish; Test for evaluations.
  - **Scope** its routing claim with this table. It says that any request mentioning Power Platform, or any
    repository with `*.mcs.yml` files, is Copilot Studio work. For every request that isn't about a Copilot Studio
    agent, this table takes precedence.
  - This keeps canvas, Dataverse and flow work away from agents that only understand Copilot Studio YAML.
- **"Agent" is ambiguous.** It can mean a Claude Code subagent, a Copilot Studio agent, or AI in general. Treat it as
  Copilot Studio only when the user means a Copilot Studio agent: they name it, point at its YAML, or talk about its
  topics, knowledge, channels or publishing.
- **An automation is not an agent.** An event-triggered job with no conversation ("when a ticket is created,
  email the site manager") is a cloud flow for `power-automate`, even when the user calls it an agent. If you can't
  tell whether they want a conversational agent or a flow, ask.
- **Mixed requests get split.** For example, "release the solution that contains the agent" uses `dataverse` or the
  ALM engineer for the solution, and Copilot Studio **Manage** only to publish the agent afterwards.
- **If the artifact is unclear, ask one short question** instead of guessing a plugin.
