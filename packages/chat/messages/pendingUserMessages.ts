import type { Message } from "./types";

/** Each message carries its own durable admission state; no loaded-page
 * receipt lookup can safely decide whether an individual row is pending. */
export function selectPendingUserMessages(messages: readonly Message[]): Message[] {
  return messages.filter(message => message.role === "user" && message.metadata?.queueState === "pending"
    && !message.metadata?.userBatchReceipt && !message.metadata?.userBatchPhase);
}

export function selectAdmittedMessages(messages: readonly Message[]): Message[] {
  const pending = new Set(selectPendingUserMessages(messages).map(message => message.id));
  return messages.filter(message => !pending.has(message.id));
}
