import { Mutex } from "async-mutex";

/** Shared by foreground commits, batch authority, and client replication.
 * Single authority process only: not a distributed lock or store CAS. */
export const dialogCommitMutexes = new Map<string, Mutex>();
export function getDialogCommitMutex(dialogId: string): Mutex {
  let mutex = dialogCommitMutexes.get(dialogId);
  if (!mutex) { mutex = new Mutex(); dialogCommitMutexes.set(dialogId, mutex); }
  return mutex;
}
export async function withDialogCommitGate<T>(dialogId: string, fn: () => Promise<T>): Promise<T> {
  const mutex = getDialogCommitMutex(dialogId);
  try { return await mutex.runExclusive(fn); }
  finally {
    if (!mutex.isLocked() && dialogCommitMutexes.get(dialogId) === mutex) dialogCommitMutexes.delete(dialogId);
  }
}

/** A message key has no escaping: both dialog and message IDs may contain
 * -msg-. Acquire EVERY syntactically possible dialog gate, in sorted order.
 * This uses only the key, never a client-supplied row.id/dialogId, includes the
 * real authority gate even for creates, and does not serialize unrelated keys.
 * All multi-gate callers use this ordering; single-dialog claim never nests. */
export function withMessageReplicationGates<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const candidates: string[] = [];
  if (key.startsWith("dialog-")) {
    for (let at = key.indexOf("-msg-", 7); at !== -1; at = key.indexOf("-msg-", at + 1)) {
      const dialog = key.slice(7, at);
      const id = key.slice(at + 5);
      if (dialog && /^[A-Za-z0-9_-]{1,128}$/.test(id)) candidates.push(dialog);
    }
  }
  const ordered = [...new Set(candidates)].sort();
  const acquire = (index: number): Promise<T> => index === ordered.length
    ? fn() : withDialogCommitGate(ordered[index], () => acquire(index + 1));
  return acquire(0);
}
