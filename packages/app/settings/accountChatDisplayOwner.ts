import { useCallback, useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { useSelector, useStore } from "react-redux";
import { selectIdentityUserId } from "identity/selectors";

// Layout effect on the web (sync binding before paint), passive effect where
// there is no DOM (React Native, SSR): React warns about useLayoutEffect during
// server rendering, and RN compiles this same module.
const useIdentitySyncEffect =
  typeof document !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Account-owned chat presentation preferences. Does not depend on Redux.
 * A new identity receives defaults until its own cloud snapshot is hydrated.
 */
export type AccountChatDisplayPreferences = Readonly<{
  showThinking: boolean;
  showScrollToTopButton: boolean;
  showScrollToBottomButton: boolean;
}>;

export const DEFAULT_ACCOUNT_CHAT_DISPLAY_PREFERENCES: AccountChatDisplayPreferences =
  Object.freeze({
    showThinking: true,
    showScrollToTopButton: false,
    showScrollToBottomButton: false,
  });

export const createAccountChatDisplayOwner = () => {
  let accountId: string | null = null;
  let snapshot = DEFAULT_ACCOUNT_CHAT_DISPLAY_PREFERENCES;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  return {
    getAccountId: () => accountId,
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    setAccount: (nextAccountId: string | null) => {
      if (accountId === nextAccountId) return;
      accountId = nextAccountId;
      snapshot = DEFAULT_ACCOUNT_CHAT_DISPLAY_PREFERENCES;
      emit();
    },
    updateForAccount: (
      expectedAccountId: string,
      changes: Partial<AccountChatDisplayPreferences>,
    ): boolean => {
      if (!expectedAccountId || expectedAccountId !== accountId) return false;
      const next = { ...snapshot, ...changes };
      if (
        next.showThinking === snapshot.showThinking &&
        next.showScrollToTopButton === snapshot.showScrollToTopButton &&
        next.showScrollToBottomButton === snapshot.showScrollToBottomButton
      ) return true;
      snapshot = Object.freeze(next);
      emit();
      return true;
    },
  };
};

export type AccountChatDisplayOwner = ReturnType<typeof createAccountChatDisplayOwner>;

export function useAccountChatDisplaySnapshot(owner: AccountChatDisplayOwner) {
  return useSyncExternalStore(
    owner.subscribe,
    owner.getSnapshot,
    () => DEFAULT_ACCOUNT_CHAT_DISPLAY_PREFERENCES,
  );
}

// One owner per Redux store during migration; never share accounts across roots.
const owners = new WeakMap<Function, AccountChatDisplayOwner>();
export function getAccountChatDisplayOwner(getState: Function): AccountChatDisplayOwner {
  let owner = owners.get(getState);
  if (!owner) {
    owner = createAccountChatDisplayOwner();
    owners.set(getState, owner);
  }
  return owner;
}

export function pickAccountChatDisplayPreferences(value: Record<string, unknown>): Partial<AccountChatDisplayPreferences> {
  const result: Partial<Record<keyof AccountChatDisplayPreferences, boolean>> = {};
  for (const key of ["showThinking", "showScrollToTopButton", "showScrollToBottomButton"] as const) {
    if (typeof value[key] === "boolean") result[key] = value[key] as boolean;
  }
  return result;
}

export function useAccountChatDisplayPreferences(): AccountChatDisplayPreferences {
  const store = useStore();
  const userId = useSelector(selectIdentityUserId);
  const owner = getAccountChatDisplayOwner(store.getState);
  const accountId = userId ?? null;

  // Render phase stays pure: it only derives a value from the owner, it never
  // moves the owner to another account. While the owner still belongs to a
  // previous identity (before the commit-phase sync below ran), the frame shows
  // defaults — the previous account's values are never rendered for a new one.
  const readPreferences = useCallback(
    (): AccountChatDisplayPreferences =>
      owner.getAccountId() === accountId
        ? owner.getSnapshot()
        : DEFAULT_ACCOUNT_CHAT_DISPLAY_PREFERENCES,
    [owner, accountId],
  );
  const preferences = useSyncExternalStore(
    owner.subscribe,
    readPreferences,
    () => DEFAULT_ACCOUNT_CHAT_DISPLAY_PREFERENCES,
  );

  // Commit phase owns the identity switch. Same account is a no-op inside
  // `setAccount`, so this never fights the hydrate path
  // (`settingThunks.ts` → owner.setAccount(userId) + updateForAccount) and
  // never resets an already hydrated snapshot.
  useIdentitySyncEffect(() => {
    // Re-read the committed identity instead of trusting the render closure: a
    // commit whose identity has since been replaced must never move the owner
    // back to the account it saw (that would reset the newer account's snapshot
    // to defaults). The render that carries the current identity runs its own
    // effect, so skipping here cannot leave the owner unsynced.
    if ((selectIdentityUserId(store.getState()) ?? null) !== accountId) return;
    owner.setAccount(accountId);
  }, [owner, accountId, store]);

  return preferences;
}
