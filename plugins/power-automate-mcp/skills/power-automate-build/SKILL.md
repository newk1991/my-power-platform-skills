---
name: power-automate-build
description: >-
  Build, scaffold, and deploy Power Automate cloud flows using the free, local
  Power Automate MCP server. Your agent constructs flow definitions, wires
  connections, deploys, and tests — all via MCP without opening the portal.
  Load this skill when asked to: create a flow, build a new flow,
  deploy a flow definition, scaffold a Power Automate workflow, construct a flow
  JSON, update an existing flow's actions, patch a flow definition, add actions
  to a flow, wire up connections, or generate a workflow definition from scratch.
---

# Build & Deploy Power Automate Flows with the Local MCP Server

Step-by-step guide for constructing and deploying Power Automate cloud flows
programmatically through the free, local Power Automate MCP server.

**Prerequisite**: The local MCP server must be built, signed in (`az login`),
and registered with your MCP client. See the `power-automate-mcp` skill for
setup. Its tools are **native MCP tools** — call them directly through your MCP
client's normal tool interface (no HTTP helper, no `x-api-key`, no JSON-RPC
envelope, no `tool_search` step).

Workflow:
1. Check for an existing flow.
2. Resolve connection references.
3. Build the definition.
4. Deploy.
5. Verify.
6. Test.

---

## Source of Truth

> Tools are listed natively by your MCP client. Inspect a tool's native schema
> there to confirm argument names and types before invoking it.
> This skill covers response shapes, behavioral notes, and build patterns —
> things tool schemas cannot tell you. If this document disagrees with a tool's
> native schema or a real API response, the API wins.

---

## Calling Tools

The server's tools are **native MCP tools**. Throughout this skill, a call
written as `tool_name(arg=value, ...)` means "invoke that native MCP tool with
these arguments" — a single tool call in your MCP client, not an HTTP request
you build yourself.

```text
ENV = "<environment-id>"   # e.g. Default-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

> **`error` field convention:** object-returning tools carry `error: null` on
> success; a non-null `error` means failure. Array-returning tools return a bare
> array. Check the `error` field — `null` = success.

---

## 1. Safety Check: Does the Flow Already Exist?

Always look before you build to avoid duplicates:

```text
results = list_live_flows(
    environmentName=ENV,
    mode="owner",
    search="My New Flow",
    top=20)

# list_live_flows returns { "flows": [...], "mode": "...", ... }
matches = [f for f in results["flows"]
           if "My New Flow".lower() in f["displayName"].lower()]

if matches:
    # Flow exists — modify rather than create
    FLOW_ID = matches[0]["id"]   # plain UUID from list_live_flows
    defn = get_live_flow(environmentName=ENV, flowName=FLOW_ID)
else:
    # Flow not found — building from scratch
    FLOW_ID = None
```

For very large environments, `list_live_flows` may return a continuation URL.
Pass it back as `continuationUrl` with the same `mode` to retrieve the next
batch. Use `mode="admin"` only when the user needs all environment flows and
the MCP identity has admin rights.

---

## 2. Obtain Connection References

Every connector action needs a `connectionName` that points to a key in the
flow's `connectionReferences` map. That key links to an authenticated connection
in the environment.

> **MANDATORY**: You MUST call `list_live_connections` first — do NOT ask the
> user for connection names or GUIDs. The API returns the exact values you need.
> Only prompt the user if the API confirms that required connections are missing.

### 2a — Find active connections

```text
conns = list_live_connections(environmentName=ENV)
active = [c for c in conns["connections"]
          if c["statuses"][0]["status"] == "Connected"]
conn_map = {c["connectorName"]: c["id"] for c in active}
```

For a known connector, pass `search` to reduce output and get paste-ready
`connectionReferenceTemplate` and `hostTemplate` values:

```text
sp_conns = list_live_connections(
    environmentName=ENV,
    search="shared_sharepointonline")
```

### 2b — Determine which connectors the flow needs

Common connector API names: SharePoint `shared_sharepointonline`, Outlook
`shared_office365`, Teams `shared_teams`, Approvals `shared_approvals`,
OneDrive `shared_onedriveforbusiness`, Excel `shared_excelonlinebusiness`,
Dataverse `shared_commondataserviceforapps`, Forms `shared_microsoftforms`.

Flows that need no connectors, such as Recurrence + Compose + HTTP only, can
omit `connectionReferences`.

### 2c — If connections are missing, guide the user

```text
connectors_needed = ["shared_sharepointonline", "shared_office365"]  # adjust per flow
missing = [c for c in connectors_needed if c not in conn_map]
if missing:
    # STOP: connections require browser OAuth consent.
    # Ask the user to create the missing connector connections in the
    # selected environment, then re-run list_live_connections.
    # Surface the missing list to the user — do not proceed.
```

### 2d — Build the connectionReferences block

```text
connection_references = {}
host_templates = {}
for connector in connectors_needed:
    c = next(c for c in active if c["connectorName"] == connector)
    connection_references[connector] = c.get("connectionReferenceTemplate") or {
        "connectionName": c["id"],   # the connection id from list_live_connections
        "source": "Invoker",
        "id": f"/providers/Microsoft.PowerApps/apis/{connector}"
    }
    host_templates[connector] = c.get("hostTemplate") or {
        "connectionName": connector
    }
```

In Step 3 action JSON, `inputs.host.connectionName` must be the map key such as
`shared_teams`, not the GUID. The GUID belongs only inside the
`connectionReferences[connector].connectionName` value. If an existing flow uses
the same connectors, you may also copy its `properties.connectionReferences`
from `get_live_flow`.

---

## 3. Build the Flow Definition

Construct the definition object. See [flow-schema.md](references/flow-schema.md)
for the full schema and these action pattern references for copy-paste templates:
- [action-patterns-core.md](references/action-patterns-core.md) — Variables, control flow, expressions
- [action-patterns-data.md](references/action-patterns-data.md) — Array transforms, HTTP, parsing
- [action-patterns-connectors.md](references/action-patterns-connectors.md) — SharePoint, Outlook, Teams, Approvals

```python
definition = {
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "contentVersion": "1.0.0.0",
    "triggers": { ... },   # see trigger-types.md / build-patterns.md
    "actions": { ... }     # see ACTION-PATTERNS-*.md / build-patterns.md
}
```

> See [build-patterns.md](references/build-patterns.md) for complete, ready-to-use
> flow definitions covering Recurrence+SharePoint+Teams, HTTP triggers, and more.

### Discover connector operations before guessing JSON

For connector-backed triggers/actions, prefer the live connector describer over
hand-written shapes. It can return authored hints, canonical examples, variant
keys, inputs/outputs, and dynamic metadata pointers.

```text
# Search across connectors when you know the user's intent but not the API.
matches = describe_live_connector(
    environmentName=ENV,
    search="send email",
    top=5)

# Describe a specific operation before copying an exampleDefinition.
op = describe_live_connector(
    environmentName=ENV,
    connectorName="shared_office365",
    operationId="SendEmailV2")
→ read op.get("hint")
```

When an operation has multiple authored variants, request the variant the flow
needs:

```text
teams_chat = describe_live_connector(
    environmentName=ENV,
    connectorName="shared_teams",
    operationId="PostMessageToConversation",
    variant="flowbot_chat")
```

When the operation description says a parameter has dynamic options or dynamic
properties, call the indicated next tool:

```text
sp_op = describe_live_connector(
    environmentName=ENV,
    connectorName="shared_sharepointonline",
    operationId="GetItems")

sites = get_live_dynamic_options(
    environmentName=ENV,
    connectorName="shared_sharepointonline",
    connectionName=conn_map["shared_sharepointonline"],
    operationId="GetItems",
    parameterName="dataset",
    dynamicMetadata=sp_op["dynamicParameters"]["dataset"])

fields = get_live_dynamic_properties(
    environmentName=ENV,
    connectorName="shared_sharepointonline",
    connectionName=conn_map["shared_sharepointonline"],
    operationId="GetItems",
    parameterName="item",
    parameters={"dataset": "<site-url>", "table": "<list-id>"},
    dynamicMetadata=sp_op["dynamicProperties"]["item"])
```

> `get_live_dynamic_options` and `get_live_dynamic_properties` are **stubs** in
> the free local server's v1. If they return no data, supply the dropdown IDs or
> field schema another way (e.g. read them from an existing flow via
> `get_live_flow`, or ask the user).

Use dynamic options for dropdown IDs such as SharePoint sites/lists and Teams
teams/channels. Use dynamic properties for schema/field shapes such as
SharePoint list item columns.

---

## 4. Deploy (Create or Update)

`update_live_flow` handles both creation and updates in a single tool.

### Create a new flow (no existing flow)

Omit `flowName` — the server generates a new GUID and creates via PUT:

```text
definition["description"] = "Weekly SharePoint → Teams notification flow, built by agent"

result = update_live_flow(
    environmentName=ENV,
    # flowName omitted → creates a new flow
    definition=definition,
    connectionReferences=connection_references,
    displayName="Overdue Invoice Notifications")

if result["error"] is not None:
    # Create failed — surface result["error"]
else:
    # Capture the new flow ID for subsequent steps
    FLOW_ID = result["created"]
    # Flow created
```

### Update an existing flow

Provide `flowName` to PATCH:

```text
definition["description"] = "Updated by agent on <timestamp>"

result = update_live_flow(
    environmentName=ENV,
    flowName=FLOW_ID,
    definition=definition,
    connectionReferences=connection_references,
    displayName="My Updated Flow")

if result["error"] is not None:
    # Update failed — surface result["error"]
else:
    # Update succeeded
```

> ⚠️ `update_live_flow` always returns an `error` field.
> Check the `error` field — `null` means success; do not treat the presence of
> the key as failure.
>
> ⚠️ Flow description lives at `definition["description"]`. Do not pass a
> top-level `description` argument unless the tool's native schema shows one.

### Common deployment errors

| Error message (contains) | Cause | Fix |
|---|---|---|
| `missing from connectionReferences` | An action's `host.connectionName` references a key that doesn't exist in the `connectionReferences` map | Ensure `host.connectionName` uses the **key** from `connectionReferences` (e.g. `shared_teams`), not the raw GUID |
| `ConnectionAuthorizationFailed` / 403 | The connection GUID belongs to another user or is not authorized | Re-run Step 2a and use a connection owned by the signed-in (`az login`) user |
| `InvalidTemplate` / `InvalidDefinition` | Syntax error in the definition JSON | Check `runAfter` chains, expression syntax, and action type spelling |
| `ConnectionNotConfigured` | A connector action exists but the connection GUID is invalid or expired | Re-check `list_live_connections` for a fresh GUID |

---

## 5. Verify the Deployment

```text
check = get_live_flow(environmentName=ENV, flowName=FLOW_ID)

# Confirm state
check["properties"]["state"]   # Should be "Started"
# If state is "Stopped", use set_live_flow_state — NOT update_live_flow
# set_live_flow_state(environmentName=ENV, flowName=FLOW_ID, state="Started")

# Confirm the action we added is there
acts = check["properties"]["definition"]["actions"]
list(acts.keys())
```

---

## 6. Test the Flow

> **MANDATORY**: Before triggering any test run, **ask the user for confirmation**.
> Running a flow has real side effects — it may send emails, post Teams messages,
> write to SharePoint, start approvals, or call external APIs. Explain what the
> flow will do and wait for explicit approval before calling `trigger_live_flow`
> or `resubmit_live_flow_run`.

### Updated flows (have prior runs) — ANY trigger type

> **Use `resubmit_live_flow_run` first.** It works for EVERY trigger type —
> Recurrence, SharePoint, connector webhooks, Button, and HTTP. It replays
> the original trigger payload. Do NOT ask the user to manually trigger the
> flow or wait for the next scheduled run.

```text
runs = get_live_flow_runs(environmentName=ENV, flowName=FLOW_ID, top=1)
if runs:
    # Works for Recurrence, SharePoint, connector triggers — not just HTTP
    result = resubmit_live_flow_run(
        environmentName=ENV, flowName=FLOW_ID, runName=runs[0]["name"])
    # result → {"resubmitted": true, "triggerName": "..."}
```

### HTTP-triggered flows — custom test payload

Only use `trigger_live_flow` when you need to send a **different** payload
than the original run. For verifying a fix, `resubmit_live_flow_run` is
better because it uses the exact data that caused the failure.

```text
defn = get_live_flow(environmentName=ENV, flowName=FLOW_ID)
triggers = defn["properties"]["definition"]["triggers"]
manual = next(iter(triggers.values()))
# Expected body: manual.get("inputs", {}).get("schema")

result = trigger_live_flow(
    environmentName=ENV, flowName=FLOW_ID,
    body={"name": "Test", "value": 1})
# result["responseStatus"]
```

### Brand-new non-HTTP flows (Recurrence, connector triggers, etc.)

A brand-new Recurrence or connector-triggered flow has **no prior runs** to
resubmit and no HTTP endpoint to call. This is the ONLY scenario where you
need the temporary HTTP trigger approach below. **Deploy with a temporary
HTTP trigger first, test the actions, then swap to the production trigger.**

Compact recipe:

```text
production_trigger = definition["triggers"]
definition["triggers"] = {
    "manual": {"type": "Request", "kind": "Http", "inputs": {"schema": {}}}
}

result = update_live_flow(
    environmentName=ENV,
    flowName=FLOW_ID,       # omit if creating new
    definition=definition,
    connectionReferences=connection_references,
    displayName="Overdue Invoice Notifications")
FLOW_ID = FLOW_ID or result["created"]

test = trigger_live_flow(environmentName=ENV, flowName=FLOW_ID,
                         body={"sample": "payload"})
runs = get_live_flow_runs(environmentName=ENV, flowName=FLOW_ID, top=1)

if runs[0]["status"] == "Failed":
    err = get_live_flow_run_error(
        environmentName=ENV, flowName=FLOW_ID, runName=runs[0]["name"])
    # STOP — inspect err["failedActions"][-1]

definition["triggers"] = production_trigger
update_live_flow(
    environmentName=ENV,
    flowName=FLOW_ID,
    definition=definition,
    connectionReferences=connection_references)
```

The trigger is only the entry point; testing through HTTP still exercises the
same actions. If actions use `triggerBody()` or `triggerOutputs()`, pass a
representative `trigger_live_flow.body` shaped like the production trigger
payload.

---

## Gotchas

| Mistake | Consequence | Prevention |
|---|---|---|
| Missing `connectionReferences` in deploy | 400 "Supply connectionReferences" | Always call `list_live_connections` first |
| `"operationOptions"` missing on Foreach | Parallel execution, race conditions on writes | Always add `"Sequential"` |
| `union(old_data, new_data)` | Old values override new (first-wins) | Use `union(new_data, old_data)` |
| `split()` on potentially-null string | `InvalidTemplate` crash | Wrap with `coalesce(field, '')` |
| Treating the `error` key's presence as failure | The key is always present; true error is a non-null value | Check the `error` field — `null` = success |
| Flow deployed but state is "Stopped" | Flow won't run on schedule | Call `set_live_flow_state` with `state: "Started"` — do **not** use `update_live_flow` for state changes |
| Teams "Chat with Flow bot" recipient as object | 400 `GraphUserDetailNotFound` | Use plain string with trailing semicolon (see below) |
| Copilot/Skills flow not in a solution | Copilot Studio may not discover it as an agent tool | After deploy, call `add_live_flow_to_solution` with the target `solutionId` |
| Button/Skills trigger used for MCP testing | MCP cannot directly fire the production trigger | Test the same actions through a temporary HTTP twin, then swap the trigger back |
| Connector action missing `metadata.operationMetadataId` | Designer/run-only UI can behave inconsistently | Preserve existing IDs; add stable GUIDs for new connector actions |
| Placeholder Excel `scriptId` | Dynamic validation fails at save time | Resolve the real Office Script ID before deploying |
| SharePoint `PatchItem` omits required fields | Save can fail even if the field is not changing | Echo unchanged required fields such as `item/Title` |
| Copilot Studio connector calls a draft agent | Connector invocation can fail or hit stale behavior | Publish the agent before testing/resubmitting the flow |

### Teams `PostMessageToConversation` — Recipient Formats

The `body/recipient` parameter format depends on the `location` value:

| Location | `body/recipient` format | Example |
|---|---|---|
| **Chat with Flow bot** | Plain email string with **trailing semicolon** | `"user@contoso.com;"` |
| **Channel** | Object with `groupId` and `channelId` | `{"groupId": "...", "channelId": "..."}` |

> **Common mistake**: passing `{"to": "user@contoso.com"}` for "Chat with Flow bot"
> returns a 400 `GraphUserDetailNotFound` error. The API expects a plain string.

---

## Reference Files

- [flow-schema.md](references/flow-schema.md) — Full flow definition JSON schema
- [trigger-types.md](references/trigger-types.md) — Trigger type templates
- [action-patterns-core.md](references/action-patterns-core.md) — Variables, control flow, expressions
- [action-patterns-data.md](references/action-patterns-data.md) — Array transforms, HTTP, parsing
- [action-patterns-connectors.md](references/action-patterns-connectors.md) — SharePoint, Outlook, Teams, Approvals
- [build-patterns.md](references/build-patterns.md) — Complete flow definition templates (Recurrence+SP+Teams, HTTP trigger)

## Related Skills

- `power-automate-mcp` — Core connection setup and tool reference
- `power-automate-debug` — Debug failing flows after deployment
