import type { IdentityUser } from "./types";
import {
  getSessionSnapshotForState,
  identityFromSessionSnapshot,
} from "./sessionSource";
import { LOCAL_USER, LOCAL_USER_ID } from "./localUser";

// Desktop edition identity selectors (nolo-desktop condition).
//
// Session-first like the cloud edition, with the desktop anonymous fallback:
// an unbound runtime (minimal stores / scripts) reads as the pinned Local
// User, while a bound-but-anonymous session reports a real logged-out state.
// 余额只显示服务端 profile 返回值（identityFromSessionSnapshot 映射
// activeAccount.balance），桌面端不做任何本地余额计算。

export const selectIdentityUserId = (state: unknown): string | undefined => {
  const snapshot = getSessionSnapshotForState(state);
  if (snapshot) return snapshot.activeAccountId ?? undefined;
  return LOCAL_USER_ID;
};

export const selectIdentityToken = (
  state: unknown
): string | null | undefined =>
  getSessionSnapshotForState(state)?.activeToken ?? undefined;

export const selectIdentityIsLoggedIn = (state: unknown): boolean => {
  const snapshot = getSessionSnapshotForState(state);
  return Boolean(snapshot?.activeAccountId && snapshot.activeToken);
};

export const selectIdentityIsInitialized = (state: unknown): boolean =>
  getSessionSnapshotForState(state)?.initialized ?? false;

export const selectIdentityUser = (state: unknown): IdentityUser | null => {
  const snapshot = getSessionSnapshotForState(state);
  if (snapshot) {
    const active = snapshot.accounts.find(
      (account) => account.userId === snapshot.activeAccountId
    );
    return (active as IdentityUser | null) ?? null;
  }
  return LOCAL_USER;
};

export const selectIdentityUserBalance = (state: unknown): number | undefined =>
  identityFromSessionSnapshot(getSessionSnapshotForState(state)).balance;
