import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineTool, type ToolContext } from "../register.js";
import type {
  GetLiveFlowResult,
  ListLiveConnectionsResult,
  ListLiveFlowsResult,
  LiveConnection,
  LiveEnvironment,
  LiveFlowListItem,
} from "../types.js";

const PS = "/providers/Microsoft.ProcessSimple";

/** Leaf of an apiId like `/providers/Microsoft.PowerApps/apis/shared_office365`. */
function connectorLeaf(apiId: string | undefined): string {
  if (!apiId) return "";
  const i = apiId.lastIndexOf("/");
  return i === -1 ? apiId : apiId.slice(i + 1);
}

function mapEnvironment(e: any): LiveEnvironment {
  const p = e.properties ?? {};
  return {
    id: e.name,
    displayName: p.displayName ?? "",
    sku: p.environmentSku ?? p.sku ?? "",
    location: p.azureRegionHint ?? p.location ?? "",
    state: p.environmentState ?? p.state ?? "",
    isDefault: Boolean(p.isDefault),
    isAdmin: Boolean(p.permissions?.admin?.canEdit ?? p.isAdmin ?? false),
    isMember: Boolean(p.isMember ?? true),
    createdTime: p.createdTime ?? "",
  };
}

function mapFlowListItem(f: any): LiveFlowListItem {
  const p = f.properties ?? {};
  const trigger = p.definitionSummary?.triggers?.[0] ?? {};
  return {
    id: f.name,
    displayName: p.displayName ?? "",
    state: p.state ?? "",
    triggerType: trigger.type ?? null,
    triggerKind: trigger.kind ?? null,
    createdTime: p.createdTime ?? null,
    lastModifiedTime: p.lastModifiedTime ?? null,
    owners: p.creator?.objectId ?? p.creator?.userId ?? null,
    definitionAvailable: Boolean(p.definitionSummary ?? p.definition),
  };
}

function mapConnection(c: any, environmentName: string): LiveConnection {
  const p = c.properties ?? {};
  const apiId: string = p.apiId ?? p.api?.id ?? "";
  const connectorName = connectorLeaf(apiId);
  const statuses: Array<{ status: string }> = Array.isArray(p.statuses)
    ? p.statuses.map((s: any) => ({ status: s.status ?? s.error?.code ?? "Unknown" }))
    : [];
  return {
    id: c.name,
    displayName: p.displayName ?? "",
    connectorName,
    environment: environmentName,
    createdBy: p.createdBy?.displayName ?? p.createdBy?.userPrincipalName ?? null,
    authenticatedUser: p.authenticatedUser?.name ?? p.createdBy?.userPrincipalName ?? null,
    overallStatus: p.overallStatus ?? statuses[0]?.status ?? null,
    statuses,
    createdTime: p.createdTime ?? null,
    connectionReferenceTemplate: { connectionName: c.name, source: "Invoker", id: apiId },
    hostTemplate: { connectionName: connectorName },
  };
}

export function registerDiscoverTools(server: McpServer, ctx: ToolContext): void {
  defineTool(server, ctx, {
    name: "list_live_environments",
    description:
      "List all Power Platform environments the signed-in account can access. " +
      "Returns a direct array; use each `id` as `environmentName` in other tools.",
    inputSchema: {},
    run: async (_args, c): Promise<LiveEnvironment[]> => {
      const page = await c.api.get(`${PS}/environments`);
      const items: any[] = page?.value ?? [];
      return items.map(mapEnvironment);
    },
  });

  defineTool(server, ctx, {
    name: "list_live_flows",
    description:
      "List cloud flows in an environment. `mode`='owner' (flows owned by the signed-in identity) " +
      "or 'admin' (all flows, requires admin rights). Optional `search` filters by display name; " +
      "`top` caps results; `continuationUrl` resumes a previous `nextLink`.",
    inputSchema: {
      environmentName: z.string().describe("Environment id from list_live_environments."),
      mode: z.enum(["owner", "admin"]).default("owner"),
      search: z.string().optional().describe("Case-insensitive display-name filter."),
      top: z.number().int().positive().optional(),
      continuationUrl: z.string().optional(),
    },
    run: async (args, c): Promise<ListLiveFlowsResult> => {
      const mode = (args.mode ?? "owner") as "owner" | "admin";
      const path =
        mode === "admin"
          ? `${PS}/scopes/admin/environments/${args.environmentName}/v2/flows`
          : `${PS}/environments/${args.environmentName}/flows`;
      const cap: number | undefined = args.top;

      let raw: any[];
      let nextLink: string | null = null;
      if (args.continuationUrl) {
        const page = await c.api.requestUrl("GET", args.continuationUrl);
        raw = page?.value ?? [];
        nextLink = page?.nextLink ?? page?.["@odata.nextLink"] ?? null;
      } else {
        // Pull pages up to the cap (default: a single page worth).
        raw = await c.api.getAllPages(path, { query: { $top: cap } }, cap);
      }

      let flows = raw.map(mapFlowListItem);
      if (args.search) {
        const needle = String(args.search).toLowerCase();
        flows = flows.filter((f) => f.displayName.toLowerCase().includes(needle));
      }
      return { mode, flows, totalCount: flows.length, nextLink };
    },
  });

  defineTool(server, ctx, {
    name: "get_live_flow",
    description:
      "Get a flow's full definition (triggers, actions, parameters) and connectionReferences. " +
      "Use before editing a flow or to inspect action configuration during debugging.",
    inputSchema: {
      environmentName: z.string(),
      flowName: z.string().describe("Flow GUID (the `id` from list_live_flows)."),
    },
    run: async (args, c): Promise<GetLiveFlowResult> => {
      const f = await c.api.get(`${PS}/environments/${args.environmentName}/flows/${args.flowName}`);
      const p = f.properties ?? {};
      return {
        name: f.name,
        properties: {
          displayName: p.displayName ?? "",
          state: p.state ?? "",
          definition: p.definition ?? null,
          connectionReferences: p.connectionReferences ?? null,
        },
      };
    },
  });

  defineTool(server, ctx, {
    name: "list_live_connections",
    description:
      "List connections (authenticated connector instances) in an environment. The `id` is the " +
      "connectionName used in connectionReferences; `connectorName` maps to apiId. Optional " +
      "`search` narrows by connector or account.",
    inputSchema: {
      environmentName: z.string(),
      search: z.string().optional(),
    },
    run: async (args, c): Promise<ListLiveConnectionsResult> => {
      const page = await c.api.get(`/providers/Microsoft.PowerApps/connections`, {
        query: { $filter: `environment eq '${args.environmentName}'` },
      });
      let raw: any[] = page?.value ?? [];
      let connections = raw.map((x) => mapConnection(x, args.environmentName));
      if (args.search) {
        const needle = String(args.search).toLowerCase();
        connections = connections.filter(
          (x) =>
            x.connectorName.toLowerCase().includes(needle) ||
            x.displayName.toLowerCase().includes(needle) ||
            (x.authenticatedUser ?? "").toLowerCase().includes(needle),
        );
      }
      return { connections, totalCount: connections.length };
    },
  });
}
