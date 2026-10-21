/**
 * Identity session source (Phase 5).
 *
 * The non-React identity read side no longer reads `state.auth` (the Redux
 * auth slice is deleted). Instead, each runtime that composes an
 * `AccountSessionRuntime` binds its Core here **explicitly** at composition
 * time. There are two explicit binding mechanisms, and neither is implicit:
 *
 * 1. **Per-store binding (production path).** The owning store wraps its
 *    reducer with `withIdentitySessionReader(reducer, core)` (`app/store.ts`
 *    web/desktop, `rn/redux/store.ts` RN per-store). Every state object the
 *    store produces carries the owning runtime's snapshot reader under a
 *    non-enumerable symbol, so `selectIdentity*(state)` always resolves the
 *    session of the store the state came from. Two stores composed in the
 *    same process (RN fast refresh, tests, multiple SSR request stores) stay
 *    fully isolated — binding one runtime never reroutes another store's
 *    read side.
 * 2. **Module binding (explicit fallback).** `bindIdentitySessionSource` /
 *    `bindIdentitySessionCore` register a process-wide fallback for callers
 *    that have no store-owned state (legacy test fixtures, minimal stores).
 *    It is a deliberate test/edge seam, never wired by production stores.
 *
 * Environments that never bind (SSR request-local stores, minimal test
 * stores) report a logged-out identity exactly like an empty auth slice used
 * to. There is no module-global Core and no fallback to ambient state.
 */

import type { AccountSessionSnapshot, IdentityUser } from "./types";

/**
 * Symbol under which a store stamps its state with the owning runtime's
 * snapshot reader. `Symbol.for` (not `Symbol`) so the stamp stays readable
 * even if a bundler duplicates this module across chunks.
 */
export const IDENTITY_SESSION_READER = Symbol.for(
  "nolo.identity.sessionReader"
);

export type SessionSnapshotReader = () => AccountSessionSnapshot | null;

let moduleFallbackReader: SessionSnapshotReader | null = null;

export interface IdentitySessionSource {
  getSnapshot(): AccountSessionSnapshot;
}

/**
 * Bind the explicit session runtime that backs the non-React read side
 * (module fallback for callers without store-owned state).
 */
export function bindIdentitySessionSource(
  source: IdentitySessionSource
): void {
  moduleFallbackReader = () => source.getSnapshot();
}

/**
 * Bind a Core directly (convenience for legacy fixtures and minimal stores).
 */
export function bindIdentitySessionCore(core: {
  getSnapshot(): AccountSessionSnapshot;
}): void {
  moduleFallbackReader = () => core.getSnapshot();
}

/** Detach the current module fallback binding (test teardown). */
export function unbindIdentitySessionSource(): void {
  moduleFallbackReader = null;
}

/** Module fallback binding; null when nothing is bound (SSR, minimal stores). */
export function getBoundSessionSnapshot(): AccountSessionSnapshot | null {
  return moduleFallbackReader?.() ?? null;
}

/**
 * Resolve the snapshot for a state object: the owning store's stamped reader
 * first (per-store isolation), then the explicit module fallback, then null
 * (logged out — SSR, minimal stores).
 */
export function getSessionSnapshotForState(
  state: unknown
): AccountSessionSnapshot | null {
  const reader = (state as Record<PropertyKey, unknown> | null | undefined)?.[
    IDENTITY_SESSION_READER
  ];
  if (typeof reader === "function") {
    return (reader as SessionSnapshotReader)();
  }
  return getBoundSessionSnapshot();
}

function stampIdentitySessionReader(
  state: unknown,
  reader: SessionSnapshotReader
): unknown {
  if (!state || typeof state !== "object") return state;
  const record = state as Record<PropertyKey, unknown>;
  if (record[IDENTITY_SESSION_READER] === undefined) {
    try {
      Object.defineProperty(state, IDENTITY_SESSION_READER, {
        value: reader,
        enumerable: false,
        writable: true,
        configurable: true,
      });
    } catch {
      // Frozen/sealed states keep the module fallback semantics.
    }
  }
  return state;
}

/**
 * Per-store binding: wrap the owning store's reducer so every state it
 * produces carries the runtime's snapshot reader. Production stores
 * (`app/store.ts`, `rn/redux/store.ts`) call this once at composition time —
 * never the module fallback.
 */
export function withIdentitySessionReader(
  reducer: (state: any, action: { type: string }) => any,
  source: { getSnapshot(): AccountSessionSnapshot }
): (state: any, action: { type: string }) => any {
  const reader: SessionSnapshotReader = () => source.getSnapshot();
  return (state, action) => {
    const next = reducer(state, action);
    return stampIdentitySessionReader(next, reader);
  };
}

/**
 * Stamp an existing state object (tests, thunk fixtures) with a session
 * snapshot reader. Selectors then resolve identity from this exact state —
 * no module mock needed, and multiple fixtures stay isolated.
 */
export function attachIdentitySessionToState<T>(
  state: T,
  source: { getSnapshot(): AccountSessionSnapshot }
): T {
  return stampIdentitySessionReader(
    state,
    () => source.getSnapshot()
  ) as T;
}

export interface IdentitySnapshotValues {
  userId: string | undefined;
  token: string | null | undefined;
  isLoggedIn: boolean;
  isInitialized: boolean;
  currentUser: IdentityUser | null;
  users: IdentityUser[];
  balance: number | undefined;
}

const LOGGED_OUT: IdentitySnapshotValues = {
  userId: undefined,
  token: null,
  isLoggedIn: false,
  isInitialized: false,
  currentUser: null,
  users: [],
  balance: undefined,
};

/**
 * Shared snapshot → identity mapping. Mirrors the React hook semantics
 * (`useIdentity`): isLoggedIn requires an active account AND token;
 * isInitialized requires the Core to have settled (initialized && idle).
 */
export function identityFromSessionSnapshot(
  snapshot: AccountSessionSnapshot | null
): IdentitySnapshotValues {
  if (!snapshot) return LOGGED_OUT;

  const activeAccount =
    snapshot.accounts.find(
      (account) => account.userId === snapshot.activeAccountId
    ) ?? null;

  return {
    userId: snapshot.activeAccountId ?? undefined,
    token: snapshot.activeToken,
    isLoggedIn: Boolean(snapshot.activeAccountId && snapshot.activeToken),
    isInitialized: snapshot.initialized && snapshot.transition === "idle",
    currentUser: (activeAccount as IdentityUser | null) ?? null,
    users: snapshot.accounts as IdentityUser[],
    balance: activeAccount?.balance,
  };
}
