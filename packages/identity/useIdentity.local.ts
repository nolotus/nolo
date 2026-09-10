import type { IdentitySnapshot, IdentityUser, User } from "./types";

export type { IdentitySnapshot, IdentityUser, User };

const LOCAL_USER_ID =
  (typeof process !== "undefined" ? process.env?.NOLO_LOCAL_USER_ID : undefined) ||
  (typeof process !== "undefined" ? process.env?.NOLO_USER_ID : undefined) ||
  "local";
const LOCAL_USER: IdentityUser = {
  userId: LOCAL_USER_ID,
  username: "Local User",
};

export const useIdentity = (): IdentitySnapshot => ({
  userId: LOCAL_USER_ID,
  token: undefined,
  isLoggedIn: true,
  isInitialized: true,
  currentUser: LOCAL_USER,
});

export const useUserId = (): string | undefined => LOCAL_USER_ID;

export const useToken = (): string | null | undefined => undefined;

export const useIsLoggedIn = (): boolean => true;

export const useCurrentUser = (): IdentityUser | null => LOCAL_USER;

export const useAccounts = (): IdentityUser[] => [LOCAL_USER];
