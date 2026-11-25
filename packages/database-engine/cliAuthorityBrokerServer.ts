import fs from "node:fs";
import path from "node:path";
import { createServer, type AddressInfo, type Server, type Socket } from "node:net";
import { createServer as createTlsServer, type SecureContextOptions } from "node:tls";
import { toErrorMessage } from "core/errorMessage";

import { createCliAuthorityBrokerClient } from "./cliAuthorityBrokerClient";
import type {
  AuthorityIteratorOptions,
  AuthorityStore,
} from "./authorityStoreTypes";
import {
  isLevelCorruptionError,
  recoverCorruptedLevelDb,
} from "./levelDbCorruptionRecovery";
import {
  acquireLevelDbOwnershipLock,
  type LevelDbOwnershipLock,
} from "./levelDbOwnershipLock";
import type {
  CliAuthorityBrokerBatchGetItem,
  CliAuthorityBrokerIteratorPage,
  CliAuthorityBrokerRequest,
  CliAuthorityBrokerResponse,
} from "./cliAuthorityBrokerTypes";

const brokerRegistry = new Map<string, Promise<CliAuthorityBrokerServerHandle>>();
const databaseOwners = new Map<string, string>();
const DEFAULT_ITERATOR_LIMIT = 200;
export const MAX_BROKER_FRAME_CHARS = 64 * 1024 * 1024;

export type CliAuthorityBrokerServerOptions = {
  endpoint: string;
  /** Native stores must declare their path before construction (Level auto-opens). */
  dbPath?: string;
  createStore: () => AuthorityStore | Promise<AuthorityStore>;
  metadataPath?: string;
  healthPath?: string;
  now?: () => number;
  transportMode?: "socket" | "inprocess";
  keepProcessAlive?: boolean;
  tls?: SecureContextOptions;
  supervisorPid?: number;
  /** Override maximum single-frame size (defaults to MAX_BROKER_FRAME_CHARS). */
  maxFrameChars?: number;
};

export type CliAuthorityBrokerServerHandle = {
  endpoint: string;
  listeningEndpoint: string;
  authorityStore: AuthorityStore;
  request(request: CliAuthorityBrokerRequest): Promise<CliAuthorityBrokerResponse>;
  close(): Promise<void>;
};

type BrokerListenTarget =
  | { kind: "unix"; path: string }
  | { kind: "tcp"; host: string; port: number };

function resolveBrokerListenTarget(endpoint: string): BrokerListenTarget {
  if (endpoint.startsWith("unix://")) {
    return { kind: "unix", path: endpoint.slice("unix://".length) };
  }
  if (endpoint.startsWith("tcp://")) {
    const url = new URL(endpoint);
    return {
      kind: "tcp",
      host: url.hostname,
      port: Number(url.port),
    };
  }
  throw new Error(`Unsupported CLI authority broker endpoint: ${endpoint}`);
}

function buildListeningEndpoint(server: Server, target: BrokerListenTarget) {
  if (target.kind === "unix") {
    return `unix://${target.path}`;
  }
  const address = server.address();
  if (!address || typeof address === "string") {
    return `tcp://${target.host}:${target.port}`;
  }
  const info = address as AddressInfo;
  return `tcp://${target.host}:${info.port}`;
}

function ensureParentDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJsonFile(filePath: string | undefined, data: Record<string, unknown>) {
  if (!filePath) return;
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function removeFileIfPresent(filePath: string | undefined) {
  if (!filePath) return;
  try {
    fs.rmSync(filePath, { force: true });
  } catch {}
}

async function buildIteratorPage(
  store: AuthorityStore,
  request: Extract<CliAuthorityBrokerRequest, { type: "iterator" }>
): Promise<CliAuthorityBrokerIteratorPage> {
  const base = request.options ?? {};
  const reverse = base.reverse === true;
  const cursor = typeof request.cursor === "string" && request.cursor.length > 0
    ? request.cursor
    : undefined;
  const iterOptions: AuthorityIteratorOptions = { ...base };

  if (cursor) {
    if (reverse) {
      // Tighten upper bound with `lt: cursor` without relaxing any existing `lte`/`lt`.
      // Note: `level` gives `lte` precedence over `lt`, so drop `lte` whenever `cursor <= lte`.
      if (iterOptions.lte !== undefined && iterOptions.lte < cursor) {
        // Existing `lte` is already strictly smaller than `cursor`.
      } else {
        delete iterOptions.lte;
        iterOptions.lt =
          iterOptions.lt !== undefined && iterOptions.lt < cursor
            ? iterOptions.lt
            : cursor;
      }
    } else {
      // Tighten lower bound with `gt: cursor` without relaxing any existing `gte`/`gt`.
      // Note: `level` gives `gte` precedence over `gt`, so drop `gte` whenever `cursor >= gte`.
      if (iterOptions.gte !== undefined && iterOptions.gte > cursor) {
        // Existing `gte` is already strictly greater than `cursor`.
      } else {
        delete iterOptions.gte;
        iterOptions.gt =
          iterOptions.gt !== undefined && iterOptions.gt > cursor
            ? iterOptions.gt
            : cursor;
      }
    }
  }

  const limit = Math.max(0, Math.floor(request.limit ?? DEFAULT_ITERATOR_LIMIT));
  const entries: Array<[string, unknown]> = [];
  let hasMore = false;

  for await (const entry of store.iterator(iterOptions)) {
    const [key] = entry as [string, unknown];
    if (cursor && (reverse ? key >= cursor : key <= cursor)) {
      continue;
    }
    if (base.gt !== undefined && key <= base.gt) {
      continue;
    }
    if (entries.length >= limit) {
      hasMore = true;
      break;
    }
    entries.push(entry as [string, unknown]);
  }

  const lastEntry = entries.at(-1) ?? null;
  return {
    entries,
    nextCursor: lastEntry ? lastEntry[0] : null,
    done: !hasMore,
  };
}

function createErrorResponse(error: unknown): CliAuthorityBrokerResponse {
  if (
    typeof error === "object" &&
    error !== null &&
    typeof (error as any).code === "string" &&
    typeof (error as any).message === "string"
  ) {
    return {
      ok: false,
      error: {
        code: (error as any).code,
        message: (error as any).message,
        retryable: (error as any).retryable === true,
      },
    };
  }
  return {
    ok: false,
    error: {
      code: "BROKER_INTERNAL_ERROR",
      message: toErrorMessage(error),
    },
  };
}

type OwnerQueue = { tail: Promise<unknown>; active: Set<Promise<unknown>>; closed: boolean };
const ownerQueues = new WeakMap<AuthorityStore, OwnerQueue>();
function ownerQueue(store: AuthorityStore): OwnerQueue {
  let state = ownerQueues.get(store);
  if (!state) { state = { tail: Promise.resolve(), active: new Set(), closed: false }; ownerQueues.set(store, state); }
  return state;
}

function validConditionalPut(request: Record<string, unknown>): boolean {
  const expected = request.expectedRevision;
  const value = request.value;
  return Object.keys(request).length === 4 &&
    Object.keys(request).every((key) => ["type", "key", "expectedRevision", "value"].includes(key)) &&
    typeof request.key === "string" && request.key.length > 0 &&
    (expected === null || (Number.isSafeInteger(expected) && (expected as number) >= 0 && (expected as number) < Number.MAX_SAFE_INTEGER)) &&
    typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.hasOwn(value, "revision") &&
    (value as { revision: unknown }).revision === (expected === null ? 1 : (expected as number) + 1);
}

// One write queue per native owner, shared by sockets, in-process dispatch and exposed writes.
// Reads bypass the write queue; lifecycle admission tracks both reads and writes.
// Rejected operations do not poison the tail. Admission closes before native close drains it.
export function dispatchCliAuthorityBrokerRequest(
  store: AuthorityStore,
  request: CliAuthorityBrokerRequest
): Promise<CliAuthorityBrokerResponse> {
  const state = ownerQueue(store);
  if (state.closed) return Promise.resolve({ ok: false, error: { code: "BROKER_CLOSING", message: "Authority broker is closing" } });
  const isRead =
    request?.type === "get" ||
    request?.type === "batchGet" ||
    request?.type === "status" ||
    request?.type === "iterator" ||
    request?.type === "close";
  const execute = () => executeCliAuthorityBrokerRequest(store, request);
  const result = isRead ? Promise.resolve().then(execute) : state.tail.then(execute);
  if (!isRead) state.tail = result.catch(() => undefined);
  // Include scheduled reads, not just ones already inside native methods.
  const settled = result.then(() => undefined, () => undefined);
  state.active.add(settled);
  void settled.then(() => state.active.delete(settled));
  return result;
}

async function executeCliAuthorityBrokerRequest(
  store: AuthorityStore,
  request: CliAuthorityBrokerRequest
): Promise<CliAuthorityBrokerResponse> {
  try {
    if (!request || typeof request !== "object") {
      return { ok: false, error: { code: "BROKER_INVALID_REQUEST", message: "Invalid broker request" } };
    }
    switch (request.type) {
      case "conditionalPut": {
        if (!validConditionalPut(request)) {
          return { ok: false, error: { code: "BROKER_INVALID_REQUEST", message: "Invalid conditionalPut request" } };
        }
        let current: unknown;
        try { current = await store.get(request.key); }
        catch (error) {
          if ((error as { code?: string })?.code !== "LEVEL_NOT_FOUND") throw error;
        }
        const matches = request.expectedRevision === null
          ? current === undefined
          : typeof current === "object" && current !== null && !Array.isArray(current) &&
            Object.hasOwn(current, "revision") &&
            (current as { revision: unknown }).revision === request.expectedRevision;
        if (!matches) return { ok: true, result: { type: "conditionalPut", status: "conflict" } };
        await store.put(request.key, request.value);
        return { ok: true, result: { type: "conditionalPut", status: "updated" } };
      }
      case "status":
        return { ok: true, result: { type: "status", ...(request.includeLocation && store.location ? { location: store.location } : {}) } };
      case "open":
        await store.open();
        return { ok: true, result: { type: "open" } };
      case "close":
        // A logical client must never close the shared native owner.
        // Only the server handle owns the store lifecycle.
        return { ok: true, result: { type: "close" } };
      case "get":
        return { ok: true, result: { type: "get", value: await store.get(request.key) } };
      case "batchGet": {
        if (!Array.isArray(request.keys) || !request.keys.every((key) => typeof key === "string")) {
          return { ok: false, error: { code: "BROKER_INVALID_REQUEST", message: "Invalid batchGet request" } };
        }
        const items = await Promise.all(
          request.keys.map(async (key): Promise<CliAuthorityBrokerBatchGetItem> => {
            try {
              return { ok: true, value: await store.get(key) };
            } catch (error) {
              const errRes = createErrorResponse(error);
              return {
                ok: false,
                error: errRes.ok
                  ? { code: "BROKER_INTERNAL_ERROR", message: "Unknown error" }
                  : errRes.error,
              };
            }
          })
        );
        return { ok: true, result: { type: "batchGet", items } };
      }
      case "put":
        await store.put(request.key, request.value);
        return { ok: true, result: { type: "put" } };
      case "del":
        await store.del(request.key);
        return { ok: true, result: { type: "del" } };
      case "batchWrite":
        await store.batchWrite(request.ops);
        return { ok: true, result: { type: "batchWrite" } };
      case "iterator":
        return {
          ok: true,
          result: {
            type: "iterator",
            page: await buildIteratorPage(store, request),
          },
        };
      default:
        return { ok: false, error: { code: "BROKER_UNSUPPORTED_REQUEST", message: "Unsupported broker request" } };
    }
  } catch (error) {
    if (request?.type === "conditionalPut") {
      return { ok: false, error: { code: "BROKER_CONDITIONAL_WRITE_FAILED", message: "Conditional write failed" } };
    }
    return createErrorResponse(error);
  }
}

async function openAuthorityStoreWithCorruptionRecovery(
  options: CliAuthorityBrokerServerOptions,
  track: (store: AuthorityStore | undefined) => void
): Promise<AuthorityStore> {
  let attemptStore: AuthorityStore | undefined;
  try {
    attemptStore = await options.createStore();
    track(attemptStore);
    await attemptStore.open();
    return attemptStore;
  } catch (error) {
    // 没有 dbPath（内存 store / 测试）时绝不碰磁盘。corruption 也绝不按锁错误
    // 重试：重试会再构造一个 native owner，把损坏扩大。
    if (!options.dbPath || !isLevelCorruptionError(error)) throw error;

    if (attemptStore) {
      // 必须先关掉失败的 native 句柄，否则 rename/repair 会撞上仍被占用的
      // LOCK/表文件；关不掉就停下，绝不改磁盘。
      try {
        await attemptStore.close();
      } catch (closeError) {
        throw Object.assign(
          new Error(
            `LevelDB corruption detected at ${options.dbPath}, but the failed database handle could not be closed; ` +
              `on-disk files were left untouched. Stop every Nolo process and retry: ${toErrorMessage(closeError)}`,
            { cause: closeError }
          ),
          { code: "LEVEL_CORRUPTION" }
        );
      }
      track(undefined);
      attemptStore = undefined;
    }

    const { backupPath } = await recoverCorruptedLevelDb({
      dbPath: options.dbPath,
      now: options.now,
    });

    try {
      attemptStore = await options.createStore();
      track(attemptStore);
      await attemptStore.open();
      return attemptStore;
    } catch (retryError) {
      throw Object.assign(
        new Error(
          `Local database corruption at ${options.dbPath} was preserved at ${backupPath}, ` +
            `but reopening the repaired copy failed: ${toErrorMessage(retryError)}. ` +
            `Do not reinstall Nolo and do not delete ${path.join(options.dbPath, "LOCK")}; ` +
            `the preserved original database is at ${backupPath}.`,
          { cause: retryError }
        ),
        { code: "LEVEL_CORRUPTION", backupPath }
      );
    }
  }
}

async function createBrokerHandle(
  options: CliAuthorityBrokerServerOptions
): Promise<CliAuthorityBrokerServerHandle> {
  const target = resolveBrokerListenTarget(options.endpoint);
  const socketMode = (options.transportMode ?? "socket") === "socket";
  let store: AuthorityStore | undefined;
  let ownershipLock: LevelDbOwnershipLock | undefined;
  const sockets = new Set<Socket>();
  const onConnection = (socket: Socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
    socket.on("error", () => {});
    // Binding reserves the endpoint before opening the native store. Never serve
    // requests from that startup window against an unready/partially open store.
    if (!storeReady || !store) {
      socket.once("data", () => {
        socket.end(`${JSON.stringify({ ok: false, error: { code: "BROKER_UNAVAILABLE", message: "CLI authority broker is starting", retryable: true } })}\n`);
      });
      return;
    }
    bindSocketRequestHandler({ socket, store, maxFrameChars: options.maxFrameChars });
  };
  const server = options.tls
    ? createTlsServer({ ...options.tls, requestCert: true, rejectUnauthorized: true, handshakeTimeout: 5_000 }, onConnection)
    : createServer(onConnection);
  let storeReady = false;
  try {
    if (socketMode) {
      if (target.kind === "unix") ensureParentDir(target.path);
      // Never unlink an existing Unix socket: it may belong to a live owner.
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        const onListening = () => {
          server.off("error", reject);
          resolve();
        };
        if (target.kind === "unix") server.listen(target.path, onListening);
        else server.listen(target.port, target.host, onListening);
      });
      if (!options.keepProcessAlive) server.unref();
    }
    if (options.dbPath) {
      // 端口已经属于本进程之后才碰 db 目录：抢不到端口时连锁文件都不创建。
      // 这是进程内 databaseOwners 之外的跨进程单写者闸门，native open 之前生效。
      ownershipLock = acquireLevelDbOwnershipLock(options.dbPath);
    }
    store = await openAuthorityStoreWithCorruptionRecovery(options, (created) => {
      store = created;
    });
    storeReady = true;
    const readyStore = store;

    const now = options.now ?? Date.now;
    const listeningEndpoint = (options.transportMode ?? "socket") === "socket"
      ? buildListeningEndpoint(server, target)
      : options.endpoint;
    writeJsonFile(options.metadataPath, {
      pid: process.pid,
      ...(options.tls ? { transportSecurity: "mutual-tls" } : {}),
      ...(options.supervisorPid === undefined ? {} : { supervisorPid: options.supervisorPid }),
      endpoint: listeningEndpoint,
      location: readyStore.location ?? listeningEndpoint,
      startedAt: new Date(now()).toISOString(),
    });
    writeJsonFile(options.healthPath, {
      ok: true,
      pid: process.pid,
      endpoint: listeningEndpoint,
      checkedAt: new Date(now()).toISOString(),
    });

    let closing: Promise<void> | undefined;
    return {
      endpoint: options.endpoint,
      listeningEndpoint,
      authorityStore: {
        ...createCliAuthorityBrokerClient({
          endpoint: listeningEndpoint,
          invoke: (request) => dispatchCliAuthorityBrokerRequest(readyStore, request),
        }),
        get location() { return readyStore.location; },
        get status() { return readyStore.status; },
      },
      request(request: CliAuthorityBrokerRequest) {
        return dispatchCliAuthorityBrokerRequest(readyStore, request);
      },
      async close() {
        closing ??= (async () => {
          storeReady = false;
          const queue = ownerQueue(readyStore);
          queue.closed = true;
          await Promise.all(queue.active);
          for (const socket of sockets) socket.destroy();
          if (server.listening) {
            await new Promise<void>((resolve, reject) => {
              server.close((error) => error ? reject(error) : resolve());
            });
          }
          await readyStore.close();
          brokerRegistry.delete(options.endpoint);
          releaseDatabaseOwnership(options);
          // 原生 store 关闭之后才放手应用级锁：反过来的话，新 owner 会在旧
          // native 句柄还开着时抢到锁并 open。
          ownershipLock?.release();
          ownershipLock = undefined;
          removeFileIfPresent(options.metadataPath);
          removeFileIfPresent(options.healthPath);
        })().catch((error) => {
          // Retain ownership if native close fails. A retry must never construct
          // a second Level while the first may still hold native resources.
          closing = undefined;
          throw error;
        });
        return closing;
      },
    };
  } catch (error) {
    storeReady = false;
    // Constructor/open or metadata failures must not strand a listener or store.
    for (const socket of sockets) socket.destroy();
    if (server.listening) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (store) {
      try {
        await store.close();
      } catch (closeError) {
        throw Object.assign(new AggregateError([error, closeError], "Broker startup failed and the native authority store could not close"), { retainAuthorityOwnership: true });
      }
    }
    // 只有本 handle 真正拿到锁时才释放（acquire 失败时 ownershipLock 仍是 undefined）。
    // 上面的 close 失败会提前抛出，锁文件按「保留归属」语义留在原处。
    ownershipLock?.release();
    throw error;
  }
}

function isMultiplexedEnvelope(
  value: unknown
): value is { id: number | string; request: CliAuthorityBrokerRequest } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    (typeof record.id === "number" || typeof record.id === "string") &&
    "request" in record &&
    typeof record.request === "object" &&
    record.request !== null &&
    !("type" in record)
  );
}

function firstNonWhitespaceChar(text: string): string | undefined {
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      continue;
    }
    return ch;
  }
  return undefined;
}

function bindSocketRequestHandler(args: {
  socket: Socket;
  store: AuthorityStore;
  maxFrameChars?: number;
}) {
  const maxFrameChars = args.maxFrameChars ?? MAX_BROKER_FRAME_CHARS;
  let buffer = "";
  let inFlight = 0;
  let clientEnded = false;
  let sawLegacyBareRequest = false;
  let protocolRejected = false;
  let currentFrameVerifiedObjectStart = false;
  args.socket.setEncoding("utf8");
  args.socket.setNoDelay?.(true);

  const maybeFinishHalfOpen = () => {
    if (clientEnded && inFlight === 0 && !args.socket.destroyed) {
      args.socket.end();
    }
  };

  const rejectAndDestroy = () => {
    protocolRejected = true;
    buffer = "";
    currentFrameVerifiedObjectStart = false;
    if (!args.socket.destroyed) {
      args.socket.destroy();
    }
  };

  const handleParsedPayload = async (parsed: Record<string, unknown>) => {
    inFlight += 1;
    args.socket.ref?.();

    if (isMultiplexedEnvelope(parsed)) {
      let response: CliAuthorityBrokerResponse;
      try {
        response = await dispatchCliAuthorityBrokerRequest(args.store, parsed.request);
      } catch (error) {
        response = createErrorResponse(error);
      }
      inFlight -= 1;
      if (!args.socket.destroyed && args.socket.writable) {
        args.socket.write(`${JSON.stringify({ id: parsed.id, response })}\n`);
      }
      if (inFlight === 0 && !clientEnded) {
        args.socket.unref?.();
      }
      maybeFinishHalfOpen();
      return;
    }

    // Backwards-compatible single-request short-lived client (bare request without envelope id).
    let response: CliAuthorityBrokerResponse;
    try {
      response = await dispatchCliAuthorityBrokerRequest(
        args.store,
        parsed as CliAuthorityBrokerRequest
      );
    } catch (error) {
      response = createErrorResponse(error);
    }
    inFlight -= 1;
    if (!args.socket.destroyed && args.socket.writable) {
      args.socket.end(`${JSON.stringify(response)}\n`);
    }
  };

  args.socket.on("data", (chunk) => {
    if (protocolRejected || sawLegacyBareRequest) return;
    const textChunk = typeof chunk === "string" ? chunk : chunk.toString("utf8");

    if (!currentFrameVerifiedObjectStart) {
      const firstChar = firstNonWhitespaceChar(textChunk);
      if (firstChar !== undefined) {
        if (firstChar !== "{") {
          rejectAndDestroy();
          return;
        }
        currentFrameVerifiedObjectStart = true;
      }
    }

    buffer += textChunk;

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      if (newlineIndex > maxFrameChars) {
        rejectAndDestroy();
        break;
      }
      const rawLine = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      currentFrameVerifiedObjectStart = false;
      if (!rawLine) continue;

      if (rawLine[0] !== "{") {
        rejectAndDestroy();
        break;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawLine);
      } catch (error) {
        protocolRejected = true;
        buffer = "";
        args.socket.pause?.();
        if (!args.socket.destroyed && args.socket.writable) {
          args.socket.end(`${JSON.stringify(createErrorResponse(error))}\n`, () => {
            if (!args.socket.destroyed) args.socket.destroy();
          });
        } else if (!args.socket.destroyed) {
          args.socket.destroy();
        }
        break;
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        rejectAndDestroy();
        break;
      }

      if (!isMultiplexedEnvelope(parsed)) {
        sawLegacyBareRequest = true;
      }
      void handleParsedPayload(parsed as Record<string, unknown>);
      if (sawLegacyBareRequest) break;
    }

    if (!protocolRejected && !sawLegacyBareRequest) {
      if (buffer.length > maxFrameChars) {
        rejectAndDestroy();
        return;
      }
      if (!currentFrameVerifiedObjectStart && buffer.length > 0) {
        const remainingFirstChar = firstNonWhitespaceChar(buffer);
        if (remainingFirstChar !== undefined) {
          if (remainingFirstChar !== "{") {
            rejectAndDestroy();
            return;
          }
          currentFrameVerifiedObjectStart = true;
        }
      }
    }
  });

  args.socket.on("end", () => {
    if (protocolRejected) {
      if (!args.socket.destroyed) args.socket.destroy();
      return;
    }
    clientEnded = true;
    maybeFinishHalfOpen();
  });
}

function canonicalDatabasePath(dbPath: string): string {
  const absolute = path.resolve(dbPath);
  try {
    return fs.realpathSync(absolute);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    // Resolve existing ancestors too, so a not-yet-created DB under a symlink
    // cannot acquire a second identity when Level creates its directory.
    const parent = path.dirname(absolute);
    if (parent === absolute) throw error;
    return path.join(canonicalDatabasePath(parent), path.basename(absolute));
  }
}

function releaseDatabaseOwnership(options: CliAuthorityBrokerServerOptions) {
  if (!options.dbPath) return;
  const identity = options.dbPath;
  if (databaseOwners.get(identity) === options.endpoint) databaseOwners.delete(identity);
}

export function getOrCreateCliAuthorityBrokerServer(
  options: CliAuthorityBrokerServerOptions
): Promise<CliAuthorityBrokerServerHandle> {
  options = { ...options, dbPath: options.dbPath ? canonicalDatabasePath(options.dbPath) : undefined };
  const existing = brokerRegistry.get(options.endpoint);
  if (existing) {
    if (options.dbPath && databaseOwners.get(options.dbPath) !== options.endpoint) {
      return Promise.reject(new Error(`CLI authority endpoint ${options.endpoint} already owns another database`));
    }
    return existing;
  }

  if (options.dbPath) {
    const identity = canonicalDatabasePath(options.dbPath);
    const owner = databaseOwners.get(identity);
    if (owner) {
      // Even a failed second Level.open() can release the owner's POSIX lock.
      // Reject before constructing Level, across endpoints and startup races.
      return Promise.reject(Object.assign(new Error(`CLI authority database already owned by ${owner}`), { code: "LEVEL_LOCKED" }));
    }
    databaseOwners.set(identity, options.endpoint);
  }
  const pending = createBrokerHandle(options).catch((error) => {
    if (!error?.retainAuthorityOwnership) releaseDatabaseOwnership(options);
    brokerRegistry.delete(options.endpoint);
    throw error;
  });
  brokerRegistry.set(options.endpoint, pending);
  return pending;
}
