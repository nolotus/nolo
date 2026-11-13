import { Mutex } from "async-mutex";
import { isLevelNotFoundError } from "database/levelNotFoundError";

export interface DialogOwnerRecord {
  dialogId: string;
  ownerId: string;
  spaceId?: string | null;
  source: string;
  registeredAt: string;
}

// dialogown is an ownership registry, NOT dialogidx (per-user list indexes),
// dialog-{owner}-{id} (dialog records), or dialog-{id}-msg-{id} (messages).
export const dialogOwnerKey = (dialogId: string) => `dialogown-${dialogId}`;
const locks = new Map<string, Mutex>();

/** Registration only; never an authorization decision. Callers supply a trusted
 * actor/context, never an owner taken from an incoming record. Read/first-write
 * is serialized in this authority process (NOT distributed CAS). All writers
 * of this namespace must use this helper. Failures are observable but must not
 * change the outcome of the pre-existing dialog write path.
 */
export async function registerDialogOwner(args: {
  store: { get(key: string): Promise<any>; put(key: string, value: any): Promise<unknown> };
  dialogId: string;
  ownerId: string;
  spaceId?: string | null;
  source: string;
  now?: () => string;
  log?: (event: Record<string, unknown>) => void;
}): Promise<void> {
  const emit = (event: Record<string, unknown>) => {
    try { (args.log ?? ((event) => console.warn(event)))(event); } catch { /* Logging must not reject a dialog write. */ }
  };
  const key = dialogOwnerKey(args.dialogId);
  let mutex = locks.get(key);
  if (!mutex) { mutex = new Mutex(); locks.set(key, mutex); }
  try {
    await mutex.runExclusive(async () => {
      let existing: DialogOwnerRecord | null;
      try { existing = await args.store.get(key); }
      catch (error) {
        if (!isLevelNotFoundError(error)) throw error;
        existing = null;
      }
      if (existing != null) {
        if (existing.ownerId !== args.ownerId) emit({
          event: "dialog_owner_conflict", dialogId: args.dialogId,
          existingOwnerId: existing.ownerId, attemptedOwnerId: args.ownerId,
          source: args.source,
        });
        return;
      }
      await args.store.put(key, {
        dialogId: args.dialogId, ownerId: args.ownerId,
        ...(args.spaceId !== undefined ? { spaceId: args.spaceId } : {}),
        source: args.source, registeredAt: (args.now ?? (() => new Date().toISOString()))(),
      } satisfies DialogOwnerRecord);
    });
  } catch (error) {
    emit({ event: "dialog_owner_registration_failed", dialogId: args.dialogId,
      source: args.source, error: error instanceof Error ? error.message : String(error) });
  } finally {
    if (!mutex.isLocked() && locks.get(key) === mutex) locks.delete(key);
  }
}
