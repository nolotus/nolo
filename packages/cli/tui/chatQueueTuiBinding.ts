import { traceChildRunWake, traceRunWake, queueWakeFields } from "./runWakeDiagnostics";
import {
  classifyInternalResumeGate,
  classifyInternalResumeHeadGate,
  classifyInternalResumeStateGate,
  classifyInternalResumeStopGate,
  type InternalResumeGate,
} from "./internalResumeGate";
import type { CliPendingResult, CliPendingRecovery } from "../client/localDialogRecords";
// packages/cli/tui/chatQueueTuiBinding.ts
//
// TUI binding for the cross-platform chat queue core.
//
// The TUI does not run Redux. It owns a single `ChatQueueRuntime` instance and
// wires it into the readline workspace:
//   - When the user presses Enter while a turn is running, the workspace asks
//     `resolveChatSendDecision`. A `queue-text` decision is enqueued here
//     instead of being dropped (the old behavior was `if (busy) return;`).
//   - When an agent turn ends, the workspace calls `notifyTurnEnd`. If the
//     core emits `drain-ready`, this binding invokes the provided `runTurn`
//     callback with the dequeued text — reusing the same turn execution path
//     the readline composer uses for direct sends.
//
// Esc while busy = abort (the workspace already handles that). Esc Esc is not
// special-cased here; the workspace can call `clear()` directly if desired.

import {
  createChatQueueRuntime,
  type ChatQueueRuntime,
} from "core/chat/chatQueueRuntime";
import {
  resolveChatSendDecision,
  type ChatSendDecision,
} from "core/chat/resolveChatSendDecision";
import { projectChatQueueStatus, type ChatQueueStatus } from "core/chat/chatQueueStatus";
import { createTurnRequest, type InternalTurnEvent, type TurnRequest } from "core/chat/internalTurnEvent";
import { initialChatQueueState } from "core/chat/chatQueueMachine";
import { monotonicFactory } from "ulid";
// Pending user messages are keyed by messageId and recovery reads them in key
// order, so the id must be monotonic: `${Date.now()}-${randomUUID()}` randomizes
// the order of messages submitted within the same millisecond, which reorders
// them on restart (violating "preserve original order").
const mintPendingMessageId = monotonicFactory();

export type RunDrainedTurn = (
  request: TurnRequest
) => Promise<{ ok: boolean; aborted: boolean }>;

/** 自动续跑结果：drained=true 表示已交给 drain 级联；false 时 gate 是挡住它的具名门。 */
export type InternalResumeResult = {
  drained: boolean;
  gate: InternalResumeGate | null;
};

export type ChatQueueTuiBinding = {
  submitPending(input: TurnRequest | InternalTurnEvent | string): Promise<void>;
  /**
   * Admit a message delivered from outside this process (`nolo dialog notify`)
   * through the same durable-save + enqueue path a typed message uses.
   *
   * Never starts a turn on its own: if the dialog is busy, stopped
   * (drain paused) or its recovery gate is closed, the request stays queued and
   * the existing cascade picks it up later. Returns `consumed` when the existing
   * drain cascade was triggered for it — that means the queue took it, not that
   * the model has read or answered it. Throws when the durable save fails (the
   * caller must keep the delivery pending) or when recovery is blocked.
   */
  admitExternalRequest(request: TurnRequest): Promise<"queued" | "consumed">;
  restorePending(): Promise<void>;
  isRecoveryBlocked(): boolean;
  /** Current recovery snapshot (for a one-time plain-language reminder). */
  getRecovery(): CliPendingRecovery;
  handlePendingCommand(action: "show" | "continue-without-resend", batchId?: string): Promise<string>;
  resumePending(): Promise<void>;
  /**
   * Drain only owned child completions after temporary screen ownership ends.
   * Never clears stop/error/recovery gates; 被挡住时回传具名门，供诊断与 UI 提示。
   */
  resumeInternalCompletions(dialogId: string | null): Promise<InternalResumeResult>;
  /** Resolve what the composer should do with the current draft right now. */
  resolveSubmit(input: {
    text: string;
    isRunning: boolean;
    /**
     * 队列无法携带的附件数（剪贴板暂存图 state.attachedImages 等）。忙时 >0 →
     * queue-blocked（保留草稿，调用方需给出提示），而不是静默丢附件。
     * 文本里内联的图片路径不算在内：它们随 TurnRequest.imagePaths 入队。
     */
    attachmentCount?: number;
  }): ChatSendDecision;
  /** Enqueue a queued text or structured event. Returns the updated status for status-line render. */
  enqueue(input: TurnRequest | InternalTurnEvent | string): ChatQueueStatus;
  /**
   * Enqueue a text or structured event and, if the workspace is currently idle,
   * trigger the drain loop synchronously/immediately so `runTurn` executes the head.
   * Returns true if a turn drain was initiated, or false if enqueued while busy/paused.
   */
  enqueueAndMaybeRun(
    input: TurnRequest | InternalTurnEvent | string
  ): Promise<boolean>;
  /** Notify that an agent turn started. */
  notifyTurnStart(): void;
  /**
   * Notify that an agent turn ended. If the queue is non-empty and the turn
   * ended cleanly, this drains the head by calling `runTurn`, then notifies
   * the core of the next turn-start/end. The head is dequeued as soon as the
   * drain starts (before `runTurn` resolves), so a drained message is treated
   * as consumed even if the turn fails. Resolves once the drain cascade
   * settles (queue empty, paused, or a turn fails).
   */
  notifyTurnEnd(outcome: { ok: boolean; aborted: boolean }): Promise<void>;
  /**
   * Manual drain trigger for the idle case: when the composer is empty and
   * the queue has residual items (e.g. a previous turn failed and kept the
   * queue), this dequeues and returns the head so the caller can run it as a
   * fresh turn. Returns null when idle-and-empty or when a turn is still
   * running (use `preemptForDrain` for the busy case).
   */
  drainHeadForManualTurn(): TurnRequest | null;
  /**
   * Preempt the running turn so the queue head can drain immediately. The
   * caller aborts the in-flight turn right after this returns true; the next
   * `notifyTurnEnd({ aborted: true })` is then treated as a clean turn-end so
   * the drain cascade runs the head instead of clearing the queue (the normal
   * abort behavior). Returns false when not running or the queue is empty.
   */
  preemptForDrain(): boolean;
  /**
   * Preempt the running turn so Esc preserves the queued follow-up without
   * draining it immediately (the "stop current reply, keep queue" action).
   * The caller aborts the in-flight turn right after this returns true; the next
   * `notifyTurnEnd({ aborted: true })` is treated as a failed non-aborted
   * turn-end so the queue is preserved (not cleared) but the drain cascade
   * does not run. Returns false when not running.
   */
  preemptForStop(): boolean;
  /**
   * Snapshot the entire queue as a single merged text (items joined by "\n"),
   * then clear the queue. Used by the Ctrl+S "flush all" shortcut: the queued
   * follow-ups are collapsed into one message and sent immediately instead of
   * waiting for the in-flight turn to finish and drain them one by one.
   * Returns null when the queue is empty.
   */
  snapshotAndClearQueue(): string | null;
  /**
   * Same as `snapshotAndClearQueue` but also returns the (de-duplicated, in
   * queue order) image paths carried by the merged items, so the flushed
   * message does not lose its attachments.
   */
  snapshotAndClearQueueWithImages(): { text: string; imagePaths: string[]; mediaPaths?: string[] } | null;
  /** Clear the queue (e.g. on /new). */
  clear(): void;
  /**
   * Recover a stale running state (batch 3). The caller believed a turn was
   * running (`busy`) but the turn-end notification was lost — an exception
   * path skipped `notifyTurnEnd`, leaving the queue core stuck in `running`
   * so every later submit silently routed into a phantom queue that could
   * never drain. Resets the core out of `running` via a *clean* turn-end:
   * the queue is preserved (nothing dropped, nothing resent) with no
   * `lastDrainError` (a lost notification is not a failed turn — the phantom
   * turn may well have completed), so draining is not paused. Idempotent:
   * returns false when the binding is already idle.
   */
  recoverStaleRunning(): boolean;
  /**
   * Claim the leading user batch for mid-turn injection without changing
   * `running`. Returns null when nothing is claimable (empty queue, drain
   * paused, recovery blocked, or a claim is already outstanding). The caller
   * must consume the claim with `acceptClaimedBatch` / `failClaimedBatch`.
   */
  claimBatchForInjection(): { batchId: number; requests: readonly TurnRequest[] } | null;
  /** Accept a claimed injection batch: removes it from the queue. */
  acceptClaimedBatch(batchId: number): void;
  /** Fail a claimed injection batch: keeps the queue, pauses the drain. */
  failClaimedBatch(batchId: number, message: string): void;
  /**
   * Roll a claimed injection batch back after an abort before the provider was
   * invoked: releases an outstanding claim, or restores an already-accepted
   * batch to the queue head so the unsent message stays re-sendable.
   */
  rollbackClaimedBatch(batchId: number, requests: readonly TurnRequest[]): void;
  /** Current UI status snapshot. */
  getStatus(): ChatQueueStatus;
  /** Number of queued items (convenience for the status line). */
  queueLength(): number;
  /** Number of queued background completion events (child runs + background tasks). */
  countQueuedBackgroundResults(): number;
  /** Tear down listeners. */
  dispose(): void;
};

/**
 * Create the TUI chat queue binding.
 *
 * `runTurn` is the callback that actually executes a drained user message as
 * an agent turn. It must resolve with `{ok, aborted}` so the binding can feed
 * the outcome back into the core and decide whether to keep draining.
 */
/**
 * The host durably persists queued user messages and executes a claimed batch
 * as one provider round. CLI production supplies dialog-backed storage and
 * original-message turn input; the batch receipt (`requested`) is written by
 * the turn runner before the provider is invoked, so no separate admission
 * write is needed here.
 */
export type TuiUserBatchHost = {
  savePending?(requests: readonly TurnRequest[]): Promise<void>;
  loadPending?(): Promise<CliPendingResult>;
  resolveUnknownWithoutResend?(batchId: string): Promise<void>;
  runBatch(requests: readonly TurnRequest[], canStart: () => boolean): ReturnType<RunDrainedTurn>;
};

export function createChatQueueTuiBinding(
  runTurn: RunDrainedTurn,
  batchHost?: TuiUserBatchHost,
): ChatQueueTuiBinding {
  const runtime: ChatQueueRuntime = createChatQueueRuntime(
    batchHost ? { ...initialChatQueueState, drainMode: "user-batch" } : undefined,
  );
  // Armed by `preemptForDrain()` / `preemptForStop()`: when the caller
  // aborts the in-flight turn right after arming, the subsequent
  // `notifyTurnEnd({ aborted: true })` is reinterpreted so the queue is
  // preserved instead of cleared (the normal abort behavior). Two modes:
  //   - "drain": reinterpret as a clean turn-end so the cascade runs the head.
  //   - "stop":  reinterpret as a failed (non-aborted) turn-end so the queue
  //              is kept but the cascade does NOT drain (user just wants to
  //              stop the current reply, not continue to the next queued item).
  type PreemptMode = "drain" | "stop";
  let preemptArmed: PreemptMode | null = null;

  const resolveSubmit = ({
    text,
    isRunning,
    attachmentCount = 0,
  }: {
    text: string;
    isRunning: boolean;
    attachmentCount?: number;
  }) => {
    return resolveChatSendDecision({
      text,
      imagePreviewCount: attachmentCount,
      pendingFileCount: 0,
      isSendBlocked: false,
      canMultiImg: true,
      isLoopRunning: isRunning,
      isSendPending: false,
      isFreshDialogSlashCommand: (s: string) => s === "/new",
      isCompactDialogSlashCommand: (s: string) => s === "/compact",
    });
  };

  const enqueue = (input: TurnRequest | InternalTurnEvent | string) => {
    const request = createTurnRequest(input);
    runtime.send({ type: "enqueue", text: request.event.kind === "user"
      ? { ...request, messageId: request.messageId ?? mintPendingMessageId(), source: request.source ?? "tui" }
      : request });
    return projectChatQueueStatus({ state: runtime.getState() });
  };

  let pendingWrites: Promise<void> = Promise.resolve();
  let stoppedGeneration = 0;
  let internalResumeStopped = false;
  let restore: Promise<void> | undefined;
  let restoreComplete = false;
  let recoveryBlocked = false;
  let recovery: CliPendingRecovery = { status: "ready", messageIds: [] };
  let writeError: string | undefined;
  const unsaved = new Map<string, TurnRequest>();
  const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);
  const restorePending = (): Promise<void> => {
    if (restoreComplete) {
      if (recoveryBlocked) runtime.send({ type: "drain-error", message: `${recovery.message ?? "Pending restore failed"}; /pending to inspect` });
      return Promise.resolve();
    }
    if (restore) return restore;
    restore = (async () => {
      try {
        const recovered = await batchHost?.loadPending?.() ?? { pending: [], recovery: { status: "ready" as const, messageIds: [] } };
        for (const request of recovered.pending) enqueue(request);
        recovery = recovered.recovery;
        // Only a real read failure blocks new messages. A provider-outcome
        // "unknown" batch is retained and never auto-resent, but the user's
        // explicit new messages must still send normally.
        recoveryBlocked = recovery.status === "read-error";
        if (recoveryBlocked) {
          runtime.send({ type: "pause-drain" });
          runtime.send({ type: "drain-error", message: `${recovery.message ?? "Pending restore failed"}; /pending to inspect` });
        }
        restoreComplete = true;
      } catch (error) {
        // Storage read failure is distinct from a provider-outcome unknown:
        // the state is indeterminate, so draining stays paused.
        recovery = { status: "read-error", messageIds: [], message: `Pending restore failed: ${errorText(error)}` };
        recoveryBlocked = true;
        runtime.send({ type: "pause-drain" });
        runtime.send({ type: "drain-error", message: `${recovery.message}; /pending to inspect` });
      } finally {
        restore = undefined;
      }
    })();
    return restore;
  };
  const handlePendingCommand = async (action: "show" | "continue-without-resend", batchId?: string) => {
    // Explicit inspection refreshes evidence; ordinary sends reuse the cached result.
    if (action === "show") restoreComplete = false;
    await restorePending();
    if (action === "show") return recovery.status === "unknown"
      ? `${recovery.message}\n${(recovery.batches ?? []).map(batch => `Batch ${batch.batchId}\n${batch.messages.map(message => `${message.messageId}: ${message.text}`).join("\n")}`).join("\n")}\nTo retain this unknown batch without resending and continue later messages: /pending continue-without-resend <batchId>`
      : "No unresolved provider batch. Pending messages remain available via Enter.";
    if (!batchId || !recovery.messageIds.includes(batchId)) throw new Error("Use /pending, then /pending continue-without-resend <exact batchId>");
    if (!batchHost?.resolveUnknownWithoutResend) throw new Error("Pending resolution unavailable");
    await batchHost.resolveUnknownWithoutResend(batchId);
    restoreComplete = false;
    await restorePending();
    if (!recoveryBlocked) { runtime.send({ type: "clear-drain-error" }); await resumePending(); }
    return `Recorded user decision for ${batchId}: no resend; original messages and receipt retained.`;
  };

  const submitPending = (input: TurnRequest | InternalTurnEvent | string): Promise<void> => {
    const request = createTurnRequest(input);
    const retryKey = JSON.stringify(request);
    const durable = unsaved.get(retryKey) ?? { ...request,
      messageId: request.messageId ?? mintPendingMessageId(), source: request.source ?? "tui" };
    unsaved.set(retryKey, durable);
    const write = pendingWrites.then(async () => {
      try {
        await batchHost?.savePending?.([durable]);
        enqueue(durable);
        unsaved.delete(retryKey);
        if (writeError && !recoveryBlocked) runtime.send({ type: "clear-drain-error" });
        writeError = undefined;
      } catch (error) {
        writeError = `Pending save failed: ${errorText(error)}; draft retained, retry to save`;
        runtime.send({ type: "drain-error", message: writeError });
        throw error;
      }
    });
    // Keep the write lane usable; the failure is retained above and returned
    // to the composer, which must not clear the draft until this resolves.
    pendingWrites = write.then(() => {}, () => {});
    return write;
  };

  const enqueueAndMaybeRun = async (
    input: TurnRequest | InternalTurnEvent | string
  ): Promise<boolean> => {
    const request = createTurnRequest(input);
    if (request.event.kind === "user") {
      await submitPending(request);
    } else {
      // Internal completion events are not durable user submissions. Admit
      // synchronously so delivery remains FIFO before any turn-end can race it;
      // never mint a user identity or pass them through savePending.
      enqueue(request);
    }
    const status = runtime.getState();
    if (!status.running && !status.drainPaused) {
      await notifyTurnEnd({ ok: true, aborted: false });
      return true;
    }
    return false;
  };

  const admitExternalRequest = async (request: TurnRequest): Promise<"queued" | "consumed"> => {
    // Settle the one-shot pending restore BEFORE writing: its snapshot must
    // predate this admission, otherwise the restore pass would enqueue the same
    // durable row a second time. The restore is memoized, so this is a no-op
    // for every later delivery.
    await restorePending();
    // A blocked recovery means the store could not be read; taking a new message
    // in that state would hide the unresolved batch. Leave it pending instead.
    if (recoveryBlocked) throw new Error(recovery.message ?? "Pending recovery is unresolved");
    await submitPending({ ...request, source: request.source ?? "dialog-notify" });
    const status = runtime.getState();
    if (status.running || status.drainPaused) return "queued";
    // Reuse the ordinary turn-end cascade: it decides whether the head may run.
    void notifyTurnEnd({ ok: true, aborted: false }).catch((error) => {
      writeError = `Queued drain failed: ${errorText(error)}`;
      runtime.send({ type: "drain-error", message: writeError });
    });
    return "consumed";
  };

  const resumePending = async () => {
    await restorePending();
    if (recoveryBlocked || writeError) return;
    internalResumeStopped = false;
    runtime.send({ type: "resume-drain" });
    await notifyTurnEnd({ ok: true, aborted: false });
  };

  const notifyTurnStart = () => {
    runtime.send({ type: "turn-start" });
  };

  const notifyTurnEnd = async (outcome: { ok: boolean; aborted: boolean }, internalDialog?: string | null) => {
    if (batchHost?.loadPending) await restorePending();
    if (batchHost?.savePending) await pendingWrites;
    if (internalDialog !== undefined) {
      const current = runtime.getState();
      if (classifyInternalResumeStateGate({
        internalResumeStopped,
        recoveryBlocked,
        writeError,
        status: current,
      })) return;
    }
    // If a preempt was armed, reinterpret the aborted turn-end so the queue
    // is preserved instead of cleared. "drain" mode reinterprets as a clean
    // turn-end (cascade runs the head); "stop" mode reinterprets as a failed
    // non-aborted turn-end (queue kept, cascade does not drain — the core
    // treats ok:false/non-aborted as "keep queue, stop draining").
    // Consumed by both the outer (direct-turn) turn-end and the drain
    // cascade below: Ctrl+S can arm preempt while a cascade turn is
    // mid-flight, and that abort must be reinterpreted too, otherwise the
    // bare `turn-end { aborted }` inside the cascade would clear the queue
    // and drop the just-merged message.
    // Returns the reinterpreted outcome plus the mode that was consumed (so
    // the caller can apply the stop-mode drain-error reset).
    const consumePreempt = (
      raw: { ok: boolean; aborted: boolean },
    ): { outcome: { ok: boolean; aborted: boolean }; mode: PreemptMode | null } => {
      const mode = preemptArmed;
      preemptArmed = null;
      if (mode === null || !raw.aborted) return { outcome: raw, mode: null };
      return {
        outcome:
          mode === "drain"
            ? { ok: true, aborted: false }
            : { ok: false, aborted: false },
        mode,
      };
    };
    const { outcome: effectiveOutcome, mode: consumedMode } = consumePreempt(outcome);
    runtime.send({ type: "turn-end", ...effectiveOutcome });
    if (recoveryBlocked || writeError) {
      runtime.send({ type: "pause-drain" });
      return;
    }
    // "stop" mode reinterprets abort as ok:false so the queue is kept and the
    // cascade does not drain — but ok:false also sets lastDrainError, which
    // would surface a spurious "previous turn failed" error for a deliberate
    // Esc. Clear it.
    if (consumedMode === "stop") {
      runtime.send({ type: "clear-drain-error" });
    }

    // Drain cascade: keep draining while the core says we should. Each drain
    // runs a full agent turn; we feed its outcome back in. The core's own
    // `drain-ready` event fires synchronously inside the turn-end send above,
    // but we drive the cascade explicitly here so we can await each turn.
    let lastOk = effectiveOutcome.ok && !effectiveOutcome.aborted;
    // Guard against runaway: the core clears the queue on abort, and a failed
    // turn stops the cascade (shouldDrainAfterTurnEnd returns false), so this
    // loop is bounded by the queue length and turn outcomes.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const status = runtime.getState();
      if (internalDialog !== undefined) {
        if (classifyInternalResumeStopGate({ internalResumeStopped, recoveryBlocked, writeError })) break;
        if (classifyInternalResumeHeadGate(status.queue, internalDialog)) break;
      }
      if (!status.running && !status.drainPaused && status.queue.length > 0 && !status.lastDrainError && lastOk) {
        const batch = status.drainBatch;
        // A claimed batch is exactly one provider round: accept the claim
        // (removing the prefix from the queue) and run every message in it
        // together. The pre-provider receipt is written by the turn runner
        // (`markCliUserBatchPhase`), so the binding neither persists nor
        // "admits" here — queued messages are already durable from
        // `submitPending`, and `enqueue` callers persist before queueing too.
        if (batch && batchHost) {
          runtime.send({ type: "batch-accepted", batchId: batch.id });
        }
        const req = status.queue[0]!;
        runtime.send({ type: "turn-start" });
        if (!batch) runtime.send({ type: "dequeue" });
        traceChildRunWake("queue-drain-start", req.event, null, queueWakeFields(getStatus()));
        let turnOutcome: { ok: boolean; aborted: boolean };
        try {
          const generation = stoppedGeneration;
          turnOutcome = batch && batchHost
            ? await batchHost.runBatch(batch.requests, () => generation === stoppedGeneration)
            : await runTurn(req);
        } catch {
          turnOutcome = { ok: false, aborted: false };
        }
        // A Ctrl+S flush can arm preempt while this cascade turn is
        // mid-flight; consume it so the abort is reinterpreted (drain/stop)
        const consumed = consumePreempt(turnOutcome);
        const effectiveTurnOutcome = consumed.outcome;
        runtime.send({ type: "turn-end", ...effectiveTurnOutcome });
        traceChildRunWake("queue-drain-end", req.event, null, { ...queueWakeFields(getStatus()), ok: effectiveTurnOutcome.ok, aborted: effectiveTurnOutcome.aborted });
        if (consumed.mode === "stop") {
          runtime.send({ type: "clear-drain-error" });
        }
        lastOk = effectiveTurnOutcome.ok && !effectiveTurnOutcome.aborted;
      } else {
        break;
      }
    }
  };

  const resumeInternalCompletions = async (
    dialogId: string | null
  ): Promise<InternalResumeResult> => {
    await restorePending();
    await pendingWrites;
    const status = runtime.getState();
    const gate = classifyInternalResumeGate({
      internalResumeStopped,
      recoveryBlocked,
      writeError,
      dialogId,
      status,
    });
    if (gate) {
      // 被挡住时只记「哪一门 + 队列规模」，不记队列内容：下次「为什么没
      // 自动续跑」能直接定位，不必再从终态时间线反推。
      traceRunWake("internal-resume-skip", {
        gate,
        ...queueWakeFields(projectChatQueueStatus({ state: status })),
      });
      return { drained: false, gate };
    }
    await notifyTurnEnd({ ok: true, aborted: false }, dialogId);
    return { drained: true, gate: null };
  };

  const drainHeadForManualTurn = (): TurnRequest | null => {
    const status = runtime.getState();
    if (batchHost || status.running || status.queue.length === 0) return null;
    const head = status.queue[0]!;
    runtime.send({ type: "turn-start" });
    runtime.send({ type: "dequeue" });
    return head;
  };

  const preemptForDrain = (): boolean => {
    const status = runtime.getState();
    if (!status.running || status.queue.length === 0) return false;
    preemptArmed = "drain";
    return true;
  };

  const preemptForStop = (): boolean => {
    internalResumeStopped = true;
    const status = runtime.getState();
    stoppedGeneration += 1;
    if (!status.running) { runtime.send({ type: "pause-drain" }); return false; }
    preemptArmed = "stop";
    return true;
  };

  const snapshotAndClearQueueWithImages = (): {
    text: string;
    imagePaths: string[];
    mediaPaths?: string[];
  } | null => {
    const status = runtime.getState();
    if (status.queue.length === 0) return null;
    const merged = status.queue.map((req) => req.text).join("\n");
    const imagePaths = [
      ...new Set(status.queue.flatMap((req) => req.imagePaths ?? [])),
    ];
    const mediaPaths = [
      ...new Set(status.queue.flatMap((req) => req.mediaPaths ?? [])),
    ];
    runtime.send({ type: "clear" });
    return {
      text: merged,
      imagePaths,
      // 空时省略字段：调用方用 `?? []`，但 toEqual 断言不希望多出键。
      ...(mediaPaths.length > 0 ? { mediaPaths } : {}),
    };
  };

  const snapshotAndClearQueue = (): string | null =>
    snapshotAndClearQueueWithImages()?.text ?? null;

  const clear = () => {
    runtime.send({ type: "clear" });
  };

  const recoverStaleRunning = (): boolean => {
    if (!runtime.getState().running) return false;
    // Clean turn-end (ok: true): exits `running`, keeps the queue, and leaves
    // lastDrainError unset so the residual queue stays drainable. See the
    // type doc: a lost notification must not be recorded as a failed turn.
    runtime.send({ type: "turn-end", ok: true, aborted: false });
    return true;
  };

  const claimBatchForInjection = (): { batchId: number; requests: readonly TurnRequest[] } | null => {
    if (runtime.getState().drainBatch) return null;
    runtime.send({ type: "claim-batch" });
    const after = runtime.getState();
    return after.drainBatch ? { batchId: after.drainBatch.id, requests: after.drainBatch.requests } : null;
  };

  const acceptClaimedBatch = (batchId: number) => {
    runtime.send({ type: "batch-accepted", batchId });
  };

  const failClaimedBatch = (batchId: number, message: string) => {
    runtime.send({ type: "batch-failed", batchId, message });
  };

  const rollbackClaimedBatch = (batchId: number, requests: readonly TurnRequest[]) => {
    runtime.send({ type: "rollback-batch", batchId, requests });
  };

  const getStatus = () => projectChatQueueStatus({ state: runtime.getState() });

  const getRecovery = () => recovery;

  const queueLength = () => runtime.getState().queue.length;

  const countQueuedBackgroundResults = (): number => {
    const queue = runtime.getState().queue;
    let count = 0;
    for (const item of queue) {
      const kind = (item.event as { kind?: unknown } | undefined)?.kind;
      if (kind === "child-run-completed" || kind === "background-task-completed") {
        count += 1;
      }
    }
    return count;
  };

  const dispose = () => {
    runtime.dispose();
  };

  return {
    submitPending,
    admitExternalRequest,
    restorePending,
    isRecoveryBlocked: () => recoveryBlocked,
    getRecovery,
    handlePendingCommand,
    resumePending,
    resumeInternalCompletions,
    resolveSubmit,
    enqueue,
    enqueueAndMaybeRun,
    notifyTurnStart,
    notifyTurnEnd,
    drainHeadForManualTurn,
    preemptForDrain,
    preemptForStop,
    snapshotAndClearQueue,
    snapshotAndClearQueueWithImages,
    clear,
    recoverStaleRunning,
    claimBatchForInjection,
    acceptClaimedBatch,
    failClaimedBatch,
    rollbackClaimedBatch,
    getStatus,
    queueLength,
    countQueuedBackgroundResults,
    dispose,
  };
}
