// packages/chat/queue/chatQueueMachine.ts
//
// Pure chat queue state machine — the cross-platform core for
// "queue user input while a turn is running, then auto-drain when it ends".

import { createTurnRequest, type TurnRequest } from "./internalTurnEvent";

export type ChatQueueBatch = {
  id: number;
  requests: readonly TurnRequest[];
};

export type ChatQueueState = {
  /** Opt-in only: legacy/internal consumers keep the single-request API. */
  drainMode?: "user-batch";
  /** Claimed prefix stays in queue until accepted, so failure is recoverable. */
  drainBatch?: ChatQueueBatch;
  batchSequence?: number;
  /** True while an agent turn is actively streaming/running. */
  running: boolean;
  /** Pending user inputs/turn requests queued while `running` is true. FIFO. */
  queue: TurnRequest[];
  /** True when drain is intentionally suspended (e.g. awaiting tool confirm). */
  drainPaused: boolean;
  /** Last drain-attempt error surfaced by the adapter (balance, network, etc). */
  lastDrainError: string | null;
};

export type ChatQueueInEvent =
  | { type: "batch-accepted"; batchId: number }
  | { type: "batch-failed"; batchId: number; message: string }
  | { type: "claim-batch" }
  | { type: "rollback-batch"; batchId: number; requests: readonly TurnRequest[] }
  | { type: "turn-start" }
  | { type: "turn-end"; ok: boolean; aborted: boolean }
  | { type: "enqueue"; text: TurnRequest | string }
  | { type: "steer"; text: TurnRequest | string }
  | { type: "dequeue" }
  | { type: "recall-last" }
  | { type: "clear" }
  | { type: "pause-drain" }
  | { type: "resume-drain" }
  | { type: "drain-error"; message: string };

export type ChatQueueOutEvent =
  | { type: "drain-batch-ready"; batch: ChatQueueBatch }
  | { type: "drain-ready"; text: string; request: TurnRequest }
  | { type: "steer-ready"; text: string; request: TurnRequest }
  | { type: "recalled-to-draft"; text: string; request: TurnRequest }
  | {
      type: "aborted-draft-refill";
      text: string;
      request: TurnRequest;
      abortedRequests: TurnRequest[];
    }
  | { type: "queue-changed"; length: number }
  | { type: "running-changed"; running: boolean }
  | { type: "drain-paused-changed"; paused: boolean };

export const initialChatQueueState: ChatQueueState = {
  running: false,
  queue: [],
  drainPaused: false,
  lastDrainError: null,
};

export function reduceChatQueue(
  state: ChatQueueState,
  event: ChatQueueInEvent
): ChatQueueState {
  switch (event.type) {
    case "turn-start":
      if (state.running && state.lastDrainError === null) return state;
      return {
        ...state,
        running: true,
        lastDrainError: null,
      };

    case "batch-accepted":
      if (state.drainBatch?.id !== event.batchId) return state;
      return {
        ...state,
        queue: state.queue.slice(state.drainBatch.requests.length),
        drainBatch: undefined,
      };

    case "claim-batch": {
      // Mid-turn claim for user-batch injection: compute the leading user
      // batch without touching `running`. The claim is consumed by the existing
      // `batch-accepted` / `batch-failed` protection, so a failed admission
      // keeps the queue and pauses the drain exactly like a turn-end claim.
      if (state.drainBatch) return state;
      if (state.drainPaused || (state.drainMode === "user-batch" && state.lastDrainError)) return state;
      if (!state.queue.length || state.queue[0]?.event.kind !== "user") return state;
      const end = state.queue.findIndex((request) => request.event.kind !== "user");
      const id = (state.batchSequence ?? 0) + 1;
      return { ...state, batchSequence: id,
        drainBatch: { id, requests: state.queue.slice(0, end < 0 ? undefined : end) } };
    }

    case "rollback-batch": {
      // Undo a mid-turn injection claim when the turn aborts before the provider
      // is actually invoked. Pre-commit the claim is still outstanding: release
      // it and leave the queue untouched. Post-commit the batch was already
      // accepted (removed from the queue): restore it at the head so the unsent
      // message stays re-sendable. `running` is never changed here.
      if (state.drainBatch?.id === event.batchId) {
        return { ...state, drainBatch: undefined };
      }
      return { ...state, queue: [...event.requests, ...state.queue] };
    }

    case "batch-failed":
      if (state.drainBatch?.id !== event.batchId) return state;
      return {
        ...state,
        drainBatch: undefined,
        drainPaused: true,
        lastDrainError: event.message || "batch admission failed",
      };

    case "turn-end": {
      if (state.drainMode === "user-batch") {
        const next: ChatQueueState = {
          ...state,
          running: false,
          drainPaused: event.aborted ? true : state.drainPaused,
          lastDrainError: !event.ok && !event.aborted ? "previous turn failed" : state.lastDrainError,
        };
        if (event.ok && !event.aborted && shouldDrainAfterTurnEnd(next, true)
            && next.queue[0]?.event.kind === "user") {
          const end = next.queue.findIndex((request) => request.event.kind !== "user");
          const id = (next.batchSequence ?? 0) + 1;
          return { ...next, batchSequence: id,
            drainBatch: { id, requests: next.queue.slice(0, end < 0 ? undefined : end) } };
        }
        return next;
      }
      return {
        ...state,
        running: false,
        queue: event.aborted ? [] : state.queue,
        lastDrainError: !event.ok && !event.aborted ? "previous turn failed" : state.lastDrainError,
      };

    }

    case "enqueue": {
      const req = createTurnRequest(event.text);
      if (req.messageId && state.queue.some((item) => item.messageId === req.messageId)) return state;
      if (!req.text.trim() && req.event.kind === "user" && !req.imagePaths?.length && !req.mediaPaths?.length) {
        return state;
      }
      return {
        ...state,
        queue: [...state.queue, req],
      };
    }

    case "steer": {
      if (state.drainBatch) return state;
      const req = createTurnRequest(event.text);
      if (!req.text.trim() && req.event.kind === "user") {
        return state;
      }
      return {
        ...state,
        queue: [req, ...state.queue],
      };
    }

    case "dequeue":
      if (state.drainBatch) return state;
      if (state.queue.length === 0) return state;
      return {
        ...state,
        queue: state.queue.slice(1),
      };

    case "recall-last":
      if (state.drainBatch) return state;
      if (state.queue.length === 0) return state;
      return {
        ...state,
        queue: state.queue.slice(0, -1),
      };

    case "clear":
      if (state.drainBatch) return state;
      if (state.queue.length === 0 && state.lastDrainError === null) return state;
      return {
        ...state,
        queue: [],
        lastDrainError: null,
      };

    case "pause-drain":
      if (state.drainPaused) return state;
      return {
        ...state,
        drainPaused: true,
      };

    case "resume-drain":
      if (!state.drainPaused && !(state.drainMode === "user-batch" && state.lastDrainError)) return state;
      return {
        ...state,
        drainPaused: false,
        lastDrainError: state.drainMode === "user-batch" ? null : state.lastDrainError,
      };

    case "drain-error":
      return {
        ...state,
        lastDrainError: event.message || null,
      };

    default:
      return state;
  }
}

export function shouldDrainAfterTurnEnd(
  state: ChatQueueState,
  cleanTurnEnd: boolean
): boolean {
  return (
    cleanTurnEnd &&
    !state.running &&
    !state.drainPaused &&
    !state.drainBatch &&
    (state.drainMode !== "user-batch" || !state.lastDrainError) &&
    state.queue.length > 0
  );
}

export type ApplyResult = {
  state: ChatQueueState;
  outgoing: ChatQueueOutEvent[];
};

export function applyChatQueueEvent(
  state: ChatQueueState,
  event: ChatQueueInEvent
): ApplyResult {
  const prevQueue = state.queue;
  const prevQueueLen = prevQueue.length;
  const prevRunning = state.running;
  const prevPaused = state.drainPaused;

  const next = reduceChatQueue(state, event);
  const outgoing: ChatQueueOutEvent[] = [];

  if (next.queue.length !== prevQueueLen) {
    outgoing.push({ type: "queue-changed", length: next.queue.length });
  }
  if (next.running !== prevRunning) {
    outgoing.push({ type: "running-changed", running: next.running });
  }
  if (next.drainPaused !== prevPaused) {
    outgoing.push({ type: "drain-paused-changed", paused: next.drainPaused });
  }

  if (event.type === "recall-last" && next.queue.length < prevQueueLen) {
    const last = prevQueue[prevQueueLen - 1]!;
    outgoing.push({ type: "recalled-to-draft", text: last.text, request: last });
  }

  if (event.type === "steer" && next.running && next.queue.length > prevQueueLen) {
    const head = next.queue[0];
    if (head) {
      outgoing.push({ type: "steer-ready", text: head.text, request: head });
    }
  }

  if (event.type === "turn-end") {
    if (next.drainBatch && next.drainBatch !== state.drainBatch) {
      outgoing.push({ type: "drain-batch-ready", batch: next.drainBatch });
    } else if (event.aborted && prevQueueLen > 0 && state.drainMode !== "user-batch") {
      const first = prevQueue[0]!;
      outgoing.push({
        type: "aborted-draft-refill",
        text: first.text,
        request: first,
        abortedRequests: [...prevQueue],
      });
    } else if (!event.aborted && event.ok) {
      if (shouldDrainAfterTurnEnd(next, true)) {
        const head = next.queue[0]!;
        outgoing.push({ type: "drain-ready", text: head.text, request: head });
      }
    }
  }

  return { state: next, outgoing };
}
