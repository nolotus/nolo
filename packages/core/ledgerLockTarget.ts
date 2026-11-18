export const LEDGER_LOCK_TARGET = Symbol.for("nolo.billing.ledgerLockTarget");

/**
 * Recursively unwrap wrapper stores tagged with `LEDGER_LOCK_TARGET` down to
 * the underlying store identity used as the `WeakMap` key for in-process
 * account locks. Uses a `seen` set to stay cycle-safe.
 */
export const resolveLedgerLockTarget = (store: object): object => {
  let current: object = store;
  const seen = new Set<object>();
  while (!seen.has(current)) {
    seen.add(current);
    const candidate = (current as { [LEDGER_LOCK_TARGET]?: unknown })[
      LEDGER_LOCK_TARGET
    ];
    if (!candidate || typeof candidate !== "object") {
      break;
    }
    current = candidate;
  }
  return current;
};

/**
 * Tag a `{ get, batch }` store adapter with its underlying store target so
 * concurrent callers using distinct per-call wrappers still share the same
 * lock queue.
 */
export const tagLedgerLockTarget = <T extends object>(
  wrapper: T,
  target: object
): T => {
  const resolvedTarget = resolveLedgerLockTarget(target);
  Object.defineProperty(wrapper, LEDGER_LOCK_TARGET, {
    value: resolvedTarget,
    enumerable: false,
    configurable: true,
  });
  return wrapper;
};
