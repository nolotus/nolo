import { createContext, useContext } from "react";

interface ChatDisplayContextValue {
  /** When true, AppDeployCard starts collapsed (no iframe) */
  compactDeployCards: boolean;
}

export const ChatDisplayContext = createContext<ChatDisplayContextValue>({
  compactDeployCards: false,
});

export function useChatDisplayContext() {
  return useContext(ChatDisplayContext);
}
