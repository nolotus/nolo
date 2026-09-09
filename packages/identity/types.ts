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
  balance?: number;
  gptProAccess?: {
    status?: string;
    requiredRechargeAmount?: number;
    rechargeAmount?: number;
    source?: string;
    sourceTxId?: string;
    grantedAt?: number;
    updatedAt?: number;
  };
}

export type User = IdentityUser;

export interface IdentitySnapshot {
  userId: string | undefined;
  token: string | null | undefined;
  isLoggedIn: boolean;
  isInitialized: boolean;
  currentUser: IdentityUser | null;
}

// ---------------------------------------------------------------------------
// Account Session 弱化镜像类型
//
// ⚠️ 以 auth/session 为单一真值源，此处接口仅用于解耦公开包（identity/sessionSource、
// accountSessionStore、updateTokensAction）与私有 auth 包的类型依赖，勿单方面扩展。
// ---------------------------------------------------------------------------

export type AccountSessionTransition =
  | "idle"
  | "initializing"
  | "signing-in"
  | "switching"
  | "signing-out";

export interface AccountSessionSnapshot {
  accounts: IdentityUser[];
  activeAccountId: string | null;
  activeToken: string | null;
  initialized: boolean;
  transition?: AccountSessionTransition | string;
}

export interface AccountSessionService {
  deductBalance(cost: number): void;
  [key: string]: any;
}

export interface AccountSessionRuntime {
  core?: any;
  service?: any;
  dispose?: () => void;
}
