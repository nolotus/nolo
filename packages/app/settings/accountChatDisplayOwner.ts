import { useSyncExternalStore } from "react";

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
