import {
  resolveRetryAfterMs
} from "/public/assets/chunks/chunk-DMDFFSG6.js";
import {
  isAbortError
} from "/public/assets/chunks/chunk-RWWUEPWY.js";

// packages/app/realtime/sharedSse.ts
var SHARED_SSE_PREFIX = "nolo-shared-sse";
var RETRY_INITIAL_MS = 1e3;
var RETRY_MAX_MS = 3e4;
var FOLLOWER_RETRY_MS = 1e3;
var sleep = (ms, signal) => new Promise((resolve) => {
  if (signal.aborted) {
    resolve();
    return;
  }
  const timeout = setTimeout(resolve, ms);
  signal.addEventListener(
    "abort",
    () => {
      clearTimeout(timeout);
      resolve();
    },
    { once: true }
  );
});
function parseSseChunk(chunk) {
  const results = [];
  for (const line of chunk.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const json = trimmed.slice(5).trim();
    if (!json) continue;
    try {
      const event = JSON.parse(json);
      if (event && typeof event.type === "string") results.push(event);
    } catch {
    }
  }
  return results;
}
async function readSseLoop(args, signal, publish) {
  let retryDelay = RETRY_INITIAL_MS;
  while (!signal.aborted) {
    try {
      const response = await fetch(args.url, {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          ...args.headers ?? {}
        },
        signal
      });
      if (!response.ok || !response.body) {
        if (response.status === 401 || response.status === 403) {
          args.onTerminalStatus?.(response.status);
          publish?.({ type: "terminal-status", status: response.status });
          return;
        }
        const retryAfterMs = resolveRetryAfterMs(response.headers, retryDelay);
        await sleep(retryAfterMs, signal);
        retryDelay = Math.min(retryAfterMs * 2, RETRY_MAX_MS);
        continue;
      }
      retryDelay = RETRY_INITIAL_MS;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (!signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const event of parseSseChunk(chunk)) {
            args.onEvent(event);
            publish?.({ type: "event", event });
          }
        }
      } finally {
        try {
          reader.releaseLock();
        } catch {
        }
      }
      if (!signal.aborted) await sleep(retryDelay, signal);
    } catch (error) {
      if (isAbortError(error) || signal.aborted) return;
      await sleep(retryDelay, signal);
      retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
    }
  }
}
function supportsSharedTransport() {
  return typeof BroadcastChannel !== "undefined" && typeof navigator !== "undefined" && typeof navigator.locks?.request === "function";
}
function subscribeDirect(args) {
  const controller = new AbortController();
  void readSseLoop(args, controller.signal);
  return () => controller.abort();
}
function subscribeSharedSse(args) {
  if (!supportsSharedTransport()) {
    return subscribeDirect(args);
  }
  const controller = new AbortController();
  const broadcast = new BroadcastChannel(`${SHARED_SSE_PREFIX}:${args.key}`);
  const lockName = `${SHARED_SSE_PREFIX}:lock:${args.key}`;
  broadcast.onmessage = (message) => {
    if (controller.signal.aborted) return;
    const data = message.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "event") {
      args.onEvent(data.event);
      return;
    }
    if (data.type === "terminal-status") {
      args.onTerminalStatus?.(data.status);
    }
  };
  const publish = (message) => {
    try {
      broadcast.postMessage(message);
    } catch {
    }
  };
  const runElection = async () => {
    const locks = navigator.locks;
    while (!controller.signal.aborted) {
      await locks.request(
        lockName,
        { mode: "exclusive", ifAvailable: true },
        async (lock) => {
          if (!lock || controller.signal.aborted) return;
          await readSseLoop(args, controller.signal, publish);
        }
      );
      if (!controller.signal.aborted) {
        await sleep(FOLLOWER_RETRY_MS, controller.signal);
      }
    }
  };
  void runElection();
  return () => {
    controller.abort();
    broadcast.close();
  };
}

export {
  subscribeSharedSse
};
