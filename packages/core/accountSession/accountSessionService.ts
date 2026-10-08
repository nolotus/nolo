/**
 * AccountSessionService — the session orchestration owner (Phase 2).
 *
 * Pure TypeScript (no React / no Redux). Owns the full lifecycle for the
 * account session and pushes every committed change into the bound
 * {@link AccountSessionCore}; there is no Redux mirror (the Phase 5
 * projection was deleted — read sides consume the Core directly).
 *
 * Reused seams (no new abstractions):
 * - `TokenManager` (auth/types) — token persistence; tokens[0] is the cookie
 *   source on web, so keep / restore ordering through it.
 * - `authenticate` / `signUpWithApi` ports — the existing Auth API (crypto +
 *   network) implementations live in `auth/client/passwordSignIn.ts` and
 *   `auth/action/signUpAction.ts`.
 * - `resetRuntime` port — `resetAuthScopedClientState` (chat/space/sync purge).
 *
 * Preserved behavioral contracts:
 * - A→B ordering: sign-in / switch clears the previous account's runtime state
 *   BEFORE persisting the new token.
 * - switchAccount fails BEFORE any side effect (reset / token reorder) when the
 *   target account has no stored token.
 * - signOut next active is deterministic: remaining tokens[0] after removing
 *   the active token (cookie follows tokens[0]).
 * - replaceActiveToken keeps remove(current)→store(next) ordering.
 */

import type { TokenManager } from "./authTypes";
import {
  parseStoredTokenEntries,
  parseUserToken,
  type AccountIdentity,
  type AccountSessionCore,
  type AccountSessionSnapshot,
} from "./accountSessionCore";

export interface SessionSignInInput {
  username: string;
  password: string;
  locale: string;
  localeCandidates?: string[];
}

export interface SessionSignUpInput {
  username: string;
  password: string;
  locale: string;
  email?: string;
  inviterId?: string;
}

export interface SessionAuthResult {
  token: string;
  account?: AccountIdentity | null;
}

export interface SessionInitializeResult {
  tokens: string[];
  activeAccountId: string | null;
  activeToken: string | null;
}

/** Auth API port: credential exchange over the network (crypto + request). */
export type SessionAuthenticator = (
  input: SessionSignInInput
) => Promise<SessionAuthResult>;

/** Auth API port: account registration; returns the signed session token. */
export type SessionSignUpApi = (
  input: SessionSignUpInput
) => Promise<SessionAuthResult>;

/** RuntimeReset port: clears account-scoped client state (chat/space/sync). */
export type SessionRuntimeReset = () => Promise<void> | void;

export interface AccountSessionServiceDeps {
  core: AccountSessionCore;
  tokenManager: TokenManager;
  authenticate: SessionAuthenticator;
  signUpWithApi?: SessionSignUpApi;
  resetRuntime?: SessionRuntimeReset;
}

export class AccountSessionService {
  private readonly deps: AccountSessionServiceDeps;

  constructor(deps: AccountSessionServiceDeps) {
    this.deps = deps;
  }

  get core(): AccountSessionCore {
    return this.deps.core;
  }

  getSnapshot(): AccountSessionSnapshot {
    return this.deps.core.getSnapshot();
  }

  /**
   * Load stored tokens, purge invalid entries from the store, and commit the
   * surviving session into the Core. tokens[0] stays the active account.
   */
  async initialize(): Promise<SessionInitializeResult> {
    this.deps.core.beginTransition("initializing");
    try {
      const tokens = await this.deps.tokenManager.initTokens();
      const entries = parseStoredTokenEntries(tokens ?? []);

      if (entries.length !== (tokens?.length ?? 0)) {
        const invalidTokens = (tokens ?? []).filter(
          (token) => !entries.some((entry) => entry.token === token)
        );
        // Sequential: tokenManager.removeToken is read-modify-write on a
        // shared list (web localStorage / RN Keychain); parallel removes race.
        for (const invalidToken of invalidTokens) {
          await this.deps.tokenManager.removeToken(invalidToken);
        }
      }

      const validTokens = entries.map((entry) => entry.token);
      this.deps.core.initializeFromTokens(validTokens);

      const snapshot = this.deps.core.getSnapshot();
      return {
        tokens: validTokens,
        activeAccountId: snapshot.activeAccountId,
        activeToken: snapshot.activeToken,
      };
    } catch (error) {
      this.deps.core.failTransition();
      throw error;
    }
  }

  /** Network sign-in, then persist + activate. A→B ordering preserved. */
  async signIn(input: SessionSignInInput): Promise<SessionAuthResult> {
    this.deps.core.beginTransition("signing-in");
    try {
      const result = await this.deps.authenticate(input);
      await this.persistAndActivate(result.token, result.account);
      return result;
    } catch (error) {
      this.deps.core.failTransition();
      throw error;
    }
  }

  /** Network registration, then persist + activate (same contract as signIn). */
  async signUp(input: SessionSignUpInput): Promise<SessionAuthResult> {
    if (!this.deps.signUpWithApi) {
      throw new Error("sign_up_unavailable");
    }
    this.deps.core.beginTransition("signing-in");
    try {
      const result = await this.deps.signUpWithApi(input);
      await this.persistAndActivate(result.token, result.account);
      return result;
    } catch (error) {
      this.deps.core.failTransition();
      throw error;
    }
  }

  /**
   * Switch to an already-stored account. Fails fast (before reset / token
   * reorder) when the target has no stored token, so the previous active
   * account survives unchanged in both Core and token storage.
   */
  async switchAccount(userId: string): Promise<SessionAuthResult> {
    this.deps.core.beginTransition("switching");
    try {
      const tokens = await this.deps.tokenManager.getTokens();
      const targetToken =
        tokens.find((token) => parseUserToken(token)?.userId === userId) ?? null;

      if (!targetToken) {
        throw new Error("Token not found for user");
      }

      await this.deps.resetRuntime?.();

      // Move the target token to the front: tokens[0] is the new active
      // account and the web cookie follows tokens[0].
      await this.deps.tokenManager.removeToken(targetToken);
      await this.deps.tokenManager.storeToken(targetToken);

      if (!this.deps.core.activateToken(targetToken)) {
        throw new Error("invalid_session_token");
      }

      return { token: targetToken, account: parseUserToken(targetToken) };
    } catch (error) {
      this.deps.core.failTransition();
      throw error;
    }
  }

  /**
   * Sign the active account out. Next active is deterministic: the first
   * surviving token (tokens[0]); the last sign-out leaves no active session.
   */
  async signOut(): Promise<{ tokens: string[] }> {
    this.deps.core.beginTransition("signing-out");
    try {
      const snapshotBefore = this.deps.core.getSnapshot();
      const activeToken = snapshotBefore.activeToken;

      await this.deps.resetRuntime?.();

      if (activeToken) {
        await this.deps.tokenManager.removeToken(activeToken);
      }
      const remainingTokens = await this.deps.tokenManager.getTokens();

      this.deps.core.initializeFromTokens(remainingTokens);

      // Profile enrichment (balance / gptProAccess / adminPermissions) is not
      // part of the token payload; re-apply it for accounts that survived.
      for (const prior of snapshotBefore.accounts) {
        if (
          remainingTokens.some(
            (token) => parseUserToken(token)?.userId === prior.userId
          )
        ) {
          this.deps.core.updateAccount(profileEnrichment(prior));
        }
      }

      return { tokens: remainingTokens };
    } catch (error) {
      this.deps.core.failTransition();
      throw error;
    }
  }

  /**
   * Rotate the active account's token (session revoke flow). Keeps the
   * remove(current) → store(next) ordering; no transition is opened (this is
   * not an identity change).
   */
  async replaceActiveToken(token: string): Promise<void> {
    const parsed = parseUserToken(token);
    if (!parsed) {
      throw new Error("invalid_session_token");
    }
    const snapshot = this.deps.core.getSnapshot();
    if (
      snapshot.activeAccountId &&
      snapshot.activeAccountId !== parsed.userId
    ) {
      throw new Error("replace_token_user_mismatch");
    }

    if (snapshot.activeToken) {
      await this.deps.tokenManager.removeToken(snapshot.activeToken);
    }
    await this.deps.tokenManager.storeToken(token);
    this.deps.core.replaceActiveToken(token);
  }

  /** Write a profile refresh (balance / gptProAccess / …) into the Core. */
  updateAccountProfile(profile: Partial<AccountIdentity> & { userId: string }): void {
    this.deps.core.updateAccount(profile);
  }

  /** Optimistic local balance deduction for the active account. */
  deductBalance(cost: number): void {
    this.deps.core.deductActiveBalance(cost);
  }

  /**
   * Shared tail of signIn/signUp: validate the token, clear the previous
   * account's runtime state, persist, and activate. An invalid token fails
   * BEFORE reset/persist and leaves the Core untouched (the caller's catch
   * then fails the transition explicitly).
   */
  private async persistAndActivate(
    token: string,
    account?: AccountIdentity | null
  ): Promise<void> {
    if (!parseUserToken(token)) {
      throw new Error("invalid_session_token");
    }
    await this.deps.resetRuntime?.();
    await this.deps.tokenManager.storeToken(token);
    const activated = this.deps.core.activateToken(token, account ?? undefined);
    if (!activated) {
      throw new Error("invalid_session_token");
    }
  }
}

/** Only the non-token-derived profile fields worth carrying across sign-out. */
const profileEnrichment = (
  account: AccountIdentity
): Partial<AccountIdentity> & { userId: string } => {
  const enrichment: Partial<AccountIdentity> & { userId: string } = {
    userId: account.userId,
  };
  if (account.balance !== undefined) enrichment.balance = account.balance;
  if (account.gptProAccess !== undefined) {
    enrichment.gptProAccess = account.gptProAccess;
  }
  if (account.adminPermissions !== undefined) {
    enrichment.adminPermissions = account.adminPermissions;
  }
  return enrichment;
};
