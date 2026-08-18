export type MessageInputKeyAction =
  | "none"
  | "mention-next"
  | "mention-prev"
  | "mention-select"
  | "mention-close"
  | "send";

export const decideMessageInputKeyAction = ({
  key,
  shiftKey,
  isMobile,
  hasMentionMenu,
  shouldDeferEnterForIme,
}: {
  key: string;
  shiftKey: boolean;
  isMobile: boolean;
  hasMentionMenu: boolean;
  shouldDeferEnterForIme: boolean;
}): MessageInputKeyAction => {
  if (hasMentionMenu) {
    if (key === "ArrowDown") {
      return "mention-next";
    }

    if (key === "ArrowUp") {
      return "mention-prev";
    }

    if (key === "Enter") {
      if (shouldDeferEnterForIme) {
        return "none";
      }
      return "mention-select";
    }

    if (key === "Tab") {
      return "mention-select";
    }

    if (key === "Escape") {
      return "mention-close";
    }
  }

  if (!isMobile && key === "Enter" && !shiftKey && !shouldDeferEnterForIme) {
    return "send";
  }

  return "none";
};

