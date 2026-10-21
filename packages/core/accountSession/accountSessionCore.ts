import { parseToken } from "core/authToken";

export type AccountIdentity = {
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
  adminPermissions?: Record<string, unknown>;
};

export type AccountSessionTransition =
  | "idle"
  | "initializing"
  | "signing-in"
  | "switching"
  | "signing-out";

export type AccountSessionSnapshot = {
  accounts: AccountIdentity[];
  activeAccountId: string | null;
  activeToken: string | null;
  initialized: boolean;
  transition: AccountSessionTransition;
};

export const isAccountIdentity = (value: unknown): value is AccountIdentity =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { userId?: unknown }).userId === "string" &&
  (value as { userId: string }).userId.length > 0;

export const parseUserToken = (token: string): AccountIdentity | null => {
  if (typeof token !== "string" || !token.trim()) return null;
  const parsed = parseToken(token);
  return isAccountIdentity(parsed) ? parsed : null;
};

export interface StoredTokenEntry {
  token: string;
  account: AccountIdentity;
}

export const parseStoredTokenEntries = (
  tokens: readonly string[]
): StoredTokenEntry[] => {
  if (!Array.isArray(tokens)) return [];
  const seenUserIds = new Set<string>();
  const entries: StoredTokenEntry[] = [];

  for (const token of tokens) {
    const account = parseUserToken(token);
    if (!account || seenUserIds.has(account.userId)) continue;
    seenUserIds.add(account.userId);
    entries.push({ token, account });
  }

  return entries;
};

export const compactUniqueAccounts = (
  accounts: readonly (AccountIdentity | null | undefined)[]
): AccountIdentity[] => {
  if (!Array.isArray(accounts)) return [];
  const seenUserIds = new Set<string>();
  const result: AccountIdentity[] = [];

  for (const account of accounts) {
    if (!isAccountIdentity(account) || seenUserIds.has(account.userId)) continue;
    seenUserIds.add(account.userId);
    result.push(account);
  }

  return result;
};

export const mergeAccountState = (
  existingAccount: AccountIdentity | null | undefined,
  nextAccount: AccountIdentity
): AccountIdentity => {
  if (!existingAccount || existingAccount.userId !== nextAccount.userId) {
    return nextAccount;
  }
  return {
    ...existingAccount,
    ...nextAccount,
  };
};

export const findTokenForUser = (
  tokens: readonly string[],
  userId: string
): string | null => {
  if (!Array.isArray(tokens) || !userId) return null;
  for (const token of tokens) {
    const account = parseUserToken(token);
    if (account && account.userId === userId) {
      return token;
    }
  }
  return null;
};

export const promoteAccount = (
  accounts: readonly AccountIdentity[],
  activeId: string
): AccountIdentity[] => {
  const target = accounts.find((a) => a.userId === activeId);
  if (!target) return [...accounts];
  return [target, ...accounts.filter((a) => a.userId !== activeId)];
};

export const buildSessionFromTokens = (
  tokens: readonly string[],
  preferredActiveAccountId?: string | null
): AccountSessionSnapshot => {
  const entries = parseStoredTokenEntries(tokens);
  if (entries.length === 0) {
    return {
      accounts: [],
      activeAccountId: null,
      activeToken: null,
      initialized: true,
      transition: "idle",
    };
  }

  const preferredEntry = preferredActiveAccountId
    ? entries.find((e) => e.account.userId === preferredActiveAccountId)
    : null;
  const activeEntry = preferredEntry ?? entries[0];

  const activeAccount = activeEntry.account;
  const otherAccounts = entries
    .filter((e) => e.account.userId !== activeAccount.userId)
    .map((e) => e.account);

  return {
    accounts: [activeAccount, ...otherAccounts],
    activeAccountId: activeAccount.userId,
    activeToken: activeEntry.token,
    initialized: true,
    transition: "idle",
  };
};

const SSR_SNAPSHOT: AccountSessionSnapshot = Object.freeze({
  accounts: [],
  activeAccountId: null,
  activeToken: null,
  initialized: false,
  transition: "idle",
});

export class AccountSessionCore {
  private snapshot: AccountSessionSnapshot;
  private readonly tokenByUserId = new Map<string, string>();
  private readonly listeners = new Set<() => void>();

  constructor(initial?: Partial<AccountSessionSnapshot>) {
    // Closed invariant (Phase 2): the active pair is only accepted when
    // 1) activeToken parses to a valid account identity,
    // 2) the parsed userId equals activeAccountId, and
    // 3) that account belongs to the accounts list.
    // Anything else normalizes to a legal no-active state (accounts preserved).
    const accounts = compactUniqueAccounts(initial?.accounts ?? []);
    const rawActiveId = initial?.activeAccountId ?? null;
    const rawActiveToken = initial?.activeToken ?? null;
    const parsedActive = rawActiveToken ? parseUserToken(rawActiveToken) : null;
    const hasValidPair =
      typeof rawActiveId === "string" &&
      rawActiveId.length > 0 &&
      parsedActive !== null &&
      parsedActive.userId === rawActiveId &&
      accounts.some((account) => account.userId === rawActiveId);

    this.snapshot = {
      accounts,
      activeAccountId: hasValidPair ? rawActiveId : null,
      activeToken: hasValidPair ? rawActiveToken : null,
      initialized: initial?.initialized ?? false,
      transition: initial?.transition ?? "idle",
    };
    if (hasValidPair && rawActiveId && rawActiveToken) {
      this.tokenByUserId.set(rawActiveId, rawActiveToken);
    }
  }

  getSnapshot = (): AccountSessionSnapshot => {
    return this.snapshot;
  };

  getServerSnapshot = (): AccountSessionSnapshot => {
    return SSR_SNAPSHOT;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private setSnapshot(next: AccountSessionSnapshot): void {
    this.snapshot = next;
    this.emit();
  }

  initializeFromTokens(
    tokens: readonly string[],
    preferredActiveAccountId?: string | null
  ): void {
    const entries = parseStoredTokenEntries(tokens);
    this.tokenByUserId.clear();
    for (const entry of entries) {
      this.tokenByUserId.set(entry.account.userId, entry.token);
    }

    if (entries.length === 0) {
      this.setSnapshot({
        accounts: [],
        activeAccountId: null,
        activeToken: null,
        initialized: true,
        transition: "idle",
      });
      return;
    }

    const preferredEntry = preferredActiveAccountId
      ? entries.find((e) => e.account.userId === preferredActiveAccountId)
      : null;
    const activeEntry = preferredEntry ?? entries[0];

    const accounts = entries.map((entry) => {
      const existing = this.snapshot.accounts.find(
        (a) => a.userId === entry.account.userId
      );
      return mergeAccountState(existing, entry.account);
    });

    const activeAccount = accounts.find(
      (a) => a.userId === activeEntry.account.userId
    ) ?? activeEntry.account;
    const orderedAccounts = [
      activeAccount,
      ...accounts.filter((a) => a.userId !== activeAccount.userId),
    ];

    this.setSnapshot({
      accounts: orderedAccounts,
      activeAccountId: activeAccount.userId,
      activeToken: activeEntry.token,
      initialized: true,
      transition: "idle",
    });
  }

  beginTransition(transition: Exclude<AccountSessionTransition, "idle">): void {
    if (this.snapshot.transition === transition) return;
    this.setSnapshot({
      ...this.snapshot,
      transition,
    });
  }

  /**
   * Activate `token` as the active account and complete the current transition.
   *
   * @returns true when the token was valid and the session moved to it.
   *   Returns false for an invalid token WITHOUT completing the transition or
   *   touching the active identity — callers (the session service) are
   *   responsible for explicitly calling failTransition in that case.
   */
  activateToken(
    token: string,
    accountOverride?: Partial<AccountIdentity> & { userId: string }
  ): boolean {
    const parsed = parseUserToken(token);
    if (!parsed) {
      return false;
    }

    this.tokenByUserId.set(parsed.userId, token);

    const merged = mergeAccountState(
      this.snapshot.accounts.find((a) => a.userId === parsed.userId),
      { ...parsed, ...accountOverride }
    );

    const otherAccounts = this.snapshot.accounts.filter(
      (a) => a.userId !== merged.userId
    );
    const nextAccounts = [merged, ...otherAccounts];

    this.setSnapshot({
      accounts: nextAccounts,
      activeAccountId: merged.userId,
      activeToken: token,
      initialized: true,
      transition: "idle",
    });
    return true;
  }

  completeTransition(): void {
    if (this.snapshot.transition === "idle" && this.snapshot.initialized) return;
    this.setSnapshot({
      ...this.snapshot,
      initialized: true,
      transition: "idle",
    });
  }

  failTransition(): void {
    if (this.snapshot.transition === "idle" && this.snapshot.initialized) return;
    this.setSnapshot({
      ...this.snapshot,
      initialized: true,
      transition: "idle",
    });
  }

  removeAccount(userId: string): void {
    this.tokenByUserId.delete(userId);
    const remainingAccounts = this.snapshot.accounts.filter(
      (a) => a.userId !== userId
    );

    if (this.snapshot.activeAccountId === userId) {
      const nextActive = remainingAccounts.find(
        (a) => Boolean(this.tokenByUserId.get(a.userId))
      );
      if (nextActive) {
        const nextActiveToken = this.tokenByUserId.get(nextActive.userId)!;
        this.setSnapshot({
          accounts: remainingAccounts,
          activeAccountId: nextActive.userId,
          activeToken: nextActiveToken,
          initialized: true,
          transition: "idle",
        });
      } else {
        this.setSnapshot({
          accounts: remainingAccounts,
          activeAccountId: null,
          activeToken: null,
          initialized: true,
          transition: "idle",
        });
      }
    } else {
      this.setSnapshot({
        ...this.snapshot,
        accounts: remainingAccounts,
        transition: "idle",
      });
    }
  }

  replaceActiveToken(token: string): void {
    const parsed = parseUserToken(token);
    if (!parsed) return;
    if (
      this.snapshot.activeAccountId &&
      this.snapshot.activeAccountId !== parsed.userId
    ) {
      return;
    }

    this.tokenByUserId.set(parsed.userId, token);

    const existing = this.snapshot.accounts.find(
      (a) => a.userId === parsed.userId
    );
    const merged = mergeAccountState(existing, parsed);
    const otherAccounts = this.snapshot.accounts.filter(
      (a) => a.userId !== parsed.userId
    );

    this.setSnapshot({
      accounts: [merged, ...otherAccounts],
      activeAccountId: parsed.userId,
      activeToken: token,
      initialized: true,
      transition: "idle",
    });
  }

  updateAccount(
    account: Partial<AccountIdentity> & { userId: string }
  ): void {
    const existingIndex = this.snapshot.accounts.findIndex(
      (a) => a.userId === account.userId
    );
    if (existingIndex === -1) return;

    const existing = this.snapshot.accounts[existingIndex];
    const merged = mergeAccountState(existing, { ...existing, ...account });
    const nextAccounts = [...this.snapshot.accounts];
    nextAccounts[existingIndex] = merged;

    this.setSnapshot({
      ...this.snapshot,
      accounts: nextAccounts,
    });
  }

  deductActiveBalance(cost: number): void {
    if (!this.snapshot.activeAccountId || typeof cost !== "number" || cost <= 0) {
      return;
    }
    const activeId = this.snapshot.activeAccountId;
    const existing = this.snapshot.accounts.find((a) => a.userId === activeId);
    if (!existing || typeof existing.balance !== "number") return;

    this.updateAccount({
      userId: activeId,
      balance: existing.balance - cost,
    });
  }

  reset(): void {
    this.tokenByUserId.clear();
    this.setSnapshot({
      accounts: [],
      activeAccountId: null,
      activeToken: null,
      initialized: false,
      transition: "idle",
    });
  }
}

export const createAccountSessionCore = (
  initial?: Partial<AccountSessionSnapshot>
): AccountSessionCore => new AccountSessionCore(initial);

// Phase 5: the module-global Core singleton is gone. Every runtime (web store,
// RN per-store Core, TUI, SSR request-local stores) creates its Core explicitly
// via `createAccountSessionCore()` and wires it through
// `composeAccountSessionRuntime` — no ambient mutable session state at module
// scope.
