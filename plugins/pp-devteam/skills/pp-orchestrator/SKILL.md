---
name: pp-orchestrator
version: 1.0.0
description: Power Platform Project Orchestrator. Auto-detects the tech stack from existing project files, confirms with the user, writes .claude/project-profile.md, and routes work requests to the right specialized skill. Run this skill first on any new or existing Power Platform project. Trigger examples: "initialize this project", "set up the project profile", "what skill should I use for X", "detect the stack", "what kind of project is this", "orient yourself to this project".
author: Dennis Newcomb
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Bash, AskUserQuestion
---

# Power Platform Project Orchestrator

$ARGUMENTS

Your two jobs: (1) establish the project profile, (2) route work to the right skill.

## Step 1: Check for Existing Profile

Read `.claude/project-profile.md`.
- Exists and complete -> skip to Step 3 (Routing Mode)
- Exists but incomplete -> proceed to Step 2 to update it
- Does not exist -> proceed to Step 2

## Step 2: Detect and Confirm the Stack

### 2.1 Scan for Indicators

| Indicator | Inference |
|-----------|-----------|
| `**/*.pa.yaml` files | Frontend: Canvas App |
| `**/powerpages.config.json` | Frontend: Power Pages |
| `**/package.json` with pcftools / pcf-scripts / @microsoft/powerplatform | Frontend: Code App |
| `**/*.cdsproj` or `**/solution.xml` | Dataverse solution present |
| `**/*.sql` files or `CREATE TABLE` in any file | Data Backend: Azure SQL |
| `**/Workflows/*.json` or the project builds/debugs Power Automate flows | Automation: Power Automate cloud flows (route to Microsoft's official `power-automate` plugin) |
| `**/agent.mcs.yml` (Copilot Studio agent YAML) | Copilot Studio agent present (route agent work to the `copilot-studio` plugin; everything else keeps its usual route) |

Run `pac env who 2>&1` via Bash to check Dataverse authentication.

### 2.2 Confirm with User

Present findings and ask (single AskUserQuestion batch, max 4):
- Frontend type: Canvas App / Model-Driven App / Power Pages / Code App / Not yet decided
- Data backend: Dataverse / Azure SQL / SharePoint / Hybrid / Not yet decided
- Custom connectors needed: Yes (name them) / No / Not yet known
- Compliance or regulatory requirements: free text or "none"

Also collect: project name, one-sentence description, target users.

### 2.3 Write Project Profile

Write `.claude/project-profile.md` (create `.claude/` directory if needed):

```
# Project Profile
- **projectName**: <name>
- **description**: <1-2 sentences>
- **frontendType**: Canvas App | Model-Driven App | Power Pages | Code App (React/Vite)
- **dataBackend**: Dataverse | Azure SQL | SharePoint | Dataverse + Custom Connector | Azure SQL + Custom Connector
- **environmentUrl**: <https://org.crm.dynamics.com> or "N/A"
- **solutionName**: <name> or "N/A"
- **customConnectors**: <comma-separated> or "none"
- **automation**: <e.g. Power Automate cloud flows> or "none"
- **complianceNotes**: <e.g. California SB 1383> or "none"
- **targetUsers**: <roles/personas>
- **lastUpdated**: <YYYY-MM-DD>
```

## Step 3: Routing Mode

When the user describes a task, map it to the right skill:

| User intent | Skill |
|-------------|-------|
| gather requirements / document the process / write user stories | `/pp-business-analyst` |
| design the data model / create tables / set up Dataverse or SQL | `/pp-data-architect` |
| design the app / design screens / create mockups | `/pp-ui-designer` |
| build the app / implement / create the Canvas App | `/pp-app-builder` |
| test the app / validate / QA | `/pp-qa-tester` |
| deploy / set up the solution / create a pipeline | `/pp-alm-engineer` |
| build/create/scaffold a Power Automate cloud flow / automate | `power-automate:build-flow` / `power-automate:create-flow` (Microsoft **power-automate** plugin) |
| debug or diagnose a flow / why did my flow fail / inspect action outputs | `power-automate:debug-flow` / `power-automate:diagnose-flow` |
| list or browse flows / trigger, resubmit or cancel a run / enable or disable a flow | `power-automate:browse-flows` / `power-automate:manage-flows` |
| design, review or troubleshoot a **Copilot Studio agent** (topics, knowledge, instructions, "why does my agent...") | `copilot-studio` **Copilot Studio Advisor** sub-agent |
| build or change a Copilot Studio agent's YAML (topics, knowledge sources, instructions, actions) | `copilot-studio` **Copilot Studio Author** sub-agent |
| clone, pull, push or publish a Copilot Studio agent | `copilot-studio` **Copilot Studio Manage** sub-agent |
| test or evaluate a Copilot Studio agent / write its eval set | `copilot-studio` **Copilot Studio Test** sub-agent; `eval-guide` skills for planning |
| update the project profile / the stack changed | `/pp-orchestrator` (re-run) |

**Route by the artifact, not by keywords.** "Power Platform", "environment", "solution" and "Copilot" appear in
most requests. A repository that contains `agent.mcs.yml` files is still a canvas, Dataverse or flow project for
every request that is not about the agent. Only requests about a Copilot Studio agent go to the `copilot-studio`
sub-agents. Mixed requests get split: for example, a solution release goes to the ALM engineer, and publishing the
agent afterwards goes to Copilot Studio Manage.

## Critical Constraints
- Do NOT hardcode project-specific values. All context comes from user input or file detection.
- Do NOT perform data modeling, UI design, or app building. Route to the appropriate skill.
- Keep `.claude/project-profile.md` accurate at all times.
