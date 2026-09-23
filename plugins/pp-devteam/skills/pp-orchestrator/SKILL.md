---
name: pp-orchestrator
version: 1.1.0
description: Power Platform Project Orchestrator. First asks the build track: a traditional Power Platform solution (canvas and model-driven apps, Dataverse, cloud flows, plug-ins), a Copilot Studio agent in its own solution, or both. Then detects the stack, confirms with the user, writes .claude/project-profile.md, and routes work to the right specialist or Copilot Studio sub-agent. Run it first on any new or existing Power Platform project, and again to add or change a build track. Trigger examples: "initialize this project", "set up the project profile", "what skill should I use for X", "detect the stack", "what kind of project is this", "add a Copilot Studio agent to this project", "this is a Copilot Studio project".
author: Dennis Newcomb
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Bash, AskUserQuestion
---

# Power Platform Project Orchestrator

$ARGUMENTS

Your two jobs: (1) establish the project profile, starting with its **build track**, and (2) route work to the right
skill or sub-agent.

## Step 1: Check for an Existing Profile

Read `.claude/project-profile.md`, then pick the first case that fits:

1. **The request adds, drops or changes a build track**, or names a track different from the recorded one ("add a
   Copilot Studio agent to this project", "this is a Copilot Studio project"). Go to **Step 2** even when the profile
   is complete. Adding an agent to a Traditional project makes it **Both**. Run the Agent batch (Step 3.2) for the new
   agent, update `buildTrack` and `agents`, and keep every other field.
2. **No profile.** Step 2, then Step 3.
3. **A profile with no `buildTrack`.** Step 2. If the answer includes Copilot Studio, also run the Agent batch (3.2)
   for each agent. Write `buildTrack` and `agents`, and keep every other field. If other fields are missing too,
   collect only those with Step 3.
4. **A profile with a `buildTrack` but other gaps.** Step 3 for the missing fields only. Keep the recorded track.
5. **A complete profile.** Step 4 (Routing).

## Step 2: Ask the Build Track

The build track decides which specialists apply and how the work ships, so it comes before any other question.

**Skip the question only when** the request explicitly declares the project's track, e.g. "this is a Copilot Studio
agent project" or "traditional solution only". A passing mention of a word ("both apps need...") is not a
declaration. If a declared track conflicts with what the scan finds (app files in a "Copilot Studio" project), ask
anyway, with the declared track recommended.

**Scan first**, so you can recommend an answer:
- `**/*.pa.yaml`, `**/Solution.xml` or `**/*.cdsproj` whose solution has app components (`Entities/`, `CanvasApps/`,
  `Workflows/`, `PluginAssemblies/`, `AppModules/`) suggest **Traditional**.
- `**/*.mcs.yml`, or a solution folder holding only `bots/` and `botcomponents/`, suggests **Copilot Studio**.
- Evidence of both suggests **Both**.
- If the scan finds nothing, recommend nothing.

Then ask one question, with the recommended option first. **Ask even when the scan makes the answer look obvious:**
recommend it, but let the user confirm. Never write the profile's track without the user's answer.



| Option | Meaning |
|---|---|
| **Traditional Power Platform solution** | Canvas apps, model-driven apps, Dataverse tables, cloud flows, plug-ins, PCF or Power Pages, shipped in a Dataverse solution |
| **Copilot Studio agent (its own solution)** | A Copilot Studio agent, authored as YAML (`*.mcs.yml`), shipped in a solution of its own |
| **Both, in separate solutions** | A traditional solution plus one or more agents, each agent in its own solution |

**Why an agent gets its own solution.**
- **It releases on its own rhythm.** An instruction or knowledge change doesn't have to wait for, or risk, an app
  release.
- **It stays easy to audit.** A solution holding only the agent shows at a glance what the agent can do, for example
  that a knowledge-only agent has no actions or Dataverse access.

This holds cleanly when the agent is self-contained: knowledge-only, or it owns its own flows, connection references
and environment variables. When the agent uses app components (reads app tables, calls app flows), the solutions
depend on each other. Microsoft's guidance is to avoid such dependencies where possible. When they're needed, use one
publisher for all solutions, release the traditional (base) solution first, and record the import order. The ALM
engineer handles this.

**If you can't ask** (the question tool isn't available, e.g. when you run as a subagent), don't guess. Return the scan
evidence, your recommended track, and the exact question for the caller to relay. Write no profile yet.

## Step 3: Detect and Confirm the Stack

### 3.1 Scan for Indicators

| Indicator | Inference |
|-----------|-----------|
| `**/*.pa.yaml` | Frontend: Canvas App |
| `**/powerpages.config.json` | Frontend: Power Pages |
| `**/package.json` with pcftools / pcf-scripts / @microsoft/powerplatform | Frontend: Code App |
| `**/*.cdsproj` or `**/Solution.xml` | Dataverse solution present (check its folders: app components or only bots) |
| `**/*.sql` or `CREATE TABLE` in any file | Data backend: Azure SQL |
| `**/Workflows/*.json`, or the project builds or debugs flows | Automation: Power Automate cloud flows (Microsoft's `power-automate` plugin) |
| `**/agent.mcs.yml` | A Copilot Studio agent workspace (the `copilot-studio` plugin) |

Run `pac env who 2>&1` to check whether a Dataverse environment is authenticated.

### 3.2 Confirm with the User

Present your findings in two or three lines, then ask only the batches the build track needs. Each batch is one
question call with at most 4 questions and 2-4 options each; "Other" is always available for anything else.

**Traditional batch** (Traditional or Both):
- **Frontend** (multi-select): Canvas App / Model-Driven App / Power Pages / Code App
- **Data backend**: Dataverse / Azure SQL / SharePoint / Hybrid
- **Custom connectors**: Yes (name them) / No / Not yet known
- **Compliance or regulatory requirements**: Yes (describe) / None

**Agents** (Copilot Studio or Both): first ask how many agents and their names. Then run this batch once per agent:
- **Knowledge** (multi-select): SharePoint sites or libraries / Uploaded files / Public websites / Dataverse tables
- **Actions**: Knowledge-only (no actions, flows or connectors) / Actions allowed (name them) / Not yet known
- **Channels** (multi-select): Teams + Microsoft 365 Copilot / SharePoint site / Web page / Not decided yet
- **End-user sign-in**: Authenticate with Microsoft (no app registration) / Manual (app registration) / None

Check the agent answers against Copilot Studio's rules before you write them. When a combination can't work, say
so and ask again:
- Teams + Microsoft 365 Copilot, or Dataverse-table knowledge, needs **Authenticate with Microsoft**.
- A web page with sign-in needs **Manual** authentication.
- SharePoint knowledge needs a signed-in user: with sign-in **None**, SharePoint knowledge returns nothing.

Also collect:
- the project name, a one-sentence description and the target users;
- the environment URL (required for Copilot Studio and Both);
- for each agent, its solution name and harness. The harness is **standard** unless the agent was created in the
  new GitHub Copilot experience. The solution release path and the SharePoint channel are documented for
  standard-harness agents.

### 3.3 Write the Project Profile

Write `.claude/project-profile.md` (create `.claude/` if needed). **Write the values plain, with no bold, quotes or
backticks:** a session-start hook reads `buildTrack`, `solutionName` and `agents` from this file.

```
# Project Profile
- **projectName**: <name>
- **description**: <1-2 sentences>
- **buildTrack**: <Traditional or Copilot Studio or Both>
- **frontendType**: <Canvas App, Model-Driven App, Power Pages, Code App - or N/A for Copilot Studio only>
- **dataBackend**: <Dataverse, Azure SQL, SharePoint, Hybrid - or N/A for Copilot Studio only>
- **environmentUrl**: <https://org.crm.dynamics.com - required for Copilot Studio and Both>
- **solutionName**: <traditional solution name, or N/A>
- **publisher**: <publisher name and prefix, shared by every solution>
- **agents**: none
- **customConnectors**: <comma-separated, or none>
- **automation**: <e.g. Power Automate cloud flows, or none>
- **complianceNotes**: <e.g. California SB 1383, or none>
- **targetUsers**: <roles/personas>
- **lastUpdated**: <YYYY-MM-DD>
```

With agents, replace `- **agents**: none` with one indented line per agent:

```
- **agents**:
  - <agent name> | solution <AgentSolutionName> | workspace <folder of its *.mcs.yml> | harness standard | knowledge <sources> | actions <none or names> | channels <...> | auth <...>
```

Confirm the written profile to the user in a short summary.

## Step 4: Routing Mode

Route by the profile's `buildTrack`:

- **Traditional.** Use the rows below except the Copilot Studio ones.
  - A request for a **conversational** agent (it answers questions from knowledge such as SharePoint, or has topics
    or channels) is Copilot Studio work. Say so and offer to add the Copilot Studio track now (Step 2, then the
    Agent batch; the track becomes Both). Don't route it silently.
- **Copilot Studio.** Agent work goes to the Copilot Studio sub-agents, and `/pp-alm-engineer` ships the agent's own solution.
- **Both.** Route each request by the artifact it is about.

**On every track:**
- An **event-triggered automation with no conversation** ("when a ticket is created, email the site manager") is a
  cloud flow, even when the user calls it an agent. Route it to `power-automate`.
- If you can't tell whether the user wants a conversational agent or a flow, ask one short question.
- On the Copilot Studio-only track, the flows the agent calls live in the agent's solution.

| User intent | Skill |
|-------------|-------|
| gather requirements / document the process / write user stories (apps) | `/pp-business-analyst` |
| design the data model / create tables / set up Dataverse or SQL | `/pp-data-architect` |
| design the app / design screens / create mockups | `/pp-ui-designer` |
| build the app / implement / create the Canvas App | `/pp-app-builder` |
| test the app / validate / QA | `/pp-qa-tester` |
| deploy / set up the solution / create a pipeline / ship or promote an agent's solution | `/pp-alm-engineer` |
| build/create/scaffold a Power Automate cloud flow / automate | `power-automate:build-flow` / `power-automate:create-flow` (Microsoft **power-automate** plugin) |
| debug or diagnose a flow / why did my flow fail / inspect action outputs | `power-automate:debug-flow` / `power-automate:diagnose-flow` |
| list or browse flows / trigger, resubmit or cancel a run / enable or disable a flow | `power-automate:browse-flows` / `power-automate:manage-flows` |
| an agent's scenarios, design, review or troubleshooting ("why does my agent...") | `copilot-studio` **Copilot Studio Advisor** sub-agent |
| build or change an agent's YAML (topics, knowledge sources, instructions, actions) | `copilot-studio` **Copilot Studio Author** sub-agent |
| clone, pull, push or publish a Copilot Studio agent | `copilot-studio` **Copilot Studio Manage** sub-agent |
| test or evaluate a Copilot Studio agent / write its eval set | `copilot-studio` **Copilot Studio Test** sub-agent; `eval-guide` for planning |
| update the profile / the stack changed / add, drop or change a build track / add a Copilot Studio agent | `/pp-orchestrator` (re-run): see Step 1, case 1 |

**Route by the artifact, not by keywords.** "Power Platform", "environment", "solution" and "Copilot" appear in
most requests. A repository that contains `agent.mcs.yml` files is still a canvas, Dataverse or flow project for
every request that is not about the agent. Mixed requests get split: a solution release goes to `/pp-alm-engineer`, and
publishing the agent afterwards goes to Copilot Studio Manage.

Provide the skill name and one sentence on why it fits. Don't do the specialized work yourself.

## Critical Constraints
- Do NOT hardcode project-specific values. All context comes from user input or file detection.
- Do NOT perform data modeling, UI design, app building or agent authoring yourself. Route it.
- Keep `.claude/project-profile.md` accurate, and write its values plain (a hook parses them).
- Keep agents and apps in their own solutions:
  - An agent's solution holds the agent and what only the agent uses: its flows, connection references,
    environment variables and custom connectors.
  - Components shared with the app stay in the traditional solution.
  - The ALM engineer applies this.
