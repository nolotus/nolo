/** Serialize settings persistence per Redux store and account, preserving user intent order.
 * A failed write rejects its caller but never poisons later writes.
 */
const queues = new WeakMap<Function, Map<string, Promise<void>>>();

export function enqueueAccountSettingsWrite<T>(
  getState: Function,
  accountId: string,
  write: () => Promise<T>,
): Promise<T> {
  let byAccount = queues.get(getState);
  if (!byAccount) {
    byAccount = new Map();
    queues.set(getState, byAccount);
  }
  const previous = byAccount.get(accountId) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(write);
  const tail = result.then(() => undefined, () => undefined);
  byAccount.set(accountId, tail);
  void tail.then(() => {
    if (byAccount?.get(accountId) === tail) byAccount.delete(accountId);
  });
  return result;
}
