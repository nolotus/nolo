/** Shared read-only React bridge. Authentication and writes remain in the runtime. */
import { createContext, createElement, useContext, useSyncExternalStore, type ReactElement, type ReactNode } from "react";
import { ReactReduxContext } from "react-redux";
import type { AccountSessionCore, AccountSessionSnapshot } from "core/accountSession";

export const AccountSessionCoreContext = createContext<
  AccountSessionCore | null | undefined
>(undefined);
AccountSessionCoreContext.displayName = "AccountSessionCoreContext";

/** Explicit, Provider-less mounting for runtimes outside a redux Provider. */
export function AccountSessionCoreProvider({
  core,
  children,
}: {
  core: AccountSessionCore;
  children: ReactNode;
}): ReactElement {
  return createElement(
    AccountSessionCoreContext.Provider,
    { value: core },
    children
  );
}

/**
 * Narrow read seam for the react-redux store context. Only the property we
 * actually consume is asserted (`accountSessionRuntime` is a Phase 5 store
 * extension, invisible to react-redux's own types); the context value itself
 * stays at its library-declared shape.
 */
type StoreWithSessionRuntime = {
  accountSessionRuntime?: { core?: AccountSessionCore | null } | null;
};

const subscribeNoop = () => () => {};

const NO_CORE_SNAPSHOT: AccountSessionSnapshot = Object.freeze({
  accounts: [],
  activeAccountId: null,
  activeToken: null,
  initialized: false,
  transition: "idle",
});

/**
 * Resolve the owning Core: explicit arg → provider context → react-redux
 * store context. Null when no runtime owns this render tree.
 */
export function useSessionCore(
  explicit?: AccountSessionCore | null
): AccountSessionCore | null {
  const provided = useContext(AccountSessionCoreContext);
  const store = useContext(ReactReduxContext)?.store as
    | StoreWithSessionRuntime
    | undefined;
  return explicit ?? provided ?? store?.accountSessionRuntime?.core ?? null;
}

function useSessionSnapshotWithCore(
  core: AccountSessionCore | null
): AccountSessionSnapshot {
  return useSyncExternalStore(
    core ? core.subscribe : subscribeNoop,
    core ? core.getSnapshot : () => NO_CORE_SNAPSHOT,
    core ? core.getServerSnapshot : () => NO_CORE_SNAPSHOT
  );
}

export function useAccountSession(
  core?: AccountSessionCore | null
): AccountSessionSnapshot {
  return useSessionSnapshotWithCore(useSessionCore(core));
}

export function useActiveToken(
  core?: AccountSessionCore | null
): string | null {
  return useAccountSession(core).activeToken;
}
