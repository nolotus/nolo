import { googleSessionRequestToken, isGoogleAuthoritySession } from "core/googleSessionScope";
import type { SpaceData } from "app/types";
import { normalizeSpaceId } from "create/space/spaceKeys";
import { API_ENDPOINTS } from "database/config";
import { isTombstoneRecord } from "database/tombstones";

type CachedSpaceReplica = {
  watermark: number;
  meta: Record<string, any> | null;
  categories: Map<string, Record<string, any>>;
  items: Map<string, Record<string, any>>;
  tombstoned: boolean;
};

const replicaStore = new Map<string, CachedSpaceReplica>();
const unsupportedScanOrigins = new Set<string>();

const WATERMARK_OVERLAP_MS = 5_000;
const DEFAULT_SCAN_PAGE_SIZE = 500;
const DEFAULT_MAX_SCAN_PAGES = 200;

const replicaCacheKey = (server: string, userId: string, spaceId: string): string =>
  `${server}|${userId}|${spaceId}`;

export function clearSpaceDirectoryScanCache(spaceId?: string): void {
  if (!spaceId) {
    replicaStore.clear();
    unsupportedScanOrigins.clear();
    return;
  }
  const normalized = normalizeSpaceId(spaceId);
  if (!normalized) return;
  for (const key of replicaStore.keys()) {
    if (key.endsWith(`|${normalized}`)) {
      replicaStore.delete(key);
    }
  }
}

function projectReplicaToSpaceData(
  spaceId: string,
  replica: CachedSpaceReplica,
): SpaceData | null {
  if (replica.tombstoned) return null;
  if (!replica.meta && replica.categories.size === 0 && replica.items.size === 0) {
    return null;
  }

  const meta = replica.meta ?? {};
  const categories: Record<string, any> = {};
  for (const [catId, catVal] of replica.categories) {
    categories[catId] = catVal;
  }
  const contents: Record<string, any> = {};
  for (const [contentKey, itemVal] of replica.items) {
    contents[contentKey] = itemVal;
  }

  return {
    id: spaceId,
    name: typeof meta.name === "string" && meta.name.trim() ? meta.name : spaceId,
    description: typeof meta.description === "string" ? meta.description : "",
    ownerId: typeof meta.ownerId === "string" ? meta.ownerId : "",
    visibility: meta.visibility ?? "private",
    members: Array.isArray(meta.members) ? meta.members : [],
    categories,
    contents,
    createdAt: typeof meta.createdAt === "number" ? meta.createdAt : 0,
    updatedAt: typeof meta.updatedAt === "number" ? meta.updatedAt : replica.watermark,
  } as SpaceData;
}

function applyScanEntriesToReplica(
  spaceId: string,
  replica: CachedSpaceReplica,
  entries: ReadonlyArray<{
    key: string;
    value: Record<string, any>;
    updatedAt: number;
    tombstone: boolean;
  }>,
  isFullSnapshot: boolean,
): void {
  if (isFullSnapshot) {
    replica.meta = null;
    replica.categories.clear();
    replica.items.clear();
    replica.tombstoned = false;
  }

  const metaKey = `sp:${spaceId}:meta`;
  const catPrefix = `sp:${spaceId}:cat:`;
  const itemPrefix = `sp:${spaceId}:item:`;

  for (const entry of entries) {
    if (!entry || typeof entry.key !== "string" || !entry.value) continue;
    const isDeleted = Boolean(entry.tombstone) || isTombstoneRecord(entry.value);
    if (entry.key === metaKey) {
      if (isDeleted) {
        replica.tombstoned = true;
        replica.meta = null;
        replica.categories.clear();
        replica.items.clear();
      } else {
        replica.tombstoned = false;
        replica.meta = entry.value;
      }
    } else if (entry.key.startsWith(catPrefix)) {
      const catId = entry.key.slice(catPrefix.length);
      if (!catId) continue;
      if (isDeleted) {
        replica.categories.delete(catId);
      } else {
        replica.categories.set(catId, {
          name: typeof entry.value.name === "string" ? entry.value.name : "",
          order: typeof entry.value.order === "number" ? entry.value.order : 0,
          updatedAt: entry.updatedAt,
        });
      }
    } else if (entry.key.startsWith(itemPrefix)) {
      const contentKey = entry.key.slice(itemPrefix.length);
      if (!contentKey) continue;
      if (isDeleted) {
        replica.items.delete(contentKey);
      } else {
        replica.items.set(contentKey, {
          ...entry.value,
          contentKey:
            typeof entry.value.contentKey === "string"
              ? entry.value.contentKey
              : contentKey,
        });
      }
    }
  }
}

export type SpaceScanFetchOutcome =
  | { status: "ok"; record: SpaceData | null }
  | { status: "unsupported" }
  | { status: "forbidden"; message: string };

export async function scanSpaceDirectoryOnServer(args: {
  server: string;
  token: string;
  userId: string;
  spaceId: string;
  fetchImpl?: typeof fetch;
  pageSize?: number;
  maxPages?: number;
}): Promise<SpaceScanFetchOutcome> {
  const {
    server,
    token,
    userId,
    fetchImpl = fetch,
    pageSize = DEFAULT_SCAN_PAGE_SIZE,
    maxPages = DEFAULT_MAX_SCAN_PAGES,
  } = args;
  const normalizedSpaceId = normalizeSpaceId(args.spaceId);
  if (!normalizedSpaceId || !server || !token || !userId) {
    return { status: "ok", record: null };
  }

  const cleanOrigin = server.replace(/\/+$/, "");
  if (unsupportedScanOrigins.has(cleanOrigin)) {
    return { status: "unsupported" };
  }

  googleSessionRequestToken(token, cleanOrigin);

  const cacheKey = replicaCacheKey(cleanOrigin, userId, normalizedSpaceId);
  const existing = replicaStore.get(cacheKey);
  const since = existing && existing.watermark > 0
    ? Math.max(0, existing.watermark - WATERMARK_OVERLAP_MS)
    : 0;
  const prefix = `sp:${normalizedSpaceId}:`;

  const collectedEntries: Array<{
    key: string;
    value: Record<string, any>;
    updatedAt: number;
    tombstone: boolean;
  }> = [];
  let cursor: string | null = null;
  let latestWatermark = existing?.watermark ?? 0;
  let completedAllPages = false;

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
    const params = new URLSearchParams({
      prefix,
      limit: String(pageSize),
    });
    if (since > 0) params.set("since", String(since));
    if (cursor) params.set("cursor", cursor);

    const response = await fetchImpl(
      `${cleanOrigin}${API_ENDPOINTS.DATABASE}/scan?${params.toString()}`,
      {
        method: "GET",
        ...(isGoogleAuthoritySession(token)
          ? { redirect: "error" as const, credentials: "omit" as const }
          : {}),
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );

    if (response.status === 404 || response.status === 405 || response.status === 501) {
      unsupportedScanOrigins.add(cleanOrigin);
      return { status: "unsupported" };
    }

    if (response.status === 401 || response.status === 403) {
      replicaStore.delete(cacheKey);
      return {
        status: "forbidden",
        message: `Access denied scanning space ${normalizedSpaceId} (${response.status})`,
      };
    }

    if (!response.ok) {
      throw new Error(`db/scan failed on ${cleanOrigin} (${response.status})`);
    }

    const payload = await response.json();
    if (
      !payload ||
      typeof payload !== "object" ||
      payload.schemaVersion !== 1 ||
      !Array.isArray(payload.entries)
    ) {
      unsupportedScanOrigins.add(cleanOrigin);
      return { status: "unsupported" };
    }

    if (typeof payload.serverWatermark === "number" && Number.isFinite(payload.serverWatermark)) {
      latestWatermark = Math.max(latestWatermark, payload.serverWatermark);
    }

    for (const item of payload.entries) {
      collectedEntries.push(item);
    }

    if (payload.hasMore) {
      if (typeof payload.nextCursor !== "string" || !payload.nextCursor) {
        throw new Error(`db/scan on ${cleanOrigin} reported hasMore without nextCursor`);
      }
      cursor = payload.nextCursor;
    } else {
      completedAllPages = true;
      break;
    }
  }

  // Never commit a truncated scan as a complete replica or advance watermark past unread tail keys.
  if (!completedAllPages) {
    throw new Error(
      `db/scan exceeded page budget (${maxPages} pages) for space ${normalizedSpaceId}; refusing partial watermark commit`,
    );
  }

  const replica: CachedSpaceReplica = existing ?? {
    watermark: 0,
    meta: null,
    categories: new Map(),
    items: new Map(),
    tombstoned: false,
  };

  applyScanEntriesToReplica(normalizedSpaceId, replica, collectedEntries, since === 0);
  replica.watermark = latestWatermark;
  replicaStore.set(cacheKey, replica);

  return {
    status: "ok",
    record: projectReplicaToSpaceData(normalizedSpaceId, replica),
  };
}
