import { isDialogRecordKey } from "database/dialogKey";
import { isLevelNotFoundError } from "database/levelNotFoundError";
import type { AuthorityBatchOperation, AuthorityStore } from "./authorityStoreTypes";

export const ACTIVE_DIALOG_RUN_PREFIX = "active-dialog-run-";
// A deployment cancellation is terminal, but explicitly requests a restart handoff.
export const DEPLOYMENT_DIALOG_RUN_PREFIX = "deployment-dialog-run-";
export const DEPLOYMENT_DIALOG_CANCEL_MESSAGE = "Cancelled by deployment (will auto-recover)";

export type DialogRunRecord = Record<string, any>;

export function dialogRunIndexPrefix(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return;
  const { status, errorMessage } = value as DialogRunRecord;
  if (status === "pending" || status === "running") return ACTIVE_DIALOG_RUN_PREFIX;
  if (status === "cancelled" && errorMessage === DEPLOYMENT_DIALOG_CANCEL_MESSAGE) {
    return DEPLOYMENT_DIALOG_RUN_PREFIX;
  }
}

export function dialogRunIndexRange(prefix: string) {
  // All index prefixes end in '-'; '.' is its exclusive lexicographic successor.
  return { gte: prefix, lt: prefix.slice(0, -1) + ".", keys: true, values: false };
}

/** Stage the authoritative row and its derived keys in the same atomic batch. */
export function dialogRunIndexOps(op: AuthorityBatchOperation): AuthorityBatchOperation[] {
  if (!isDialogRecordKey(op.key)) return [];
  const member = op.type === "put" ? dialogRunIndexPrefix(op.value) : undefined;
  return [ACTIVE_DIALOG_RUN_PREFIX, DEPLOYMENT_DIALOG_RUN_PREFIX].map((prefix) => {
    const key = prefix + op.key;
    return member === prefix ? { type: "put", key, value: true } : { type: "del", key };
  });
}

type GuardedIndexStore = Pick<AuthorityStore, "get" | "batchWrite">;
export type DialogRunIndexReader = Pick<AuthorityStore, "get" | "iterator"> & {
  runPublicationBatch<T>(task: (store: GuardedIndexStore) => Promise<T>): Promise<T>;
};

export async function getIndexedDialogRun(
  db: DialogRunIndexReader,
  prefix: string,
  indexKey: string,
  accept: (dialog: DialogRunRecord) => boolean = () => true,
): Promise<{ key: string; dialog: DialogRunRecord } | null> {
  if (!indexKey.startsWith(prefix)) return null;
  const key = indexKey.slice(prefix.length);
  const read = async (store: Pick<AuthorityStore, "get">) => {
    // Reject malformed pointers before get(), including any pointer to a message value.
    if (!isDialogRecordKey(key)) return null;
    try {
      const dialog = await store.get(key);
      return dialogRunIndexPrefix(dialog) === prefix && accept(dialog) ? { key, dialog } : null;
    } catch (error) {
      if (isLevelNotFoundError(error)) return null;
      throw error;
    }
  };
  const current = await read(db);
  if (current) return current;
  // Recheck under the same lock used for writes: a snapshot iterator can outlive
  // a terminal -> running transition, and must not remove the freshly added key.
  return db.runPublicationBatch(async (store) => {
    const latest = await read(store);
    if (latest) return latest;
    await store.batchWrite([{ type: "del", key: indexKey }]);
    return null;
  });
}
