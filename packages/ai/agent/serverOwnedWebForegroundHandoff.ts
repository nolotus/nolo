import type { Message } from "chat/messages/types";

function normalizeComparableText(value: unknown): string {
  if (typeof value === "string") {
    return value.replace(/\r\n/g, "\n").trimEnd();
  }
  if (!Array.isArray(value)) return "";
  return value
    .flatMap((part) => {
      if (!part || typeof part !== "object") return [];
      const record = part as Record<string, unknown>;
      if (record.type === "text" && typeof record.text === "string") {
        return [record.text];
      }
      return [];
    })
    .join("")
    .replace(/\r\n/g, "\n")
    .trimEnd();
}

function assistantText(message: Message): string {
  return normalizeComparableText(message.content);
}

function assistantThinking(message: Message): string {
  const value =
    typeof (message as any).thinkContent === "string"
      ? (message as any).thinkContent
      : typeof (message as any).reasoning_content === "string"
        ? (message as any).reasoning_content
        : "";
  return normalizeComparableText(value);
}

function assistantAgentKey(message: Message): string {
  const value = (message as any).agentKey ?? (message as any).cybotKey;
  return typeof value === "string" ? value : "";
}

export function findNewCanonicalAssistant(
  messages: readonly Message[],
  initialMessageIds: ReadonlySet<string>,
  transientId: string,
  expectedText?: string,
  expectedThinking?: string,
  expectedAgentKey?: string,
): Message | null {
  const transient = messages.find((message) => message?.id === transientId);
  // Empty string is a meaningful final-segment fingerprint (for example a
  // thinking-only assistant after a tool boundary). Only `undefined` means the
  // caller did not provide an explicit segment value and should fall back to the
  // live transient.
  const completedText = normalizeComparableText(
    expectedText !== undefined
      ? expectedText
      : transient
        ? assistantText(transient)
        : "",
  );
  const completedThinking = normalizeComparableText(
    expectedThinking !== undefined
      ? expectedThinking
      : transient
        ? assistantThinking(transient)
        : "",
  );

  const candidates = messages.filter((message) => {
    if (!message?.id || message.id === transientId) return false;
    if (initialMessageIds.has(message.id)) return false;
    if (message.role !== "assistant") return false;
    if (message.isStreaming) return false;

    // A local-first cache may be missing an older historical assistant. Remote
    // revalidation can add that row during this handoff, so "new id in Redux"
    // alone is not enough proof. Prefer final answer text; for thinking-only
    // turns compare persisted reasoning as a second stable fingerprint. Both
    // paths normalize CRLF/trailing whitespace and text-part arrays because
    // persistence may change representation without changing visible content.
    if (completedText) return assistantText(message) === completedText;
    if (completedThinking) return assistantThinking(message) === completedThinking;
    return false;
  });

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0] ?? null;

  // Auto-mode dialogs may persist the trace agent rather than the dialog/router
  // agent, so identity cannot be a hard eligibility condition. Use it only to
  // disambiguate multiple content-equivalent rows; otherwise fail closed rather
  // than removing a possibly unrelated assistant.
  if (expectedAgentKey) {
    const agentMatches = candidates.filter(
      (message) => assistantAgentKey(message) === expectedAgentKey,
    );
    if (agentMatches.length === 1) return agentMatches[0] ?? null;
  }
  return null;
}

export async function waitForNewCanonicalAssistant(args: {
  readMessages: () => readonly Message[];
  initialMessageIds: ReadonlySet<string>;
  transientId: string;
  expectedText?: string;
  expectedThinking?: string;
  expectedAgentKey?: string;
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
      args.expectedThinking,
      args.expectedAgentKey,
    );
    if (canonical) return canonical;
    if (Date.now() >= deadline) return null;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}
