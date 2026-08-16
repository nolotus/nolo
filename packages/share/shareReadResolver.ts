import { API_ENDPOINTS, NOLO_CLUSTER_SERVERS, normalizeKnownServerOrigin } from "database/config";
import { isRecord } from "core/isRecord";
import { normalizeServerOrigin } from "core/serverOrigin";

export const normalizeShareReadServerOrigin = (value: unknown): string | null => {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  return normalizeKnownServerOrigin(value) ?? normalizeServerOrigin(value);
};

const isNoloClusterServer = (value: string): boolean =>
  (NOLO_CLUSTER_SERVERS as string[]).includes(
    normalizeShareReadServerOrigin(value) ?? value
  );

export const buildShareReadServerCandidates = ({
  currentOrigin,
  currentServer,
  syncServers,
  originServer,
}: {
  currentOrigin?: unknown;
  currentServer?: unknown;
  syncServers?: unknown;
  originServer?: unknown;
}): string[] => {
  const normalized = [
    currentOrigin,
    currentServer,
    originServer,
    ...(Array.isArray(syncServers) ? syncServers : []),
  ]
    .map(normalizeShareReadServerOrigin)
    .filter((server): server is string => !!server);

  if (normalized.some(isNoloClusterServer)) {
    normalized.push(...NOLO_CLUSTER_SERVERS);
  }

  return Array.from(new Set(normalized));
};

export const fetchSharedRecordFromServers = async ({
  dbKey,
  servers,
  token,
  fetchImpl = fetch,
}: {
  dbKey: string;
  servers: string[];
  token?: string | null;
  fetchImpl?: typeof fetch;
}): Promise<{ record: Record<string, unknown>; server: string } | null> => {
  for (const server of servers) {
    try {
      const response = await fetchImpl(
        `${server}${API_ENDPOINTS.DATABASE}/read/${encodeURIComponent(dbKey)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );
      if (response.status !== 200) continue;
      const payload = await response.json();
      if (isRecord(payload)) {
        return { record: payload, server };
      }
    } catch {
      // Try the next server.
    }
  }

  return null;
};
