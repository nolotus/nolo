import type { UserBatchReceipt } from "./pendingUserBatchControl";

import { normalizeAttachmentPart } from "ai/attachments/attachmentPart";
import type { PendingAttachmentMessagePart } from "./pendingAttachmentParts";

// Capture payload at request construction; defer canonicalization until exact
// receipt IDs are known so unrelated historical parts cannot block this batch.
export function snapshotUserBatchInput(messages: readonly { id: string; role?: string; content?: unknown }[]) {
  return messages.filter(message => message.role === "user").map(message => ({ id: message.id, content: structuredClone(message.content) }));
}
export type UserBatchInputSnapshot = ReturnType<typeof snapshotUserBatchInput>;
function canonicalUserContent(content: unknown): string {
  const parts = typeof content === "string" ? ["string", content] : Array.isArray(content)
    ? ["parts", content.map((raw: unknown) => {
        const part = raw as PendingAttachmentMessagePart & Record<string, any>;
        if (part?.type === "text" && typeof part.text === "string") return ["text", part.text];
        if (part?.type === "image_url") {
          const url = typeof part.image_url === "string" ? part.image_url : part.image_url?.url;
          if (typeof url !== "string") throw new Error("Invalid user batch image; blocked");
          return ["image_url", url, typeof part.image_url === "object" ? part.image_url.detail ?? "auto" : "auto",
            part.google_native?.inlineData?.mimeType ?? null, part.google_native?.inlineData?.data ?? null,
            part.google_native?.thoughtSignature ?? null];
        }
        if (part?.type === "attachment") {
          const parsed = normalizeAttachmentPart(part);
          if (parsed.status !== "valid") throw new Error("Invalid user batch attachment; blocked");
          const a = parsed.attachment; const source = a.source;
          return [a.type, a.v, source.kind, source.kind === "remote-file" ? [source.fileKey] : [source.path, source.machineId, source.workspaceRoot ?? null], a.name, a.mimeType, a.size];
        }
        // Same reference identity fields emitted by buildReferencePart and the
        // PendingAttachmentMessagePart reference branch (type is extensible).
        if (part && typeof part.type === "string" && typeof part.name === "string" &&
            [part.pageKey, part.dialogKey, part.id].some(value => typeof value === "string" && !!value)) {
          return ["reference", part.type, part.name, part.pageKey ?? null, part.dialogKey ?? null, part.id ?? null];
        }
        throw new Error("Unsupported user batch content; blocked");
      })] : (() => { throw new Error("Invalid user batch content; blocked"); })();
  return JSON.stringify(parts);
}
export function orderedUserBatchInput(snapshot: UserBatchInputSnapshot, ids: string[]) {
  return ids.map(id => {
    const rows = snapshot.filter(row => row.id === id);
    if (rows.length !== 1) throw new Error("Incomplete user batch content; blocked");
    return canonicalUserContent(rows[0].content);
  });
}
export function assertUserBatchInput(expected: UserBatchInputSnapshot, actual: UserBatchInputSnapshot, ids: string[]) {
  const a = orderedUserBatchInput(expected, ids); const b = orderedUserBatchInput(actual, ids);
  if (a.some((part, i) => part !== b[i])) throw new Error("User batch authorized content changed; blocked");
}

/** Ephemeral permission for one caller execution, never a durable authority.
 * Construct inside streamAgentChatTurn, dispose in its finally. No global cache. */
export function createUserBatchExecution(signal: AbortSignal, owns: () => boolean) {
  let grant: { dialogKey: string; receipt: UserBatchReceipt; input: UserBatchInputSnapshot } | undefined;
  let closed = false;
  let inFlight = false;
  const dispose = () => { closed = true; grant = undefined; };
  const valid = () => {
    if (closed || signal.aborted || !owns()) { dispose(); return false; }
    return true;
  };
  signal.addEventListener("abort", dispose, { once: true });
  const same = (key: string, receipt: UserBatchReceipt) => grant?.dialogKey === key &&
    grant.receipt.batchId === receipt.batchId && grant.receipt.token === receipt.token &&
    grant.receipt.messageIds.length === receipt.messageIds.length &&
    grant.receipt.messageIds.every((id, index) => id === receipt.messageIds[index]);
  return {
    valid,
    hasGrant: () => valid() && !!grant,
    dispose() { dispose(); signal.removeEventListener("abort", dispose); },
    has(key: string, receipt: UserBatchReceipt) { return valid() && same(key, receipt); },
    authorize(key: string, receipt: UserBatchReceipt, input: UserBatchInputSnapshot) {
      if (!valid() || inFlight) throw new Error("User batch execution ownership lost; blocked");
      orderedUserBatchInput(input, receipt.messageIds);
      grant = { dialogKey: key, receipt: { ...receipt, messageIds: [...receipt.messageIds] }, input: structuredClone(input) };
    },
    async start(key: string, receipt: UserBatchReceipt, input: UserBatchInputSnapshot, invoke: () => unknown) {
      if (!valid() || !same(key, receipt) || inFlight) {
        dispose(); throw new Error("User batch execution permission expired or mismatched; blocked");
      }
      inFlight = true;
      try { assertUserBatchInput(grant!.input, input, receipt.messageIds); return await invoke(); }
      catch (error) { dispose(); throw error; }
      finally { inFlight = false; }
    },
  };
}
export type UserBatchExecution = ReturnType<typeof createUserBatchExecution>;
