// packages/cli/client/cliBatchIdentity.ts
//
// Explicit, validated identity for queued user batches.
//
// The batch tail message id is the stable identity persisted by
// localDialogRecords (`cliBatchPhase`). Callers must pass it explicitly
// instead of inferring "this turn has a queue batch" from the presence of
// `userMessages` (which is also set for other host paths).

export type CliBatchPhase = "requested" | "completed";

export type CliBatchIdentity = {
  /** Stable tail user-message id; also the persisted batch key suffix. */
  batchId: string;
  /** Ordered ids of every user message in the batch. */
  messageIds: string[];
};

/**
 * Structured failure for a batch phase write or a pre-send identity block.
 *
 * `requestStarted` is the authoritative flag for "did this attempt invoke the
 * provider": it is false for pre-send blocks (identity mismatch, requested-mark
 * failure) and true when the provider ran but the reply/completion evidence was
 * not confirmed persisted. `replyPersisted` is NOT a proxy for that: a save
 * failure after the provider ran also leaves it false.
 */
export type CliBatchPhaseFailure = Error & {
  code: "cli_batch_phase_failed";
  phase: CliBatchPhase;
  batchId: string;
  /** Whether this attempt invoked the provider. */
  requestStarted: boolean;
  /** Whether the assistant reply was durably persisted. */
  replyPersisted: boolean;
  cause?: unknown;
};

export function cliBatchPhaseFailure(args: {
  phase: CliBatchPhase;
  batchId: string;
  requestStarted: boolean;
  replyPersisted: boolean;
  cause: unknown;
}): CliBatchPhaseFailure {
  const { phase, batchId, requestStarted, replyPersisted, cause } = args;
  const message = cause instanceof Error ? cause.message : String(cause);
  const error = new Error(
    `cli batch phase ${phase} failed for ${batchId} (requestStarted=${requestStarted}, replyPersisted=${replyPersisted}): ${message}`,
  ) as CliBatchPhaseFailure;
  error.code = "cli_batch_phase_failed";
  error.phase = phase;
  error.batchId = batchId;
  error.requestStarted = requestStarted;
  error.replyPersisted = replyPersisted;
  error.cause = cause;
  return error;
}

/**
 * Resolve and validate the batch identity for a turn.
 *
 * Returns undefined when no explicit `cliBatchId` is supplied (ordinary turn).
 * Throws a structured pre-send failure when the identity is supplied but does
 * not match the tail of `userMessages`, or when any batch message lacks a
 * durable `cliMessageId`.
 */
export function resolveCliBatchIdentity(options: {
  cliBatchId?: string;
  userMessages?: ReadonlyArray<{ cliMessageId?: string }>;
}): CliBatchIdentity | undefined {
  const batchId = options.cliBatchId?.trim();
  if (!batchId) return undefined;
  const userMessages = options.userMessages;
  if (!userMessages || userMessages.length === 0) {
    throw cliBatchPhaseFailure({
      phase: "requested",
      batchId,
      requestStarted: false,
      replyPersisted: false,
      cause: new Error("batch identity requires userMessages"),
    });
  }
  const tailId = userMessages[userMessages.length - 1]?.cliMessageId;
  if (tailId !== batchId) {
    throw cliBatchPhaseFailure({
      phase: "requested",
      batchId,
      requestStarted: false,
      replyPersisted: false,
      cause: new Error(`batch identity mismatch: tail=${tailId ?? "none"}`),
    });
  }
  const messageIds = userMessages.map(message => message.cliMessageId);
  if (messageIds.some(id => !id)) {
    throw cliBatchPhaseFailure({
      phase: "requested",
      batchId,
      requestStarted: false,
      replyPersisted: false,
      cause: new Error("batch user message missing cliMessageId"),
    });
  }
  return { batchId, messageIds: messageIds as string[] };
}
