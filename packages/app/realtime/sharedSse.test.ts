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

function installPerNameLocks() {
  const held = new Set<string>();
  return {
    async request(
      name: string,
      options: { ifAvailable?: boolean },
      callback: (lock: unknown | null) => Promise<void> | void
    ) {
      if (held.has(name) && options.ifAvailable) {
        return callback(null);
      }
      held.add(name);
      try {
        return await callback({});
      } finally {
        held.delete(name);
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
    let attempts = 0;

    globalThis.fetch = mock(async () => {
      attempts++;
      if (attempts === 1) {
        return new Response(
          JSON.stringify({
            error: "Server draining",
            reason: "core_draining",
            retryable: true,
            retryAfterMs: 0,
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "0",
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
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();

    expect(attempts).toBe(2);
    expect(received).toEqual([{ type: "hello", value: 2 }]);

    dispose();
  });

  test("keeps per-channel cursor isolated across different channel keys on reconnect", async () => {
    Object.defineProperty(globalThis, "BroadcastChannel", {
      value: FakeBroadcastChannel,
      configurable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: { locks: installPerNameLocks() },
      configurable: true,
    });

    // 两个不同 channel key 各自独立 leader（不同 lock name），事件交错到达。
    // A 先 503（Retry-After: 0 立即重连），再收到 A1；B 收到 B1。
    // 精确的 reconnect-cursor 隔离 invariant 由 sharedSseEffect.test.ts
    // （虚拟时间）证明；这里验证 façade + live layers 的多 key 接线。
    const encoder = new TextEncoder();
    const lastEventIdByUrl = new Map<string, string | null>();
    const fetchMock = mock(async (url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("space-1")) {
        if (!lastEventIdByUrl.has(u)) {
          lastEventIdByUrl.set(u, null);
          return new Response(
            JSON.stringify({ error: "draining" }),
            { status: 503, headers: { "Retry-After": "0" } }
          );
        }
        lastEventIdByUrl.set(u, (init?.headers as Record<string, string>)?.["Last-Event-ID"] ?? null);
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(
                encoder.encode(
                  `id: A1\ndata: ${JSON.stringify({ type: "a", _eventId: "A1" })}\n\n`
                )
              );
            },
          }),
          { status: 200, headers: { "Content-Type": "text/event-stream" } }
        );
      }
      if (u.includes("user-1")) {
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(
                encoder.encode(
                  `id: B1\ndata: ${JSON.stringify({ type: "b", _eventId: "B1" })}\n\n`
                )
              );
            },
          }),
          { status: 200, headers: { "Content-Type": "text/event-stream" } }
        );
      }
      throw new Error("unexpected url " + u);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const receivedA: unknown[] = [];
    const receivedB: unknown[] = [];
    const disposeA = subscribeSharedSse({
      key: "space-1",
      url: "https://nolo.test/api/events/space-1",
      onEvent: (event) => receivedA.push(event),
    });
    const disposeB = subscribeSharedSse({
      key: "user-1",
      url: "https://nolo.test/api/events/user-1",
      onEvent: (event) => receivedB.push(event),
    });

    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();
    await flush();

    expect(receivedA).toEqual([{ type: "a", _eventId: "A1" }]);
    expect(receivedB).toEqual([{ type: "b", _eventId: "B1" }]);
    // A 重连时携带的是 A 自己的 cursor（此时 A 尚未收到任何事件 → null），
    // 而不是 B 的 B1。精确的「A 收到 A1 后重连携带 A1」invariant
    // 由 sharedSseEffect.test.ts（虚拟时间）证明。
    expect(lastEventIdByUrl.get("https://nolo.test/api/events/space-1")).not.toBe("B1");

    disposeA();
    disposeB();
  });
});
