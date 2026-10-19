import fs from "node:fs";
import path from "node:path";
import { createServer, type AddressInfo, type Server, type Socket } from "node:net";
import { toErrorMessage } from "core/errorMessage";

import type { AuthorityStore } from "./authorityStoreTypes";
import type {
  CliAuthorityBrokerIteratorPage,
  CliAuthorityBrokerRequest,
  CliAuthorityBrokerResponse,
} from "./cliAuthorityBrokerTypes";

const brokerRegistry = new Map<string, Promise<CliAuthorityBrokerServerHandle>>();
const databaseOwners = new Map<string, string>();
const DEFAULT_ITERATOR_LIMIT = 200;

export type CliAuthorityBrokerServerOptions = {
  endpoint: string;
  /** Native stores must declare their path before construction (Level auto-opens). */
  dbPath?: string;
  createStore: () => AuthorityStore | Promise<AuthorityStore>;
  metadataPath?: string;
  healthPath?: string;
  now?: () => number;
  transportMode?: "socket" | "inprocess";
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
  const rows: Array<[string, unknown]> = [];
  for await (const entry of store.iterator(request.options ?? {})) {
    rows.push(entry as [string, unknown]);
  }

  const startIndex = request.cursor
    ? rows.findIndex(([key]) => key === request.cursor) + 1
    : 0;
  const limit = request.limit ?? DEFAULT_ITERATOR_LIMIT;
  const entries = rows.slice(startIndex, startIndex + limit);
  const lastEntry = entries.at(-1) ?? null;

  return {
    entries,
    nextCursor: lastEntry ? lastEntry[0] : null,
    done: startIndex + entries.length >= rows.length,
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

export async function dispatchCliAuthorityBrokerRequest(
  store: AuthorityStore,
  request: CliAuthorityBrokerRequest
): Promise<CliAuthorityBrokerResponse> {
  try {
    switch (request.type) {
      case "status":
        return { ok: true, result: { type: "status" } };
      case "open":
        await store.open();
        return { ok: true, result: { type: "open" } };
      case "close":
        // A logical client must never close the shared native owner.
        // Only the server handle owns the store lifecycle.
        return { ok: true, result: { type: "close" } };
      case "get":
        return { ok: true, result: { type: "get", value: await store.get(request.key) } };
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
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}

async function createBrokerHandle(
  options: CliAuthorityBrokerServerOptions
): Promise<CliAuthorityBrokerServerHandle> {
  const target = resolveBrokerListenTarget(options.endpoint);
  const socketMode = (options.transportMode ?? "socket") === "socket";
  let store: AuthorityStore | undefined;
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
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
    bindSocketRequestHandler({ socket, store });
  });
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
      server.unref();
    }
    store = await options.createStore();
    await store.open();
    storeReady = true;
    const readyStore = store;

    const now = options.now ?? Date.now;
    const listeningEndpoint = (options.transportMode ?? "socket") === "socket"
      ? buildListeningEndpoint(server, target)
      : options.endpoint;
    writeJsonFile(options.metadataPath, {
      pid: process.pid,
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
      authorityStore: readyStore,
      request(request: CliAuthorityBrokerRequest) {
        return dispatchCliAuthorityBrokerRequest(readyStore, request);
      },
      async close() {
        closing ??= (async () => {
          storeReady = false;
          for (const socket of sockets) socket.destroy();
          if (server.listening) {
            await new Promise<void>((resolve, reject) => {
              server.close((error) => error ? reject(error) : resolve());
            });
          }
          await readyStore.close();
          brokerRegistry.delete(options.endpoint);
          releaseDatabaseOwnership(options);
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
    throw error;
  }
}

function bindSocketRequestHandler(args: { socket: Socket; store: AuthorityStore }) {
  let buffer = "";
  args.socket.setEncoding("utf8");
  args.socket.on("data", async (chunk) => {
    buffer += chunk;
    if (!buffer.includes("\n")) return;
    const [rawRequest] = buffer.split("\n");
    buffer = "";
    let response: CliAuthorityBrokerResponse;
    try {
      response = await dispatchCliAuthorityBrokerRequest(
        args.store,
        JSON.parse(rawRequest) as CliAuthorityBrokerRequest
      );
    } catch (error) {
      response = createErrorResponse(error);
    }
    args.socket.end(`${JSON.stringify(response)}\n`);
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
