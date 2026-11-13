export type IncompleteBrowserTurnMessage = {
  id?: string;
  dbKey?: string;
  role?: string;
  content?: unknown;
  metadata?: { queueState?: string; userBatchPhase?: string };
};

export type IncompleteBrowserTurnInput = {
  messages: IncompleteBrowserTurnMessage[];
  isLoadingInitial: boolean;
  hasLocalOwner: boolean;
  recoveredForegroundTurn: string | null | undefined;
};

/**
 * Temporary stopgap for the browser-owned /api/v1/chat path.
 *
 * User messages are persisted before the browser starts the provider turn. If
 * the page disappears before an assistant/tool row is durably written, the
 * persisted conversation ends with a user row and there is no execution owner
 * to recover. That is enough to surface an explicit "reply interrupted" state
 * without adding a second turn-state schema that will be removed when normal
 * Web chat migrates to server-owned foreground execution.
 */
export function deriveIncompleteBrowserTurn(
  input: IncompleteBrowserTurnInput,
): IncompleteBrowserTurnMessage | null {
  if (
    input.isLoadingInitial ||
    input.hasLocalOwner ||
    input.recoveredForegroundTurn === "running"
  ) {
    return null;
  }

  for (let index = input.messages.length - 1; index >= 0; index -= 1) {
    const message = input.messages[index];
    if (!message) continue;
    if (message.role !== "user" && message.role !== "assistant" && message.role !== "tool") {
      continue;
    }
    if (message.role !== "user") return null;
    // Queued input is durable, but is not evidence that a provider turn began.
    // Do not scan past it: that could resurrect an older completed turn.
    if (message.metadata?.queueState === "pending" &&
        !["admitted", "requested"].includes(message.metadata?.userBatchPhase ?? "")) {
      return null;
    }
    return message;
  }

  return null;
}
