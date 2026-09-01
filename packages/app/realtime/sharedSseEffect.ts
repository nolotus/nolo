// packages/app/realtime/sharedSseEffect.ts
// Realtime Effect kernel（第一刀）：把 sharedSse 的手工机制收进 Effect。
//
// 可替换边界（窄接口，无空泛抽象）：
//   SseClock      — sleep（生产=setTimeout 真实 sleep；测试=TestClock 虚拟时间）
//   SseTransport  — fetch（生产=fetch；测试=内存 mock）
//   SseCursor     — 每个 physical subscription 的 scoped cursor（Ref），替代模块级全局
//   SseLock       — navigator.locks 选举（生产=真实 locks；测试=单持有者 mock）
//   SseBroadcast  — BroadcastChannel 扇出（生产=真实 channel；测试=内存 channel）
//
// 生命周期语义：
//   - 整个 subscription 是一个 fiber；dispose = interrupt fiber（AbortSignal 自动触发 fetch abort）
//   - reader.releaseLock / broadcast.close 用 Effect.ensuring 绑定到 fiber 生命周期
//     （generator finally 在 async 中断时不会执行，ensuring 才会）
//   - cursor 是 scoped Ref：每个 physical subscription 一份实例（A → Ref A、B → Ref B，
//     各自独立），同 key 的 leader/follower 在**各自实例内**维护自己的 Ref；
//     cursor 值经 BroadcastChannel 广播同步（follower 收到带 _eventId 的事件写自己的 Ref），
//     跨 key 天然隔离（不同 key 的实例不互通）

import { Context, Data, Effect, Fiber, Layer, Option, Ref, Deferred } from "effect";
import { resolveRetryAfterMs } from "app/utils/retryAfter";

export type SseEvent = Record<string, unknown>;

export type SubscribeSharedSseArgs = {
  key: string;
  url: string;
  headers?: Record<string, string>;
  onEvent: (event: SseEvent) => void;
  onTerminalStatus?: (status: number) => void;
};

export type SharedSseMessage =
  | { type: "event"; event: SseEvent }
  | { type: "terminal-status"; status: number };

export const SHARED_SSE_PREFIX = "nolo-shared-sse";
export const RETRY_INITIAL_MS = 1000;
export const RETRY_MAX_MS = 30000;
export const FOLLOWER_RETRY_MS = 1000;

// ── Services ────────────────────────────────────────────────────────────────

export class SseClock extends Context.Service<SseClock, {
  readonly sleep: (ms: number) => Effect.Effect<void>;
}>()("SseClock") {}

export class SseTransport extends Context.Service<SseTransport, {
  readonly fetch: (
    url: string,
    headers: Record<string, string>
  ) => Effect.Effect<Response, SseStreamError>;
}>()("SseTransport") {}

export class SseCursor extends Context.Service<SseCursor, {
  readonly get: () => Effect.Effect<string | null>;
  readonly set: (id: string) => Effect.Effect<void>;
}>()("SseCursor") {}

export class SseLock extends Context.Service<SseLock, {
  readonly withLock: <A, R>(
    name: string,
    use: Effect.Effect<A, never, R>
  ) => Effect.Effect<Option.Option<A>, never, R>;
}>()("SseLock") {}

export class SseBroadcast extends Context.Service<SseBroadcast, {
  readonly create: (
    name: string,
    onMessage: (message: SharedSseMessage) => void
  ) => Effect.Effect<{
    readonly post: (message: SharedSseMessage) => void;
    readonly close: () => void;
  }>;
}>()("SseBroadcast") {}

// ── Errors ──────────────────────────────────────────────────────────────────

export class SseStreamError extends Data.TaggedError("SseStreamError")<{
  readonly cause: unknown;
  /** true 表示该次失败发生在「成功建立 SSE response（response.ok && body）之后」，
   *  即读流阶段失败；retry loop 据此把 backoff 复位（建连成功即视为连接成功）。 */
  readonly connected?: boolean;
}> {}

// ── Pure helpers ────────────────────────────────────────────────────────────

/**
 * 解析一个 SSE chunk，返回解析出的事件与最后见到的 event id。
 * 纯函数：不写任何外部状态；cursor 由调用方通过返回的 lastEventId 更新。
 */
export function parseSseChunk(chunk: string): {
  events: SseEvent[];
  lastEventId: string | null;
} {
  const events: SseEvent[] = [];
  let lastEventId: string | null = null;
  for (const line of chunk.split("\n")) {
    const trimmed = line.trim();
    // 解析 SSE id: 行（标准 SSE Last-Event-ID 机制）
    if (trimmed.startsWith("id:")) {
      const id = trimmed.slice(3).trim();
      if (id) lastEventId = id;
      continue;
    }
    if (!trimmed.startsWith("data:")) continue;
    const json = trimmed.slice(5).trim();
    if (!json) continue;
    try {
      const event = JSON.parse(json);
      if (event && typeof event.type === "string") {
        // 记住事件的 _eventId（服务端 pushEvent 加的）
        if (typeof event._eventId === "string") {
          lastEventId = event._eventId;
        }
        events.push(event);
      }
    } catch {
      // Ignore heartbeats and malformed partial lines.
    }
  }
  return { events, lastEventId };
}

// ── Effect program ──────────────────────────────────────────────────────────

/**
 * 单次 physical SSE 连接：fetch → 读流 → 解析 → 回调。
 * 返回 "terminal"（401/403，停止）或 "stream-ended"（正常结束，重连）。
 * 失败返回 SseStreamError（网络错误 / 非 2xx / 读流错误）。
 * connected 语义：「成功建立 SSE response（response.ok && response.body 成立）」
 * 即视为连接成功，retry loop 据此把 backoff 复位为 RETRY_INITIAL_MS——即使随后的
 * reader 读流失败、下次重连也按初始退避（旧行为），而不是沿用已增长的 backoff。
 * 503 等非 2xx（无 body 可读）不会进入 connected，仍走 Retry-After 增长路径。
 */
const readSseOnce = (
  args: SubscribeSharedSseArgs,
  publish: (message: SharedSseMessage) => void
): Effect.Effect<
  { readonly outcome: "terminal" | "stream-ended"; readonly connected: boolean },
  SseStreamError,
  SseCursor | SseTransport
> =>
  Effect.gen(function* () {
    const transport = yield* SseTransport;
    const cursor = yield* SseCursor;

    const lastEventId = yield* cursor.get();
    const response = yield* transport.fetch(args.url, {
      Accept: "text/event-stream",
      ...(lastEventId ? { "Last-Event-ID": lastEventId } : {}),
      ...(args.headers ?? {}),
    });

    if (!response.ok || !response.body) {
      if (response.status === 401 || response.status === 403) {
        args.onTerminalStatus?.(response.status);
        publish({ type: "terminal-status", status: response.status });
        return { outcome: "terminal" as const, connected: false };
      }
      return yield* Effect.fail(
        new SseStreamError({ cause: { status: response.status, headers: response.headers } })
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    // 可中断读：Effect.callback + canceler(reader.cancel)。
    // 中断时 canceler 取消 pending read，保证 fiber 可中断、无悬挂。
    // v4: Effect.async 已移除，改用 Effect.callback（签名兼容：resume + 返回 canceler）。
    const abortableRead = Effect.callback<ReadableStreamReadResult<Uint8Array>, Error>(
      (resume) => {
        reader.read().then(
          (r) => resume(Effect.succeed(r as ReadableStreamReadResult<Uint8Array>)),
          (e) => resume(Effect.fail(new Error((e as Error)?.name ?? "read-error"))),
        );
        return Effect.sync(() => {
          void reader.cancel().catch(() => {});
        });
      }
    );

    const readLoop = Effect.gen(function* () {
      while (true) {
        const { done, value } = yield* abortableRead;
        if (done) return;
        const chunk = decoder.decode(value, { stream: true });
        const { events, lastEventId: chunkLastId } = parseSseChunk(chunk);
        if (chunkLastId) yield* cursor.set(chunkLastId);
        for (const event of events) {
          args.onEvent(event);
          publish({ type: "event", event });
        }
      }
    });

    return yield* readLoop.pipe(
      // connected = true：读到此处说明 response.ok && response.body 已成立
      //（连接成功建立），随后的读流失败属于「建连成功后的 reader 错误」，
      // retry loop 据此复位 backoff。非 2xx 在 fetch 之后直接 return/fail，
      // 不会走到这里（connected 保持 false）。
      Effect.catch((error) =>
        Effect.fail(new SseStreamError({ cause: error, connected: true }))
      ),
      Effect.ensuring(
        Effect.sync(() => {
          try {
            reader.releaseLock();
          } catch {
            // Already released or closed.
          }
        })
      ),
      Effect.map(() => ({ outcome: "stream-ended" as const, connected: true }))
    );
  });

/**
 * 带 retry/backoff 的读循环：503/网络错误 → sleep(retryAfter) → 重试。
 * sleep 走 SseClock（可替换为 TestClock 做虚拟时间测试）。
 *
 * cursor 粒度决策：cursorRef 由 subscribeSharedSseEffect 在 per-key 实例层创建
 * （见该函数注释），本循环只读写它，不负责创建。这样 cursor 属于
 * physical subscription/key 而非「leader 任期」——重新当选/锁交接后
 * 仍携带此前收到的 Last-Event-ID，避免服务端全量重放。
 *
 * 返回 "terminal"（401/403，调用方应终止选举循环）或 "stream-ended"（正常结束）。
 */
export const readSseLoop = (
  args: SubscribeSharedSseArgs,
  publish: (message: SharedSseMessage) => void,
  cursorRef: Ref.Ref<string | null>
): Effect.Effect<"terminal" | "stream-ended", never, SseClock | SseTransport> =>
  Effect.gen(function* () {
    const clock = yield* SseClock;
    const cursorService: Context.Service.Shape<typeof SseCursor> = {
      get: () => Ref.get(cursorRef),
      set: (id: string) => Ref.set(cursorRef, id),
    };

    let retryDelay = RETRY_INITIAL_MS;

    const loop = Effect.gen(function* () {
      while (true) {
        // v4: Effect.either 已移除，改用 Effect.result（Result.Success/Failure）
        const outcome = yield* Effect.result(readSseOnce(args, publish));
        if (outcome._tag === "Success") {
          if (outcome.success.outcome === "terminal") return "terminal" as const;
          // connected = 成功建立 SSE response（response.ok && response.body 成立），
          // 此时把 backoff 复位为 RETRY_INITIAL_MS：流正常结束或随后的 reader
          // 读流错误触发重连时，下次重连都按初始退避，不沿用已增长的 backoff。
          // 非 2xx（503 等）不会进入 connected，仍走 Retry-After 增长路径。
          if (outcome.success.connected) retryDelay = RETRY_INITIAL_MS;
          yield* clock.sleep(retryDelay);
          continue;
        }
        const error = outcome.failure;
        const cause = error.cause as { status?: number; headers?: Headers };
        if (cause.status === 401 || cause.status === 403) {
          // terminal status 已在 readSseOnce 内处理
          return "terminal" as const;
        }
        // 建连成功（200 + body）后的读流失败也复位 backoff：connect 成功即
        // 视为连接成功，next reconnect 按初始退避（旧行为），不沿用已增长的
        // backoff。非 2xx 失败（error.connected 未设/false）仍走 Retry-After 增长。
        if (error.connected) retryDelay = RETRY_INITIAL_MS;
        const retryAfterMs = resolveRetryAfterMs(cause.headers ?? null, retryDelay);
        yield* clock.sleep(retryAfterMs);
        retryDelay = Math.min(retryAfterMs * 2, RETRY_MAX_MS);
      }
    });

    return yield* loop.pipe(Effect.provideService(SseCursor, cursorService));
  });

/**
 * 选举循环：leader 持有 lock 跑 readSseLoop，follower 等待后重试。
 * 用 Deferred-gate 把 lock callback（promise 边界）桥回 Effect fiber，
 * 保证 TestClock / FiberRefs 在 callback 内仍然生效。
 *
 * terminal 语义：readSseLoop 返回 "terminal"（401/403）时直接终止选举循环，
 * 不再重试——terminal 本就不该重试（旧共享模式用死 token 无限重试属 bug）。
 * 共享与 direct 两种模式统一为「terminal 即停」；onTerminalStatus 已在
 * readSseOnce 内触发，调用方仍能感知。
 */
export const runElection = (
  args: SubscribeSharedSseArgs,
  publish: (message: SharedSseMessage) => void,
  cursorRef: Ref.Ref<string | null>
): Effect.Effect<void, never, SseClock | SseLock | SseTransport> =>
  Effect.gen(function* () {
    const lock = yield* SseLock;
    const clock = yield* SseClock;
    const lockName = `${SHARED_SSE_PREFIX}:lock:${args.key}`;

    while (true) {
      const outcome = yield* lock.withLock(lockName, readSseLoop(args, publish, cursorRef));
      if (Option.isSome(outcome)) {
        // 拿到锁且 use 完成：use 只在 terminal 时返回（stream-ended / retryable
        // 错误都在 readSseLoop 内部消化）。terminal 即停，不再热循环。
        return;
      }
      // 没拿到锁（follower）→ 节流后重新选举
      yield* clock.sleep(FOLLOWER_RETRY_MS);
    }
  });

// ── Live layers（生产实现）───────────────────────────────────────────────────

/**
 * 完整 subscription program：创建 BroadcastChannel + 选举循环。
 * 整个 program 在单个 fiber 里运行（façade 用 runFork 启动），
 * dispose = interrupt 该 fiber；channel.close 绑定到 ensuring。
 *
 * cursor 粒度决策：cursorRef 在这里（per-key 实例层）创建，而不是在
 * readSseLoop 内——cursor 属于 physical subscription/key，而非「leader 任期」。
 * 语义澄清：每个 subscription 实例有自己的 cursorRef（A → Ref A、B → Ref B，
 * 各自独立，互不读写）；同 key 的 leader/follower 在各自实例内维护自己的 Ref。
 * cursor 值的跨实例同步靠 BroadcastChannel：follower 收到广播的带 _eventId
 * 事件时写自己的 Ref。因此同一 key 的不同实例在 lock handover 后都能带上
 * 正确的 Last-Event-ID（leader 掉线前收到的 id 已广播给 follower），
 * 避免服务端全量重放。跨 key 天然隔离（不同 key 的实例不互通）。
 */
export const subscribeSharedSseEffect = (
  args: SubscribeSharedSseArgs
): Effect.Effect<void, never, SseBroadcast | SseClock | SseLock | SseTransport> =>
  Effect.gen(function* () {
    const broadcast = yield* SseBroadcast;
    const channelName = `${SHARED_SSE_PREFIX}:${args.key}`;
    const cursorRef = yield* Ref.make<string | null>(null);

    let disposed = false;
    const channel = yield* broadcast.create(channelName, (message) => {
      if (disposed) return;
      if (message.type === "event") {
        // follower 也写 cursor：同一实例的 Ref 被 leader 与 follower 共享，
        // 晋升时 Last-Event-ID 不归零（见函数头注释的粒度决策）。
        const eventId = message.event._eventId;
        if (typeof eventId === "string") {
          Effect.runSync(Ref.set(cursorRef, eventId));
        }
        args.onEvent(message.event);
        return;
      }
      if (message.type === "terminal-status") {
        args.onTerminalStatus?.(message.status);
      }
    });

    const publish = (message: SharedSseMessage) => {
      channel.post(message);
    };

    return yield* runElection(args, publish, cursorRef).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          disposed = true;
          channel.close();
        })
      )
    );
  });

/** 生产 Clock：setTimeout 实现真实 sleep；测试用 SseClock + TestClock 替换。 */
export const SseClockLive = Layer.succeed(SseClock, {
  sleep: (ms) =>
    Effect.callback<void>((resume) => {
      const t = setTimeout(() => resume(Effect.void), ms);
      return Effect.sync(() => clearTimeout(t));
    }),
});

/** 生产 Transport：fetch，AbortSignal 由 Effect 中断自动触发。 */
export const SseTransportLive = Layer.succeed(SseTransport, {
  fetch: (url, headers) =>
    Effect.tryPromise({
      try: (signal) =>
        fetch(url, { method: "GET", headers, signal }),
      catch: (e) => new SseStreamError({ cause: e }),
    }),
});

/** 生产 Lock：navigator.locks 选举，Deferred-gate 桥回 Effect fiber。 */
export const SseLockLive = Layer.succeed(SseLock, {
  withLock: <A, R>(name: string, use: Effect.Effect<A, never, R>) =>
    Effect.gen(function* () {
      const locks = (navigator as any).locks;
      const go = yield* Deferred.make<void>();
      const done = yield* Deferred.make<void>();
      // runner 把 use 的结果写进闭包变量；done 用 ensuring 完成（中断也完成），
      // 保证 navigator.locks 的 callback promise 总能 settle → 锁总能释放。
      // 读侧在 done 完成后才读 result，写读有 happens-before，无竞态。
      let result: A | undefined;
      const runner = yield* Effect.forkChild(
        Effect.gen(function* () {
          yield* Deferred.await(go);
          result = yield* use;
        }).pipe(Effect.ensuring(Deferred.succeed(done, undefined)))
      );
      const acquired = yield* Effect.tryPromise(() =>
        locks.request(name, { mode: "exclusive", ifAvailable: true }, (lock: unknown) => {
          if (!lock) return Promise.resolve(false);
          return Effect.runPromise(
            Effect.gen(function* () {
              yield* Deferred.succeed(go, undefined);
              yield* Deferred.await(done);
            })
          ).then(() => true);
        })
      ).pipe(Effect.catch(() => Effect.succeed(false)));
      if (!acquired) {
        yield* Fiber.interrupt(runner);
        return Option.none();
      }
      // 拿到锁且 use 已完成（promise 在 done 完成后才 resolve true）
      return Option.some(result as A);
    }),
});

/** 直接模式 Lock：无 navigator.locks 时（旧 subscribeDirect 路径）总是获取。 */
export const SseLockDirect = Layer.succeed(SseLock, {
  withLock: <A, R>(_name: string, use: Effect.Effect<A, never, R>) =>
    Effect.gen(function* () {
      const result = yield* use;
      return Option.some(result);
    }),
});

/** 生产 Broadcast：BroadcastChannel 扇出。 */
export const SseBroadcastLive = Layer.succeed(SseBroadcast, {
  create: (name, onMessage) =>
    Effect.sync(() => {
      const channel = new BroadcastChannel(name);
      channel.onmessage = (message: MessageEvent<SharedSseMessage>) => {
        const data = message.data;
        if (!data || typeof data !== "object") return;
        onMessage(data as SharedSseMessage);
      };
      return {
        post: (message: SharedSseMessage) => {
          try {
            channel.postMessage(message);
          } catch {
            // Broadcast delivery is best-effort; the leader still updates itself.
          }
        },
        close: () => {
          try {
            channel.close();
          } catch {
            // Already closed.
          }
        },
      };
    }),
});

/** 直接模式 Broadcast：no-op。direct fallback（supportsSharedTransport() 为 false）
 * 的常见触发条件恰是 typeof BroadcastChannel === "undefined"，因此这里绝不依赖
 * BroadcastChannel。direct 模式无跨实例共享语义（无锁选举、无扇出），单实例
 * 在 readSseOnce 内 self-deliver 事件，post/close 为空操作即可。 */
export const SseBroadcastDirect = Layer.succeed(SseBroadcast, {
  create: (_name, _onMessage) =>
    Effect.sync(() => ({
      post: () => {},
      close: () => {},
    })),
});
