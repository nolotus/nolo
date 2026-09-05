export type MessageInputKeyAction =
  | "none"
  | "suggestion-next"
  | "suggestion-prev"
  | "suggestion-select"
  | "suggestion-close"
  | "send";

/**
 * Suggestion-surface-generic key decision for the composer textarea.
 * Arrow/Enter/Tab/Escape route to the unified suggestion actions while the
 * surface is open, regardless of whether the active provider is an agent
 * @mention or a slash command. IME-deferred Enter, modal ownership and the
 * mobile Enter behavior are unchanged.
 */
export const decideMessageInputKeyAction = ({
  key,
  shiftKey,
  isMobile,
  hasSuggestionMenu,
  shouldDeferEnterForIme,
  hasActiveModal = false,
}: {
  key: string;
  shiftKey: boolean;
  isMobile: boolean;
  hasSuggestionMenu: boolean;
  shouldDeferEnterForIme: boolean;
  hasActiveModal?: boolean;
}): MessageInputKeyAction => {
  if (hasActiveModal && key === "Enter" && !shiftKey) {
    return "none";
  }

  if (hasSuggestionMenu) {
    if (key === "ArrowDown") {
      return "suggestion-next";
    }

    if (key === "ArrowUp") {
      return "suggestion-prev";
    }

    if (key === "Enter") {
      if (shouldDeferEnterForIme) {
        return "none";
      }
      return "suggestion-select";
    }

    if (key === "Tab") {
      return "suggestion-select";
    }

    if (key === "Escape") {
      return "suggestion-close";
    }
  }

  if (!isMobile && key === "Enter" && !shiftKey && !shouldDeferEnterForIme) {
    return "send";
  }

  return "none";
};
