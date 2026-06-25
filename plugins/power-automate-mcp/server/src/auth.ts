import { execFile } from "node:child_process";
import { FlowError } from "./errors.js";
import type { Logger } from "./log.js";

/**
 * Audience for the Power Automate "ProcessSimple" API. The trailing slash is
 * load-bearing — the service validates `aud === "https://service.flow.microsoft.com/"`.
 */
export const FLOW_RESOURCE = "https://service.flow.microsoft.com/";

interface CachedToken {
  token: string;
  /** Epoch milliseconds at which the token expires. */
  expiresAtMs: number;
}

/** Re-mint this many ms before the real expiry to avoid using a stale token. */
const SKEW_MS = 5 * 60 * 1000;

export interface TokenProvider {
  getToken(): Promise<string>;
  invalidate(): void;
}

/**
 * Token provider that reuses the user's existing Azure CLI login by shelling out
 * to `az account get-access-token`. No app registration, no secrets on disk.
 */
export class AzCliTokenProvider implements TokenProvider {
  private cache: CachedToken | null = null;
  private inflight: Promise<string> | null = null;

  constructor(private readonly log: Logger) {}

  invalidate(): void {
    this.cache = null;
  }

  async getToken(): Promise<string> {
    const now = Date.now();
    if (this.cache && now < this.cache.expiresAtMs - SKEW_MS) {
      return this.cache.token;
    }
    // Collapse concurrent mints into one az invocation.
    if (!this.inflight) {
      this.inflight = this.mint().finally(() => {
        this.inflight = null;
      });
    }
    return this.inflight;
  }

  private async mint(): Promise<string> {
    const raw = await runAz(
      ["account", "get-access-token", "--resource", FLOW_RESOURCE, "-o", "json"],
      this.log,
    );
    let parsed: { accessToken?: string; expiresOn?: string; expires_on?: number };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new FlowError("AuthError", `Could not parse az token output: ${raw.slice(0, 200)}`);
    }
    if (!parsed.accessToken) {
      throw new FlowError("AuthError", "az returned no accessToken. Run `az login`.");
    }
    this.cache = {
      token: parsed.accessToken,
      expiresAtMs: resolveExpiry(parsed),
    };
    this.log.debug(`minted Flow token; expires in ${Math.round((this.cache.expiresAtMs - Date.now()) / 1000)}s`);
    return this.cache.token;
  }
}

/**
 * Prefer the epoch `expires_on` field (unambiguous) over the timezone-less
 * `expiresOn` string, which az emits in local time and is easy to misparse.
 */
function resolveExpiry(p: { expiresOn?: string; expires_on?: number }): number {
  if (typeof p.expires_on === "number" && p.expires_on > 0) {
    return p.expires_on * 1000;
  }
  if (p.expiresOn) {
    const ms = Date.parse(p.expiresOn); // local time, no tz — best effort
    if (!Number.isNaN(ms)) return ms;
  }
  // Fall back to a conservative 50-minute lifetime.
  return Date.now() + 50 * 60 * 1000;
}

const AZ_NOT_FOUND =
  "Azure CLI not found on PATH. Install it (https://aka.ms/azcli) and run `az login`, " +
  "or set PA_MCP_AUTH=devicecode.";

/**
 * Run the Azure CLI. On Windows `az` is a `.cmd` shim, and since the Node
 * CVE-2024-27980 hardening `execFile` rejects `.cmd`/`.bat` with EINVAL unless a
 * shell is used — so on Windows we run through the shell (args are fixed
 * constants, no user input, so there is no injection surface). On POSIX we use
 * execFile directly. Override the binary with PA_MCP_AZ_BIN.
 */
function runAz(args: string[], _log: Logger): Promise<string> {
  const isWin = process.platform === "win32";
  const bin = process.env.PA_MCP_AZ_BIN || "az";
  const opts = { maxBuffer: 10 * 1024 * 1024, windowsHide: true, shell: isWin } as const;
  // On Windows pass the whole command as one string with empty args, to dodge
  // the DEP0190 "args + shell" deprecation warning.
  const cmd = isWin ? `${bin} ${args.join(" ")}` : bin;
  const cmdArgs = isWin ? [] : args;

  return new Promise<string>((resolve, reject) => {
    execFile(cmd, cmdArgs, opts, (err, stdout, stderr) => {
      if (!err) {
        resolve(stdout);
        return;
      }
      const detail = (stderr || stdout || "").toString();
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || /not recognized|command not found|No such file/i.test(detail)) {
        reject(new FlowError("AuthError", AZ_NOT_FOUND));
        return;
      }
      if (/az login|AADSTS50058|no subscription|Please run ['"]?az login|not logged in/i.test(detail)) {
        reject(new FlowError("AuthError", "Not logged in to Azure CLI. Run `az login`.", detail.slice(0, 400)));
        return;
      }
      if (/AADSTS500011|was not found in the tenant|resource principal/i.test(detail)) {
        reject(
          new FlowError(
            "AuthError",
            "The Azure CLI client was refused the Power Automate resource in this tenant. " +
              "Set PA_MCP_AUTH=devicecode (optionally with PA_MCP_CLIENT_ID/PA_MCP_TENANT_ID).",
            detail.slice(0, 400),
          ),
        );
        return;
      }
      reject(new FlowError("AuthError", `az token mint failed: ${detail.slice(0, 400)}`));
    });
  });
}

/**
 * Device-code fallback provider. Lazily imports @azure/msal-node only when
 * selected, so the default az path has zero extra dependencies.
 */
export class DeviceCodeTokenProvider implements TokenProvider {
  private cache: CachedToken | null = null;
  // Public Azure CLI client id — broadly pre-consented for first-party resources.
  private static readonly AZURE_CLI_CLIENT = "04b07795-8ddb-461a-bbee-02f9e1bf7b46";

  constructor(private readonly log: Logger) {}

  invalidate(): void {
    this.cache = null;
  }

  async getToken(): Promise<string> {
    const now = Date.now();
    if (this.cache && now < this.cache.expiresAtMs - SKEW_MS) return this.cache.token;

    // Non-literal specifier so the compiler does not require the optional package.
    const moduleName = "@azure/msal-node";
    let msal: any;
    try {
      msal = await import(moduleName);
    } catch {
      throw new FlowError(
        "AuthError",
        "Device-code auth requires @azure/msal-node. Run `npm i @azure/msal-node` in server/, " +
          "or use the default PA_MCP_AUTH=azcli with `az login`.",
      );
    }
    const clientId = process.env.PA_MCP_CLIENT_ID || DeviceCodeTokenProvider.AZURE_CLI_CLIENT;
    const tenant = process.env.PA_MCP_TENANT_ID || "organizations";
    const pca = new msal.PublicClientApplication({
      auth: { clientId, authority: `https://login.microsoftonline.com/${tenant}` },
    });
    const result = await pca.acquireTokenByDeviceCode({
      scopes: [`${FLOW_RESOURCE}.default`],
      deviceCodeCallback: (info: any) => {
        // Must go to stderr — stdout is the MCP stdio channel.
        this.log.notify(info.message);
      },
    });
    if (!result?.accessToken) throw new FlowError("AuthError", "Device-code flow returned no token.");
    this.cache = {
      token: result.accessToken,
      expiresAtMs: result.expiresOn ? result.expiresOn.getTime() : Date.now() + 50 * 60 * 1000,
    };
    return this.cache.token;
  }
}

export function createTokenProvider(log: Logger): TokenProvider {
  const mode = (process.env.PA_MCP_AUTH || "azcli").toLowerCase();
  if (mode === "devicecode") return new DeviceCodeTokenProvider(log);
  return new AzCliTokenProvider(log);
}
