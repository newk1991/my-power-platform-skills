/**
 * Minimal stderr logger. CRITICAL: never write to stdout — that is the MCP
 * stdio JSON-RPC channel, and any stray byte corrupts the protocol.
 */
const LEVELS = { error: 0, info: 1, debug: 2 } as const;
type Level = keyof typeof LEVELS;

export interface Logger {
  error(msg: string): void;
  info(msg: string): void;
  debug(msg: string): void;
  /** Always emitted (e.g. device-code prompts), regardless of level. */
  notify(msg: string): void;
}

export function createLogger(): Logger {
  const configured = (process.env.PA_MCP_LOG || "error").toLowerCase() as Level;
  const threshold = LEVELS[configured] ?? LEVELS.error;
  const write = (level: Level, msg: string) => {
    if (LEVELS[level] <= threshold) process.stderr.write(`[pa-mcp:${level}] ${msg}\n`);
  };
  return {
    error: (m) => write("error", m),
    info: (m) => write("info", m),
    debug: (m) => write("debug", m),
    notify: (m) => process.stderr.write(`${m}\n`),
  };
}
