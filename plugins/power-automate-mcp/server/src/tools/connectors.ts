import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineTool, type ToolContext } from "../register.js";
import { FlowError } from "../errors.js";

/**
 * Connector discovery + dynamic value/schema resolution.
 *
 * describe_live_connector is implemented against the PowerApps apis endpoint
 * (`/providers/Microsoft.PowerApps/apis`). The single-connector GET with
 * `$expand=swagger` returns `properties.swagger` (OpenAPI 2.0); we parse
 * `swagger.paths` into a narrow operations catalog and never echo the raw
 * 100–600 KB swagger blob back to the caller.
 *
 * get_live_dynamic_options / get_live_dynamic_properties ship as documented
 * NotImplemented stubs in v1: invoking the connector's dynamic value/schema
 * mechanism requires an authorized connection at runtime, which could not be
 * live-verified (no connections exist in the probe environment). The skills
 * tolerate the `error` field, so deferring does not break authoring — resolve
 * dynamic values manually from the operation's x-ms-dynamic-* metadata surfaced
 * by describe_live_connector.
 */

const APIS_PATH = "/providers/Microsoft.PowerApps/apis";

/** OpenAPI 2.0 HTTP methods that carry an operation object on a path item. */
const HTTP_METHODS = ["get", "put", "post", "delete", "patch", "head", "options"] as const;

interface ConnectorProps {
  displayName?: string;
  description?: string;
  tier?: string;
  isCustomApi?: boolean;
  swagger?: SwaggerDoc;
}

interface SwaggerDoc {
  paths?: Record<string, Record<string, unknown>>;
}

interface SwaggerParam {
  name?: string;
  in?: string;
  required?: boolean;
  type?: string;
  description?: string;
  "x-ms-summary"?: string;
  "x-ms-dynamic-values"?: unknown;
  "x-ms-dynamic-list"?: unknown;
  "x-ms-dynamic-tree"?: unknown;
  "x-ms-dynamic-schema"?: unknown;
  "x-ms-dynamic-properties"?: unknown;
}

interface CompactOperation {
  operationId: string;
  summary: string;
  method: string;
  path: string;
  description: string;
}

/** Build the apis-endpoint query with the environment filter applied. */
function envQuery(environmentName: string, extra?: Record<string, string>): Record<string, string> {
  return { $filter: `environment eq '${environmentName}'`, ...(extra ?? {}) };
}

/** Fetch the raw connector list for an environment (compact projection only). */
async function listConnectors(ctx: ToolContext, environmentName: string): Promise<any[]> {
  const res = await ctx.api.get(APIS_PATH, { query: envQuery(environmentName) });
  const value = res?.value;
  return Array.isArray(value) ? value : [];
}

/** Fetch one connector with its swagger expanded. */
async function getConnectorWithSwagger(
  ctx: ToolContext,
  environmentName: string,
  connectorName: string,
): Promise<{ name: string; properties: ConnectorProps }> {
  const res = await ctx.api.get(`${APIS_PATH}/${encodeURIComponent(connectorName)}`, {
    query: envQuery(environmentName, { $expand: "swagger" }),
  });
  if (!res || typeof res !== "object") {
    throw new FlowError("SwaggerUnavailable", `No connector definition returned for '${connectorName}'.`);
  }
  return res as { name: string; properties: ConnectorProps };
}

/** Parse swagger.paths into a flat, compact operations catalog. */
function parseOperations(swagger: SwaggerDoc | undefined): { op: CompactOperation; raw: Record<string, unknown> }[] {
  const out: { op: CompactOperation; raw: Record<string, unknown> }[] = [];
  const paths = swagger?.paths;
  if (!paths || typeof paths !== "object") return out;
  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;
    for (const method of HTTP_METHODS) {
      const raw = (pathItem as Record<string, unknown>)[method];
      if (!raw || typeof raw !== "object") continue;
      const opObj = raw as Record<string, unknown>;
      const operationId = typeof opObj.operationId === "string" ? opObj.operationId : `${method}:${path}`;
      const xSummary = typeof opObj["x-ms-summary"] === "string" ? (opObj["x-ms-summary"] as string) : undefined;
      const summary = typeof opObj.summary === "string" ? (opObj.summary as string) : undefined;
      const description = typeof opObj.description === "string" ? (opObj.description as string) : "";
      out.push({
        op: {
          operationId,
          summary: xSummary ?? summary ?? "",
          method: method.toUpperCase(),
          path,
          description,
        },
        raw: opObj,
      });
    }
  }
  return out;
}

/** Hint pointing the caller at the right dynamic-resolution tool for a parameter. */
function dynamicMetadataHint(param: SwaggerParam): Record<string, unknown> | undefined {
  // Value/list/tree extensions populate dropdown OPTIONS.
  if (param["x-ms-dynamic-values"] !== undefined) {
    return { kind: "x-ms-dynamic-values", nextTool: "get_live_dynamic_options", spec: param["x-ms-dynamic-values"] };
  }
  if (param["x-ms-dynamic-list"] !== undefined) {
    return { kind: "x-ms-dynamic-list", nextTool: "get_live_dynamic_options", spec: param["x-ms-dynamic-list"] };
  }
  if (param["x-ms-dynamic-tree"] !== undefined) {
    return { kind: "x-ms-dynamic-tree", nextTool: "get_live_dynamic_options", spec: param["x-ms-dynamic-tree"] };
  }
  // Schema/properties extensions populate dynamic field SETS (object properties).
  if (param["x-ms-dynamic-schema"] !== undefined) {
    return { kind: "x-ms-dynamic-schema", nextTool: "get_live_dynamic_properties", spec: param["x-ms-dynamic-schema"] };
  }
  if (param["x-ms-dynamic-properties"] !== undefined) {
    return {
      kind: "x-ms-dynamic-properties",
      nextTool: "get_live_dynamic_properties",
      spec: param["x-ms-dynamic-properties"],
    };
  }
  return undefined;
}

/** Expand one operation's parameter list with dynamic-metadata hints. */
function expandOperation(entry: { op: CompactOperation; raw: Record<string, unknown> }): Record<string, unknown> {
  const rawParams = entry.raw.parameters;
  const params: Record<string, unknown>[] = [];
  if (Array.isArray(rawParams)) {
    for (const p of rawParams) {
      if (!p || typeof p !== "object") continue;
      const param = p as SwaggerParam;
      const hint = dynamicMetadataHint(param);
      params.push({
        name: param.name ?? "",
        in: param.in ?? "",
        required: param.required === true,
        type: param.type,
        "x-ms-summary": param["x-ms-summary"],
        description: param.description,
        ...(hint ? { dynamicMetadata: hint } : {}),
      });
    }
  }
  return {
    operationId: entry.op.operationId,
    summary: entry.op.summary,
    method: entry.op.method,
    path: entry.op.path,
    description: entry.op.description,
    parameters: params,
  };
}

export function registerConnectorTools(server: McpServer, ctx: ToolContext): void {
  defineTool(server, ctx, {
    name: "describe_live_connector",
    description:
      "Describe a connector and its operations (parameters, schemas) before authoring connector " +
      "actions. Modes: search across connectors, compact catalog for one connector, or expanded " +
      "schema for one operationId. Returns a narrowed slice — never the full swagger blob.",
    inputSchema: {
      environmentName: z.string(),
      connectorName: z.string().optional(),
      search: z.string().optional(),
      operationId: z.string().optional(),
      variant: z.string().optional(),
      top: z.number().int().positive().optional(),
    },
    run: async (args) => {
      const environmentName: string = args.environmentName;
      const connectorName: string | undefined = args.connectorName;
      const search: string | undefined = args.search;
      const operationId: string | undefined = args.operationId;
      const top: number | undefined = args.top;

      // ---- Search / catalog mode: no connectorName given ------------------
      if (!connectorName) {
        const all = await listConnectors(ctx, environmentName);
        let connectors = all.map((c) => {
          const props: ConnectorProps = (c?.properties ?? {}) as ConnectorProps;
          return {
            name: typeof c?.name === "string" ? c.name : "",
            displayName: props.displayName ?? "",
            description: props.description ?? "",
            tier: props.tier ?? "",
            isCustomApi: props.isCustomApi === true,
          };
        });
        if (search) {
          const term = search.toLowerCase();
          connectors = connectors.filter(
            (c) => c.name.toLowerCase().includes(term) || c.displayName.toLowerCase().includes(term),
          );
        }
        const totalCount = connectors.length;
        if (top !== undefined) connectors = connectors.slice(0, top);
        return { connectors, totalCount };
      }

      // ---- Single-connector mode: fetch + parse swagger -------------------
      const connector = await getConnectorWithSwagger(ctx, environmentName, connectorName);
      const props: ConnectorProps = (connector.properties ?? {}) as ConnectorProps;
      const swagger = props.swagger;
      if (!swagger || typeof swagger !== "object" || !swagger.paths) {
        throw new FlowError(
          "SwaggerUnavailable",
          `Swagger definition could not be retrieved for connector '${connectorName}'.`,
          { connectorName },
        );
      }
      const operations = parseOperations(swagger);

      // ---- Operation-detail mode: operationId given ----------------------
      if (operationId) {
        const match = operations.find((e) => e.op.operationId === operationId);
        if (!match) {
          throw new FlowError(
            "OperationNotFound",
            `Operation '${operationId}' not found on connector '${connectorName}'.`,
            { connectorName, operationId },
          );
        }
        return { connectorName, operation: expandOperation(match) };
      }

      // ---- Compact catalog for the connector -----------------------------
      const totalCount = operations.length;
      let catalog = operations.map((e) => e.op);
      if (top !== undefined) catalog = catalog.slice(0, top);
      return {
        connectorName,
        displayName: props.displayName ?? "",
        operations: catalog,
        totalCount,
      };
    },
  });

  // ---- Dynamic value/schema resolution: documented NotImplemented stubs --
  // Invoking a connector's dynamic mechanism requires an authorized runtime
  // connection; it could not be live-verified in v1. Resolve manually from the
  // operation's x-ms-dynamic-* metadata (surfaced by describe_live_connector).
  const DYNAMIC_STUB_HINT =
    "Resolve dynamic values manually: inspect the connector operation's x-ms-dynamic-values/" +
    "x-ms-dynamic-list metadata via describe_live_connector, or pick the id from list output in the maker portal.";

  defineTool(server, ctx, {
    name: "get_live_dynamic_options",
    description:
      "Resolve live dropdown/list options for a connector parameter (x-ms-dynamic-list / " +
      "x-ms-dynamic-values), e.g. SharePoint sites/lists or Teams channels. Pass the dynamicMetadata " +
      "from describe_live_connector, the connection id, and any resolved dependent parameters.",
    inputSchema: {
      environmentName: z.string(),
      connectorName: z.string(),
      connectionName: z.string(),
      operationId: z.string(),
      parameterName: z.string(),
      dynamicMetadata: z.unknown(),
      parameters: z.record(z.unknown()).optional(),
    },
    run: async () => {
      throw new FlowError(
        "NotImplemented",
        `get_live_dynamic_options is not implemented in v1. ${DYNAMIC_STUB_HINT}`,
      );
    },
  });

  defineTool(server, ctx, {
    name: "get_live_dynamic_properties",
    description:
      "Resolve live schema/field properties for a connector parameter (dynamic field sets such as " +
      "SharePoint list columns after site+list are known). Use `propertyName` for one field; " +
      "`includeRaw` only when needed (can be large).",
    inputSchema: {
      environmentName: z.string(),
      connectorName: z.string(),
      connectionName: z.string(),
      operationId: z.string(),
      parameterName: z.string(),
      dynamicMetadata: z.unknown(),
      parameters: z.record(z.unknown()).optional(),
      propertyName: z.string().optional(),
      includeRaw: z.boolean().optional(),
    },
    run: async () => {
      throw new FlowError(
        "NotImplemented",
        `get_live_dynamic_properties is not implemented in v1. ${DYNAMIC_STUB_HINT}`,
      );
    },
  });
}
