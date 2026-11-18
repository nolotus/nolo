import fs from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { toErrorMessage } from "core/errorMessage";
import {
  createCliAuthorityBrokerClient,
  createCliAuthorityBrokerSocketInvoker,
  isCliAuthorityBrokerTimeoutError,
  isCliAuthorityBrokerUnavailableError,
} from "../database-engine/cliAuthorityBrokerClient";
import type { CliAuthorityBrokerClientOptions } from "../database-engine/cliAuthorityBrokerClient";
import {
  getOrCreateCliAuthorityBrokerServer,
} from "../database-engine/cliAuthorityBrokerServer";
import type { CliAuthorityBrokerServerOptions } from "../database-engine/cliAuthorityBrokerServer";
import {
  resolveCliAuthorityBrokerEndpoint,
  resolveCliAuthorityBrokerHealthPath,
  resolveCliAuthorityBrokerMetadataPath,
} from "../database-engine/cliAuthorityStoreDriver";
import { isLevelLockError } from "../database/levelLockError";
import { resolveNoloHome } from "../database-engine/dbPath";
import type {
  AuthorityBatchOperation,
  AuthorityIteratorOptions,
  AuthorityStore,
} from "../database-engine/authorityStoreTypes";
import { createLevelAuthorityStore } from "../database-engine/levelAuthorityStore";
import { createLegacyServerDb } from "../database-engine/legacyServerDb";

type EnvLike = Record<string, string | undefined>;

type ResolveCliLocalRuntimeAuthorityOptions = {
  env?: EnvLike;
  homeDir?: string;
};

function ensureDbParentDir(dbPath: string) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

function findCliAuthorityCorruption(error: unknown): unknown {
  const seen = new Set<unknown>();
  let current = error;
  while (current && !seen.has(current)) {
    seen.add(current);
    if ((current as { code?: unknown }).code === "LEVEL_CORRUPTION" || /Corruption:|missing files/i.test(toErrorMessage(current))) return current;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

function throwCliAuthorityStartupError(error: unknown): never {
  const corruption = findCliAuthorityCorruption(error);
  if (corruption) {
    throw new Error(`Local authority database corruption: ${toErrorMessage(corruption)}`, { cause: error });
  }
  throw error;
}

/** Level lock (shared pure seam) plus CLI broker bind/start contention shapes. */
function isCliAuthorityLockError(error: unknown) {
  if (findCliAuthorityCorruption(error)) return false;
  const seen = new Set<unknown>();
  let current = error;
  while (current && !seen.has(current)) {
    seen.add(current);
    if (isLevelLockError(current)) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return /EADDRINUSE|Failed to listen/i.test(toErrorMessage(error));
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveCliLocalRuntimeDbPath(options: ResolveCliLocalRuntimeAuthorityOptions = {}) {
  return path.join(
    resolveNoloHome({
      env: options.env,
      homeDir: options.homeDir,
    }),
    "data",
    "leveldb"
  );
}

const DEFAULT_ATTACH_BACKOFF_MS = [100, 200, 400, 800] as const;
const DEFAULT_ATTACH_RETRY_BUDGET_MS = 9_000;

function findOwnerPid(error: unknown): number | undefined {
  const seen = new Set<unknown>();
  let current = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const pid = (current as { ownerPid?: unknown }).ownerPid;
    if (typeof pid === "number" && Number.isInteger(pid) && pid > 0) {
      return pid;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

function isTransientBrokerOpenError(error: unknown): boolean {
  return (
    isCliAuthorityBrokerUnavailableError(error) ||
    isCliAuthorityBrokerTimeoutError(error)
  );
}

type CliAuthorityBrokerConnectDeps = {
  createClient: (options: CliAuthorityBrokerClientOptions) => AuthorityStore;
  startBroker: (options: CliAuthorityBrokerServerOptions) => Promise<unknown>;
  sleep: (ms: number) => Promise<void>;
  /**
   * PERF: 快速路径开关——先尝试直接 open 连到已有 broker，跳过 startBroker
   * 的 LevelDB open + lock 检测。生产默认 true；测试 mock 的 open 不做真实
   * socket 连接，传 false 跳过快速路径走原有 startBroker 流程。
   */
  useFastPath?: boolean;
  /** Total retry/backoff budget (ms) when lock or endpoint contention indicates a live owner. */
  attachRetryBudgetMs?: number;
  /** Backoff steps (ms); final step repeats until budget is exhausted. */
  attachBackoffMs?: readonly number[];
};

const defaultCliAuthorityBrokerConnectDeps: CliAuthorityBrokerConnectDeps = {
  createClient: (options) => createCliAuthorityBrokerClient(options),
  startBroker: (options) => getOrCreateCliAuthorityBrokerServer(options),
  sleep,
  useFastPath: true,
};

export async function connectCliAuthorityBroker(args: {
  endpoint: string;
  metadataPath: string;
  healthPath: string;
  dbPath: string;
  deps?: Partial<CliAuthorityBrokerConnectDeps>;
}) {
  const deps: CliAuthorityBrokerConnectDeps = {
    ...defaultCliAuthorityBrokerConnectDeps,
    ...args.deps,
  };

  async function connectClient() {
    const client = deps.createClient({
      endpoint: args.endpoint,
      invoke: createCliAuthorityBrokerSocketInvoker({ endpoint: args.endpoint }),
    });

    const backoffSchedule = deps.attachBackoffMs?.length
      ? deps.attachBackoffMs
      : DEFAULT_ATTACH_BACKOFF_MS;
    const retryBudgetMs = deps.attachRetryBudgetMs ?? DEFAULT_ATTACH_RETRY_BUDGET_MS;
    let waitedMs = 0;
    let backoffStep = 0;
    let lastAttachError: unknown;

    const waitBackoff = async () => {
      if (waitedMs >= retryBudgetMs) return false;
      const delay = backoffSchedule[Math.min(backoffStep, backoffSchedule.length - 1)]!;
      if (waitedMs > 0 && waitedMs + delay > retryBudgetMs) return false;
      backoffStep += 1;
      const startedAt = Date.now();
      await deps.sleep(delay);
      waitedMs += Math.max(delay, Date.now() - startedAt);
      return true;
    };

    async function attachToExistingBroker(attempts: number) {
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        if (!(await waitBackoff())) return false;
        const probeStartedAt = Date.now();
        try {
          await client.open();
          return true;
        } catch (error) {
          waitedMs += Date.now() - probeStartedAt;
          if (!isTransientBrokerOpenError(error)) throw error;
          lastAttachError = error;
        }
      }
      return false;
    }

    // PERF: 快速路径——先尝试直接 open 连到已有 broker。如果 broker 已
    // 存在（TUI/daemon/之前的 agent run 启动的），open 会立即成功，跳过
    // startBroker 的 LevelDB open + lock 检测（实测撞锁路径 ~800ms，
    // 直接 open ~10ms）。若 broker 不存在或因宿主事件循环瞬时繁忙超时，
    // 落入下方的 startBroker + 锁检测/有界退避附着恢复流程。
    if (deps.useFastPath) {
      try {
        await client.open();
        return client;
      } catch (error) {
        if (!isTransientBrokerOpenError(error)) throw error;
        lastAttachError = error;
      }
    }

    try {
      await deps.startBroker({
        endpoint: args.endpoint,
        metadataPath: args.metadataPath,
        healthPath: args.healthPath,
        dbPath: args.dbPath,
        createStore: () => createLevelAuthorityStore(args.dbPath),
      });
      await client.open();
      return client;
    } catch (error) {
      if (!isCliAuthorityLockError(error)) throwCliAuthorityStartupError(error);

      if (await attachToExistingBroker(5)) {
        return client;
      }

      let lastError: unknown = error;
      while (await waitBackoff()) {
        try {
          await deps.startBroker({
            endpoint: args.endpoint,
            metadataPath: args.metadataPath,
            healthPath: args.healthPath,
            dbPath: args.dbPath,
            createStore: () => createLevelAuthorityStore(args.dbPath),
          });
          await client.open();
          return client;
        } catch (retryError) {
          lastError = retryError;
          if (isCliAuthorityLockError(retryError)) {
            if (await attachToExistingBroker(2)) {
              return client;
            }
            continue;
          }
          if (isTransientBrokerOpenError(retryError)) {
            lastAttachError = retryError;
            continue;
          }
          throwCliAuthorityStartupError(retryError);
        }
      }
      const lastMessage = toErrorMessage(lastError);
      const attachMessage = lastAttachError ? toErrorMessage(lastAttachError) : "";
      const portInUse = (
        lastError !== null && typeof lastError === "object" &&
        "code" in lastError && lastError.code === "EADDRINUSE"
      ) || /EADDRINUSE/i.test(lastMessage);
      const ownerPid = findOwnerPid(lastError);
      let detail = "";
      if (portInUse) {
        detail = `: EADDRINUSE (${lastMessage}). The broker endpoint is already in use; check the process using it or set NOLO_CLI_AUTHORITY_BROKER_PORT to a free port for all local CLI processes`;
      } else {
        const parts = [
          ownerPid !== undefined ? `ownerPid=${ownerPid}` : undefined,
          lastMessage || undefined,
          attachMessage && attachMessage !== lastMessage ? `attach=${attachMessage}` : undefined,
        ].filter(Boolean);
        if (parts.length > 0) {
          detail = `: ${parts.join("; ")}`;
        }
      }
      throw new Error(`CLI authority broker could not attach or take ownership for ${args.endpoint}${detail}`, {
        cause: lastError,
      });
    }
  }

  let client = await connectClient();
  let reconnecting: Promise<AuthorityStore> | null = null;

  async function reconnect() {
    reconnecting ??= connectClient();
    try {
      client = await reconnecting;
      return client;
    } finally {
      reconnecting = null;
    }
  }

  async function runWithSelfHealing<T>(
    operation: (activeClient: AuthorityStore) => Promise<T>
  ): Promise<T> {
    try {
      return await operation(client);
    } catch (error) {
      if (!isCliAuthorityBrokerUnavailableError(error)) throw error;
      const recoveredClient = await reconnect();
      return operation(recoveredClient);
    }
  }

  return {
    get location() {
      return client.location;
    },
    get status() {
      return client.status;
    },
    open: () => runWithSelfHealing((activeClient) => activeClient.open()),
    close: () => runWithSelfHealing((activeClient) => activeClient.close()),
    get: (key: string) =>
      runWithSelfHealing((activeClient) => activeClient.get(key)),
    conditionalPut: (key: string, expectedRevision: number | null, value: unknown) =>
      runWithSelfHealing((activeClient) => {
        if (!activeClient.conditionalPut) {
          throw new Error("CLI authority broker does not support conditionalPut");
        }
        return activeClient.conditionalPut(key, expectedRevision, value);
      }),
    put: (key: string, value: unknown) =>
      runWithSelfHealing((activeClient) => activeClient.put(key, value)),
    del: (key: string) =>
      runWithSelfHealing((activeClient) => activeClient.del(key)),
    batchWrite: (ops: AuthorityBatchOperation[]) =>
      runWithSelfHealing((activeClient) => activeClient.batchWrite(ops)),
    createBatch() {
      const ops: AuthorityBatchOperation[] = [];
      return {
        put(key: string, value: unknown) {
          ops.push({ type: "put", key, value });
        },
        del(key: string) {
          ops.push({ type: "del", key });
        },
        write: () =>
          runWithSelfHealing((activeClient) => activeClient.batchWrite(ops)),
      };
    },
    iterator(options: AuthorityIteratorOptions = {}) {
      return (async function* iterate() {
        let activeOptions = options;
        let lastYieldedKey: string | undefined;
        let skipResumeKey = false;
        let recovered = false;

        while (true) {
          try {
            for await (const entry of client.iterator(activeOptions)) {
              if (skipResumeKey && entry[0] === lastYieldedKey) {
                skipResumeKey = false;
                continue;
              }
              skipResumeKey = false;
              lastYieldedKey = entry[0];
              yield entry;
            }
            return;
          } catch (error) {
            if (
              recovered ||
              !isCliAuthorityBrokerUnavailableError(error)
            ) {
              throw error;
            }
            recovered = true;
            await reconnect();
            if (lastYieldedKey === undefined) {
              activeOptions = options;
              continue;
            }
            if (options.reverse) {
              activeOptions = {
                ...options,
                lt: lastYieldedKey,
              };
              continue;
            }
            activeOptions = {
              ...options,
              gte: lastYieldedKey,
            };
            skipResumeKey = true;
          }
        }
      })();
    },
  } satisfies AuthorityStore;
}

export async function getDefaultCliLocalRuntimeAuthority(
  options: ResolveCliLocalRuntimeAuthorityOptions = {}
) {
  // NOLO_HOME says *where this machine keeps its local state*; it is not part
  // of the per-call config a caller curates (auth, model, language). Callers
  // that hand down a partial env — the TUI workspace passes its own env object,
  // and tests routinely pass `{}` — must not silently relocate the database and
  // broker to a different home than the rest of the CLI uses. An explicit
  // NOLO_HOME in the caller's env still wins.
  const ambientNoloHome = process.env.NOLO_HOME?.trim();
  const env = {
    ...(ambientNoloHome ? { NOLO_HOME: ambientNoloHome } : {}),
    ...(options.env ?? process.env),
  };
  const dbPath = resolveCliLocalRuntimeDbPath({
    env,
    homeDir: options.homeDir,
  });
  ensureDbParentDir(dbPath);
  const endpoint = resolveCliAuthorityBrokerEndpoint({
    transport: "tcp",
    env,
    homeDir: options.homeDir,
  });
  const metadataPath = resolveCliAuthorityBrokerMetadataPath({
    transport: "tcp",
    env,
    homeDir: options.homeDir,
  });
  const healthPath = resolveCliAuthorityBrokerHealthPath({
    transport: "tcp",
    env,
    homeDir: options.homeDir,
  });
  return connectCliAuthorityBroker({
    endpoint,
    metadataPath,
    healthPath,
    dbPath,
  });
}

export async function getDefaultCliLocalRuntimeDb(
  options: ResolveCliLocalRuntimeAuthorityOptions = {}
) {
  const authorityStore = await getDefaultCliLocalRuntimeAuthority(options);
  return createLegacyServerDb(authorityStore);
}


/** Narrow lifecycle entry for local MCP consumers: generated, never-reused IDs;
 * no delete, explicit-ID create, or unconditional write capability is exposed.
 * Disabling is an update with enabled:false, not deletion. Callers must not mix raw
 * authority writes into this namespace. No storage-generation/ABA guarantee is made.
 */
export function createCliLocalMcpConnectionRevisionWriter(
  authority: AuthorityStore,
  authenticatedUserId: string,
) {
  if (!authenticatedUserId) throw new Error("Local MCP connection owner is required");
  const prefix = `mcp-private:v1:${encodeURIComponent(authenticatedUserId)}:connection:`;
  const conditionalPut = authority.conditionalPut?.bind(authority);
  if (!conditionalPut) throw new Error("CLI authority broker does not support conditionalPut");
  return {
    async create(value: Record<string, unknown>) {
      const id = randomUUID();
      const result = await conditionalPut(prefix + id, null, { ...value, revision: 1 });
      // A collision is never retried with the same ID or treated as successful creation.
      return { id, ...result };
    },
    async update(id: string, expectedRevision: number, value: Record<string, unknown>) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
          !Number.isSafeInteger(expectedRevision) || expectedRevision < 1 || expectedRevision >= Number.MAX_SAFE_INTEGER) {
        throw new Error("Invalid local MCP connection identity or revision");
      }
      return conditionalPut(prefix + id, expectedRevision, { ...value, revision: expectedRevision + 1 });
    },
  };
}
