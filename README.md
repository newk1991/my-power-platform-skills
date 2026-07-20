# my-power-platform-skills

Custom Claude Code plugins for Power Platform development.

## Install this marketplace

```bash
claude plugin marketplace add newk1991/my-power-platform-skills
```

## Available plugins

| Plugin | Description |
|--------|-------------|
| [canvas-creator-kit](plugins/canvas-creator-kit/) | Extends canvas-apps with Power Apps Creator Kit (Fluent UI) control knowledge |
| [pp-devteam](plugins/pp-devteam/) | A full AI development team — Orchestrator, Business Analyst, Data Architect, UI Designer, App Builder, QA Tester, and ALM Engineer — delivered as both skills and agents |

## Install a plugin

```bash
claude plugin install canvas-creator-kit@my-power-platform-skills
claude plugin install pp-devteam@my-power-platform-skills
```

## pp-devteam at a glance

Seven specialized roles take a Power Platform project from requirements through deployment.
Each role ships as both a user-invocable **skill** (`/pp-orchestrator`) and a Task-invocable
**agent**. Start with `/pp-orchestrator` to detect your stack and write the shared project
profile, then the rest of the team works from that profile and the artifacts in
`.claude/artifacts/`. Works across Canvas Apps, Power Pages, Model-Driven Apps, Code Apps,
Dataverse, and Azure SQL.

> pp-devteam delegates implementation to the Microsoft `power-platform-skills` and `dataverse`
> marketplace plugins, and to Microsoft's official **power-automate** plugin for Power Automate
> cloud flow build/debug/diagnose — so install those alongside it.
