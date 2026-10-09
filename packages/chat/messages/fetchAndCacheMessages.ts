import { Message } from "./types";
import { fetchMessages as fetchLocalMessages } from "./fetchMessages";
import { fetchConvMsgs } from "./fetchConvMsgs";
import { swallowNonAbortError } from "app/utils/async";
import { dialogMessageKey } from "database/keys";
import { DataType } from "create/types";
import {
  isTombstoneRecord,
  shouldReplaceWithNextRecord,
} from "database/tombstones";

type MessageRecord = Message & { deletedAt?: string; createdAt?: string | number | Date };

interface FetchAndCacheOptions {
  db: any; // Local LevelDB instance
  dialogId: string;
  dialogKey?: string;
  limit?: number;
  beforeKey?: string;
  token?: string | null;
  remoteServers?: string[];
  signal?: AbortSignal;
}

interface FetchAndCacheMessagesLocalFirstResult {
  localMessages: MessageRecord[];
  remotePromise: Promise<MessageRecord[]>;
  /**
   * Earliest display view: resolves as soon as the first configured source in
   * `remoteServers` — getAllServers order, NOT an authority (it can be a
   * sync/runtime node when currentServer is unset) — settles, merged over the
   * initial local read with the shared tombstone/restore precedence. Resolves
   * `[]` when there is no extra source to wait for, the source yielded
   * nothing, or the call was aborted. `remotePromise` remains the only full
   * reconcile.
   */
  partialPromise: Promise<MessageRecord[]>;
  /**
   * Winning tombstone records from the full reconcile merge, keyed by id.
   * Populated by the time `remotePromise` settles. The init flow uses it as the
   * only deletion evidence for late removal — absence from one page is not proof.
   */
  finalTombstonesById: Map<string, MessageRecord>;
  earlyReturned: boolean;
}

const sortByCreatedAtDesc = (a: MessageRecord, b: MessageRecord): number => {
  const aCreated = a && typeof a === "object" && "createdAt" in a ? a.createdAt : undefined;
  const bCreated = b && typeof b === "object" && "createdAt" in b ? b.createdAt : undefined;
  const tA = new Date((aCreated as string | number | Date | undefined) || 0).getTime();
  const tB = new Date((bCreated as string | number | Date | undefined) || 0).getTime();
  return tB - tA;
};

/**
 * Visible-view merge for the early per-source snapshot: newest record per id
 * wins under the shared tombstone/restore precedence (database/tombstones),
 * tombstones are hidden. The full reconcile below keeps its own cache-tracking
 * loop but shares the same precedence helper and comparator, so this stays a
 * strict subset view — never a second merge truth.
 */
const mergeVisibleRecords = (
  seed: MessageRecord[],
  incoming: MessageRecord[],
): MessageRecord[] => {
  const byId = new Map<string, MessageRecord>();
  const put = (m: MessageRecord | null | undefined) => {
    if (!m || !m.id) return;
    const existing = byId.get(m.id);
    if (existing && !shouldReplaceWithNextRecord(m, existing)) return;
    byId.set(m.id, m);
  };
  seed.forEach(put);
  incoming.forEach(put);
  return Array.from(byId.values())
    .filter((message) => !isTombstoneRecord(message))
    .sort(sortByCreatedAtDesc);
};

export const fetchAndCacheMessagesLocalFirst = async ({
  db,
  dialogId,
  dialogKey,
  // Default: full dialog history (no 50-message window that blinds multi-turn agents).
  limit,
  beforeKey,
  token,
  remoteServers = [],
  signal,
}: FetchAndCacheOptions): Promise<FetchAndCacheMessagesLocalFirstResult> => {
  const startedAt =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  // 1. local query
  const localPromise = fetchLocalMessages(db, dialogId, {
    limit,
    beforeKey,
    throwOnError: false,
    includeDeleted: true,
  }).catch(() => [] as MessageRecord[]);

  // 2. remote query — every source starts in parallel; index 0 is the current
  // source (getAllServers order) and also backs the early partial view.
  const serverPromises: Promise<MessageRecord[]>[] =
    token && remoteServers.length > 0
      ? remoteServers.map((server) =>
          swallowNonAbortError(
            fetchConvMsgs(
              server,
              token as string,
              { dialogId, dialogKey, limit, beforeKey },
              { signal },
            ),
            [] as MessageRecord[],
            undefined,
          ),
        )
      : [];
  const remotePromise = Promise.all(serverPromises).then(
    (results) => results.flat() as MessageRecord[],
  );

  let localSettledAt: number | null = null;
  const localTimingPromise = localPromise.then((value) => {
    localSettledAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    return value;
  });

  const localMsgs = await localTimingPromise;
  const localMs =
    localSettledAt !== null ? Math.round(localSettledAt - startedAt) : null;
  const earlyReturned = localMsgs.length > 0;

  // 2b. earliest visible view of the first configured source only. Fires only
  // when a slower peer actually exists (>= 2 sources); a single source is
  // already the full reconcile, so the existing mode is kept unchanged there.
  const partialPromise: Promise<MessageRecord[]> = (async () => {
    if (!token || remoteServers.length < 2) return [] as MessageRecord[];
    const primaryServerPromise = serverPromises[0];
    if (!primaryServerPromise) return [] as MessageRecord[];
    try {
      const [seedLocal, primaryMsgs] = await Promise.all([
        localTimingPromise,
        primaryServerPromise,
      ]);
      if (signal?.aborted) return [] as MessageRecord[];
      if (!primaryMsgs || primaryMsgs.length === 0) return [] as MessageRecord[];
      // Re-read local after the primary source settles: tombstone/restore/
      // stream-end writes that landed while it was in flight must not be
      // overwritten by the stale seed snapshot. On read failure, fall back to
      // the primary-only view instead of the stale seed.
      const freshLocal = await fetchLocalMessages(db, dialogId, {
        limit,
        beforeKey,
        throwOnError: false,
        includeDeleted: true,
      }).catch(() => [] as MessageRecord[]);
      if (signal?.aborted) return [] as MessageRecord[];
      return mergeVisibleRecords(freshLocal, primaryMsgs);
    } catch {
      // Best-effort early view; the full reconcile below reports errors.
      return [] as MessageRecord[];
    }
  })();

  // 3. background remote merge + persist
  // Tombstones that win the full merge, exposed as deletion evidence for the
  // init flow (absence from a page alone must never drive a removal).
  const finalTombstonesById = new Map<string, MessageRecord>();
  const remotePromiseWithMerge = (async () => {
    let remoteSettledAt: number | null = null;
    const remoteMsgs = await remotePromise.then((value) => {
      remoteSettledAt =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      return value;
    });

    // Re-read local after remote settles so concurrent messageStreamEnd writes
    // (quick-chat first turn) are not lost when remote is empty/stale.
    const freshLocalMsgs = await fetchLocalMessages(db, dialogId, {
      limit,
      beforeKey,
      throwOnError: false,
      includeDeleted: true,
    }).catch(() => [] as MessageRecord[]);

    const uniqueMap = new Map<string, MessageRecord>();
    const changedMessagesToCache = new Map<string, MessageRecord>();
    const put = (m: MessageRecord | null | undefined, trackChange = false) => {
      if (!m || !m.id) return;
      const existing = uniqueMap.get(m.id);
      if (existing && !shouldReplaceWithNextRecord(m, existing)) return;
      uniqueMap.set(m.id, m);
      if (trackChange) changedMessagesToCache.set(m.id, m);
    };
    // Seed with initial local, then fresher local, then remote (remote may track cache writes).
    localMsgs.forEach((m) => put(m));
    freshLocalMsgs.forEach((m) => put(m));
    remoteMsgs.forEach((m) => put(m, true));

    for (const [recordId, record] of uniqueMap) {
      if (isTombstoneRecord(record)) finalTombstonesById.set(recordId, record);
    }

    if (changedMessagesToCache.size > 0) {
      try {
        const ops = Array.from(changedMessagesToCache.values()).map((msg) => {
          let key = msg.dbKey || (msg as MessageRecord).dbKey;

          if (!key) {
            key = dialogMessageKey(dialogId, msg.id);
          }

          return {
            type: "put",
            key,
            value: {
              ...msg,
              dbKey: key,
              type: DataType.MSG,
            },
          };
        });

        await db.batch(ops);
      } catch {
        // Silently ignore cache write errors
      }
    }

    console.info("[fetchAndCacheMessages-perf]", {
      dialogId,
      localMs,
      remoteMs:
        remoteSettledAt !== null
          ? Math.round(remoteSettledAt - startedAt)
          : null,
      totalMs: Math.round(
        (typeof performance !== "undefined" ? performance.now() : Date.now()) -
          startedAt,
      ),
      localCount: localMsgs.length,
      remoteCount: remoteMsgs.length,
      remoteServerCount: remoteServers.length,
      hasToken: !!token,
      earlyReturned,
    });

    return Array.from(uniqueMap.values())
      .filter((message) => !isTombstoneRecord(message))
      .sort(sortByCreatedAtDesc);
  })();

  if (!earlyReturned) {
    const mergedMessages = await remotePromiseWithMerge;
    return {
      localMessages: mergedMessages,
      remotePromise: Promise.resolve(mergedMessages),
      partialPromise,
      finalTombstonesById,
      earlyReturned: false,
    };
  }

  return {
    localMessages: localMsgs,
    remotePromise: remotePromiseWithMerge,
    partialPromise,
    finalTombstonesById,
    earlyReturned: true,
  };
};

export const fetchAndCacheMessages = async (
  options: FetchAndCacheOptions,
): Promise<Message[]> => {
  const { remotePromise } = await fetchAndCacheMessagesLocalFirst(options);
  return remotePromise;
};
