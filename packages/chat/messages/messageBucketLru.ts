import { selectPendingUserMessages } from "./pendingUserMessages";
import { GLOBAL_MESSAGE_DIALOG_ID } from "./messageSessionStore";
import type { Message } from "./types";

/**
 * Maximum number of cold/inactive historical dialog message buckets retained
 * in Redux memory (`state.dialogStateById`). Active, streaming, loading,
 * pending-queue, draft/save-failed, and `__global__` buckets are exempt from
 * this cap and are never evicted.
 */
export const MAX_CACHED_INACTIVE_DIALOG_BUCKETS = 10;

const SAVE_FAILED_MARKER = "[Failed to save message]";

export interface MessageBucketLike {
  msgs: {
    ids: string[];
    entities: Record<string, Message | undefined>;
  };
}

export interface ColdBucketEvictionInput {
  dialogStateById: Record<string, MessageBucketLike | undefined>;
  lruOrder?: readonly string[];
  activeDialogId?: string | null;
  protectedDialogIds?: readonly (string | null | undefined)[];
  maxCachedInactiveBuckets?: number;
  isDialogProtected?: (dialogId: string, messages: Message[]) => boolean;
}

function isSaveFailedMessageContent(
  content: Message["content"] | undefined,
): boolean {
  if (typeof content === "string") {
    return content.includes(SAVE_FAILED_MARKER);
  }
  if (Array.isArray(content)) {
    return content.some(
      (part) =>
        Boolean(part) &&
        part.type === "text" &&
        typeof (part as { text?: unknown }).text === "string" &&
        (part as { text: string }).text.includes(SAVE_FAILED_MARKER),
    );
  }
  return false;
}

/**
 * Returns true if any message in the bucket carries in-flight, queued, draft,
 * or save-failed state that exists only or unstably in memory/queue and must
 * never be evicted.
 */
export function hasProtectedMessageInBucket(
  messages: readonly (Message | undefined)[],
): boolean {
  const validMessages: Message[] = [];

  for (const msg of messages) {
    if (!msg) continue;
    validMessages.push(msg);

    if (msg.isStreaming === true) return true;
    if (msg.imageGenerationState != null) return true;

    const metadata = msg.metadata as Record<string, unknown> | undefined;
    const queueState = metadata?.queueState;
    if (
      queueState === "pending" ||
      queueState === "queued" ||
      queueState === "accepted"
    ) {
      return true;
    }

    const userBatchPhase = metadata?.userBatchPhase;
    if (userBatchPhase === "admitted" || userBatchPhase === "requested") {
      return true;
    }

    const rawMsg = msg as unknown as Record<string, unknown>;
    if (
      metadata?.saveFailed === true ||
      metadata?.draft === true ||
      metadata?.isDraft === true ||
      metadata?.persisted === false ||
      metadata?.unsaved === true ||
      rawMsg.saveFailed === true ||
      rawMsg.isDraft === true ||
      rawMsg.persisted === false
    ) {
      return true;
    }

    if (isSaveFailedMessageContent(msg.content)) {
      return true;
    }
  }

  return selectPendingUserMessages(validMessages).length > 0;
}

/**
 * Pure deterministic LRU touch: moves `dialogId` to the MRU tail using logical
 * array order (no `Date.now()`). Returns the same array reference if `dialogId`
 * is already at the tail.
 */
export function touchDialogBucketLru(
  lruOrder: readonly string[] | undefined,
  dialogId: string,
  dialogStateById?: Record<string, unknown>,
): string[] {
  if (!dialogId || dialogId === GLOBAL_MESSAGE_DIALOG_ID) {
    return lruOrder ? [...lruOrder] : [];
  }
  if (
    lruOrder &&
    lruOrder.length > 0 &&
    lruOrder[lruOrder.length - 1] === dialogId
  ) {
    return lruOrder as string[];
  }

  const seen = new Set<string>();
  const next: string[] = [];

  if (!lruOrder && dialogStateById) {
    for (const existingId of Object.keys(dialogStateById)) {
      if (
        existingId !== GLOBAL_MESSAGE_DIALOG_ID &&
        existingId !== dialogId &&
        !seen.has(existingId)
      ) {
        seen.add(existingId);
        next.push(existingId);
      }
    }
  }

  if (lruOrder) {
    for (const existingId of lruOrder) {
      if (
        existingId !== GLOBAL_MESSAGE_DIALOG_ID &&
        existingId !== dialogId &&
        !seen.has(existingId) &&
        (!dialogStateById || existingId in dialogStateById)
      ) {
        seen.add(existingId);
        next.push(existingId);
      }
    }
  }

  next.push(dialogId);
  return next;
}

/**
 * Computes the ordered list of cold inactive dialogIds to evict (oldest first)
 * when evictable cold buckets exceed `maxCachedInactiveBuckets`.
 */
export function planColdMessageBucketEviction(
  input: ColdBucketEvictionInput,
): string[] {
  const {
    dialogStateById,
    lruOrder = [],
    activeDialogId,
    protectedDialogIds = [],
    maxCachedInactiveBuckets = MAX_CACHED_INACTIVE_DIALOG_BUCKETS,
    isDialogProtected,
  } = input;

  const cap = Math.max(0, Math.floor(maxCachedInactiveBuckets));

  const protectedSet = new Set<string>([GLOBAL_MESSAGE_DIALOG_ID]);
  if (typeof activeDialogId === "string" && activeDialogId.length > 0) {
    protectedSet.add(activeDialogId);
  }
  for (const id of protectedDialogIds) {
    if (typeof id === "string" && id.length > 0) {
      protectedSet.add(id);
    }
  }

  // Build oldest-to-newest order: any untracked keys present in dialogStateById
  // are placed ahead of tracked lruOrder entries so legacy/pre-populated buckets
  // are treated as older than explicitly touched ones.
  const trackedSet = new Set<string>();
  const trackedOrdered: string[] = [];
  for (const id of lruOrder) {
    if (
      id !== GLOBAL_MESSAGE_DIALOG_ID &&
      id in dialogStateById &&
      !trackedSet.has(id)
    ) {
      trackedSet.add(id);
      trackedOrdered.push(id);
    }
  }

  const orderedIds: string[] = [];
  for (const id of Object.keys(dialogStateById)) {
    if (id !== GLOBAL_MESSAGE_DIALOG_ID && !trackedSet.has(id)) {
      orderedIds.push(id);
    }
  }
  orderedIds.push(...trackedOrdered);

  const evictableIds: string[] = [];
  for (const dialogId of orderedIds) {
    if (protectedSet.has(dialogId)) continue;

    const bucket = dialogStateById[dialogId];
    if (!bucket) continue;

    const entities = bucket.msgs?.entities ?? {};
    const messages = Object.values(entities).filter((msg): msg is Message =>
      Boolean(msg),
    );

    if (hasProtectedMessageInBucket(messages)) continue;
    if (isDialogProtected?.(dialogId, messages)) continue;

    evictableIds.push(dialogId);
  }

  const overflow = evictableIds.length - cap;
  if (overflow <= 0) {
    return [];
  }

  return evictableIds.slice(0, overflow);
}
