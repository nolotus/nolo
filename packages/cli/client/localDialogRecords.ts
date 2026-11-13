import { registerDialogOwner } from "database-engine/dialogOwner";
import {
  buildAgentRuntimeDialogWritePlan,
  dialogMessageRecordToAgentRuntimeMessage,
  type AgentRuntimeSaveTurnInput,
} from "../agentRuntimeLocal";

type LocalDialogRecord = Record<string, any>;

export const localDialogMessageRecordToRuntimeMessage = dialogMessageRecordToAgentRuntimeMessage;

export function buildLocalDialogWritePlan(args: {
  input: AgentRuntimeSaveTurnInput;
  userId: string;
  now: number;
  createId: () => string;
  existingDialog?: LocalDialogRecord | null;
  cwd?: string;
  titleOverride?: string;
}) {
  return buildAgentRuntimeDialogWritePlan({
    input: args.input,
    userId: args.userId,
    now: args.now,
    createId: args.createId,
    existingDialog: args.existingDialog,
    runtimeHost: "cli",
    runtimeMetadata: {
      ...(args.cwd ? { worktreePath: args.cwd } : {}),
    },
    ...(args.titleOverride ? { titleOverride: args.titleOverride } : {}),
  });
}

/** Pending user records share the existing dialog message namespace and Web receipt schema. */
export async function saveCliPendingUserMessages(args: {
  store: import("./hybridRecordStore").HybridRecordStore;
  userId: string; dialogId: string; agentKey: string;
  requests: readonly import("core/chat/internalTurnEvent").TurnRequest[];
}) {
  const dialogKey = `dialog-${args.userId}-${args.dialogId}`;
  const existing = await args.store.read(dialogKey, { remote: false });
  const now = new Date().toISOString();
  const ops: any[] = [];
  if (!existing) ops.push({ type: "put", key: dialogKey, value: {
    id: args.dialogId, dbKey: dialogKey, type: "dialog", userId: args.userId,
    primaryAgentKey: args.agentKey, cybots: [args.agentKey], createdAt: now, updatedAt: now,
  } });
  for (const request of args.requests) {
    if (!request.messageId) throw new Error("Pending user message requires a stable messageId");
    const key = `dialog-${args.dialogId}-msg-${request.messageId}`;
    if (await args.store.read(key, { remote: false })) continue;
    ops.push({ type: "put", key, value: {
      id: request.messageId, dbKey: key, type: "message", dialogId: args.dialogId,
      userId: args.userId, role: "user", content: request.text, createdAt: now,
      metadata: { queueState: "pending", source: request.source ?? "tui",
        imagePaths: request.imagePaths, mediaPaths: request.mediaPaths },
    } });
  }
  await registerDialogOwner({
    store: { get: (key) => args.store.read(key, { remote: false }), put: (key, value) => args.store.batch([{ type: "put", key, value }]) },
    dialogId: args.dialogId, ownerId: args.userId, source: "cli-pending-user",
  });
  if (ops.length) await args.store.batch(ops);
}

export type CliPendingRecovery = {
  /**
   * "ready"       — no unresolved state.
   * "unknown"     — a batch was dispatched (requested) and the provider outcome
   *                 is unknown. It is retained and never auto-resent, but it
   *                 does NOT block new user messages.
   * "read-error"  — the durable store could not be read; the state is
   *                 indeterminate, so draining stays paused until resolved.
   */
  status: "ready" | "unknown" | "read-error";
  messageIds: string[];
  message?: string;
  batches?: Array<{ batchId: string; messages: Array<{ messageId: string; text: string }> }>;
};

export type CliPendingResult = { pending: readonly import("core/chat/internalTurnEvent").TurnRequest[]; recovery: CliPendingRecovery };

export async function readCliPendingUserMessages(store: import("./hybridRecordStore").HybridRecordStore, dialogId: string): Promise<CliPendingResult> {
  const { readDialogMessageRecords } = await import("./cliLocalAgentRecordReader");
  const rows = await readDialogMessageRecords({ store, dialogId });
  const uncertain = rows.filter(({ record }) => (record.metadata as any)?.cliBatchPhase === "requested" && !(record.metadata as any)?.cliBatchResolution);
  const recovery: CliPendingRecovery = uncertain.length ? {
    status: "unknown", messageIds: uncertain.map(row => row.messageId),
    // Attribute each unknown batch to its own members via the tail receipt.
    // `acceptedUserMessageIds` is written by `markCliUserBatchPhase`; older
    // records carry the same field from the legacy admission path. Records with
    // neither fall back to every accepted row (never attribute a completed
    // batch's members to an unknown one when the receipt is available).
    batches: uncertain.map(row => {
      const receiptIds = (row.record.metadata as any)?.acceptedUserMessageIds;
      const memberIds = Array.isArray(receiptIds) && receiptIds.length
        ? receiptIds as string[]
        : rows.filter(message => (message.record.metadata as any)?.queueState === "accepted")
          .map(message => message.messageId);
      const memberSet = new Set(memberIds);
      return { batchId: row.messageId, messages: rows.filter(message => memberSet.has(message.messageId))
        .map(message => ({ messageId: message.messageId, text: String(message.record.content ?? "") })) };
    }),
    message: `Batch provider outcome unknown for ${uncertain.map(row => row.messageId).join(", ")}; pending history retained; resubmission paused to avoid duplicate billing`,
  } : { status: "ready", messageIds: [] };
  const pending = rows.filter(({ record }) => record.role === "user"
    && (record.metadata as any)?.queueState === "pending")
    .map(({ record, messageId }) => ({ messageId, source: (record.metadata as any)?.source,
      text: String(record.content ?? ""), event: { kind: "user" as const, text: String(record.content ?? "") },
      imagePaths: (record.metadata as any)?.imagePaths, mediaPaths: (record.metadata as any)?.mediaPaths }));
  return { pending, recovery };
}

/**
 * Mark a queued batch as dispatched ("requested") or finished ("completed").
 *
 * The batch tail message id is the stable receipt key. `messageIds` is the
 * ordered set of user messages in the batch, supplied by the caller from the
 * validated batch identity (`cliBatchIdentity.ts`). The tail receipt keeps
 * `acceptedUserMessageIds` so recovery can attribute each unknown batch to its
 * own members — without it, `readCliPendingUserMessages` would list every
 * accepted row under every unknown tail (cross-batch mixing). "requested" is
 * the pre-provider in-flight marker: it is what makes a crash after the model
 * was called recover as "unknown outcome" instead of a blind resend.
 */
export async function markCliUserBatchPhase(
  store: import("./hybridRecordStore").HybridRecordStore, dialogId: string,
  messageId: string, phase: "requested" | "completed",
  messageIds: readonly string[],
  preparedMessages?: readonly { cliMessageId?: string; content: unknown }[],
) {
  const key = `dialog-${dialogId}-msg-${messageId}`;
  const record = await store.read(key, { remote: false });
  if (!record) throw new Error("Missing durable batch receipt");
  const current = (record as any).metadata?.cliBatchPhase;
  if (phase === "requested" && (current === "requested" || current === "completed")) {
    throw new Error(`Batch ${messageId} already requested; resubmission blocked`);
  }
  const ops = [];
  for (const id of messageIds) {
    const messageKey = `dialog-${dialogId}-msg-${id}`;
    const message = await store.read(messageKey, { remote: false });
    if (!message) throw new Error(`Missing batch user message ${id}`);
    const prepared = preparedMessages?.find(item => item.cliMessageId === id);
    ops.push({ type: "put" as const, key: messageKey, value: { ...message,
      ...(prepared ? { content: prepared.content } : {}), metadata: {
      ...(message as any).metadata, queueState: "accepted",
      ...(id === messageId ? { cliBatchPhase: phase, acceptedUserMessageIds: [...messageIds] } : {}),
    } } });
  }
  await store.batch(ops);
}

/**
 * Roll a dispatched batch back to `pending` after an abort/failure that happened
 * BEFORE the provider was invoked. This is an accurate state update, not a
 * delete: the durable message stays, `cliBatchPhase` is cleared, and
 * `queueState` returns to `pending` so recovery re-queues it instead of locking
 * the dialog on a false "unknown outcome". Idempotent.
 */
export async function rollbackCliUserBatchPhase(
  store: import("./hybridRecordStore").HybridRecordStore, dialogId: string,
  batchId: string, messageIds: readonly string[],
) {
  const ops = [];
  for (const id of messageIds) {
    const key = `dialog-${dialogId}-msg-${id}`;
    const record = await store.read(key, { remote: false });
    if (!record) continue;
    const metadata = { ...(record as any).metadata };
    delete metadata.cliBatchPhase;
    metadata.queueState = "pending";
    ops.push({ type: "put" as const, key, value: { ...record, metadata } });
  }
  if (ops.length) await store.batch(ops);
}

/**
 * Build the minimal completion op for a batch tail message without writing it.
 *
 * Only the tail's `cliBatchPhase` is needed for recovery (`readCliPendingUserMessages`
 * treats `completed` as ready and `requested` as unknown). Split out so the reply
 * save can append this op to its own `store.batch`, making the completion evidence
 * atomic with the persisted reply — no "reply saved but finalize missing" window.
 */
export async function buildCliBatchCompletionOp(
  store: import("./hybridRecordStore").HybridRecordStore, dialogId: string, batchId: string,
): Promise<{ type: "put"; key: string; value: any }> {
  const key = `dialog-${dialogId}-msg-${batchId}`;
  const record = await store.read(key, { remote: false });
  if (!record) throw new Error(`Missing batch user message ${batchId}`);
  return { type: "put", key, value: { ...record,
    metadata: { ...(record as any).metadata, cliBatchPhase: "completed" } } };
}

/** Explicit user decision: retain requested phase and receipt, never claim completion. */
export async function resolveCliUnknownBatchWithoutResend(
  store: import("./hybridRecordStore").HybridRecordStore, dialogId: string, batchId: string,
) {
  const key = `dialog-${dialogId}-msg-${batchId}`;
  const record = await store.read(key, { remote: false });
  if (!record || (record as any).metadata?.cliBatchPhase !== "requested") throw new Error(`Unknown requested batch not found: ${batchId}`);
  if ((record as any).metadata.cliBatchResolution) return;
  await store.batch([{ type: "put", key, value: { ...record, metadata: {
    ...(record as any).metadata, cliBatchResolution: { decision: "continue-without-resend", decidedBy: "user", decidedAt: new Date().toISOString() },
  } } }]);
}
