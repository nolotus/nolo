import type { IdentityUser, User } from "./types";
import { getSessionSnapshotForState } from "./sessionSource";

export type { IdentityUser, User };

// Local implementation of identity selectors
// Always returns a fixed single-user setup
const LOCAL_USER_ID =
  (typeof process !== "undefined" ? process.env?.NOLO_LOCAL_USER_ID : undefined) ||
  (typeof process !== "undefined" ? process.env?.NOLO_USER_ID : undefined) ||
  "local";
const LOCAL_USER: IdentityUser = {
  userId: LOCAL_USER_ID,
  username: "Local User",
};

export const selectIdentityUserId = (state: any): string | undefined => {
  // A bound/stamped session wins — including the logged-out bound state
  // (activeAccountId null → undefined). Only a completely unbound runtime
  // (local CLI/scripts, minimal stores) falls back to the pinned local user.
  const snapshot = getSessionSnapshotForState(state);
  if (snapshot) return snapshot.activeAccountId ?? undefined;
  return LOCAL_USER_ID;
};

export const selectIdentityToken = (state: any): string | null | undefined => {
  // Local-first builds still surface a server token when the user has logged
  // in (initialize restores it into the bound AccountSessionCore). Hiding it
  // broke credential sync and any server fetch that relied on useToken().
  // Resolve via the state-stamped per-store reader first; the module binding
  // is only a fallback for stateless fixtures.
  return getSessionSnapshotForState(state)?.activeToken ?? undefined;
};

export const selectIdentityIsLoggedIn = (state: any): boolean => true;

export const selectIdentityIsInitialized = (state: any): boolean => true;

export const selectIdentityUser = (state: any): IdentityUser | null => {
  // Surface the logged-in account when a session is bound (see
  // selectIdentityUserId); the pinned local user is the unbound default.
  const snapshot = getSessionSnapshotForState(state);
  if (snapshot) {
    const active = snapshot.accounts.find(
      (account) => account.userId === snapshot.activeAccountId
    );
    return (active as IdentityUser | null) ?? null;
  }
  return LOCAL_USER;
};

// balance 是云端专属能力（无账号模式下无意义）。local edition 返回 undefined。
export const selectIdentityUserBalance = (state: any): number | undefined => undefined;
