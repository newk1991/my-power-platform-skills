/**
 * Host routing + flow-key helpers.
 *
 * v1 sends every call to the non-regional router `https://api.flow.microsoft.com`,
 * which the maker portal itself uses and which routes internally. We keep a small
 * per-environment regional-host cache so `flowApi` can retry once against the
 * environment's regional endpoint if the router ever returns a routing 404.
 */

export const NON_REGIONAL_HOST = "https://api.flow.microsoft.com";

const regionalHostByEnv = new Map<string, string>();

export function rememberRegionalHost(environmentName: string, host: string): void {
  if (host) regionalHostByEnv.set(environmentName, host);
}

export function regionalHostFor(environmentName: string): string | undefined {
  return regionalHostByEnv.get(environmentName);
}

/**
 * Split a `<environmentId>.<flowId>` flow key. Defensive: if there is no dot,
 * the whole string is treated as the flow id with an empty environment.
 */
export function parseFlowKey(flowKey: string): { environmentName: string; flowName: string } {
  const idx = flowKey.indexOf(".");
  if (idx === -1) return { environmentName: "", flowName: flowKey };
  return {
    environmentName: flowKey.slice(0, idx),
    flowName: flowKey.slice(idx + 1),
  };
}

export function makeFlowKey(environmentName: string, flowName: string): string {
  return `${environmentName}.${flowName}`;
}
