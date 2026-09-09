/**
 * Account-session → store bridge (Phase 5).
 *
 * Replaces the old "mutable thunk extra + `store.accountSession`" wiring:
 * the owning store calls `registerStoreSessionBridge(store, runtime)` once at
 * composition time (app/store.ts, rn/redux/store.ts). Non-React code with a
 * store reference resolves the session runtime via `getSessionRuntime(store)`
 * instead of poking `(store as any).accountSession`.
 *
 * A WeakMap keeps the mapping out of the store object and the module never
 * owns a Core — runtimes hand theirs in explicitly. `store.accountSession`
 * / `store.accountSessionRuntime` props are still set by the stores for
 * legacy introspection and the read-side hooks that resolve the Core through
 * the react-redux store context.
 */

import type { AccountSessionRuntime } from "../types";

export type SessionBridgeStore = {
  accountSession?: unknown;
  accountSessionRuntime?: AccountSessionRuntime | null;
  dispatch?: (action: unknown) => unknown;
};

const bridges = new WeakMap<object, AccountSessionRuntime>();

/** Wire a composed AccountSessionRuntime to its owning store. */
export function registerStoreSessionBridge(
  store: object,
  runtime: AccountSessionRuntime
): void {
  bridges.set(store, runtime);
  const target = store as SessionBridgeStore;
  target.accountSessionRuntime = runtime;
  target.accountSession = runtime.service ?? null;
}

/** Teardown hook for stores that are recreated (tests, RN fast refresh). */
export function unregisterStoreSessionBridge(store: object): void {
  bridges.delete(store);
}

export const getSessionRuntime = (
  store: object | null | undefined
): AccountSessionRuntime | null => {
  if (!store) return null;
  const bridged = (store as SessionBridgeStore).accountSessionRuntime ?? null;
  return bridged ?? bridges.get(store as object) ?? null;
};
