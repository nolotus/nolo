// Desktop edition identity hooks (nolo-desktop condition).
//
// Session-aware replacement for useIdentity.local: reads the SAME
// core/accountSession snapshot the desktop store composes (see
// storeSession.desktop), resolving the Core through the react-redux store
// context (`store.accountSessionRuntime.core`) — without importing the
// private auth package (public boundary).
//
// Contract:
// - Real session semantics: anonymous desktop reports isLoggedIn=false — it is
//   a first-class state, never a fabricated cloud login.
// - Display fallback only: useCurrentUser() returns the pinned Local User when
//   no account is active, so the Topbar shows "Local User" while the local
//   workspace stays usable without any sign-in gate.
import { useContext, useSyncExternalStore } from "react";
import { ReactReduxContext } from "react-redux";
import type {
  AccountSessionCore,
  AccountSessionSnapshot,
} from "core/accountSession";
import { identityFromSessionSnapshot } from "./sessionSource";
import { LOCAL_USER } from "./localUser";
import type { IdentitySnapshot, IdentityUser } from "./types";

export type { IdentitySnapshot, IdentityUser };

const subscribeNoop = () => () => {};

const NO_CORE_SNAPSHOT: AccountSessionSnapshot = Object.freeze({
  accounts: [],
  activeAccountId: null,
  activeToken: null,
  initialized: false,
  transition: "idle",
});

type StoreWithSessionRuntime = {
  accountSessionRuntime?: { core?: AccountSessionCore | null } | null;
};

/** Resolve the owning Core from the react-redux store context (SSR-safe). */
function useSessionCore(): AccountSessionCore | null {
  const store = useContext(ReactReduxContext)?.store as
    | StoreWithSessionRuntime
    | undefined;
  return store?.accountSessionRuntime?.core ?? null;
}

function useSessionSnapshot(): AccountSessionSnapshot {
  const core = useSessionCore();
  return useSyncExternalStore(
    core ? core.subscribe : subscribeNoop,
    core ? core.getSnapshot : () => NO_CORE_SNAPSHOT,
    core ? core.getServerSnapshot : () => NO_CORE_SNAPSHOT
  );
}

export const useIdentity = (): IdentitySnapshot => {
  const values = identityFromSessionSnapshot(useSessionSnapshot());
  return {
    userId: values.userId,
    token: values.token,
    isLoggedIn: values.isLoggedIn,
    isInitialized: values.isInitialized,
    currentUser: values.currentUser,
  };
};

export const useUserId = (): string | undefined =>
  identityFromSessionSnapshot(useSessionSnapshot()).userId;

export const useToken = (): string | null | undefined =>
  identityFromSessionSnapshot(useSessionSnapshot()).token;

export const useIsLoggedIn = (): boolean =>
  identityFromSessionSnapshot(useSessionSnapshot()).isLoggedIn;

/** Display-level fallback: anonymous desktop renders the Local User. */
export const useCurrentUser = (): IdentityUser | null =>
  identityFromSessionSnapshot(useSessionSnapshot()).currentUser ?? LOCAL_USER;

export const useAccounts = (): IdentityUser[] =>
  identityFromSessionSnapshot(useSessionSnapshot()).users;
