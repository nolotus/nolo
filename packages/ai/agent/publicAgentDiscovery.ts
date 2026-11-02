import type { Agent } from "app/types";

export interface FetchPublicAgentsDiscoveryResult {
  agents: Agent[];
  total: number;
  hasMore: boolean;
  truncated: boolean;
}

export async function fetchPublicAgentsForDiscovery(args: {
  serverBase: string;
  token?: string;
  limit?: number;
  offset?: number;
  query?: string;
  fetchImpl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}): Promise<FetchPublicAgentsDiscoveryResult> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const MAX_CEILING = 2000;
  const targetLimit = typeof args.limit === "number"
    ? Math.min(Math.max(1, args.limit), MAX_CEILING)
    : args.query
      ? MAX_CEILING
      : 500;
  let currentOffset = Math.max(0, args.offset ?? 0);
  let accumulated: Agent[] = [];
  let upstreamTotal = 0;
  let upstreamHasMore = false;
  let isTruncated = false;
  const batchLimit = 100;
  let iteration = 0;
  const seenIds = new Set<string>();
  const searchName = args.query && typeof args.query === "string" && args.query.trim()
    ? args.query.trim()
    : undefined;

  while (accumulated.length < targetLimit && iteration < 20) {
    iteration++;
    const toFetch = Math.min(batchLimit, targetLimit - accumulated.length);
    try {
      const response = await fetchImpl(`${args.serverBase.replace(/\/$/, "")}/rpc/getPublicAgents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(args.token ? { Authorization: `Bearer ${args.token}` } : {}),
        },
        body: JSON.stringify({
          limit: toFetch,
          offset: currentOffset,
          summary: true,
          ...(searchName ? { searchName } : {}),
        }),
      });
      if (!response.ok) {
        // A catalog failure must not read as "no public agents": the caller
        // would render an empty list instead of surfacing the error.
        throw new Error(`Public agent catalog request failed (${response.status})`);
      }
      const payload = await response.json();
      const resultObj = payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data)
        ? payload.data
        : payload;
      const batch = Array.isArray(resultObj?.data)
        ? resultObj.data
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : null;
      if (!batch) {
        isTruncated = true;
        break;
      }

      let newBatchCount = 0;
      for (const item of batch) {
        const id = item?.id ?? item?.dbKey;
        if (!id || !seenIds.has(id)) {
          if (id) seenIds.add(id);
          accumulated.push(item as Agent);
          newBatchCount++;
        }
      }

      upstreamTotal = typeof resultObj?.total === "number" ? resultObj.total : accumulated.length;
      upstreamHasMore = Boolean(resultObj?.hasMore ?? (currentOffset + batch.length < upstreamTotal));

      if (!upstreamHasMore || batch.length === 0 || newBatchCount === 0) break;
      currentOffset += batch.length;
    } catch (error) {
      // Failures must surface: swallowing them would present an empty catalog
      // as a successful empty result, which is the exact regression the
      // datasource contract forbids.
      throw error instanceof Error
        ? error
        : new Error(`Public agent catalog request failed: ${String(error)}`);
    }
  }

  return {
    agents: accumulated,
    total: upstreamTotal,
    hasMore: upstreamHasMore,
    truncated: isTruncated || (upstreamHasMore && accumulated.length < upstreamTotal),
  };
}
