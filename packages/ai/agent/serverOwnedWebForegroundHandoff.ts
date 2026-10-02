import type { Message } from "chat/messages/types";

function assistantText(message: Message): string {
  return typeof message.content === "string" ? message.content : "";
}

export function findNewCanonicalAssistant(
  messages: readonly Message[],
  initialMessageIds: ReadonlySet<string>,
  transientId: string,
  expectedText?: string,
): Message | null {
  const transient = messages.find((message) => message?.id === transientId);
  const completedText = expectedText || (transient ? assistantText(transient) : "");

  for (const message of messages) {
    if (!message?.id || message.id === transientId) continue;
    if (initialMessageIds.has(message.id)) continue;
    if (message.role !== "assistant") continue;
    if (message.isStreaming) continue;
    // A local-first cache may be missing an older historical assistant. Remote
    // revalidation can add that row during this handoff, so "new id in Redux"
    // alone is not enough proof. When this turn streamed text, require the
    // canonical row to carry that completed text as well.
    if (completedText && assistantText(message) !== completedText) continue;
    return message;
  }
  return null;
}

export async function waitForNewCanonicalAssistant(args: {
  readMessages: () => readonly Message[];
  initialMessageIds: ReadonlySet<string>;
  transientId: string;
  expectedText?: string;
  timeoutMs?: number;
  pollMs?: number;
}): Promise<Message | null> {
  const timeoutMs = Math.max(0, args.timeoutMs ?? 5_000);
  const pollMs = Math.max(1, args.pollMs ?? 25);
  const deadline = Date.now() + timeoutMs;

  while (true) {
    const canonical = findNewCanonicalAssistant(
      args.readMessages(),
      args.initialMessageIds,
      args.transientId,
      args.expectedText,
    );
    if (canonical) return canonical;
    if (Date.now() >= deadline) return null;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}
