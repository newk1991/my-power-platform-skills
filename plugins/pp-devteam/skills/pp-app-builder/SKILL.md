---
name: pp-app-builder
version: 1.0.0
description: Power Platform App Builder. Implements the full application by invoking the right skill stack for the project type. Reads the UI design spec and data model, then builds Canvas Apps via canvas-apps:canvas-app, Power Pages sites via power-pages skills, Model-Driven generative pages via model-apps:genpage, or Code Apps via code-apps-preview skills. Connects data sources and handles multi-screen/multi-page implementations. Trigger examples: "build the app", "implement the Canvas App", "create the screens", "build the Power Pages site", "implement the data entry form", "add the history screen", "connect the data source", "implement the UI spec", "start building".
author: Dennis Newcomb
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, TaskCreate, TaskUpdate, Skill
---

# Power Platform App Builder

$ARGUMENTS

You implement Power Platform applications by invoking the right skill stack for the project type.

## Step 1: Read Context

1. `.claude/project-profile.md` — frontendType and dataBackend. Missing -> run `/pp-orchestrator`.
2. `.claude/artifacts/ui-design-spec.md` — controls, data bindings, conditional logic
3. `.claude/artifacts/data-model.md` — tables, columns, implementation notes
4. `.claude/artifacts/requirements.md` — business rules reference

Route to the build workflow matching frontendType.

## Step 2: Canvas App Build Workflow

1. If Canvas Authoring MCP not connected: invoke `canvas-apps:configure-canvas-mcp`.
2. Invoke `canvas-apps:add-data-source` to connect the backend. Reference implementation notes in data-model.md.
3. Invoke `canvas-apps:canvas-app` passing the FULL contents of ui-design-spec.md as requirements. Include screen inventory, per-screen control definitions and bindings, conditional logic, navigation, validation rules, and style direction.

Key patterns:
- Multi-row entry: local Collection -> ForAll submit on button press
- CreatedBy: auto-populate from User().Email in Submit OnSelect
- Conditional dropdowns: Filter(category2, category1_id = CategoryDropdown.Selected.id)
- Delegation: use Filter/Search with supported columns on large tables

## Step 3: Power Pages Build Workflow

1. New sites: invoke `power-pages:create-site`
2. Invoke `power-pages:setup-datamodel` to wire Dataverse tables
3. Invoke `power-pages:integrate-webapi` for data access
4. Auth required: invoke `power-pages:setup-auth`
5. Invoke `power-pages:deploy-site`

## Step 4: Model-Driven App Build Workflow

Invoke `model-apps:genpage` for each page in ui-design-spec.md, passing target Dataverse
table, view/form spec, and layout notes.

## Step 5: Code App Build Workflow

1. New apps: invoke `code-apps-preview:create-code-app`
2. Data sources: `code-apps-preview:add-dataverse` / `code-apps-preview:add-sharepoint` / `code-apps-preview:add-datasource`
3. Invoke `code-apps-preview:deploy`

## Step 6: Custom Connector Note

If project profile lists custom connectors: "Custom connector implementation requires a
Postman-based connector skill not yet available. Manual setup in Power Platform is needed."

## Step 7: Summary

State what was built, file locations, any manual steps (e.g., publish in Power Apps Studio),
and recommend `/pp-qa-tester` to validate and `/pp-alm-engineer` for deployment.

## Critical Constraints
- Always read ui-design-spec.md first. Implement what was designed.
- Pass the FULL ui-design-spec.md content to canvas-apps:canvas-app.
- Do NOT design UI and do NOT create data model objects.
- Note custom connector gaps explicitly.
