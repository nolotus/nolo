// packages/app/realtime/sharedSseEffect.test.ts
// deterministic（虚拟时间）测试：不依赖真实等待时间。
// 用 TestClock 控制 sleep，用内存 transport/broadcast/lock 替换生产实现。

import { describe, expect, test } from "bun:test";
import { Duration, Effect, Fiber, FiberId, Layer, Option, TestContext, TestClock } from "effect";

import {
  SseBroadcast,
  SseClock,
  SseLock,
  SseLockDirect,
  SseTransport,
  SseStreamError,
  subscribeSharedSseEffect,
  type SharedSseMessage,
} from "./sharedSseEffect";

// ── Test services ───────────────────────────────────────────────────────────

/** TestClock 驱动的 Clock：sleep 走虚拟时间。 */
const testClockLayer = Layer.succeed(SseClock, {
  sleep: (ms) => Effect.sleep(Duration.millis(ms)),
});

/** 内存 Transport：fetch 由测试注入。 */
function makeTransport(
  fetchImpl: (url: string, headers: Record<string, string>) => Promise<Response>
) {
  return Layer.succeed(SseTransport, {
    fetch: (url, headers) =>
      Effect.tryPromise({
        try: () => fetchImpl(url, headers),
        catch: (e) => new SseStreamError({ cause: e }),
      }),
  });
}

/** 内存 Broadcast：记录 post 的消息，不跨实例扇出。 */
function makeBroadcast() {
  const posted: SharedSseMessage[] = [];
  const layer = Layer.succeed(SseBroadcast, {
    create: (_name, _onMessage) =>
      Effect.sync(() => ({
        post: (m) => {
          posted.push(m);
        },
        close: () => {},
      })),
  });
  return { layer, posted };
}

/** 内存 Broadcast（扇出版）：同 key 的多个实例互相投递消息（模拟真实 BroadcastChannel）。 */
function makeFanoutBroadcast() {
  const channels = new Map<string, Set<(message: SharedSseMessage) => void>>();
  const layer = Layer.succeed(SseBroadcast, {
    create: (name, onMessage) =>
      Effect.sync(() => {
        const set = channels.get(name) ?? new Set();
        set.add(onMessage);
        channels.set(name, set);
        return {
          post: (m) => {
            for (const handler of set) {
              if (handler !== onMessage) handler(m);
            }
          },
          close: () => {
            set.delete(onMessage);
          },
        };
      }),
  });
  return { layer };
}

/**
 * 内存 Lock（单持有者）：同一时刻只有一个实例能拿到锁，其余返回 None。
 * 模拟 navigator.locks 的选举语义，供「锁交接 / 重新当选」测试使用。
 * 释放用 Effect.ensuring（generator finally 在中断时不执行，ensuring 才会），
 * 与生产 SseLockLive 的释放语义一致：leader 掉线（interrupt）后锁被释放。
 */
function makeSingleHolderLock() {
  let held = false;
  const layer = Layer.succeed(SseLock, {
    withLock: <A, R>(_name: string, use: Effect.Effect<A, never, R>) =>
      Effect.gen(function* () {
        if (held) return Option.none();
        held = true;
        return yield* use.pipe(
          Effect.map((result) => Option.some(result)),
          Effect.ensuring(
            Effect.sync(() => {
              held = false;
            })
          )
        );
      }),
  });
  return { layer };
}

const encoder = new TextEncoder();

function sseResponse(body: string, keepOpen = false) {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(body));
        if (!keepOpen) controller.close();
      },
    }),
    { status: 200, headers: { "Content-Type": "text/event-stream" } }
  );
}

/** 跑一个测试 program：提供全部 test services + TestContext。 */
function runWith<R>(
  program: Effect.Effect<void, never, R>,
  layers: Layer.Layer<never, never, R>[]
) {
  const merged = Layer.mergeAll(testClockLayer, ...layers);
  return Effect.runPromise(
    program.pipe(
      Effect.provide(TestContext.TestContext),
      Effect.provide(merged)
    ) as Effect.Effect<void>
  );
}
// ── Tests ───────────────────────────────────────────────────────────────────

describe("sharedSseEffect (deterministic)", () => {
  test("keeps per-channel cursor isolated across different channel keys on reconnect", async () => {
    // A 收到 A1 后断线重连，必须携带 Last-Event-ID: A1，而不是 B 的 B1。
    const lastEventIdByUrl = new Map<string, string | null>();
    const transport = makeTransport(async (url, headers) => {
      if (url.includes("space-1")) {
        if (!lastEventIdByUrl.has(url)) {
          lastEventIdByUrl.set(url, null);
          return sseResponse(
            `id: A1\ndata: ${JSON.stringify({ type: "a", _eventId: "A1" })}\n\n`
          );
        }
        lastEventIdByUrl.set(url, headers["Last-Event-ID"] ?? null);
        return sseResponse(
          `id: A2\ndata: ${JSON.stringify({ type: "a", _eventId: "A2" })}\n\n`,
          true // 保持打开，避免无限重连
        );
      }
      if (url.includes("user-1")) {
        return sseResponse(
          `id: B1\ndata: ${JSON.stringify({ type: "b", _eventId: "B1" })}\n\n`,
          true
        );
      }
      throw new Error("unexpected url " + url);
    });
    const { layer: broadcastLayer } = makeBroadcast();
    const receivedA: unknown[] = [];
    const receivedB: unknown[] = [];

    const program = Effect.gen(function* () {
      const fiberA = yield* Effect.fork(
        subscribeSharedSseEffect({
          key: "space-1",
          url: "https://nolo.test/api/events/space-1",
          onEvent: (e) => receivedA.push(e),
        })
      );
      const fiberB = yield* Effect.fork(
        subscribeSharedSseEffect({
          key: "user-1",
          url: "https://nolo.test/api/events/user-1",
          onEvent: (e) => receivedB.push(e),
        })
      );
      for (let i = 0; i < 10; i++) yield* Effect.yieldNow();

      // A 的第一次流结束 → 进入 retry sleep（1000ms）→ 重连
      yield* TestClock.adjust(Duration.millis(1000));
      for (let i = 0; i < 10; i++) yield* Effect.yieldNow();

      expect(receivedB).toEqual([{ type: "b", _eventId: "B1" }]);
      // A 重连时携带的必须是 A 自己的 cursor，而不是 B 的
      expect(lastEventIdByUrl.get("https://nolo.test/api/events/space-1")).toBe("A1");

      yield* Fiber.interrupt(fiberA);
      yield* Fiber.interrupt(fiberB);
    });

    await runWith(program, [transport, broadcastLayer, SseLockDirect]);
  });

  test("Retry-After backoff: no reconnect before 2s, reconnect exactly at 2s (virtual time)", async () => {
    let attempts = 0;
    const transport = makeTransport(async () => {
      attempts++;
      if (attempts === 1) {
        return new Response(JSON.stringify({ error: "draining" }), {
          status: 503,
          headers: { "Content-Type": "application/json", "Retry-After": "2" },
        });
      }
      return sseResponse(
        `data: ${JSON.stringify({ type: "hello", value: 2 })}\n\n`,
        true
      );
    });
    const { layer: broadcastLayer } = makeBroadcast();
    const received: unknown[] = [];

    const program = Effect.gen(function* () {
      const fiber = yield* Effect.fork(
        subscribeSharedSseEffect({
          key: "space-space-2",
          url: "https://nolo.test/api/events/space-space-2",
          onEvent: (e) => received.push(e),
        })
      );
      for (let i = 0; i < 10; i++) yield* Effect.yieldNow();
      expect(attempts).toBe(1);

      // 首次 503 + Retry-After: 2 → 应等待 2000ms
      yield* TestClock.adjust(Duration.millis(1999));
      for (let i = 0; i < 10; i++) yield* Effect.yieldNow();
      expect(attempts).toBe(1); // 1999ms 不应重连

      yield* TestClock.adjust(Duration.millis(1));
      for (let i = 0; i < 10; i++) yield* Effect.yieldNow();
      expect(attempts).toBe(2); // 2000ms 应重连
      expect(received).toEqual([{ type: "hello", value: 2 }]);

      yield* Fiber.interrupt(fiber);
    });

    await runWith(program, [transport, broadcastLayer, SseLockDirect]);
  });

  test("dispose during retry sleep: no new fetch, no new event, no dangling retry", async () => {
    let attempts = 0;
    const transport = makeTransport(async () => {
      attempts++;
      return new Response(JSON.stringify({ error: "draining" }), {
        status: 503,
        headers: { "Content-Type": "application/json", "Retry-After": "2" },
      });
    });
    const { layer: broadcastLayer } = makeBroadcast();
    const received: unknown[] = [];

    const program = Effect.gen(function* () {
      const fiber = yield* Effect.fork(
        subscribeSharedSseEffect({
          key: "space-space-2",
          url: "https://nolo.test/api/events/space-space-2",
          onEvent: (e) => received.push(e),
        })
      );
      for (let i = 0; i < 10; i++) yield* Effect.yieldNow();
      expect(attempts).toBe(1);

      // 进入 retry sleep（2000ms）后 dispose
      yield* Fiber.interrupt(fiber);
      for (let i = 0; i < 10; i++) yield* Effect.yieldNow();

      // 推进很久：不应有新的 fetch / event / dangling retry
      yield* TestClock.adjust(Duration.millis(100_000));
      for (let i = 0; i < 10; i++) yield* Effect.yieldNow();

      expect(attempts).toBe(1);
      expect(received).toEqual([]);
    });

    await runWith(program, [transport, broadcastLayer, SseLockDirect]);
  });

  test("terminal (401): no reconnect hot loop, onTerminalStatus fires exactly once", async () => {
    let attempts = 0;
    let terminalStatuses: number[] = [];
    const transport = makeTransport(async () => {
      attempts++;
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    });
    const { layer: broadcastLayer } = makeBroadcast();

    const program = Effect.gen(function* () {
      const fiber = yield* Effect.fork(
        subscribeSharedSseEffect({
          key: "space-space-3",
          url: "https://nolo.test/api/events/space-space-3",
          onEvent: () => {},
          onTerminalStatus: (status) => terminalStatuses.push(status),
        })
      );
      for (let i = 0; i < 10; i++) yield* Effect.yieldNow();

      // 401 → terminal：fetch 计数必须停在 1，不再热循环
      expect(attempts).toBe(1);
      expect(terminalStatuses).toEqual([401]);

      // 推进很久：仍无新 fetch（terminal 即停，不重试）
      yield* TestClock.adjust(Duration.millis(100_000));
      for (let i = 0; i < 10; i++) yield* Effect.yieldNow();

      expect(attempts).toBe(1);
      expect(terminalStatuses).toEqual([401]);

      yield* Fiber.interrupt(fiber);
    });

    await runWith(program, [transport, broadcastLayer, SseLockDirect]);
  });

  test("cursor survives lock handover: promoted follower reconnects with Last-Event-ID", async () => {
    // 两个实例竞争同一 key 的锁：A 先当选 leader 收到 A1（B 作为 follower 经
    // broadcast 也收到 A1）。随后 A 掉线（dispose）→ 锁释放 → B 晋升为 leader。
    // B 的 reconnect 必须携带 A1（follower 也写 cursor），而不是空。
    const lastEventIdByUrl = new Map<string, string | null>();
    const transport = makeTransport(async (url, headers) => {
      if (!lastEventIdByUrl.has(url)) {
        lastEventIdByUrl.set(url, null);
        return sseResponse(
          `id: A1\ndata: ${JSON.stringify({ type: "a", _eventId: "A1" })}\n\n`
        );
      }
      lastEventIdByUrl.set(url, headers["Last-Event-ID"] ?? null);
      return sseResponse(
        `id: A2\ndata: ${JSON.stringify({ type: "a", _eventId: "A2" })}\n\n`,
        true // 保持打开，避免无限重连
      );
    });
    const { layer: broadcastLayer } = makeFanoutBroadcast();
    const { layer: lockLayer } = makeSingleHolderLock();
    const receivedA: unknown[] = [];
    const receivedB: unknown[] = [];

    const program = Effect.gen(function* () {
      const fiberA = yield* Effect.fork(
        subscribeSharedSseEffect({
          key: "space-space-4",
          url: "https://nolo.test/api/events/space-space-4",
          onEvent: (e) => receivedA.push(e),
        })
      );
      const fiberB = yield* Effect.fork(
        subscribeSharedSseEffect({
          key: "space-space-4",
          url: "https://nolo.test/api/events/space-space-4",
          onEvent: (e) => receivedB.push(e),
        })
      );
      for (let i = 0; i < 10; i++) yield* Effect.yieldNow();

      // A 当选 leader 收到 A1；B 是 follower（经 broadcast 也收到 A1）
      expect(receivedA).toEqual([{ type: "a", _eventId: "A1" }]);
      expect(receivedB).toEqual([{ type: "a", _eventId: "A1" }]);

      // A 掉线（dispose）→ 锁释放 → B 晋升 → B 重连必须带 Last-Event-ID: A1
      yield* Fiber.interrupt(fiberA);
      for (let i = 0; i < 10; i++) yield* Effect.yieldNow();
      yield* TestClock.adjust(Duration.millis(1000)); // B 的 follower retry sleep
      for (let i = 0; i < 10; i++) yield* Effect.yieldNow();

      expect(lastEventIdByUrl.get("https://nolo.test/api/events/space-space-4")).toBe("A1");

      yield* Fiber.interrupt(fiberB);
    });

    await runWith(program, [transport, broadcastLayer, lockLayer]);
  });
});
