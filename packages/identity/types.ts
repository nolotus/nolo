export interface IdentityUser {
  userId: string;
  username?: string;
  name?: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  locale?: string;
  publicKey?: string;
  tokenVersion?: number;
}

export type User = IdentityUser;

export interface IdentitySnapshot {
  userId: string | undefined;
  token: string | null | undefined;
  isLoggedIn: boolean;
  isInitialized: boolean;
  currentUser: IdentityUser | null;
}
