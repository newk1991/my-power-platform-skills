import type { ErrorField } from "./types.js";

/**
 * An error carrying an explicit machine-readable code, so tools can surface a
 * stable `error.code` (e.g. "NotImplemented", "NotHttpTrigger", "AuthError").
 */
export class FlowError extends Error {
  code: string;
  details?: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "FlowError";
    this.code = code;
    this.details = details;
  }
}

/** HTTP-layer failure from the Power Automate API. */
export class HttpError extends FlowError {
  status: number;
  constructor(status: number, message: string, details?: unknown) {
    super(httpCode(status), message, details);
    this.name = "HttpError";
    this.status = status;
  }
}

function httpCode(status: number): string {
  if (status === 401 || status === 403) return "AuthError";
  if (status === 404) return "NotFound";
  if (status === 429) return "Throttled";
  return `Http${status}`;
}

/** Normalize any thrown value into the `{ code, message, details }` contract. */
export function toErrorField(e: unknown): ErrorField {
  if (e instanceof FlowError) {
    return { code: e.code, message: e.message, ...(e.details !== undefined ? { details: e.details } : {}) };
  }
  if (e instanceof Error) {
    return { code: "Error", message: e.message };
  }
  return { code: "Error", message: String(e) };
}
