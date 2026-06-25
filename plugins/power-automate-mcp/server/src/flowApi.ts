import { HttpError } from "./errors.js";
import type { Logger } from "./log.js";
import type { TokenProvider } from "./auth.js";
import { NON_REGIONAL_HOST } from "./regions.js";

const API_VERSION = "2016-11-01";

export interface RequestOptions {
  /** Query params (api-version is added automatically). Values are URL-encoded. */
  query?: Record<string, string | number | undefined>;
  /** JSON body for POST/PATCH. */
  body?: unknown;
  /** Override host (defaults to the non-regional router). */
  host?: string;
  /** Override the token audience (defaults to the Flow resource; e.g. PowerApps for connections). */
  resource?: string;
  /** Expect no response body (e.g. 204). */
  noBody?: boolean;
}

/**
 * Thin HTTP client for the Power Automate ProcessSimple / PowerApps APIs.
 * Owns auth-header injection and the single 401 retry; tool modules never touch
 * `fetch` or tokens directly.
 */
export class FlowApi {
  constructor(
    private readonly auth: TokenProvider,
    private readonly log: Logger,
  ) {}

  get = (path: string, opts: RequestOptions = {}) => this.request("GET", path, opts);
  post = (path: string, opts: RequestOptions = {}) => this.request("POST", path, opts);
  patch = (path: string, opts: RequestOptions = {}) => this.request("PATCH", path, opts);

  async request(method: string, path: string, opts: RequestOptions = {}): Promise<any> {
    return this.send(method, this.buildUrl(path, opts), opts, true);
  }

  /** Request against a fully-formed absolute URL (e.g. a `nextLink`). */
  async requestUrl(method: string, url: string, opts: RequestOptions = {}): Promise<any> {
    return this.send(method, url, opts, true);
  }

  private buildUrl(path: string, opts: RequestOptions): string {
    const host = opts.host ?? NON_REGIONAL_HOST;
    const url = new URL(path.startsWith("http") ? path : `${host}${path}`);
    if (!url.searchParams.has("api-version")) url.searchParams.set("api-version", API_VERSION);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
    return url.toString();
  }

  private async send(method: string, url: string, opts: RequestOptions, allowRetry: boolean): Promise<any> {
    const token = await this.auth.getToken(opts.resource);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    let payload: string | undefined;
    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(opts.body);
    }
    this.log.debug(`${method} ${url}`);
    const res = await fetch(url, { method, headers, body: payload });

    if (res.status === 401 && allowRetry) {
      this.log.debug("401 — invalidating token and retrying once");
      this.auth.invalidate();
      return this.send(method, url, opts, false);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let detail: unknown = text;
      try {
        detail = JSON.parse(text);
      } catch {
        /* keep raw text */
      }
      throw new HttpError(res.status, `${method} ${url} → ${res.status}`, detail);
    }

    if (opts.noBody || res.status === 204) return undefined;
    const text = await res.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  /**
   * Follow a paged ProcessSimple list, accumulating `value[]` across pages.
   * Stops once `cap` items are collected (when provided).
   */
  async getAllPages(path: string, opts: RequestOptions = {}, cap?: number): Promise<any[]> {
    const out: any[] = [];
    let page = await this.get(path, opts);
    while (page) {
      const items: any[] = Array.isArray(page) ? page : (page.value ?? []);
      out.push(...items);
      const next: string | undefined = page.nextLink ?? page["@odata.nextLink"];
      if (!next || (cap !== undefined && out.length >= cap)) break;
      page = await this.requestUrl("GET", next, { resource: opts.resource });
    }
    return cap !== undefined ? out.slice(0, cap) : out;
  }

  /**
   * Fetch a pre-signed SAS link (inputsLink/outputsLink). These URLs are already
   * authorized — sending an Authorization header can cause a 403, so we send none.
   * Returns the parsed body plus its byte size, honoring a size cap.
   */
  async fetchSas(uri: string, capBytes: number): Promise<{ value: unknown; sizeBytes: number; truncated: boolean }> {
    const res = await fetch(uri, { method: "GET" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new HttpError(res.status, `SAS fetch → ${res.status}`, text.slice(0, 300));
    }
    const declared = Number(res.headers.get("content-length") ?? "0");
    if (declared > capBytes) {
      return { value: `<${declared} bytes — exceeds ${capBytes}-byte cap; omitted>`, sizeBytes: declared, truncated: true };
    }
    const text = await res.text();
    const sizeBytes = Buffer.byteLength(text);
    if (sizeBytes > capBytes) {
      return { value: `${text.slice(0, 2000)}…`, sizeBytes, truncated: true };
    }
    let value: unknown = text;
    try {
      value = JSON.parse(text);
    } catch {
      /* keep as string (Compose-style scalar outputs are plain text) */
    }
    return { value, sizeBytes, truncated: false };
  }
}
