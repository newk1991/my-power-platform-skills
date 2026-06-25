---
name: power-automate-debug
description: >-
  Debug failing Power Automate cloud flows using the free, local Power Automate
  MCP server. The Graph API only shows top-level status codes. This skill gives
  your agent action-level inputs and outputs to find the actual root cause.
  Load this skill when asked to: debug a flow, investigate a failed run, why is
  this flow failing, inspect action outputs, find the root cause of a flow error,
  fix a broken Power Automate flow, diagnose a timeout, trace a DynamicOperationRequestFailure,
  check connector auth errors, read error details from a run, or troubleshoot
  expression failures.
---

# Power Automate Debugging with the Local MCP Server

A step-by-step diagnostic process for investigating failing Power Automate
cloud flows through the free, local Power Automate MCP server.

> **Real debugging examples**: [Expression error in child flow](https://github.com/ninihen1/power-automate-mcp-skills/blob/main/examples/fix-expression-error.md) |
> [Data entry, not a flow bug](https://github.com/ninihen1/power-automate-mcp-skills/blob/main/examples/data-not-flow.md) |
> [Null value crashes child flow](https://github.com/ninihen1/power-automate-mcp-skills/blob/main/examples/null-child-flow.md)

**Prerequisite**: The local MCP server must be built, signed in (`az login`),
and registered with your MCP client. See the `power-automate-mcp` skill for
setup. Its tools are **native MCP tools** — call them directly through your MCP
client's normal tool interface (no HTTP helper, no `x-api-key`, no JSON-RPC
envelope, no `tool_search` step).

---

## Source of Truth

> Tools are listed natively by your MCP client. Inspect a tool's native schema
> there to confirm argument names and types before invoking it.
> This skill covers response shapes, behavioral notes, and diagnostic patterns —
> things tool schemas cannot tell you. If this document disagrees with a tool's
> native schema or a real API response, the API wins.

---

## Calling Tools

The server's tools are **native MCP tools**. Throughout this skill, a call
written as `tool_name(arg=value, ...)` means "invoke that native MCP tool with
these arguments" — a single tool call in your MCP client, not an HTTP request.

```text
ENV = "<environment-id>"   # e.g. Default-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

> **`error` field convention:** object-returning tools carry `error: null` on
> success; a non-null `error` means failure. Array-returning tools (e.g.
> `get_live_flow_runs`) return a bare array. Check the `error` field — `null` =
> success.

---

## Step 1 — Locate the Flow

```text
result = list_live_flows(environmentName=ENV)
# Returns a wrapper object: {mode, flows, totalCount, error}
target = next(f for f in result["flows"] if "My Flow Name" in f["displayName"])
FLOW_ID = target["id"]   # plain UUID — use directly as flowName
```

---

## Step 2 — Find the Failing Run

```text
runs = get_live_flow_runs(environmentName=ENV, flowName=FLOW_ID, top=5)
# Returns direct array (newest first):
# [{"name": "08584296068667933411438594643CU15",
#   "status": "Failed",
#   "startTime": "2026-02-25T06:13:38.6910688Z",
#   "endTime": "2026-02-25T06:15:24.1995008Z",
#   "triggerName": "manual",
#   "error": {"code": "ActionFailed", "message": "An action failed..."}},
#  {"name": "...", "status": "Succeeded", "error": null, ...}]

RUN_ID = next(r["name"] for r in runs if r["status"] == "Failed")
```

---

## Step 3 — Get the Top-Level Error

> **CRITICAL**: `get_live_flow_run_error` tells you **which** action failed.
> `get_live_flow_run_action_outputs` tells you **why**. You must call BOTH.
> Never stop at the error alone — error codes like `ActionFailed`,
> `NotSpecified`, and `InternalServerError` are generic wrappers. The actual
> root cause (wrong field, null value, HTTP 500 body, stack trace) is only
> visible in the action's inputs and outputs.

```text
err = get_live_flow_run_error(
    environmentName=ENV, flowName=FLOW_ID, runName=RUN_ID)
# Returns:
# {
#   "runName": "08584296068667933411438594643CU15",
#   "failedActions": [
#     {"actionName": "Apply_to_each_prepare_workers", "status": "Failed",
#      "error": {"code": "ActionFailed", "message": "An action failed..."},
#      "startTime": "...", "endTime": "..."},
#     {"actionName": "HTTP_find_AD_User_by_Name", "status": "Failed",
#      "code": "NotSpecified", "startTime": "...", "endTime": "..."}
#   ],
#   "allActions": [
#     {"actionName": "Apply_to_each", "status": "Skipped"},
#     {"actionName": "Compose_WeekEnd", "status": "Succeeded"},
#     ...
#   ]
# }

# failedActions is ordered outer-to-inner. The ROOT cause is the LAST entry:
root = err["failedActions"][-1]
# Root action: root["actionName"] → code: root.get("code")

# allActions shows every action's status — useful for spotting what was Skipped
# See common-errors.md to decode the error code.
```

---

## Step 4 — Inspect the Failing Action's Inputs and Outputs

> **This is the most important step.** `get_live_flow_run_error` only gives
> you a generic error code. The actual error detail — HTTP status codes,
> response bodies, stack traces, null values — lives in the action's runtime
> inputs and outputs. **Always inspect the failing action immediately after
> identifying it.**

```text
# Get the root failing action's full inputs and outputs
root_action = err["failedActions"][-1]["actionName"]
detail = get_live_flow_run_action_outputs(
    environmentName=ENV,
    flowName=FLOW_ID,
    runName=RUN_ID,
    actionName=root_action)

# detail is an array; >1 entry → multiple foreach repetitions (inspect indexes)
out = detail[0] if detail else {}
# out["actionName"], out["status"]

# For HTTP actions, the real error is in outputs.body
#   out["outputs"]["statusCode"]  + out["outputs"]["body"]
#   Error bodies are often nested JSON strings — parse body["error"] if present.

# For expression errors, the error is in out["error"].

# Also check out["inputs"] — they show what expression/URL/body was used.
```

### What the action outputs reveal (that error codes don't)

| Error code from `get_live_flow_run_error` | What `get_live_flow_run_action_outputs` reveals |
|---|---|
| `ActionFailed` | Which nested action actually failed and its HTTP response |
| `NotSpecified` | The HTTP status code + response body with the real error |
| `InternalServerError` | The server's error message, stack trace, or API error JSON |
| `InvalidTemplate` | The exact expression that failed and the null/wrong-type value |
| `BadRequest` | The request body that was sent and why the server rejected it |

### Foreach iterations

When `actionName` refers to an action inside a foreach, the output tool can
return every repetition of that action. Each item may include
`repetitionIndexes` with the loop name and zero-based `itemIndex`. Use
`iterationIndex` to inspect one iteration after you find the suspicious item:

```text
all_reps = get_live_flow_run_action_outputs(
    environmentName=ENV,
    flowName=FLOW_ID,
    runName=RUN_ID,
    actionName=root_action)

# Scan all_reps[:10] for rep["repetitionIndexes"], rep["status"], rep["error"]
# to find the suspicious iteration, then inspect just that one:

one_rep = get_live_flow_run_action_outputs(
    environmentName=ENV,
    flowName=FLOW_ID,
    runName=RUN_ID,
    actionName=root_action,
    iterationIndex=3)
```

### Evidence Compose Bookends

For uncertain connector work, add a `Compose_*_Request` before the risky action
and a `Compose_*_Result` after it, with the result action allowed on both
`Succeeded` and `Failed`. This gives future debugging a clean payload snapshot
without requiring another deploy. Do not include secrets or long binary payloads
in these bookends.

### Example: HTTP action returning 500

```
Error code: "InternalServerError" ← this tells you nothing

Action outputs reveal:
  HTTP 500
  body: {"error": "Cannot read properties of undefined (reading 'toLowerCase')
    at getClientParamsFromConnectionString (storage.js:20)"}
  ← THIS tells you the Azure Function crashed because a connection string is undefined
```

### Example: Expression error on null

```
Error code: "BadRequest" ← generic

Action outputs reveal:
  inputs: "body('HTTP_GetTokenFromStore')?['token']?['access_token']"
  outputs: ""   ← empty string, the path resolved to null
  ← THIS tells you the response shape changed — token is at body.access_token, not body.token.access_token
```

---

## Step 5 — Read the Flow Definition

```text
defn = get_live_flow(environmentName=ENV, flowName=FLOW_ID)
actions = defn["properties"]["definition"]["actions"]
list(actions.keys())
```

Find the failing action in the definition. Inspect its `inputs` expression
to understand what data it expects.

---

## Step 6 — Walk Back from the Failure

When the failing action's inputs reference upstream actions, inspect those
too. Walk backward through the chain until you find the source of the
bad data:

```text
# Inspect multiple actions leading up to the failure
for action_name in [root_action, "Compose_WeekEnd", "HTTP_Get_Data"]:
    result = get_live_flow_run_action_outputs(
        environmentName=ENV,
        flowName=FLOW_ID,
        runName=RUN_ID,
        actionName=action_name)
    out = result[0] if result else {}
    # Read out["status"], out.get("inputs"), out.get("outputs")
```

> ⚠️ Output payloads from array-processing actions can be very large.
> Slice each field (e.g. first ~500 chars) before reasoning about it.

> **Tip**: Omit `actionName` to list top-level actions when you're not sure
> which action produced the bad data. Once you pick an action inside a foreach,
> pass `iterationIndex` to avoid pulling every repetition into context.

---

## Step 7 — Pinpoint the Root Cause

### Expression Errors (e.g. `split` on null)
If the error mentions `InvalidTemplate` or a function name:
1. Find the action in the definition
2. Check what upstream action/expression it reads
3. **Inspect that upstream action's output** for null / missing fields

```text
# Example: action uses split(item()?['Name'], ' ')
# → null Name in the source data
result = get_live_flow_run_action_outputs(..., actionName="Compose_Names")
names = result[0].get("outputs", {}).get("body") if result else []
nulls = [x for x in (names or []) if x.get("Name") is None]
# len(nulls) records have a null Name
```

### Wrong Field Path
Expression `triggerBody()?['fieldName']` returns null → `fieldName` is wrong.
**Inspect the trigger output** to see the actual field names:
```text
result = get_live_flow_run_action_outputs(..., actionName="<trigger-action-name>")
# Read result[0].get("outputs") for the real field names
```

### HTTP Actions Returning Errors
The error code says `InternalServerError` or `NotSpecified` — **always inspect
the action outputs** to get the actual HTTP status and response body:
```text
result = get_live_flow_run_action_outputs(..., actionName="HTTP_Get_Data")
out = result[0]
# out["outputs"]["statusCode"] + out["outputs"]["body"]
```

### Connection / Auth Failures
Look for `ConnectionAuthorizationFailed` — the connection owner must match the
service account running the flow. Cannot fix via API; fix in PA designer.

### Outlook user-picker failures (`DynamicListValuesUndefinedOrInvalid`)
Outlook actions like `GetEmailsV3` use parameters (`mailboxAddress`, `to`, `cc`,
`from`) whose dropdown is backed by `builtInOperation:AadGraph.GetUsers` — which
is broken at the PA listEnum layer and always returns
`DynamicListValuesUndefinedOrInvalid`. This shows up when an agent rebuilds or
modifies an Outlook action via `update_live_flow` and tries to resolve a user
through dynamic options. **Don't fix it by retrying AadGraph** — switch to
`shared_office365users.SearchUserV2` instead (returns the same AAD user shape).
Use `describe_live_connector` to confirm whether the affected parameter exposes
a structured `fallback`, then call `get_live_dynamic_options` against
`shared_office365users.SearchUserV2` instead of the broken AadGraph operation.
For dynamic field schemas rather than dropdown options, use
`get_live_dynamic_properties` with the metadata returned by
`describe_live_connector`.

---

## Step 8 — Apply the Fix

**For expression/data issues**:
```text
defn = get_live_flow(environmentName=ENV, flowName=FLOW_ID)
acts = defn["properties"]["definition"]["actions"]

# Example: fix split on potentially-null Name
acts["Compose_Names"]["inputs"] = "@coalesce(item()?['Name'], 'Unknown')"

conn_refs = defn["properties"]["connectionReferences"]
result = update_live_flow(
    environmentName=ENV,
    flowName=FLOW_ID,
    definition=defn["properties"]["definition"],
    connectionReferences=conn_refs)

# result["error"] → null = success
```

> ⚠️ `update_live_flow` always returns an `error` field.
> Check the `error` field — `null` means success.

---

## Step 9 — Verify the Fix

> **Use `resubmit_live_flow_run` to test ANY flow — not just HTTP triggers.**
> `resubmit_live_flow_run` replays a previous run using its original trigger
> payload. This works for **every trigger type**: Recurrence, SharePoint
> "When an item is created", connector webhooks, Button triggers, and HTTP
> triggers. You do NOT need to ask the user to manually trigger the flow or
> wait for the next scheduled run.
>
> The only case where `resubmit` is not available is a **brand-new flow that
> has never run** — it has no prior run to replay.

```text
# Resubmit the failed run — works for ANY trigger type
resubmit = resubmit_live_flow_run(
    environmentName=ENV, flowName=FLOW_ID, runName=RUN_ID)
# resubmit → {"resubmitted": true, "triggerName": "..."}

# Wait ~30 s, then check the newest run
new_runs = get_live_flow_runs(environmentName=ENV, flowName=FLOW_ID, top=3)
# new_runs[0]["status"]  → "Succeeded" = done
```

### When to use resubmit vs trigger

| Scenario | Use | Why |
|---|---|---|
| **Testing a fix** on any flow | `resubmit_live_flow_run` | Replays the exact trigger payload that caused the failure — best way to verify |
| Recurrence / scheduled flow | `resubmit_live_flow_run` | Cannot be triggered on demand any other way |
| SharePoint / connector trigger | `resubmit_live_flow_run` | Cannot be triggered without creating a real SP item |
| HTTP trigger with **custom** test payload | `trigger_live_flow` | When you need to send different data than the original run |
| Brand-new flow, never run | `trigger_live_flow` (HTTP only) | No prior run exists to resubmit |

### Testing HTTP-Triggered Flows with custom payloads

For flows with a `Request` (HTTP) trigger, use `trigger_live_flow` when you
need to send a **different** payload than the original run:

```text
# First inspect what the trigger expects — read directly from the flow definition
defn = get_live_flow(environmentName=ENV, flowName=FLOW_ID)
triggers = defn["properties"]["definition"]["triggers"]
manual = next(iter(triggers.values()))   # usually the only trigger on HTTP flows
request_schema = manual.get("inputs", {}).get("schema")   # Expected body schema

# Response schemas live on Response action(s) in the actions block:
#   for each action with type == "Response", read inputs.schema

# Trigger with a test payload
result = trigger_live_flow(
    environmentName=ENV,
    flowName=FLOW_ID,
    body={"name": "Test User", "value": 42})
# result["responseStatus"], result.get("responseBody")
```

> `trigger_live_flow` handles AAD-authenticated triggers automatically.
> Only works for flows with a `Request` (HTTP) trigger type.

---

## Quick-Reference Diagnostic Decision Tree

| Symptom | First Tool | Then ALWAYS Call | What to Look For |
|---|---|---|---|
| Flow shows as Failed | `get_live_flow_run_error` | `get_live_flow_run_action_outputs` on the failing action | HTTP status + response body in `outputs` |
| Error code is generic (`ActionFailed`, `NotSpecified`) | — | `get_live_flow_run_action_outputs` | The `outputs.body` contains the real error message, stack trace, or API error |
| HTTP action returns 500 | — | `get_live_flow_run_action_outputs` | `outputs.statusCode` + `outputs.body` with server error detail |
| Expression crash | — | `get_live_flow_run_action_outputs` on prior action | null / wrong-type fields in output body |
| Flow never starts | `get_live_flow` | — | check `properties.state` = "Started" |
| Action returns wrong data | `get_live_flow_run_action_outputs` | — | actual output body vs expected |
| Fix applied but still fails | `get_live_flow_runs` after resubmit | — | new run `status` field |

> **Rule: never diagnose from error codes alone.** `get_live_flow_run_error`
> identifies the failing action. `get_live_flow_run_action_outputs` reveals
> the actual cause. Always call both.

---

## Reference Files

- [common-errors.md](references/common-errors.md) — Error codes, likely causes, and fixes
- [debug-workflow.md](references/debug-workflow.md) — Full decision tree for complex failures

## Related Skills

- `power-automate-mcp` — Foundation skill: connection setup, MCP helper, tool discovery
- `power-automate-build` — Build and deploy new flows
