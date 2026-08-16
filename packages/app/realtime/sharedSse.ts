type SseEvent = Record<string, unknown>;
import { resolveRetryAfterMs } from "app/utils/retryAfter";
import { isAbortError } from "core/abortError";

type SubscribeSharedSseArgs = {
  key: string;
  url: string;
  headers?: Record<string, string>;
  onEvent: (event: SseEvent) => void;
  onTerminalStatus?: (status: number) => void;
};

type SharedSseMessage =
  | { type: "event"; event: SseEvent }
  | { type: "terminal-status"; status: number };

const SHARED_SSE_PREFIX = "nolo-shared-sse";
const RETRY_INITIAL_MS = 1000;
const RETRY_MAX_MS = 30000;
const FOLLOWER_RETRY_MS = 1000;

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
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

function parseSseChunk(chunk: string): SseEvent[] {
  const results: SseEvent[] = [];
  for (const line of chunk.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const json = trimmed.slice(5).trim();
    if (!json) continue;
    try {
      const event = JSON.parse(json);
      if (event && typeof event.type === "string") results.push(event);
    } catch {
      // Ignore heartbeats and malformed partial lines.
    }
  }
  return results;
}

async function readSseLoop(
  args: SubscribeSharedSseArgs,
  signal: AbortSignal,
  publish?: (message: SharedSseMessage) => void
) {
  let retryDelay = RETRY_INITIAL_MS;

  while (!signal.aborted) {
    try {
      const response = await fetch(args.url, {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          ...(args.headers ?? {}),
        },
        signal,
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
          // Already released or closed.
        }
      }

      if (!signal.aborted) await sleep(retryDelay, signal);
    } catch (error: any) {
      if (isAbortError(error) || signal.aborted) return;
      await sleep(retryDelay, signal);
      retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
    }
  }
}

function supportsSharedTransport() {
  return (
    typeof BroadcastChannel !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof (navigator as any).locks?.request === "function"
  );
}

function subscribeDirect(args: SubscribeSharedSseArgs) {
  const controller = new AbortController();
  void readSseLoop(args, controller.signal);
  return () => controller.abort();
}

export function subscribeSharedSse(args: SubscribeSharedSseArgs): () => void {
  if (!supportsSharedTransport()) {
    return subscribeDirect(args);
  }

  const controller = new AbortController();
  const broadcast = new BroadcastChannel(`${SHARED_SSE_PREFIX}:${args.key}`);
  const lockName = `${SHARED_SSE_PREFIX}:lock:${args.key}`;

  broadcast.onmessage = (message: MessageEvent<SharedSseMessage>) => {
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

  const publish = (message: SharedSseMessage) => {
    try {
      broadcast.postMessage(message);
    } catch {
      // Broadcast delivery is best-effort; the leader still updates itself.
    }
  };

  const runElection = async () => {
    const locks = (navigator as any).locks;
    while (!controller.signal.aborted) {
      await locks.request(
        lockName,
        { mode: "exclusive", ifAvailable: true },
        async (lock: unknown | null) => {
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
