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

import { Effect, Queue, Stream, type Cause } from "effect";
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

export interface LocalLoopObservationBoundaryOptions {
  /**
   * 队列最大容量限制。默认 1024（对单回合的正常突发完全足够，同时杜绝慢消费者的无限内存泄露）。
   */
  readonly capacity?: number;
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
  /** 获取因为队列容量限制而被淘汰/丢弃的事件总数 */
  readonly droppedCount: () => number;
  /** 观察流容量与统计指标 */
  readonly getMetrics: () => {
    readonly totalEmitted: number;
    readonly droppedCount: number;
    readonly peakSize: number;
    readonly capacity: number;
    readonly strategy: "sliding" | "dropping" | "unbounded";
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

  let queue: Queue.Queue<LocalLoopObservationEvent, Cause.Done<void>> | undefined;
  let cachedStream: Stream.Stream<LocalLoopObservationEvent, Cause.Done<void>> | undefined;
  let closed = false;
  let totalEmitted = 0;
  let dropped = 0;
  let peakSize = 0;

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
      const preSize = Queue.sizeUnsafe(queue) ?? 0;
      const offered = Queue.offerUnsafe(queue, event);

      if (strategy === "dropping" && !offered) {
        dropped++;
      } else if (strategy === "sliding" && preSize >= capacity && offered) {
        dropped++;
      }

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
    if (dropped > 0) {
      console.warn(
        `[observationStream] stream buffer overflow: dropped ${dropped}/${totalEmitted} events (strategy=${strategy}, capacity=${capacity})`,
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

  const droppedCount = () => dropped;

  const getMetrics = () => ({
    totalEmitted,
    droppedCount: dropped,
    peakSize,
    capacity,
    strategy,
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
    droppedCount,
    getMetrics,
  };
}
