import { afterEach, describe, expect, mock, test } from "bun:test";

import { subscribeSharedSse } from "./sharedSse";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

class FakeBroadcastChannel {
  static channels = new Map<string, Set<FakeBroadcastChannel>>();

  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(name: string) {
    this.name = name;
    const set = FakeBroadcastChannel.channels.get(name) ?? new Set();
    set.add(this);
    FakeBroadcastChannel.channels.set(name, set);
  }

  postMessage(data: unknown) {
    const set = FakeBroadcastChannel.channels.get(this.name) ?? new Set();
    for (const peer of set) {
      if (peer === this) continue;
      queueMicrotask(() => peer.onmessage?.({ data } as MessageEvent));
    }
  }

  close() {
    FakeBroadcastChannel.channels.get(this.name)?.delete(this);
  }
}

function installSingleHolderLocks() {
  let held = false;
  return {
    async request(
      _name: string,
      options: { ifAvailable?: boolean },
      callback: (lock: unknown | null) => Promise<void> | void
    ) {
      if (held && options.ifAvailable) {
        return callback(null);
      }
      held = true;
      try {
        return await callback({});
      } finally {
        held = false;
      }
    },
  };
}

function makeSseResponse(event: unknown) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    }
  );
}

describe("subscribeSharedSse", () => {
  const originalBroadcastChannel = globalThis.BroadcastChannel;
  const originalNavigator = globalThis.navigator;
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;

  afterEach(() => {
    FakeBroadcastChannel.channels.clear();
    Object.defineProperty(globalThis, "BroadcastChannel", {
      value: originalBroadcastChannel,
      configurable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
    });
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
  });

  test("shares one physical SSE connection across subscribers for the same key", async () => {
    Object.defineProperty(globalThis, "BroadcastChannel", {
      value: FakeBroadcastChannel,
      configurable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: { locks: installSingleHolderLocks() },
      configurable: true,
    });

    const receivedByFirst: unknown[] = [];
    const receivedBySecond: unknown[] = [];
    const fetchMock = mock(async () => makeSseResponse({ type: "hello", value: 1 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const disposeFirst = subscribeSharedSse({
      key: "space-space-1",
      url: "https://nolo.test/api/events/space-space-1",
      headers: { Authorization: "Bearer token" },
      onEvent: (event) => receivedByFirst.push(event),
    });
    const disposeSecond = subscribeSharedSse({
      key: "space-space-1",
      url: "https://nolo.test/api/events/space-space-1",
      headers: { Authorization: "Bearer token" },
      onEvent: (event) => receivedBySecond.push(event),
    });

    await flush();
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(receivedByFirst).toEqual([{ type: "hello", value: 1 }]);
    expect(receivedBySecond).toEqual([{ type: "hello", value: 1 }]);

    disposeFirst();
    disposeSecond();
  });

  test("honors Retry-After when the server is draining before reopening the SSE stream", async () => {
    const received: unknown[] = [];
    const recordedDelays: number[] = [];
    let attempts = 0;

    globalThis.setTimeout = (((callback: (...args: any[]) => void, delay?: number, ...args: any[]) => {
      recordedDelays.push(Number(delay ?? 0));
      return originalSetTimeout(callback, 0, ...args);
    }) as unknown) as typeof setTimeout;

    globalThis.fetch = mock(async () => {
      attempts++;
      if (attempts === 1) {
        return new Response(
          JSON.stringify({
            error: "Server draining",
            reason: "core_draining",
            retryable: true,
            retryAfterMs: 2_000,
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "2",
            },
          }
        );
      }
      return makeSseResponse({ type: "hello", value: 2 });
    }) as unknown as typeof fetch;

    const dispose = subscribeSharedSse({
      key: "space-space-2",
      url: "https://nolo.test/api/events/space-space-2",
      headers: { Authorization: "Bearer token" },
      onEvent: (event) => received.push(event),
    });

    await flush();
    await flush();
    await flush();

    expect(attempts).toBe(2);
    expect(recordedDelays).toContain(2_000);
    expect(received).toEqual([{ type: "hello", value: 2 }]);

    dispose();
  });
});
