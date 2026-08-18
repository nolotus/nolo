import { deleteMessages } from "chat/messages/deleteMessages";
import { asOptionalTrimmedString } from "core/optionalString";
import { buildDialogAgentListIndexDeleteOps } from "database/keys";
import { dialogMessagePrefix, parseDialogKey } from "database/dialogKey";

export type DeleteDialogCascadeDb = {
  batch: {
    (): { del: (key: string) => void; write: () => Promise<void> };
    (ops?: Array<{ type: "del" | "put"; key: string; value?: unknown }>): any;
  };
  iterator: (options: {
    gte: string;
    lte: string;
  }) => AsyncIterable<[string, unknown]> | Promise<AsyncIterable<[string, unknown]>>;
};

export type DeleteDialogCascadeOptions = {
  previousRecord?: Record<string, unknown> | null;
  userId?: string | null;
  /** auth path: only del into sink, no write */
  accumulate?: { del: (key: string) => void };
  deletePrimary?: boolean;
};

export async function deleteDialogCascade(
  db: DeleteDialogCascadeDb,
  dialogKey: string,
  options: DeleteDialogCascadeOptions = {},
): Promise<{
  parsed: { userId: string; dialogId: string } | null;
  messageKeys: string[];
  agentListIndexKeys: string[];
}> {
  const parsed = parseDialogKey(dialogKey);
  if (!parsed) {
    return { parsed: null, messageKeys: [], agentListIndexKeys: [] };
  }
  const userId =
    asOptionalTrimmedString(options.userId) ?? parsed.userId;
  const { dialogId } = parsed;

  const agentOps = buildDialogAgentListIndexDeleteOps({
    userId,
    dialogKey,
    dialogId,
    previousRecord: options.previousRecord ?? null,
  });
  const agentListIndexKeys = agentOps.map((op) => op.key);

  if (options.accumulate) {
    // Auth batch path: collect message keys + index + optional primary into batch
    const prefix = dialogMessagePrefix(dialogId);
    const messageKeys: string[] = [];
    let iterator = db.iterator({ gte: prefix, lte: prefix + "\uffff" }) as any;
    if (iterator && typeof iterator.then === "function") iterator = await iterator;
    for await (const [key] of iterator) {
      messageKeys.push(String(key));
      options.accumulate.del(String(key));
    }
    for (const k of agentListIndexKeys) options.accumulate.del(k);
    if (options.deletePrimary) options.accumulate.del(dialogKey);
    return { parsed, messageKeys, agentListIndexKeys };
  }

  // Immediate write path (server/client): MUST call deleteMessages so server/delete.test mock still fires
  const msgResult = await deleteMessages(db as any, dialogId);
  const messageKeys: string[] = Array.isArray((msgResult as any)?.processingIds)
    ? (msgResult as any).processingIds.map(String)
    : [];

  if (agentListIndexKeys.length > 0 || options.deletePrimary) {
    const batch = db.batch();
    for (const k of agentListIndexKeys) batch.del(k);
    if (options.deletePrimary) batch.del(dialogKey);
    await batch.write();
  }

  return { parsed, messageKeys, agentListIndexKeys };
}
