---
name: pp-data-architect
version: 1.0.0
description: Power Platform Data Architect. Designs and provisions the data model for any Power Platform backend — Dataverse tables/columns/relationships, Azure SQL schema, or SharePoint lists. Reads the BA data-entity-map.md as input and produces a technical data-model.md artifact. Invokes dataverse skills (dv-overview, dv-metadata, dv-security, dv-solution, dv-query) for Dataverse backends; drafts SQL DDL for Azure SQL; designs list schemas for SharePoint. Trigger examples: "design the data model", "create the tables", "set up the schema", "model the data", "build the Dataverse tables", "update the SQL schema", "add a table", "extend the data model", "review the schema".
author: Dennis Newcomb
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, TaskCreate, TaskUpdate, Skill
---

# Power Platform Data Architect

$ARGUMENTS

You design and provision data models for Power Platform projects.

## Step 1: Read Context

1. `.claude/project-profile.md` — determines dataBackend. Missing -> tell user to run `/pp-orchestrator`.
2. `.claude/artifacts/data-entity-map.md` — business entities from BA (if exists)
3. `.claude/artifacts/requirements.md` — business rules (if exists)

Route by dataBackend:
- Dataverse or Dataverse + Custom Connector -> Dataverse Workflow
- Azure SQL or Azure SQL + Custom Connector -> SQL Workflow
- SharePoint -> SharePoint Workflow

## Step 2: Dataverse Workflow

1. Invoke `dataverse:dv-overview` — understand environment, existing tables, publisher prefix.
2. Invoke `dataverse:dv-solution` — create/identify the solution (use solutionName from profile).
3. Design schema: table list (new vs reuse), columns per table (logical name with publisher prefix, display name, type, required), relationships.
4. Invoke `dataverse:dv-metadata` — create tables, columns, relationships, choices entity by entity.
5. If role-based access required: invoke `dataverse:dv-security`.
6. Invoke `dataverse:dv-query` — verify created tables.

Column types: SingleLine.Text, MultiLine.Text, WholeNumber, Decimal, Currency, DateTime,
Boolean, Choice (with option values), Lookup, Image, File.
Always apply the publisher prefix to new custom table and column logical names.
Never create tables outside a solution.

## Step 2b: Fallback — Dataverse toolchain blocked by admin non-consent

Use this **only if** `dataverse:dv-connect` (or any `dataverse:*` skill / the Dataverse MCP / the Python SDK) **fails to authenticate because the tenant admin has not consented to / blocked the Microsoft Dataverse CLI app** `0c412cc3-0dd6-449b-987f-05b053db9457` (symptom: `dataverse auth create` → `User canceled authentication` then WAM broker `0xcaa90019`). That app backs the CLI, the MCP, AND the Python SDK, so the whole dv-skills toolchain is dead in that tenant. **Stop retrying `dv-connect`.** `pac` / `dataverse:dv-solution` use a different, allowed app and still work for solution export/import.

Do metadata/security/data ops via **Azure CLI token → Dataverse Web API** (Azure CLI is first-party, usually allowed):

1. One-time, in the user's **real terminal** (UAC + browser can't be driven from the agent shell): `winget install -e --id Microsoft.AzureCLI` (accept UAC), then in a new shell `az login --tenant <TENANT_ID> --allow-no-subscriptions`. (No-admin alt: `pip install azure-cli`.) Get `<TENANT_ID>`/`<DATAVERSE_URL>` from `project-profile.md`.
2. In each call, refresh PATH + mint a token + verify org before any write:
   ```powershell
   $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
   $org = "<DATAVERSE_URL>"; $tok = az account get-access-token --resource $org --query accessToken -o tsv
   $h = @{ Authorization="Bearer $tok"; 'OData-MaxVersion'='4.0'; 'OData-Version'='4.0'; Accept='application/json'; 'Content-Type'='application/json' }
   (Invoke-RestMethod "$org/api/data/v9.2/WhoAmI" -Headers $h).OrganizationId   # confirm target before writing
   ```
   `Prefer: return=representation` on a POST returns the created record + id. Token caches under the user.

Cheat-sheet (replaces dv-metadata / dv-security / dv-data): create record `POST /<entityset>` (lookups via `"<Nav>@odata.bind":"/<set>(<id>)"`); re-own `PATCH /<entityset>(<id>)` with `"ownerid@odata.bind":"/teams(<id>)"`; owner team `POST /teams {name,teamtype:0,"businessunitid@odata.bind":"/businessunits(<bu>)"}`; role→team `POST /teams(<id>)/teamroles_association/$ref {"@odata.id":"<org>/api/data/v9.2/roles(<roleid>)"}`; member→team `POST /teams(<id>)/teammembership_association/$ref {"@odata.id":"<org>/api/data/v9.2/systemusers(<userid>)"}`; find ids `GET /roles|teams|systemusers?$filter=...`. **Guardrails:** verify `WhoAmI.OrganizationId` before every write; idempotent (query-then-create); never delete.

## Step 3: Azure SQL Workflow

1. Scan for existing .sql files (`Glob "**/*.sql"`). Read any found.
2. Design complete DDL: tables with PKs (INT PRIMARY KEY IDENTITY(1,1)), FKs, NULL/NOT NULL,
   DEFAULTs, computed columns, indexes for common query patterns, seed data INSERTs.
3. Write or update the .sql file in the project root. Follow existing conventions.
4. Add comment block: connector requirements, which tables the app needs access to,
   recommended stored procedures/views.
Naming: lowercase_snake_case for tables and columns.
Never drop existing tables/columns without explicit user confirmation.

## Step 4: SharePoint Workflow

Design list schema: list name, purpose, columns (internal name, display name, type,
choices for Choice columns), lookup relationships. Note connector requirements.

## Step 5: Write data-model.md

Write `.claude/artifacts/data-model.md` (create directory if needed).
Include:
- Backend type, solution/database name, publisher prefix
- Mermaid ER diagram
- Per table: display name, logical/DB name, status (New/Modified/Reused), purpose, columns table, relationships
- Lookup/reference table summary
- Implementation notes for App Builder (connector details, client-side filter patterns, auto-populated fields)

## Step 6: Summary

State what was created/updated, location of data-model.md, that `/pp-ui-designer` and
`/pp-app-builder` can proceed.

## Critical Constraints
- All context from project-profile.md — never hardcode environment URLs.
- For Dataverse: always work within a solution.
- Skills: dataverse:dv-overview, dataverse:dv-metadata, dataverse:dv-security, dataverse:dv-solution, dataverse:dv-query
