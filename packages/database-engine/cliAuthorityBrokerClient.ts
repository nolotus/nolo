import type {
  AuthorityBatchOperation,
  AuthorityBatchWriter,
  AuthorityIteratorOptions,
  AuthorityStore,
} from "./authorityStoreTypes";
import type {
  CliAuthorityBrokerBatchGetItem,
  CliAuthorityBrokerRequest,
  CliAuthorityBrokerResponse,
} from "./cliAuthorityBrokerTypes";
import { createConnection, type Socket } from "node:net";
import { connect as connectTls, type SecureContextOptions } from "node:tls";

const DEFAULT_ITERATOR_PAGE_SIZE = 200;

export class CliAuthorityBrokerUnavailableError extends Error {
  readonly reason = "cli_authority_broker_unavailable";
  readonly status = 503;
  readonly endpoint: string;

  constructor(endpoint: string, cause?: unknown) {
    super(`CLI authority broker unavailable at ${endpoint}. Start the local authority broker and retry.`);
    this.name = "CliAuthorityBrokerUnavailableError";
    this.endpoint = endpoint;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class CliAuthorityBrokerTimeoutError extends Error {
  readonly reason = "cli_authority_broker_timeout";
  readonly endpoint: string;
  readonly timeoutMs: number;

  constructor(endpoint: string, timeoutMs: number, cause?: unknown) {
    super(`CLI authority broker request at ${endpoint} timed out after ${timeoutMs}ms`);
    this.name = "CliAuthorityBrokerTimeoutError";
    this.endpoint = endpoint;
    this.timeoutMs = timeoutMs;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class CliAuthorityBrokerProtocolError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(error: { code: string; message: string; retryable?: boolean }) {
    super(error.message);
    this.name = "CliAuthorityBrokerProtocolError";
    this.code = error.code;
    this.retryable = error.retryable === true;
  }
}

export function isCliAuthorityBrokerUnavailableError(
  error: unknown
): error is CliAuthorityBrokerUnavailableError {
  return (
    error instanceof CliAuthorityBrokerUnavailableError ||
    (
      typeof error === "object" &&
      error !== null &&
      (error as any).reason === "cli_authority_broker_unavailable" &&
      (error as any).status === 503
    )
  );
}

export function isCliAuthorityBrokerTimeoutError(
  error: unknown
): error is CliAuthorityBrokerTimeoutError {
  return (
    error instanceof CliAuthorityBrokerTimeoutError ||
    (
      typeof error === "object" &&
      error !== null &&
      (error as any).reason === "cli_authority_broker_timeout"
    )
  );
}

export function isCliAuthorityBrokerProtocolError(
  error: unknown
): error is CliAuthorityBrokerProtocolError {
  return (
    error instanceof CliAuthorityBrokerProtocolError ||
    (
      typeof error === "object" &&
      error !== null &&
      (error as any).name === "CliAuthorityBrokerProtocolError"
    )
  );
}

function isBrokerUnavailableCause(error: unknown): boolean {
  if (!error) return false;
  if (isCliAuthorityBrokerTimeoutError(error) || isCliAuthorityBrokerProtocolError(error)) {
    return false;
  }
  if (isCliAuthorityBrokerUnavailableError(error)) {
    return true;
  }
  if (typeof error === "object") {
    const code = (error as { code?: unknown }).code;
    if (
      typeof code === "string" &&
      /^(ECONNREFUSED|ENOENT|ECONNRESET|EPIPE|EADDRNOTAVAIL|ENETUNREACH|EHOSTUNREACH)$/i.test(code)
    ) {
      return true;
    }
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/timed out/i.test(message)) return false;
  if (/malformed response|protocol mismatch/i.test(message)) return false;
  return /ECONNREFUSED|ENOENT|ECONNRESET|EPIPE|closed connection without response|returned no response/i.test(message);
}

export type CliAuthorityBrokerRequestInvoker = (
  request: CliAuthorityBrokerRequest
) => Promise<CliAuthorityBrokerResponse>;

export type CliAuthorityBrokerClientOptions = {
  endpoint: string;
  location?: string;
  status?: string;
  invoke: CliAuthorityBrokerRequestInvoker;
  iteratorPageSize?: number;
};

type BrokerSocketTarget =
  | { kind: "unix"; path: string }
  | { kind: "tcp"; host: string; port: number };

function resolveBrokerSocketTarget(endpoint: string): BrokerSocketTarget {
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

function isRetryableReadRequest(request: CliAuthorityBrokerRequest): boolean {
  return (
    request.type === "get" ||
    request.type === "batchGet" ||
    request.type === "status" ||
    request.type === "iterator" ||
    request.type === "close"
  );
}

type PendingSocketRequest = {
  id: number;
  request: CliAuthorityBrokerRequest;
  resolve: (response: CliAuthorityBrokerResponse) => void;
  reject: (error: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
  settled: boolean;
  written: boolean;
  retried: boolean;
};

type PersistentBrokerConnection = {
  socket: Socket;
  connected: boolean;
  closed: boolean;
  reused: boolean;
  buffer: string;
  pending: Map<number, PendingSocketRequest>;
  writeQueue: PendingSocketRequest[];
  idleTimer: ReturnType<typeof setTimeout> | null;
};

export type CliAuthorityBrokerSocketInvoker = CliAuthorityBrokerRequestInvoker & {
  close?: () => void;
};

function isUnsupportedBrokerRequestPayload(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
  if ((parsed as any).ok !== false) return false;
  const error = (parsed as any).error;
  if (!error || typeof error !== "object") return false;
  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message : "";
  return (
    code === "UNSUPPORTED_REQUEST" ||
    code === "BROKER_UNSUPPORTED_REQUEST" ||
    /unsupported broker request/i.test(message)
  );
}

function isUnsupportedBrokerRequestError(error: unknown): boolean {
  if (!isCliAuthorityBrokerProtocolError(error)) return false;
  return (
    error.code === "UNSUPPORTED_REQUEST" ||
    error.code === "BROKER_UNSUPPORTED_REQUEST" ||
    /unsupported broker request/i.test(error.message)
  );
}

function isNotFoundBrokerError(error: unknown): boolean {
  if (isCliAuthorityBrokerProtocolError(error)) {
    if (error.code === "LEVEL_NOT_FOUND" || error.code === "NOT_FOUND") {
      return true;
    }
    return /^(?:not\s*found|key not found)/i.test(error.message.trim());
  }
  if (typeof error === "object" && error !== null) {
    const code = (error as { code?: unknown }).code;
    if (code === "LEVEL_NOT_FOUND" || code === "NOT_FOUND") return true;
    if ((error as { notFound?: unknown }).notFound === true) return true;
  }
  return false;
}

export function createCliAuthorityBrokerSocketInvoker(options: {
  endpoint: string;
  tls?: SecureContextOptions;
  timeoutMs?: number;
  idleTimeoutMs?: number;
}): CliAuthorityBrokerSocketInvoker {
  const target = resolveBrokerSocketTarget(options.endpoint);
  const connectedEvent = options.tls ? "secureConnect" : "connect";
  const connect = (): Socket => target.kind === "unix"
    ? createConnection(target.path)
    : options.tls
      ? connectTls({ host: target.host, port: target.port, servername: "localhost", ...options.tls, rejectUnauthorized: true })
      : createConnection({ host: target.host, port: target.port });
  const timeoutMs = options.timeoutMs ?? 5000;
  const idleTimeoutMs = options.idleTimeoutMs ?? 5000;
  let nextRequestId = 1;
  let activeConn: PersistentBrokerConnection | null = null;
  let legacyBareMode = false;
  let explicitlyClosed = false;
  const legacyInFlight = new Set<{ close: () => void }>();

  const clearIdleTimer = (conn: PersistentBrokerConnection) => {
    if (conn.idleTimer) {
      clearTimeout(conn.idleTimer);
      conn.idleTimer = null;
    }
  };

  const destroyConnection = (conn: PersistentBrokerConnection) => {
    if (activeConn === conn) activeConn = null;
    conn.closed = true;
    clearIdleTimer(conn);
    if (!conn.socket.destroyed) {
      conn.socket.destroy();
    }
  };

  const maybeScheduleIdle = (conn: PersistentBrokerConnection) => {
    if (conn.closed || conn.pending.size > 0) return;
    conn.socket.unref?.();
    clearIdleTimer(conn);
    if (idleTimeoutMs > 0) {
      conn.idleTimer = setTimeout(() => {
        if (conn.pending.size === 0 && !conn.closed) {
          destroyConnection(conn);
        }
      }, idleTimeoutMs);
      conn.idleTimer.unref?.();
    }
  };

  const settlePending = (
    conn: PersistentBrokerConnection,
    req: PendingSocketRequest,
    outcome: () => void
  ) => {
    if (req.settled) return;
    req.settled = true;
    clearTimeout(req.timer);
    conn.pending.delete(req.id);
    const qIndex = conn.writeQueue.indexOf(req);
    if (qIndex !== -1) conn.writeQueue.splice(qIndex, 1);
    outcome();
  };

  const createClosedError = () =>
    new CliAuthorityBrokerUnavailableError(
      options.endpoint,
      new Error(`CLI authority broker invoker at ${options.endpoint} closed`)
    );

  const sendLegacyBare = (
    request: CliAuthorityBrokerRequest
  ): Promise<CliAuthorityBrokerResponse> => {
    if (explicitlyClosed) {
      return Promise.reject(createClosedError());
    }
    return new Promise<CliAuthorityBrokerResponse>((resolve, reject) => {
      const socket = connect();
      let settled = false;
      let buffer = "";
      let timer: ReturnType<typeof setTimeout>;

      const cleanup = () => {
        clearTimeout(timer);
        legacyInFlight.delete(closeHandle);
      };

      const finishResolve = (response: CliAuthorityBrokerResponse) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (!socket.destroyed) socket.destroy();
        resolve(response);
      };

      const finishReject = (error: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (!socket.destroyed) socket.destroy();
        reject(error);
      };

      const closeHandle = {
        close: () => {
          finishReject(createClosedError());
        },
      };
      legacyInFlight.add(closeHandle);

      timer = setTimeout(() => {
        finishReject(new CliAuthorityBrokerTimeoutError(options.endpoint, timeoutMs));
      }, timeoutMs);

      socket.setEncoding("utf8");
      socket.on(connectedEvent, () => {
        if (settled || explicitlyClosed) return;
        socket.write(`${JSON.stringify(request)}\n`);
      });

      const handleLine = (line: string) => {
        try {
          finishResolve(JSON.parse(line) as CliAuthorityBrokerResponse);
        } catch (parseError) {
          finishReject(
            new CliAuthorityBrokerProtocolError({
              code: "MALFORMED_RESPONSE",
              message: `CLI authority broker at ${options.endpoint} returned malformed response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
            })
          );
        }
      };

      socket.on("data", (chunk) => {
        if (settled) return;
        buffer += chunk;
        const newlineIndex = buffer.indexOf("\n");
        if (newlineIndex === -1) return;
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line) return;
        handleLine(line);
      });

      socket.on("end", () => {
        if (settled) return;
        const trailing = buffer.trim();
        if (trailing) {
          handleLine(trailing);
          return;
        }
        finishReject(
          new CliAuthorityBrokerUnavailableError(
            options.endpoint,
            new Error(`CLI authority broker at ${options.endpoint} closed connection without response`)
          )
        );
      });

      socket.on("error", (error) => {
        finishReject(
          isBrokerUnavailableCause(error)
            ? new CliAuthorityBrokerUnavailableError(options.endpoint, error)
            : error
        );
      });

      socket.on("close", () => {
        finishReject(
          new CliAuthorityBrokerUnavailableError(
            options.endpoint,
            new Error(`CLI authority broker at ${options.endpoint} closed connection without response`)
          )
        );
      });
    });
  };

  const processResponseLine = (conn: PersistentBrokerConnection, line: string): boolean => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (parseError) {
      const protocolError = new CliAuthorityBrokerProtocolError({
        code: "MALFORMED_RESPONSE",
        message: `CLI authority broker at ${options.endpoint} returned malformed response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      });
      const pendingRequests = [...conn.pending.values()];
      destroyConnection(conn);
      for (const req of pendingRequests) {
        settlePending(conn, req, () => req.reject(protocolError));
      }
      return false;
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      "response" in parsed &&
      (typeof (parsed as any).id === "number" || typeof (parsed as any).id === "string")
    ) {
      const id = Number((parsed as any).id);
      const req = conn.pending.get(id);
      if (!req) return true; // Late response after timeout: ignore safely.
      conn.reused = true;
      settlePending(conn, req, () => {
        req.resolve((parsed as any).response as CliAuthorityBrokerResponse);
      });
      return true;
    }

    // Bare response (e.g. startup !storeReady BROKER_UNAVAILABLE or legacy single-request server).
    const pendingRequests = [...conn.pending.values()];
    if (isUnsupportedBrokerRequestPayload(parsed)) {
      legacyBareMode = true;
      for (const req of pendingRequests) {
        settlePending(conn, req, () => {
          if (explicitlyClosed) {
            req.reject(createClosedError());
            return;
          }
          void sendLegacyBare(req.request).then(req.resolve, req.reject);
        });
      }
      destroyConnection(conn);
      return false;
    }
    if (pendingRequests.length === 1) {
      const [onlyReq] = pendingRequests;
      destroyConnection(conn);
      settlePending(conn, onlyReq, () => {
        onlyReq.resolve(parsed as CliAuthorityBrokerResponse);
      });
      return false;
    }
    if (
      pendingRequests.length > 1 &&
      parsed &&
      typeof parsed === "object" &&
      (parsed as any).ok === false
    ) {
      destroyConnection(conn);
      for (const req of pendingRequests) {
        settlePending(conn, req, () => {
          req.resolve(parsed as CliAuthorityBrokerResponse);
        });
      }
      return false;
    }
    const protocolError = new CliAuthorityBrokerProtocolError({
      code: "MALFORMED_RESPONSE",
      message: `CLI authority broker protocol mismatch at ${options.endpoint}`,
    });
    destroyConnection(conn);
    for (const req of pendingRequests) {
      settlePending(conn, req, () => req.reject(protocolError));
    }
    return false;
  };

  const failRemainingPending = (
    conn: PersistentBrokerConnection,
    errorFactory: () => unknown
  ) => {
    const remaining = [...conn.pending.values()];
    if (remaining.length === 0) return;
    const canRetryOnDrop = !explicitlyClosed && conn.reused;
    for (const req of remaining) {
      settlePending(conn, req, () => {
        if (
          !explicitlyClosed &&
          !req.retried &&
          (!req.written || (canRetryOnDrop && isRetryableReadRequest(req.request)))
        ) {
          void sendWithRetry(req.request, true).then(req.resolve, req.reject);
          return;
        }
        req.reject(errorFactory());
      });
    }
  };

  const getOrOpenConnection = (): PersistentBrokerConnection => {
    if (
      activeConn &&
      !activeConn.closed &&
      !activeConn.socket.destroyed &&
      activeConn.socket.writable
    ) {
      clearIdleTimer(activeConn);
      activeConn.socket.ref?.();
      return activeConn;
    }

    const socket = connect();

    const conn: PersistentBrokerConnection = {
      socket,
      connected: false,
      closed: false,
      reused: false,
      buffer: "",
      pending: new Map(),
      writeQueue: [],
      idleTimer: null,
    };
    activeConn = conn;
    socket.setEncoding("utf8");
    socket.setNoDelay?.(true);

    socket.on(connectedEvent, () => {
      if (conn.closed) return;
      conn.connected = true;
      const queued = conn.writeQueue.splice(0, conn.writeQueue.length);
      for (const req of queued) {
        if (req.settled) continue;
        req.written = true;
        socket.write(`${JSON.stringify({ id: req.id, request: req.request })}\n`);
      }
    });

    socket.on("data", (chunk) => {
      if (conn.closed) return;
      conn.buffer += chunk;
      let newlineIndex: number;
      while ((newlineIndex = conn.buffer.indexOf("\n")) !== -1) {
        const line = conn.buffer.slice(0, newlineIndex).trim();
        conn.buffer = conn.buffer.slice(newlineIndex + 1);
        if (!line) continue;
        if (!processResponseLine(conn, line)) return;
      }
      maybeScheduleIdle(conn);
    });

    socket.on("end", () => {
      const trailing = conn.buffer.trim();
      conn.buffer = "";
      if (trailing && conn.pending.size > 0 && !conn.closed) {
        processResponseLine(conn, trailing);
      }
      if (activeConn === conn) activeConn = null;
      conn.closed = true;
      clearIdleTimer(conn);
      failRemainingPending(
        conn,
        () =>
          new CliAuthorityBrokerUnavailableError(
            options.endpoint,
            new Error(`CLI authority broker at ${options.endpoint} closed connection without response`)
          )
      );
    });

    socket.on("error", (error) => {
      if (activeConn === conn) activeConn = null;
      conn.closed = true;
      clearIdleTimer(conn);
      failRemainingPending(conn, () =>
        isBrokerUnavailableCause(error)
          ? new CliAuthorityBrokerUnavailableError(options.endpoint, error)
          : error
      );
    });

    socket.on("close", () => {
      if (activeConn === conn) activeConn = null;
      conn.closed = true;
      clearIdleTimer(conn);
      failRemainingPending(
        conn,
        () =>
          new CliAuthorityBrokerUnavailableError(
            options.endpoint,
            new Error(`CLI authority broker at ${options.endpoint} closed connection without response`)
          )
      );
    });

    return conn;
  };

  const sendWithRetry = (
    request: CliAuthorityBrokerRequest,
    retried: boolean
  ): Promise<CliAuthorityBrokerResponse> => {
    if (explicitlyClosed) {
      return Promise.reject(createClosedError());
    }
    if (legacyBareMode) {
      return sendLegacyBare(request);
    }
    return new Promise<CliAuthorityBrokerResponse>((resolve, reject) => {
      const conn = getOrOpenConnection();
      const id = nextRequestId++;
      const req: PendingSocketRequest = {
        id,
        request,
        resolve,
        reject,
        timer: undefined as unknown as ReturnType<typeof setTimeout>,
        settled: false,
        written: false,
        retried,
      };

      req.timer = setTimeout(() => {
        if (req.settled) return;
        settlePending(conn, req, () => {
          if (conn.pending.size === 0) {
            destroyConnection(conn);
          }
          req.reject(new CliAuthorityBrokerTimeoutError(options.endpoint, timeoutMs));
        });
      }, timeoutMs);

      conn.pending.set(id, req);
      if (conn.connected) {
        req.written = true;
        conn.socket.write(`${JSON.stringify({ id: req.id, request: req.request })}\n`);
      } else {
        conn.writeQueue.push(req);
      }
    });
  };

  const invoker: CliAuthorityBrokerSocketInvoker = (request: CliAuthorityBrokerRequest) => {
    if (explicitlyClosed) {
      return Promise.reject(createClosedError());
    }
    return legacyBareMode ? sendLegacyBare(request) : sendWithRetry(request, false);
  };
  invoker.close = () => {
    explicitlyClosed = true;
    const conn = activeConn;
    if (conn) {
      destroyConnection(conn);
      failRemainingPending(conn, createClosedError);
    }
    for (const handle of [...legacyInFlight]) {
      handle.close();
    }
  };
  return invoker;
}

async function invokeBrokerRequest(
  options: CliAuthorityBrokerClientOptions,
  request: CliAuthorityBrokerRequest
) {
  try {
    const response = await options.invoke(request);
    if (!response || typeof response !== "object" || typeof (response as any).ok !== "boolean") {
      throw new CliAuthorityBrokerProtocolError({
        code: "MALFORMED_RESPONSE",
        message: `CLI authority broker protocol mismatch at ${options.endpoint}`,
      });
    }
    if (response.ok) {
      if (!response.result || typeof response.result !== "object") {
        throw new CliAuthorityBrokerProtocolError({
          code: "MALFORMED_RESPONSE",
          message: `CLI authority broker protocol mismatch at ${options.endpoint}`,
        });
      }
      return response.result;
    }
    if (
      !response.error ||
      typeof response.error !== "object" ||
      typeof (response.error as any).code !== "string" ||
      typeof (response.error as any).message !== "string"
    ) {
      throw new CliAuthorityBrokerProtocolError({
        code: "MALFORMED_RESPONSE",
        message: `CLI authority broker protocol mismatch at ${options.endpoint}`,
      });
    }
    if (response.error.code === "BROKER_UNAVAILABLE") {
      throw new CliAuthorityBrokerUnavailableError(options.endpoint, response.error);
    }
    throw new CliAuthorityBrokerProtocolError(response.error);
  } catch (error) {
    if (isCliAuthorityBrokerTimeoutError(error)) throw error;
    if (isCliAuthorityBrokerUnavailableError(error)) throw error;
    if (isCliAuthorityBrokerProtocolError(error)) throw error;
    if (isBrokerUnavailableCause(error)) {
      throw new CliAuthorityBrokerUnavailableError(options.endpoint, error);
    }
    throw error;
  }
}

export function createCliAuthorityBrokerClient(
  options: CliAuthorityBrokerClientOptions
): AuthorityStore {
  const pageSize = options.iteratorPageSize ?? DEFAULT_ITERATOR_PAGE_SIZE;
  let batchGetUnsupported = false;

  const fallbackBatchGet = (keys: string[]): Promise<CliAuthorityBrokerBatchGetItem[]> =>
    Promise.all(
      keys.map(async (key): Promise<CliAuthorityBrokerBatchGetItem> => {
        try {
          const result = await invokeBrokerRequest(options, { type: "get", key });
          if (result.type !== "get") {
            throw new Error(`CLI authority broker protocol mismatch for get at ${options.endpoint}`);
          }
          return { ok: true, value: result.value };
        } catch (error) {
          if (isNotFoundBrokerError(error)) {
            return {
              ok: false,
              error: {
                code: isCliAuthorityBrokerProtocolError(error)
                  ? error.code
                  : typeof (error as any)?.code === "string"
                    ? (error as any).code
                    : "NOT_FOUND",
                message: error instanceof Error ? error.message : String(error),
                ...(isCliAuthorityBrokerProtocolError(error) && error.retryable
                  ? { retryable: true }
                  : {}),
              },
            };
          }
          throw error;
        }
      })
    );

  return {
    get location() {
      return options.location ?? options.endpoint;
    },
    get status() {
      return options.status ?? "broker";
    },
    async open() {
      await invokeBrokerRequest(options, { type: "status" });
    },
    async close() {},
    async get(key: string): Promise<any> {
      const result = await invokeBrokerRequest(options, { type: "get", key });
      if (result.type !== "get") {
        throw new Error(`CLI authority broker protocol mismatch for get at ${options.endpoint}`);
      }
      return result.value;
    },
    async batchGet(keys: string[]): Promise<CliAuthorityBrokerBatchGetItem[]> {
      if (batchGetUnsupported) {
        return fallbackBatchGet(keys);
      }
      try {
        const result = await invokeBrokerRequest(options, { type: "batchGet", keys });
        if (result.type !== "batchGet" || !Array.isArray(result.items) || result.items.length !== keys.length) {
          throw new CliAuthorityBrokerProtocolError({
            code: "BROKER_PROTOCOL_MISMATCH",
            message: `CLI authority broker protocol mismatch for batchGet at ${options.endpoint}`,
          });
        }
        return result.items;
      } catch (error) {
        if (isUnsupportedBrokerRequestError(error)) {
          batchGetUnsupported = true;
          return fallbackBatchGet(keys);
        }
        throw error;
      }
    },
    async conditionalPut(key: string, expectedRevision: number | null, value: unknown) {
      const result = await invokeBrokerRequest(options, { type: "conditionalPut", key, expectedRevision, value });
      if (!result || result.type !== "conditionalPut" ||
          (result.status !== "updated" && result.status !== "conflict") ||
          Object.keys(result).some((key) => key !== "type" && key !== "status")) {
        throw new CliAuthorityBrokerProtocolError({ code: "BROKER_PROTOCOL_MISMATCH", message: "Invalid conditionalPut response" });
      }
      return { status: result.status };
    },
    async put(key: string, value: unknown) {
      await invokeBrokerRequest(options, { type: "put", key, value });
    },
    async del(key: string) {
      await invokeBrokerRequest(options, { type: "del", key });
    },
    async batchWrite(ops: AuthorityBatchOperation[]) {
      await invokeBrokerRequest(options, { type: "batchWrite", ops });
    },
    createBatch(): AuthorityBatchWriter {
      const ops: AuthorityBatchOperation[] = [];
      return {
        put(key: string, value: unknown) {
          ops.push({ type: "put", key, value });
        },
        del(key: string) {
          ops.push({ type: "del", key });
        },
        async write() {
          await invokeBrokerRequest(options, { type: "batchWrite", ops });
        },
      };
    },
    iterator(iteratorOptions: AuthorityIteratorOptions = {}) {
      return (async function* iterate() {
        let cursor: string | null | undefined = undefined;
        while (true) {
          const result = await invokeBrokerRequest(options, {
            type: "iterator",
            options: iteratorOptions,
            cursor,
            limit: pageSize,
          });
          if (result.type !== "iterator") {
            throw new Error(
              `CLI authority broker protocol mismatch for iterator at ${options.endpoint}`
            );
          }
          for (const entry of result.page.entries) {
            yield entry;
          }
          if (result.page.done || !result.page.nextCursor) return;
          cursor = result.page.nextCursor;
        }
      })();
    },
  };
}
