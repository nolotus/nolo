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
import { useAccountSession } from "./session/accountSessionReact";
import { identityFromSessionSnapshot } from "./sessionSource";
import { LOCAL_USER } from "./localUser";
import type { IdentitySnapshot, IdentityUser } from "./types";

export type { IdentitySnapshot, IdentityUser };

export const useIdentity = (): IdentitySnapshot => {
  const values = identityFromSessionSnapshot(useAccountSession());
  return {
    userId: values.userId,
    token: values.token,
    isLoggedIn: values.isLoggedIn,
    isInitialized: values.isInitialized,
    currentUser: values.currentUser,
  };
};

export const useUserId = (): string | undefined =>
  identityFromSessionSnapshot(useAccountSession()).userId;

export const useToken = (): string | null | undefined =>
  identityFromSessionSnapshot(useAccountSession()).token;

export const useIsLoggedIn = (): boolean =>
  identityFromSessionSnapshot(useAccountSession()).isLoggedIn;

/** Display-level fallback: anonymous desktop renders the Local User. */
export const useCurrentUser = (): IdentityUser | null =>
  identityFromSessionSnapshot(useAccountSession()).currentUser ?? LOCAL_USER;

export const useAccounts = (): IdentityUser[] =>
  identityFromSessionSnapshot(useAccountSession()).users;
