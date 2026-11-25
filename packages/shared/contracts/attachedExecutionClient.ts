/**
 * Shared cross-platform Attached Execution stream & cursor-replay client.
 *
 * Lives in `shared/contracts/` (public role, zero private imports) so Web,
 * Desktop, React Native, and CLI share one exact state machine for:
 * - Consuming `attached_execution_event` and `attached_execution_receipt` SSE wakeups
 * - Detecting sequence gaps or lease-epoch handovers
 * - Catching up via `callApiProcedure(readAttachedExecutionEventsContract, ...)`
 * - Reading durable command receipts via `callApiProcedure(readAttachedExecutionReceiptContract, ...)`
 */
import {
  callApiProcedure,
  type ApiResult,
  type CallApiProcedureOptions,
} from "desktop-runtime/apiContract";
import {
  readAttachedExecutionEventsContract,
  readAttachedExecutionReceiptContract,
  type ReadAttachedExecutionReceiptOutput,
} from "./attachedExecutionApi";
import {
  isContractCounter,
  isContractId,
  type ExecutionCommandStage,
  type ExecutionEvent,
  type ExecutionEventData,
  type ExecutionStatus,
} from "./executionAttachment";

export interface AttachedExecutionSseEventFrame {
  type: "attached_execution_event";
  dialogKey: string;
  runId: string;
  executionId: string;
  leaseEpoch: number;
  seq: number;
  status: ExecutionStatus;
  event: ExecutionEventData;
}

export interface AttachedExecutionSseReceiptFrame {
  type: "attached_execution_receipt";
  dialogKey: string;
  runId: string;
  executionId: string;
  leaseEpoch: number;
  commandId: string;
  kind: "append" | "cancel";
  stage: ExecutionCommandStage;
  messageId?: string;
  code?: string;
}

export type AttachedExecutionSseFrame =
  | AttachedExecutionSseEventFrame
  | AttachedExecutionSseReceiptFrame;

export interface AttachedExecutionReceiptState {
  commandId: string;
  kind: "append" | "cancel";
  stage: ExecutionCommandStage;
  leaseEpoch: number;
  executionId: string;
  runId: string;
  messageId?: string;
  code?: string;
}

export interface AttachedExecutionTimelineItem {
  seq: number;
  leaseEpoch: number;
  runId: string;
  executionId: string;
  event: ExecutionEventData;
}

export interface AttachedExecutionStreamState {
  dialogKey: string;
  runId?: string;
  executionId?: string;
  leaseEpoch: number;
  afterSeq: number;
  latestSeq: number;
  status?: ExecutionStatus;
  events: readonly AttachedExecutionTimelineItem[];
  receipts: Readonly<Record<string, AttachedExecutionReceiptState>>;
}

export interface ApplyAttachedExecutionSseResult {
  state: AttachedExecutionStreamState;
  applied: boolean;
  needsCatchup: boolean;
}

const VALID_STATUSES = new Set<string>(["running", "done", "failed", "cancelled"]);
const VALID_STAGES = new Set<string>(["queued", "accepted", "applied", "rejected", "uncertain"]);
const STAGE_RANK: Record<ExecutionCommandStage, number> = {
  queued: 0,
  accepted: 1,
  applied: 2,
  rejected: 2,
  uncertain: 2,
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createAttachedExecutionStreamState(
  dialogKey: string,
): AttachedExecutionStreamState {
  return {
    dialogKey,
    leaseEpoch: 0,
    afterSeq: 0,
    latestSeq: 0,
    events: [],
    receipts: {},
  };
}

export function isAttachedExecutionSseFrame(
  value: unknown,
): value is AttachedExecutionSseFrame {
  if (!isPlainObject(value)) return false;
  if (
    !isContractId(value.dialogKey) ||
    !isContractId(value.runId) ||
    !isContractId(value.executionId) ||
    !isContractCounter(value.leaseEpoch, 1)
  ) {
    return false;
  }

  if (value.type === "attached_execution_event") {
    return (
      isContractCounter(value.seq, 1) &&
      typeof value.status === "string" &&
      VALID_STATUSES.has(value.status) &&
      isPlainObject(value.event) &&
      typeof value.event.kind === "string"
    );
  }

  if (value.type === "attached_execution_receipt") {
    return (
      isContractId(value.commandId) &&
      (value.kind === "append" || value.kind === "cancel") &&
      typeof value.stage === "string" &&
      VALID_STAGES.has(value.stage)
    );
  }

  return false;
}

function mergeReceipt(
  existing: AttachedExecutionReceiptState | undefined,
  incoming: AttachedExecutionReceiptState,
): { next: AttachedExecutionReceiptState; changed: boolean } {
  if (!existing) {
    return { next: incoming, changed: true };
  }
  if (incoming.leaseEpoch < existing.leaseEpoch) {
    return { next: existing, changed: false };
  }
  if (incoming.leaseEpoch === existing.leaseEpoch) {
    const existingRank = STAGE_RANK[existing.stage];
    const incomingRank = STAGE_RANK[incoming.stage];
    if (incomingRank < existingRank) {
      return { next: existing, changed: false };
    }
    if (incomingRank === existingRank && existing.stage === incoming.stage) {
      const nextMessageId = existing.messageId ?? incoming.messageId;
      const nextCode = existing.code ?? incoming.code;
      if (nextMessageId === existing.messageId && nextCode === existing.code) {
        return { next: existing, changed: false };
      }
      return {
        next: {
          ...existing,
          ...(nextMessageId ? { messageId: nextMessageId } : {}),
          ...(nextCode ? { code: nextCode } : {}),
        },
        changed: true,
      };
    }
    // Terminal stages (`applied`, `rejected`, `uncertain`) never flip to another terminal stage.
    if (existingRank >= 2) {
      return { next: existing, changed: false };
    }
  }
  return { next: incoming, changed: true };
}

/**
 * Pure monotonic reducer for `attached_execution_event` and
 * `attached_execution_receipt` SSE frames.
 *
 * Fail-closed: rejects any frame whose `dialogKey` does not exactly match
 * `state.dialogKey`. Signals `needsCatchup: true` whenever a sequence gap or
 * new lease epoch with `seq > 1` is observed so callers pull missing frames
 * from `GET /api/agent/runs/attached/events`.
 */
export function applyAttachedExecutionSseFrame(
  state: AttachedExecutionStreamState,
  frame: unknown,
): ApplyAttachedExecutionSseResult {
  if (!isAttachedExecutionSseFrame(frame) || frame.dialogKey !== state.dialogKey) {
    return { state, applied: false, needsCatchup: false };
  }

  if (frame.type === "attached_execution_receipt") {
    const incoming: AttachedExecutionReceiptState = {
      commandId: frame.commandId,
      kind: frame.kind,
      stage: frame.stage,
      leaseEpoch: frame.leaseEpoch,
      executionId: frame.executionId,
      runId: frame.runId,
      ...(typeof frame.messageId === "string" ? { messageId: frame.messageId } : {}),
      ...(typeof frame.code === "string" ? { code: frame.code } : {}),
    };
    const merged = mergeReceipt(state.receipts[frame.commandId], incoming);
    if (!merged.changed) {
      return { state, applied: false, needsCatchup: false };
    }
    return {
      state: {
        ...state,
        receipts: {
          ...state.receipts,
          [frame.commandId]: merged.next,
        },
      },
      applied: true,
      needsCatchup: false,
    };
  }

  // `attached_execution_event`
  if (state.leaseEpoch > 0 && frame.leaseEpoch < state.leaseEpoch) {
    return { state, applied: false, needsCatchup: false };
  }

  const item: AttachedExecutionTimelineItem = {
    seq: frame.seq,
    leaseEpoch: frame.leaseEpoch,
    runId: frame.runId,
    executionId: frame.executionId,
    event: frame.event,
  };

  // New epoch (first event or host handover/reconnect with incremented leaseEpoch).
  if (frame.leaseEpoch > state.leaseEpoch) {
    if (frame.seq === 1) {
      return {
        state: {
          ...state,
          runId: frame.runId,
          executionId: frame.executionId,
          leaseEpoch: frame.leaseEpoch,
          afterSeq: 1,
          latestSeq: 1,
          status: frame.status,
          events: [item],
        },
        applied: true,
        needsCatchup: false,
      };
    }
    // Observed a higher epoch mid-stream: reset cursor to 0 and require catch-up.
    return {
      state: {
        ...state,
        runId: frame.runId,
        executionId: frame.executionId,
        leaseEpoch: frame.leaseEpoch,
        afterSeq: 0,
        latestSeq: frame.seq,
        status: frame.status,
        events: [],
      },
      applied: true,
      needsCatchup: true,
    };
  }

  // Same epoch: deduplicate already-applied sequence numbers.
  if (frame.seq <= state.afterSeq) {
    if (frame.status !== state.status) {
      return {
        state: { ...state, status: frame.status },
        applied: true,
        needsCatchup: false,
      };
    }
    return { state, applied: false, needsCatchup: false };
  }

  // Gap detected: do not append out-of-order frame into contiguous timeline.
  if (frame.seq > state.afterSeq + 1) {
    return {
      state: {
        ...state,
        latestSeq: Math.max(state.latestSeq, frame.seq),
        status: frame.status,
      },
      applied: false,
      needsCatchup: true,
    };
  }

  // Exact contiguous next event (`frame.seq === state.afterSeq + 1`).
  return {
    state: {
      ...state,
      runId: frame.runId,
      executionId: frame.executionId,
      afterSeq: frame.seq,
      latestSeq: Math.max(state.latestSeq, frame.seq),
      status: frame.status,
      events: [...state.events, item],
    },
    applied: true,
    needsCatchup: false,
  };
}

function mergeEventsIntoState(
  state: AttachedExecutionStreamState,
  page: {
    events: ExecutionEvent[];
    nextAfterSeq: number;
    latestSeq: number;
    leaseEpoch: number;
    status: ExecutionStatus;
  },
): AttachedExecutionStreamState {
  const epochChanged = state.leaseEpoch > 0 && page.leaseEpoch !== state.leaseEpoch;
  const baseEvents = epochChanged ? [] : [...state.events];
  const seen = new Set(baseEvents.map((e) => e.seq));

  let runId = state.runId;
  let executionId = state.executionId;
  for (const ev of page.events) {
    if (ev.leaseEpoch !== page.leaseEpoch) continue;
    runId = ev.runId;
    executionId = ev.executionId;
    if (!seen.has(ev.seq)) {
      seen.add(ev.seq);
      baseEvents.push({
        seq: ev.seq,
        leaseEpoch: ev.leaseEpoch,
        runId: ev.runId,
        executionId: ev.executionId,
        event: ev.event,
      });
    }
  }
  baseEvents.sort((a, b) => a.seq - b.seq);
  const highestEventSeq =
    baseEvents.length > 0 ? baseEvents[baseEvents.length - 1]!.seq : 0;

  return {
    ...state,
    ...(runId ? { runId } : {}),
    ...(executionId ? { executionId } : {}),
    leaseEpoch: page.leaseEpoch,
    afterSeq: epochChanged
      ? Math.max(page.nextAfterSeq, highestEventSeq)
      : Math.max(state.afterSeq, page.nextAfterSeq, highestEventSeq),
    latestSeq: Math.max(epochChanged ? 0 : state.latestSeq, page.latestSeq, highestEventSeq),
    status: page.status,
    events: baseEvents,
  };
}

export interface CatchUpAttachedExecutionOptions extends CallApiProcedureOptions {
  limit?: number;
  maxPages?: number;
}

export type CatchUpAttachedExecutionResult =
  | { ok: true; state: AttachedExecutionStreamState; fetchedCount: number; hasMore: boolean }
  | { ok: false; state: AttachedExecutionStreamState; error: { code: string; message: string; status: number } };

/**
 * Pulls missed events from `GET /api/agent/runs/attached/events` starting at
 * `state.afterSeq`. If the server returns `409 fenced` (because a newer host
 * lease epoch replaced the previous one), resets the cursor to `0` without
 * pinning the stale `leaseEpoch` and reloads the active epoch cleanly.
 */
export async function catchUpAttachedExecutionEvents(
  initialState: AttachedExecutionStreamState,
  options: CatchUpAttachedExecutionOptions,
): Promise<CatchUpAttachedExecutionResult> {
  const limit = options.limit ?? 64;
  const maxPages = Math.max(1, options.maxPages ?? 16);
  let current = initialState;
  let fetchedCount = 0;
  let hasMore = false;
  let retriedAfterFence = false;

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const res = await callApiProcedure(
      readAttachedExecutionEventsContract,
      {
        dialogKey: current.dialogKey,
        afterSeq: current.afterSeq,
        limit,
        ...(current.leaseEpoch > 0 ? { leaseEpoch: current.leaseEpoch } : {}),
      },
      options,
    );

    if (!res.ok) {
      if (res.error.status === 409 && current.leaseEpoch > 0 && !retriedAfterFence) {
        retriedAfterFence = true;
        hasMore = true;
        current = {
          ...current,
          leaseEpoch: 0,
          afterSeq: 0,
          latestSeq: 0,
          events: [],
        };
        // Do not consume a page slot on fence rollover so `maxPages === 1`
        // (or a 409 on the final page) still fetches the replacement epoch.
        pageIndex -= 1;
        continue;
      }
      return {
        ok: false,
        state: current,
        error: {
          code: res.error.code,
          message: res.error.message,
          status: res.error.status,
        },
      };
    }

    fetchedCount += res.data.events.length;
    const prevAfterSeq = current.afterSeq;
    const prevEpoch = current.leaseEpoch;
    current = mergeEventsIntoState(current, res.data);
    hasMore = res.data.hasMore;

    if (!hasMore) break;
    // Guard against non-advancing pagination responses.
    if (current.afterSeq <= prevAfterSeq && current.leaseEpoch === prevEpoch) {
      break;
    }
  }

  return {
    ok: true,
    state: current,
    fetchedCount,
    hasMore,
  };
}

export async function fetchAttachedExecutionReceipt(
  dialogKey: string,
  commandId: string,
  options: CallApiProcedureOptions,
): Promise<ApiResult<ReadAttachedExecutionReceiptOutput>> {
  return callApiProcedure(
    readAttachedExecutionReceiptContract,
    { dialogKey, commandId },
    options,
  );
}
