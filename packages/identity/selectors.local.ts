import type { IdentityUser, User } from "./types";

export type { IdentityUser, User };

// Local implementation of identity selectors
// Always returns a fixed single-user setup
const LOCAL_USER_ID = process.env.NOLO_LOCAL_USER_ID || process.env.NOLO_USER_ID || "local";
const LOCAL_USER: IdentityUser = {
  userId: LOCAL_USER_ID,
  username: "Local User",
};

export const selectIdentityUserId = (state: any): string | undefined => LOCAL_USER_ID;

export const selectIdentityToken = (state: any): string | null | undefined => {
  // Local-first builds still surface a server token when the user has logged
  // in (initializeAuth restores it into state.auth.currentToken). Hiding it
  // broke credential sync and any server fetch that relied on useToken().
  if (state?.auth?.currentToken) return state.auth.currentToken as string;
  return undefined;
};

export const selectIdentityIsLoggedIn = (state: any): boolean => true;

export const selectIdentityIsInitialized = (state: any): boolean => true;

export const selectIdentityUser = (state: any): IdentityUser | null => LOCAL_USER;

// balance 是云端专属能力（无账号模式下无意义）。local edition 返回 undefined。
export const selectIdentityUserBalance = (state: any): number | undefined => undefined;
