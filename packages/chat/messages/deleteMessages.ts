// chat/messages/deleteMessages.ts
import { createKey, dialogMessagePrefix } from "database/keys";

export interface KeyValueDB {
  batch: () => {
    del: (key: string) => void;
    write: () => Promise<void>;
  };
  iterator: (options: { gte: string; lte: string }) => AsyncIterable<[string, unknown]>;
}

/**
 * 通用的按前缀批量删除
 */
export async function deleteRows(db: KeyValueDB, prefix: string) {
  const batch = db.batch();
  const deletedKeys: string[] = [];

  let iterator = (db as any).iterator({
    gte: prefix,
    lte: prefix + "\uffff",
  });

  if (iterator && typeof iterator.then === 'function') {
    iterator = await iterator;
  }

  for await (const [key] of iterator) {
    batch.del(key);
    deletedKeys.push(key);
  }

  await batch.write();

  return {
    message: "Rows deleted successfully",
    processingIds: deletedKeys,
  };
}

/**
 * 删除某个对话下的所有消息
 */
export function deleteMessages(db: KeyValueDB, dialogId: string) {
  const prefix = dialogMessagePrefix(dialogId);
  return deleteRows(db, prefix);
}