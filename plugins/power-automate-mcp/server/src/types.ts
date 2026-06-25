/**
 * Response shapes returned by the MCP tools.
 *
 * These mirror, field-for-field, the contract documented in
 * `skills/power-automate-mcp/references/tool-reference.md` so the existing skill
 * reference docs stay valid against this local server. When the API and this
 * file disagree, the API wins — update both.
 *
 * Every tool response carries an `error` field (null on success) so callers can
 * check `result.error != null` uniformly, matching how the skills branch.
 */

export interface ErrorField {
  code: string;
  message: string;
  /** Optional upstream detail (HTTP status, raw API error body, etc.). */
  details?: unknown;
}

/** Wrapper applied to every tool result: success payload plus a null error. */
export type WithError<T> = T & { error: ErrorField | null };

// ---------------------------------------------------------------------------
// Discover
// ---------------------------------------------------------------------------

export interface LiveEnvironment {
  id: string;
  displayName: string;
  sku: string;
  location: string;
  state: string;
  isDefault: boolean;
  isAdmin: boolean;
  isMember: boolean;
  createdTime: string;
}

export interface LiveFlowListItem {
  id: string;
  displayName: string;
  state: string;
  triggerType: string | null;
  triggerKind: string | null;
  createdTime: string | null;
  lastModifiedTime: string | null;
  owners: string | null;
  definitionAvailable: boolean;
}

export interface ListLiveFlowsResult {
  mode: "owner" | "admin";
  flows: LiveFlowListItem[];
  totalCount: number;
  nextLink: string | null;
}

export interface ConnectionReferenceTemplate {
  connectionName: string;
  source: string;
  id: string;
}

export interface LiveConnection {
  id: string;
  displayName: string;
  connectorName: string;
  environment: string;
  createdBy: string | null;
  authenticatedUser: string | null;
  overallStatus: string | null;
  statuses: Array<{ status: string }>;
  createdTime: string | null;
  connectionReferenceTemplate: ConnectionReferenceTemplate;
  hostTemplate: { connectionName: string };
}

export interface ListLiveConnectionsResult {
  connections: LiveConnection[];
  totalCount: number;
}

// ---------------------------------------------------------------------------
// Flow definition (live API)
// ---------------------------------------------------------------------------

export interface GetLiveFlowResult {
  name: string;
  properties: {
    displayName: string;
    state: string;
    definition: unknown;
    connectionReferences: unknown;
  };
}

export interface UpdateLiveFlowResult {
  /** false on update; the new flow GUID (string) on create. */
  created: string | false;
  flowKey: string;
  updated: string[];
  displayName: string;
  state: string;
  definition: unknown;
}

export interface AddFlowToSolutionResult {
  added: boolean;
  flowKey: string;
  solutionId: string | null;
}

// ---------------------------------------------------------------------------
// Runs & debugging
// ---------------------------------------------------------------------------

export interface LiveRun {
  name: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
  triggerName: string | null;
}

export interface FailedAction {
  actionName: string;
  status: string;
  error?: unknown;
  code: string | null;
  startTime: string | null;
  endTime: string | null;
}

export interface ActionStatus {
  actionName: string;
  status: string;
}

export interface GetRunErrorResult {
  runName: string;
  failedActions: FailedAction[];
  allActions: ActionStatus[];
}

export interface ActionOutput {
  actionName: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
  error: unknown;
  inputs: unknown;
  outputs: unknown;
  repetitionIndexes?: unknown;
  /** Set when a payload exceeded the size cap and was not fully fetched. */
  truncated?: boolean;
  sizeBytes?: number;
}

// ---------------------------------------------------------------------------
// Run control
// ---------------------------------------------------------------------------

export interface ResubmitResult {
  flowKey: string;
  resubmitted: boolean;
  runName: string;
  triggerName: string;
}

export interface CancelResult {
  flowKey: string;
  cancelled: boolean;
  runName: string;
}

export interface TriggerResult {
  flowKey: string;
  triggerName: string;
  triggerUrl: string | null;
  requiresAadAuth: boolean;
  authType: string | null;
  responseStatus: number | null;
  responseBody: unknown;
}

export interface SetStateResult {
  flowName: string;
  environmentName: string;
  requestedState: string;
  actualState: string;
}
