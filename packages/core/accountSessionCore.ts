import { parseToken } from "./authToken";

export interface SessionAccount {
  readonly userId: string;
  readonly token: string;
}

export interface ActiveSessionProjection {
  readonly activeAccountId: string | null;
  readonly activeToken: string | null;
}

export interface AccountSessionSnapshot extends ActiveSessionProjection {
  readonly accounts: readonly SessionAccount[];
  readonly initialized: boolean;
}

/** Minimal persistence seam; storage and platform concerns stay outside the core. */
export interface TokenStore {
  getTokens(): Promise<readonly string[]>;
  storeToken(token: string): Promise<void>;
  removeToken(token: string): Promise<void>;
}

/** Optional hook for clearing runtime state when the active account changes. */
export interface ActiveAccountRuntimeReset {
  reset(previousAccountId: string | null, nextAccountId: string | null): void;
}

export type AccountSessionListener = (
  snapshot: AccountSessionSnapshot,
) => void;

function tokenAccount(token: string): SessionAccount | null {
  if (!token.trim()) return null;
  const parsed = parseToken(token);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as { userId?: unknown }).userId !== "string"
  ) {
    return null;
  }
  const userId = (parsed as { userId: string }).userId.trim();
  return userId ? { userId, token } : null;
}

/** Build the de-duplicated account projection from raw auth tokens. */
export function accountsFromTokens(
  tokens: readonly string[],
): SessionAccount[] {
  const accounts: SessionAccount[] = [];
  const indexByUserId = new Map<string, number>();
  for (const token of tokens) {
    if (typeof token !== "string") continue;
    const account = tokenAccount(token);
    if (!account) continue;
    const existingIndex = indexByUserId.get(account.userId);
    if (existingIndex === undefined) {
      indexByUserId.set(account.userId, accounts.length);
      accounts.push(account);
    } else {
      accounts[existingIndex] = account;
    }
  }
  return accounts;
}

/** Return the current token for a user, or null when that user is absent. */
export function tokenForUserId(
  accounts: readonly SessionAccount[],
  userId: string,
): string | null {
  return accounts.find((account) => account.userId === userId)?.token ?? null;
}

function cloneSnapshot(snapshot: AccountSessionSnapshot): AccountSessionSnapshot {
  return {
    activeAccountId: snapshot.activeAccountId,
    activeToken: snapshot.activeToken,
    initialized: snapshot.initialized,
    accounts: snapshot.accounts.map((account) => ({ ...account })),
  };
}

export class AccountSessionCore {
  private current: AccountSessionSnapshot = {
    activeAccountId: null,
    activeToken: null,
    accounts: [],
    initialized: false,
  };
  private readonly listeners = new Set<AccountSessionListener>();

  constructor(private readonly runtimeReset?: ActiveAccountRuntimeReset) {}

  getSnapshot(): AccountSessionSnapshot {
    return cloneSnapshot(this.current);
  }

  /** Compatibility alias for callers using the earlier Phase 1 name. */
  snapshot(): AccountSessionSnapshot {
    return this.getSnapshot();
  }

  subscribe(listener: AccountSessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Hydrate once or replace the token set while retaining the first account as active. */
  initialize(tokens: readonly string[]): AccountSessionSnapshot {
    const accounts = accountsFromTokens(tokens);
    const active = accounts[0] ?? null;
    return this.commit({
      accounts,
      activeAccountId: active?.userId ?? null,
      activeToken: active?.token ?? null,
      initialized: true,
    });
  }

  /** Add or replace one account and make it active. An empty token clears the session. */
  setSession(token: string): AccountSessionSnapshot {
    const account = tokenAccount(token);
    if (!account) return this.clearSession();

    const accounts = this.current.accounts.filter(
      (candidate) => candidate.userId !== account.userId,
    );
    accounts.push(account);
    return this.commit({
      accounts,
      activeAccountId: account.userId,
      activeToken: account.token,
      initialized: this.current.initialized,
    });
  }

  promote(userId: string): AccountSessionSnapshot {
    const index = this.current.accounts.findIndex(
      (account) => account.userId === userId,
    );
    if (index < 0) return this.snapshot();
    const account = this.current.accounts[index];
    return this.commit({
      ...this.current,
      activeAccountId: account.userId,
      activeToken: account.token,
    });
  }

  clearSession(): AccountSessionSnapshot {
    return this.commit({
      accounts: [],
      activeAccountId: null,
      activeToken: null,
      initialized: this.current.initialized,
    });
  }

  private commit(next: AccountSessionSnapshot): AccountSessionSnapshot {
    const previous = this.current;
    this.current = {
      ...next,
      accounts: next.accounts.map((account) => ({ ...account })),
    };
    if (previous.activeAccountId !== this.current.activeAccountId) {
      this.runtimeReset?.reset(
        previous.activeAccountId,
        this.current.activeAccountId,
      );
    }
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
    return snapshot;
  }
}
