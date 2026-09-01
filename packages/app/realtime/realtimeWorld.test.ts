// packages/app/realtime/realtimeWorld.test.ts
// Realtime World Test（Effect 第二刀的核心验收）：
// 真 client × 真 server core × in-memory transport/storage，单进程 deterministic。
//
// 证明：client connect → server emit E1 → client 收到（cursor=E1）
//       → 物理断网（transport 断开连接流，client fiber 不动）
//       → server emit E2/E3（离线期间，仅落库）
//       → client 自己重连，请求头带 Last-Event-ID=E1
//       → server core replay E2/E3（与 production 共用同一套规则）
//       → client 最终收到 [E1,E2,E3]，不重复不丢失。
//
// 组件分工：
//   - 真实 client logic：subscribeSharedSseEffect / runElection / readSseLoop /
//     readSseOnce / parseSseChunk（sharedSseEffect.ts 全真，未 mock）
//   - 真实 server core：InMemoryEventStore + selectForReplay
//     （server/realtime/eventStoreCore.ts，production 同款 replay 规则）
//   - fake transport：FakeNetwork（可控 connect/disconnect/deliver/记录请求头）
//   - fake storage：InMemoryEventStore（核心旁，与 LevelDB adapter 共用规则）
//   - TestClock：reconnect 的 retry sleep 走虚拟时间（无真实 sleep）
//
// 不拉入：HTTP/auth/routing/LevelDB/React/Redux/真实网络。

import { describe, expect, test } from "bun:test";
import { Duration, Effect, Fiber, Layer } from "effect";
import { TestClock } from "effect/testing";

import {
  SseBroadcast,
  SseClock,
  SseLockDirect,
  SseStreamError,
  SseTransport,
  subscribeSharedSseEffect,
} from "./sharedSseEffect";
import { makeInMemoryEventStore } from "server/realtime/eventStoreCore";
import type { ServerEvent } from "server/realtime/eventStoreCore";

// ── Test services（与 sharedSseEffect.test.ts 相同的虚拟时间基础设施） ──────

const testClockLayer = Layer.succeed(SseClock, {
  sleep: (ms) => Effect.sleep(Duration.millis(ms)),
});

/** no-op Broadcast：单实例 world test 无跨实例扇出语义（等同生产 direct 模式）。 */
const noopBroadcastLayer = Layer.succeed(SseBroadcast, {
  create: (_name, _onMessage) =>
    Effect.sync(() => ({
      post: () => {},
      close: () => {},
    })),
});

const encoder = new TextEncoder();

/** 复刻 eventBus.buildSseData 的 wire 格式（id: 行 + data: 行）。 */
function sseData(event: ServerEvent, eventId?: string): string {
  const idLine = eventId ? `id: ${eventId}\n` : "";
  return `${idLine}data: ${JSON.stringify(event)}\n\n`;
}

// ── FakeServer：真实 server core（InMemoryEventStore + 共享 replay 规则） ────

/**
 * 对端 server 实体。语义对齐 eventBus.ts：
 *   - emit   = pushEvent：先落库再广播在线订阅者（world test 用同步持久化，
 *     规避 production fire-and-forget 竞态——该竞态在 Q5 单独报告，不在本测试复现）
 *   - handleConnect = handleEvents：有 Last-Event-ID → 核心 replay；
 *     无 → 补发最近一条（订阅竞态保护，与 eventBus 语义一致）
 *   - disconnectAll = 物理断网：error 掉所有连接流（client 的 reader 读流失败 →
 *     SseStreamError(connected:true) → 自身 retry loop 重连；测试不 interrupt fiber）
 */
class FakeServer {
  readonly store = makeInMemoryEventStore(() => 0); // 固定时间 → retention(1h) 不误伤
  readonly connections = new Set<ReadableStreamDefaultController<Uint8Array>>();

  emit(channel: string, event: ServerEvent, eventId?: string): void {
    const { eventWithId } = this.store.append(channel, event, eventId); // 先落库
    const payload = encoder.encode(sseData(eventWithId, eventWithId._eventId as string));
    for (const controller of this.connections) {
      try {
        controller.enqueue(payload); // 再广播在线订阅者
      } catch {
        // 连接已断流（errored），忽略
      }
    }
  }

  /** 新连接：返回 SSE Response（初始 payload = replay 或最近一条）。 */
  handleConnect(channel: string, lastEventId: string | null): Response {
    let initial = "retry: 1000\n: connected\n\n";
    if (lastEventId) {
      // server core replay 规则（与 production 同一套 selectForReplay）
      const missed = this.store.listAfter(channel, lastEventId);
      for (const event of missed) {
        initial += sseData(event, event._eventId as string);
      }
    } else {
      const last = this.store.latest(channel); // 无 Last-Event-ID：补发最近一条
      if (last) initial += sseData(last, last._eventId as string);
    }

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.connections.add(controller);
        controller.enqueue(encoder.encode(initial));
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  /** 物理断网：error 掉所有连接流（client fiber 不被打断，reconnect 由其自身逻辑触发）。 */
  disconnectAll(): void {
    for (const controller of this.connections) {
      try {
        controller.error(new Error("network down"));
      } catch {
        // already errored
      }
    }
    this.connections.clear();
  }
}

// ── FakeNetwork：可控 transport（connect / disconnect / deliver / 记录请求头） ──

/**
 * 测试控制的网络。client program 完全不知道自己在 fake network 里：
 * fetch 走 SseTransport service（与生产同一接口），只是实现换成内存。
 * 断网 = error 掉连接流（client 的 reader 报错 → 其自身 retry loop 重连），
 * 不是 interrupt client fiber。
 */
class FakeNetwork {
  readonly fetches: Array<{ url: string; headers: Record<string, string> }> = [];
  readonly connections = new Map<string, ReadableStreamDefaultController<Uint8Array>>();

  constructor(private readonly server: FakeServer) {}

  handleFetch(url: string, headers: Record<string, string>): Response {
    this.fetches.push({ url, headers });
    const channel = new URL(url).pathname.split("/").pop() ?? "";
    const response = this.server.handleConnect(channel, headers["Last-Event-ID"] ?? null);
    // 登记 controller 以便 inspect（本 test 仅用 server.connections 管理生命周期）
    return response;
  }

  lastFetchHeaders(url: string): Record<string, string> | undefined {
    for (let i = this.fetches.length - 1; i >= 0; i--) {
      if (this.fetches[i].url === url) return this.fetches[i].headers;
    }
    return undefined;
  }

  fetchCount(url?: string): number {
    if (!url) return this.fetches.length;
    return this.fetches.filter((f) => f.url === url).length;
  }
}

function makeTransportLayer(network: FakeNetwork) {
  return Layer.succeed(SseTransport, {
    fetch: (url: string, headers: Record<string, string>) =>
      Effect.tryPromise({
        try: async () => network.handleFetch(url, headers),
        catch: (e) => new SseStreamError({ cause: e }),
      }),
  });
}

function runWith<A, R>(
  program: Effect.Effect<A, never, R>,
  layers: Layer.Layer<never, never, R>[]
) {
  const merged = Layer.mergeAll(testClockLayer, ...layers);
  return Effect.runPromise(
    program.pipe(
      Effect.provide(TestClock.layer()),
      Effect.provide(merged)
    ) as Effect.Effect<A>
  );
}

const yieldLoop = () => Effect.gen(function* () {
  for (let i = 0; i < 20; i++) yield* Effect.yieldNow;
});

// ── World tests ──────────────────────────────────────────────────────────────

describe("realtime world (real client × real server core)", () => {
  test("convergence: connect → E1 → physical disconnect → E2/E3 → reconnect(Last-Event-ID=E1) → replay → [E1,E2,E3]", async () => {
    const server = new FakeServer();
    const network = new FakeNetwork(server);
    const url = "https://nolo.test/api/events/space-1";
    const received: unknown[] = [];

    const program = Effect.gen(function* () {
      const fiber = yield* Effect.forkChild(
        subscribeSharedSseEffect({
          key: "space-1",
          url,
          onEvent: (e) => received.push(e),
        })
      );
      yield* yieldLoop();

      // ── 1. client connect（无历史，无 Last-Event-ID）
      expect(network.fetchCount(url)).toBe(1);
      expect(received).toEqual([]);

      // ── 2. server emit E1 → 在线送达
      server.emit("space-1", { type: "e1", n: 1 }, "E1");
      yield* yieldLoop();
      expect(received).toEqual([{ type: "e1", n: 1, _eventId: "E1" }]);

      // ── 3. 物理断网（transport 断开连接流；client fiber 不动，自己走 reconnect 逻辑）
      server.disconnectAll();
      yield* yieldLoop();
      // client 尚未重连（处于 retry sleep，未推进时钟）
      expect(network.fetchCount(url)).toBe(1);
      expect(received).toEqual([{ type: "e1", n: 1, _eventId: "E1" }]);

      // ── 4. 离线期间 server emit E2、E3（只落库，无在线订阅者）
      server.emit("space-1", { type: "e2", n: 2 }, "E2");
      server.emit("space-1", { type: "e3", n: 3 }, "E3");
      yield* yieldLoop();
      expect(received).toEqual([{ type: "e1", n: 1, _eventId: "E1" }]); // 仍未收到

      // ── 5. TestClock 推进到 reconnect（RETRY_INITIAL_MS=1000）
      yield* TestClock.adjust(Duration.millis(1000));
      yield* yieldLoop();

      // ── 6. 重连请求头带 Last-Event-ID=E1（client cursor 保存的）
      expect(network.fetchCount(url)).toBe(2);
      expect(network.lastFetchHeaders(url)?.["Last-Event-ID"]).toBe("E1");

      // ── 7. server core replayAfter(space-1, E1) → E2/E3 → client 收敛
      yield* yieldLoop();
      expect(received).toEqual([
        { type: "e1", n: 1, _eventId: "E1" },
        { type: "e2", n: 2, _eventId: "E2" },
        { type: "e3", n: 3, _eventId: "E3" },
      ]);
      // 不重复不丢失：恰 3 条，连接数 2（初连 + 重连），无第三次 fetch
      expect(network.fetchCount(url)).toBe(2);

      yield* Fiber.interrupt(fiber);
    });

    await runWith(program, [makeTransportLayer(network), noopBroadcastLayer, SseLockDirect]);
  });

  test("channel isolation: client A replays only A2, never B1/B2 (server-side rule)", async () => {
    const server = new FakeServer();
    const network = new FakeNetwork(server);
    const urlA = "https://nolo.test/api/events/space-A";
    const receivedA: unknown[] = [];

    const program = Effect.gen(function* () {
      const fiberA = yield* Effect.forkChild(
        subscribeSharedSseEffect({
          key: "space-A",
          url: urlA,
          onEvent: (e) => receivedA.push(e),
        })
      );
      yield* yieldLoop();

      // client A 在线收到 A1
      server.emit("space-A", { type: "a", n: 1 }, "A1");
      yield* yieldLoop();
      expect(receivedA).toEqual([{ type: "a", n: 1, _eventId: "A1" }]);

      // 物理断网
      server.disconnectAll();
      yield* yieldLoop();

      // 离线期间：space-A 产生 A2，user-B 产生 B1、B2（B 事件穿插，验证隔离）
      server.emit("space-A", { type: "a", n: 2 }, "A2");
      server.emit("user-B", { type: "b", n: 1 }, "B1");
      server.emit("user-B", { type: "b", n: 2 }, "B2");
      yield* yieldLoop();

      // 重连（core 规则：Last-Event-ID=A1 → 只 replay space-A 的 A2）
      yield* TestClock.adjust(Duration.millis(1000));
      yield* yieldLoop();

      expect(network.lastFetchHeaders(urlA)?.["Last-Event-ID"]).toBe("A1");
      expect(receivedA).toEqual([
        { type: "a", n: 1, _eventId: "A1" },
        { type: "a", n: 2, _eventId: "A2" },
      ]);
      // B1/B2 绝不出现
      expect(receivedA.some((e) => (e as { type?: string }).type === "b")).toBe(false);

      yield* Fiber.interrupt(fiberA);
    });

    await runWith(program, [makeTransportLayer(network), noopBroadcastLayer, SseLockDirect]);
  });
});
