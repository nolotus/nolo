import type { Message } from "chat/messages/types";

export function findNewCanonicalAssistant(
  messages: readonly Message[],
  initialMessageIds: ReadonlySet<string>,
  transientId: string,
): Message | null {
  for (const message of messages) {
    if (!message?.id || message.id === transientId) continue;
    if (initialMessageIds.has(message.id)) continue;
    if (message.role !== "assistant") continue;
    if (message.isStreaming) continue;
    return message;
  }
  return null;
}

export async function waitForNewCanonicalAssistant(args: {
  readMessages: () => readonly Message[];
  initialMessageIds: ReadonlySet<string>;
  transientId: string;
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
    );
    if (canonical) return canonical;
    if (Date.now() >= deadline) return null;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}
