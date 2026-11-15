import { decodeTime } from "ulid";
import type { AgentRuntimeChatMessage } from "./types";

/** Receipt identity is stable before saveTurn; ordinary new rows are appended at save time. */
export function orderDialogHistory<T extends AgentRuntimeChatMessage>(messages: readonly T[]): T[] {
  const time = (message: T): number => {
    if (Number.isFinite(message.cliHistoryOrder)) return message.cliHistoryOrder!;
    const id = message.id ?? (message as T & { cliMessageId?: string }).cliMessageId;
    if (!id) return Infinity;
    const timestamp = /^(\d+)-/.exec(id);
    if (timestamp) return Number(timestamp[1]);
    if (/^[0-9A-HJKMNP-TV-Z]{26}$/.test(id)) {
      try { return decodeTime(id); } catch { /* Unknown identities retain their relative order. */ }
    }
    return Number.isFinite(message.createdAt) ? message.createdAt! : -Infinity;
  };
  const identity = (message: T) => message.id ?? (message as T & { cliMessageId?: string }).cliMessageId;
  return messages.map((message, index) => ({ message, index, time: time(message) }))
    .sort((a, b) => {
      if (a.time !== b.time) return a.time < b.time ? -1 : 1;
      const left = identity(a.message), right = identity(b.message);
      if (left && right && left !== right) return left < right ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ message }) => message);
}

/** Same direct-input identity at the canonical seam and the CLI write seam. */
export function dialogTurnUserMessageId(turnId: unknown, index: number): string | undefined {
  if (typeof turnId !== "string" || !/^turn-[0-9A-HJKMNP-TV-Z]{26}$/.test(turnId)) return undefined;
  return `${decodeTime(turnId.slice(5))}-${String(index + 1).padStart(3, "0")}-${turnId}`;
}
