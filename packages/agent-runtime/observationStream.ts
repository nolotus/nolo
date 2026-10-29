// packages/agent-runtime/observationStream.ts
// LocalAgentLoop 第四刀：Observation Stream boundary。
//
// 职责：将 localLoop 内部产生的所有观测事件（canonical loop events、text/reasoning delta、
// provider in-flight tool events）收敛至单一出口 `emit(event)`，进入统一的
// Effect v4 Queue / Stream，并由此单向投影到 legacy 回调（onLoopEvent / onToolEvent /
// onTextDelta / onReasoningDelta）。
//
// 保证：
// 1. 顺序稳定：所有事件在同一个 Queue/Stream 中按严格发射顺序流转。
// 2. 单一真相源：同一事件只构造一次，由 boundary 统一入队并投影，消除多路径手工构造。
// 3. 零内存滞留（默认路径）：Queue 惰性创建，无 Stream/Queue 消费者时直投 legacy 回调，零事件积压。
// 4. 纯净 Canonical 负载：bridge 存放在独立 envelope 字段中，进入 onLoopEvent 的事件对象无 bridge 污染。
// 5. 确定性收集与清理：回合开始建立 boundary，结束/中断时 close（Queue.endUnsafe）；
//    结束后迟到事件安全拒收，无重复 terminal、无 dangling consumer。
// 6. 双重预算：队列同时受「条数上限」（capacity）与「字节上限」（byteCapacity）约束，
//    谁先到谁按 strategy 丢弃；emit 仍是同步 void，不做真背压（行为不变）。

import { Effect, Exit, Queue, Stream, type Cause } from "effect";
import type { AgentExecutionObservationEvent } from "./executionObservation";
import type { LocalAgentToolEvent } from "./localLoopContract";

export type LocalLoopObservationEvent =
  | (AgentExecutionObservationEvent & { bridge?: never })
  | {
      kind: "text-delta";
      chunk: string;
      round?: number;
      atMs: number;
    }
  | {
      kind: "reasoning-delta";
      chunk: string;
      round?: number;
      atMs: number;
    }
  | {
      kind: "tool-event";
      event: LocalAgentToolEvent;
      round?: number;
      atMs: number;
    };

/**
 * 内部统一发射信封：将 canonical event 与可选的 legacy bridge 载荷明确分离，
 * 避免 bridge 污染 canonical event 结构。
 */
export type LocalLoopEmitEnvelope = {
  event: LocalLoopObservationEvent;
  bridge?: LocalAgentToolEvent;
};

export type LegacyObservationCallbacks = {
  onLoopEvent?: (event: AgentExecutionObservationEvent) => void;
  onToolEvent?: (event: LocalAgentToolEvent) => void;
  onTextDelta?: (chunk: string) => void;
  onReasoningDelta?: (chunk: string) => void;
  onObservationEvent?: (event: LocalLoopObservationEvent) => void;
};

export const DEFAULT_OBSERVATION_QUEUE_CAPACITY = 1024;

/**
 * 默认字节预算：2 MiB。
 *
 * 推导：旧的唯一约束是 1024 条，而 observation 事件的平均体积只有几百字节
 * （text/reasoning delta 约 0.3–1 KiB，tool 事件几个 KiB 到几十 KiB），
 * 正常回合的积压实测在 1 MiB 以内；但「按条数」对单条大事件完全不设防
 * （一条 8 MiB 的 tool-result 就能把预算吃穿，更别说 1024 条）。
 * 取 2 MiB = 旧上限「8 KiB/条」假设下 1024 条的 1/4，既覆盖正常突发，
 * 又把慢消费者最坏占用从 ~8 MiB 压到 2 MiB。
 */
export const DEFAULT_OBSERVATION_QUEUE_BYTE_CAPACITY = 2 * 1024 * 1024;

/** 事件无法序列化（循环引用等）时的保守字节估计 */
const OBSERVATION_EVENT_BYTE_FALLBACK = 1024;

const UTF8_ENCODER = typeof TextEncoder !== "undefined" ? new TextEncoder() : undefined;

const observeByteLength = (text: string): number => {
  const nodeBuffer = (
    globalThis as {
      Buffer?: { byteLength?: (value: string, encoding?: string) => number };
    }
  ).Buffer;
  if (typeof nodeBuffer?.byteLength === "function") {
    return nodeBuffer.byteLength(text, "utf8");
  }
  if (UTF8_ENCODER) {
    return UTF8_ENCODER.encode(text).byteLength;
  }
  return text.length;
};

/**
 * 估计单条事件的 UTF-8 字节数（序列化后的实际占用，而非字符数）。
 * 仅在队列已激活（有 stream 消费者）、且字节预算开启时才会被调用。
 */
const measureObservationEventBytes = (event: LocalLoopObservationEvent): number => {
  try {
    const serialized = JSON.stringify(event);
    return typeof serialized === "string"
      ? observeByteLength(serialized)
      : OBSERVATION_EVENT_BYTE_FALLBACK;
  } catch {
    return OBSERVATION_EVENT_BYTE_FALLBACK;
  }
};

const resolveByteCapacity = (raw: number | null | undefined): number | null => {
  // null = 显式关闭字节预算（仅排障用，例如需要完整复现积压现场）
  if (raw === null) return null;
  if (raw === undefined) return DEFAULT_OBSERVATION_QUEUE_BYTE_CAPACITY;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_OBSERVATION_QUEUE_BYTE_CAPACITY;
  }
  return Math.floor(raw);
};

export interface LocalLoopObservationBoundaryOptions {
  /**
   * 队列最大容量限制。默认 1024（对单回合的正常突发完全足够，同时杜绝慢消费者的无限内存泄露）。
   * 与 byteCapacity 同时生效：谁先到谁截断。
   */
  readonly capacity?: number;
  /**
   * 队列累计字节预算。默认 DEFAULT_OBSERVATION_QUEUE_BYTE_CAPACITY（2 MiB）。
   * 与 capacity 同时生效（谁先到谁截断）：条数没超但字节超了，同样按 strategy 丢弃。
   * - 传 null 显式关闭字节预算（仅排障）
   * - 非法值（<=0 / NaN / Infinity）回落到默认值
   * - "unbounded" 策略下忽略（该策略的语义就是「无界」）
   */
  readonly byteCapacity?: number | null;
  /**
   * 队列溢出策略：
   * - "sliding": 丢弃最老事件（保留最新事件，适合实时 UI 观测流）
   * - "dropping": 丢弃最新到达事件
   * - "unbounded": 无界（仅供特定全量排障调试）
   * 默认 "sliding"
   */
  readonly strategy?: "sliding" | "dropping" | "unbounded";
}

export interface LocalLoopObservationBoundary {
  readonly queue: Queue.Queue<LocalLoopObservationEvent, Cause.Done<void>>;
  readonly stream: Stream.Stream<LocalLoopObservationEvent, Cause.Done<void>>;
  readonly emit: (envelope: LocalLoopEmitEnvelope | LocalLoopObservationEvent) => void;
  readonly close: () => void;
  readonly isClosed: () => boolean;
  /** 合并额外的 legacy callbacks，确保自定义 boundary 传入时 legacy 回调不丢失 */
  readonly attachCallbacks: (callbacks?: LegacyObservationCallbacks) => void;
  /** 检查当前 queue 是否已实例化（用于断言默认 legacy-only 路径零队列积压） */
  readonly isQueueActive: () => boolean;
  /** 获取当前 queue 积压大小（未初始化时为 0） */
  readonly queueSize: () => number;
  /** 获取当前 queue 内事件的累计字节估计（未激活/字节预算关闭时为 0） */
  readonly bufferedBytes: () => number;
  /** 获取因为队列容量限制而被淘汰/丢弃的事件总数（含字节预算导致的丢弃） */
  readonly droppedCount: () => number;
  /** 获取其中由字节预算触发的事件丢弃数 */
  readonly droppedByBytes: () => number;
  /** 观察流容量与统计指标 */
  readonly getMetrics: () => {
    readonly totalEmitted: number;
    readonly droppedCount: number;
    readonly peakSize: number;
    readonly capacity: number;
    readonly strategy: "sliding" | "dropping" | "unbounded";
  };
  /** 字节维度的容量与统计指标 */
  readonly getByteMetrics: () => {
    /** 生效的字节预算；null 表示关闭 */
    readonly byteCapacity: number | null;
    /** 当前积压事件的字节估计 */
    readonly bufferedBytes: number;
    /** 峰值积压字节 */
    readonly peakBytes: number;
    /** 字节预算导致的事件丢弃数（droppedCount 的子集） */
    readonly droppedByBytes: number;
  };
}

export function createLocalLoopObservationBoundary(
  initialCallbacks?: LegacyObservationCallbacks,
  options?: LocalLoopObservationBoundaryOptions,
): LocalLoopObservationBoundary {
  const rawCapacity = options?.capacity;
  const capacity =
    typeof rawCapacity === "number" && Number.isFinite(rawCapacity) && rawCapacity >= 1
      ? Math.floor(rawCapacity)
      : DEFAULT_OBSERVATION_QUEUE_CAPACITY;
  const strategy = options?.strategy ?? "sliding";
  // 字节预算与条数上限同时生效；"unbounded" 是排障逃生口，保持真正的无界语义
  const byteCapacity = strategy === "unbounded" ? null : resolveByteCapacity(options?.byteCapacity);
  const byteBudgetEnabled = byteCapacity !== null;

  let queue: Queue.Queue<LocalLoopObservationEvent, Cause.Done<void>> | undefined;
  let cachedStream: Stream.Stream<LocalLoopObservationEvent, Cause.Done<void>> | undefined;
  let closed = false;
  let totalEmitted = 0;
  let dropped = 0;
  let peakSize = 0;

  // 字节预算影子账本：只记录「我们认为仍在队列里」的事件字节数（FIFO，最老在前）。
  // 消费者从队首取走事件后影子账本会偏大，每次 emit 先与 Queue.sizeUnsafe 对齐，
  // 避免把已经被消费掉的事件算成积压而误丢新事件。
  const shadowSizes: number[] = [];
  let shadowHead = 0;
  let bufferedBytes = 0;
  let peakBytes = 0;
  let droppedByBytesCount = 0;

  const shadowLength = () => shadowSizes.length - shadowHead;

  const compactShadow = () => {
    if (shadowHead > 0 && shadowHead * 2 >= shadowSizes.length) {
      shadowSizes.splice(0, shadowHead);
      shadowHead = 0;
    }
  };

  /** 影子账本对齐到队列真实长度（消费者取走/FIFO 淘汰都发生在队首），返回真实队列长度 */
  const syncShadow = (activeQueue: Queue.Queue<LocalLoopObservationEvent, Cause.Done<void>>) => {
    const liveSize = Queue.sizeUnsafe(activeQueue);
    while (shadowLength() > liveSize) {
      bufferedBytes -= shadowSizes[shadowHead++] ?? 0;
    }
    if (bufferedBytes < 0) bufferedBytes = 0;
    compactShadow();
    return liveSize;
  };

  /**
   * sliding 策略下按字节预算淘汰最老事件。
   * 保留「永远接受最新事件」的既有语义：即便单条事件本身超过预算，也会清空存量后入队，
   * 而不是把最新事件也丢掉（否则消费者会看到一条意义不明的空流）。
   */
  const evictOldestForBytes = (
    activeQueue: Queue.Queue<LocalLoopObservationEvent, Cause.Done<void>>,
    incomingBytes: number,
  ) => {
    if (byteCapacity === null) return;
    while (shadowLength() > 0 && bufferedBytes + incomingBytes > byteCapacity) {
      const taken = Queue.takeUnsafe(activeQueue);
      if (taken === undefined || !Exit.isSuccess(taken)) break;
      bufferedBytes -= shadowSizes[shadowHead++] ?? 0;
      droppedByBytesCount++;
    }
    if (bufferedBytes < 0) bufferedBytes = 0;
    compactShadow();
  };

  const callbackList: LegacyObservationCallbacks[] = [];
  if (initialCallbacks) {
    callbackList.push(initialCallbacks);
  }

  const getOrCreateQueue = () => {
    if (!queue) {
      if (strategy === "unbounded") {
        queue = Effect.runSync(
          Queue.unbounded<LocalLoopObservationEvent, Cause.Done<void>>(),
        );
      } else if (strategy === "dropping") {
        queue = Effect.runSync(
          Queue.dropping<LocalLoopObservationEvent, Cause.Done<void>>(capacity),
        );
      } else {
        // default "sliding"
        queue = Effect.runSync(
          Queue.sliding<LocalLoopObservationEvent, Cause.Done<void>>(capacity),
        );
      }
    }
    return queue;
  };

  const emit = (envelopeOrEvent: LocalLoopEmitEnvelope | LocalLoopObservationEvent) => {
    if (closed) return;

    totalEmitted++;

    const envelope: LocalLoopEmitEnvelope =
      "event" in envelopeOrEvent &&
      typeof envelopeOrEvent.event === "object" &&
      envelopeOrEvent.event !== null &&
      "kind" in envelopeOrEvent.event
        ? (envelopeOrEvent as LocalLoopEmitEnvelope)
        : { event: envelopeOrEvent as LocalLoopObservationEvent };

    const { event, bridge } = envelope;

    // 1. 仅在 queue 已创建（有 stream 消费者）时入队，默认 legacy-only 零积压
    if (queue) {
      const eventBytes = byteBudgetEnabled ? measureObservationEventBytes(event) : 0;
      const liveSize = syncShadow(queue);

      // 字节先于条数生效：只有队列里已经有事件时才拒绝新事件，
      // 保证「单条超大事件」也能进来（先清空存量），不会产出一条空流。
      const rejectedByBytes =
        strategy === "dropping" && liveSize > 0 && byteCapacity !== null
          ? bufferedBytes + eventBytes > byteCapacity
          : false;

      if (strategy === "sliding" && byteBudgetEnabled) {
        evictOldestForBytes(queue, eventBytes);
      }

      const preSize = Queue.sizeUnsafe(queue);
      const offered = rejectedByBytes ? false : Queue.offerUnsafe(queue, event);

      if (offered) {
        shadowSizes.push(eventBytes);
        bufferedBytes += eventBytes;
        if (bufferedBytes > peakBytes) peakBytes = bufferedBytes;
      }

      if (rejectedByBytes) {
        droppedByBytesCount++;
      } else if (strategy === "dropping" && !offered) {
        dropped++;
      } else if (strategy === "sliding" && preSize >= capacity && offered) {
        dropped++;
      }

      // Queue.sliding 自身可能在 offer 时淘汰队首，账本随之对齐
      syncShadow(queue);

      const postSize = Queue.sizeUnsafe(queue) ?? 0;
      if (postSize > peakSize) {
        peakSize = postSize;
      }
    }

    // 2. 派发给所有注册的 callbacks（fail-open 隔离，抛错绝不影响主循环）
    for (const callbacks of callbackList) {
      try {
        callbacks.onObservationEvent?.(event);
      } catch {
        // fail-open
      }

      if (event.kind === "text-delta") {
        try {
          callbacks.onTextDelta?.(event.chunk);
        } catch {
          // fail-open
        }
      } else if (event.kind === "reasoning-delta") {
        try {
          callbacks.onReasoningDelta?.(event.chunk);
        } catch {
          // fail-open
        }
      } else if (event.kind === "tool-event") {
        try {
          callbacks.onToolEvent?.(event.event);
        } catch {
          // fail-open
        }
      } else {
        // Canonical AgentExecutionObservationEvent（纯净对象，无 bridge 字段泄漏）
        try {
          callbacks.onLoopEvent?.(event);
        } catch {
          // fail-open
        }
        if (bridge) {
          try {
            callbacks.onToolEvent?.(bridge);
          } catch {
            // fail-open
          }
        }
      }
    }
  };

  const close = () => {
    if (closed) return;
    closed = true;
    const totalDropped = dropped + droppedByBytesCount;
    if (totalDropped > 0) {
      console.warn(
        `[observationStream] stream buffer overflow: dropped ${totalDropped}/${totalEmitted} events ` +
          `(strategy=${strategy}, capacity=${capacity}, byteCapacity=${byteCapacity ?? "off"}, ` +
          `droppedByCount=${dropped}, droppedByBytes=${droppedByBytesCount}, peakBytes=${peakBytes})`,
      );
    }
    if (queue) {
      Queue.endUnsafe(queue);
    }
  };

  const isClosed = () => closed;

  const attachCallbacks = (callbacks?: LegacyObservationCallbacks) => {
    if (!callbacks) return;
    callbackList.push(callbacks);
  };

  const isQueueActive = () => queue !== undefined;

  const queueSize = () => {
    if (!queue) return 0;
    return Queue.sizeUnsafe(queue) ?? 0;
  };

  const droppedCount = () => dropped + droppedByBytesCount;

  const bufferedBytesOfQueue = () => {
    if (!queue) return 0;
    syncShadow(queue);
    return bufferedBytes;
  };

  const droppedByBytes = () => droppedByBytesCount;

  const getMetrics = () => ({
    totalEmitted,
    droppedCount: dropped + droppedByBytesCount,
    peakSize,
    capacity,
    strategy,
  });

  const getByteMetrics = () => ({
    byteCapacity,
    bufferedBytes: bufferedBytesOfQueue(),
    peakBytes,
    droppedByBytes: droppedByBytesCount,
  });

  return {
    get queue() {
      return getOrCreateQueue();
    },
    get stream() {
      if (!cachedStream) {
        cachedStream = Stream.fromQueue(getOrCreateQueue());
      }
      return cachedStream;
    },
    emit,
    close,
    isClosed,
    attachCallbacks,
    isQueueActive,
    queueSize,
    bufferedBytes: bufferedBytesOfQueue,
    droppedCount,
    droppedByBytes,
    getMetrics,
    getByteMetrics,
  };
}
