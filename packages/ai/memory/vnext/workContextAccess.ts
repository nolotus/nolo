import { buildDialogKey, dialogMessageKey } from "database/dialogKey";
import { isTombstoneRecord } from "database/tombstones";
import type { WorkContextScope } from "./workContext";

/** Verify identifiers against persisted host records, never model-authored source text. */
export async function resolveWorkContextAccess(db: any, userId: string, dialogId: unknown, userMessageId?: unknown): Promise<{ scope: WorkContextScope; sourceRef?: string }> {
  if (!userId || userId === "server" || typeof dialogId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(dialogId)) throw new Error("invalid work dialog");
  const dialog = await db.get(buildDialogKey(userId, dialogId));
  if (!dialog || dialog.id !== dialogId || (dialog.userId != null && dialog.userId !== userId) || isTombstoneRecord(dialog)) throw new Error("work dialog forbidden");
  const scope = { ownerId: `user:${encodeURIComponent(userId)}`, spaceId: typeof dialog.spaceId === "string" && dialog.spaceId ? dialog.spaceId : null, dialogId };
  if (userMessageId === undefined) return { scope };
  if (typeof userMessageId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(userMessageId)) throw new Error("persisted user message required");
  const message = await db.get(dialogMessageKey(dialogId, userMessageId));
  if (!message || message.id !== userMessageId || (message.dialogId != null && message.dialogId !== dialogId) || message.role !== "user" || message.userId !== userId || isTombstoneRecord(message) || typeof message.content !== "string" || typeof message.createdAt !== "string") throw new Error("work source forbidden");
  return { scope, sourceRef: JSON.stringify(["dialog", dialogId, "message", userMessageId]) };
}

