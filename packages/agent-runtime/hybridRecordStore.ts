import { toErrorMessage } from "core/errorMessage";
import { asOptionalPositiveFiniteNumber } from "core/optionalPositiveNumber";
import { normalizeServerOrigin } from "core/serverOrigin";

export type HybridRecordKvDb = {
  get(key: string): Promise<any>;
  put(key: string, value: any): Promise<unknown>;
  del(key: string): Promise<unknown>;
  batch(ops: Array<{ type: "put"; key: string; value: any }>): Promise<unknown>;
  iterator(options: { gte: string; lte?: string; lt?: string; reverse?: boolean; limit?: number }): AsyncIterable<[string, any]>;
};

export type HybridRecordStore = {
  read(dbKey: string, options?: { preferredServerOrigin?: string | null; remote?: boolean }): Promise<any>;
  write(dbKey: string, record: any): Promise<any>;
  batch(ops: Array<{ type: "put"; key: string; value: any }>): Promise<unknown>;
  iterator(options: { gte: string; lte?: string; lt?: string; reverse?: boolean; limit?: number }): AsyncIterable<[string, any]>;
};

type HybridRecordStoreDeps = {
  db: HybridRecordKvDb;
  defaultServer: string;
  fallbackServers?: string[];
  authToken?: string;
  fetchImpl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  /** Per-remote-read timeout in ms. Prevents a slow/dead cluster server from
   * blocking the whole read for minutes. Defaults to undefined (no timeout). */
  requestTimeoutMs?: number;
};

function resolveHybridServers(
  defaultServer: string,
  preferredServerOrigin?: string | null,
  fallbackServers: string[] = []
) {
  const raw = [
    preferredServerOrigin || "",
    defaultServer,
    ...fallbackServers,
  ].filter((value) => value.trim().length > 0);
  return [...new Set(raw.map(normalizeServerOrigin))];
}

function normalizeHybridRecord(dbKey: string, record: any, serverOrigin?: string | null) {
  if (!record || typeof record !== "object") return null;
  return {
    ...record,
    dbKey: typeof record.dbKey === "string" && record.dbKey ? record.dbKey : dbKey,
    ...(serverOrigin ? { serverOrigin } : {}),
  };
}

function getHybridRecordTimestamp(record: any): number {
  if (!record || typeof record !== "object") return 0;
  const candidates = [
    record.updatedAt,
    record.updated_at,
    record.createdAt,
    record.created,
    record?.meta?.createdAt,
  ];
  for (const candidate of candidates) {
    const asNumber = asOptionalPositiveFiniteNumber(candidate);
    if (asNumber !== undefined) return asNumber;
    if (typeof candidate === "string" && candidate.trim()) {
      const parsed = asOptionalPositiveFiniteNumber(Date.parse(candidate));
      if (parsed !== undefined) return parsed;
    }
  }
  return 0;
}

function isHybridTombstoneRecord(record: any): boolean {
  if (!record || typeof record !== "object") return false;
  if (typeof record.deletedAt === "string") return record.deletedAt.trim().length > 0;
  return Boolean(record.deletedAt);
}

function shouldReplaceWithHybridRecord(nextRecord: any, currentRecord: any): boolean {
  const nextTs = getHybridRecordTimestamp(nextRecord);
  const currentTs = getHybridRecordTimestamp(currentRecord);
  if (nextTs !== currentTs) return nextTs > currentTs;
  return isHybridTombstoneRecord(nextRecord) && !isHybridTombstoneRecord(currentRecord);
}

function isHybridNotFoundError(error: unknown) {
  const message = toErrorMessage(error);
  return /not found|notfound|leveldb: not found|key not found/i.test(message);
}

async function readHybridLocalRecord(db: HybridRecordKvDb, dbKey: string) {
  try {
    return await db.get(dbKey);
  } catch (error) {
    if (!isHybridNotFoundError(error)) throw error;
    return null;
  }
}

async function fetchHybridRemoteRecord(args: {
  dbKey: string;
  server: string;
  authToken?: string;
  fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  signal?: AbortSignal;
}) {
  const response = await args.fetchImpl(
    `${args.server}/api/v1/db/read/${encodeURIComponent(args.dbKey)}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(args.authToken ? { Authorization: `Bearer ${args.authToken}` } : {}),
      },
      ...(args.signal ? { signal: args.signal } : {}),
    }
  );
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null);
  return normalizeHybridRecord(args.dbKey, payload?.data ?? payload, args.server);
}

export function shouldCacheHybridRemoteRecord(remoteRecord: any, localRecord: any) {
  if (!remoteRecord || typeof remoteRecord !== "object") return false;
  if (!localRecord || typeof localRecord !== "object") return true;
  return shouldReplaceWithHybridRecord(remoteRecord, localRecord);
}

export type SyncServersEnvLike = Record<string, string | undefined>;

/**
 * Parse NOLO_SYNC_SERVERS: comma-separated extra site origins the runtime
 * should consult on local miss (e.g. "https://alpha.nolo.chat,https://us.nolo.chat").
 * Shared by CLI and desktop hybrid stores so extra sites behave identically
 * regardless of which runtime executes the agent.
 */
export function parseSyncServersEnv(env: SyncServersEnvLike | undefined) {
  const raw = env?.NOLO_SYNC_SERVERS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

/** Read 路径远端 fallback 的整体预算（ms），requestTimeoutMs 未传时生效；0/负数=关闭超时。 */
export const DEFAULT_HYBRID_READ_TIMEOUT_MS = 250;

export function createHybridRecordStore(
  deps: HybridRecordStoreDeps
): HybridRecordStore {
  const fetchImpl = deps.fetchImpl ?? fetch;
  // PERF(H2): 本地 miss → 远端 fallback 需要超时保护。未显式配置时默认 250ms
  // （整体预算，跨 server 共享）。注意语义：显式传 requestTimeoutMs（含 desktop
  // 的 300s）也按「整体预算、超时=miss 不 advance」执行——per-server 单次超时
  // 语义已并入共享预算；desktop 单 server 场景等价，多 server 下总预算从
  // N×300s 收敛为 300s（如需放宽可调大 requestTimeoutMs）。
  const requestTimeoutMs = deps.requestTimeoutMs ?? DEFAULT_HYBRID_READ_TIMEOUT_MS;

  return {
    read: async (dbKey, options) => {
      const localRecord = await readHybridLocalRecord(deps.db, dbKey);
      const normalizedLocalRecord = normalizeHybridRecord(dbKey, localRecord);
      if (normalizedLocalRecord && options?.remote !== true) return normalizedLocalRecord;
      if (options?.remote === false) return null;

      // 远端 fallback 整体预算：每个 server 尝试只用剩余预算（AbortSignal.timeout）。
      // 超时/失败沿用既有 miss 语义（进 catch → 下一个 server / 返回本地），
      // 不新增重试；预算耗尽后不再发起新的远端请求，按 miss 返回本地结果。
      // requestTimeoutMs <= 0 → 关闭超时（保持历史行为）。
      const fallbackDeadlineMs =
        requestTimeoutMs > 0 ? Date.now() + requestTimeoutMs : null;

      for (const server of resolveHybridServers(
        deps.defaultServer,
        options?.preferredServerOrigin,
        deps.fallbackServers
      )) {
        const remainingMs =
          fallbackDeadlineMs === null
            ? null
            : fallbackDeadlineMs - Date.now();
        if (remainingMs !== null && remainingMs <= 0) break;

        let remoteRecord = null;
        try {
          remoteRecord = await fetchHybridRemoteRecord({
            dbKey,
            server,
            authToken: deps.authToken,
            fetchImpl,
            ...(remainingMs !== null
              ? { signal: AbortSignal.timeout(remainingMs) }
              : {}),
          });
        } catch {
          // network error or timeout: advance to the next server sequentially
          continue;
        }
        if (!remoteRecord) continue;
        if (shouldCacheHybridRemoteRecord(remoteRecord, localRecord)) {
          await deps.db.put(dbKey, remoteRecord);
          return remoteRecord;
        }
        return normalizedLocalRecord ?? remoteRecord;
      }

      return normalizedLocalRecord ?? null;
    },
    write: async (dbKey, record) => {
      const nextRecord = normalizeHybridRecord(dbKey, record) ?? { dbKey };
      await deps.db.put(dbKey, nextRecord);
      return nextRecord;
    },
    batch: async (ops) => deps.db.batch(ops.map((op) => ({
      ...op,
      value: normalizeHybridRecord(op.key, op.value) ?? { dbKey: op.key },
    }))),
    iterator: (options) => deps.db.iterator(options),
  };
}
