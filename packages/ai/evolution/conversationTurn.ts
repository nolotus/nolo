import { decodeTime } from "ulid";

/**
 * Shared turn-scoping for Evolution evidence consumers.
 *
 * One dialog turn maps to N runs (continue-dialog), so a run/candidate is
 * bounded by time, not by the whole dialog. Both the durable Case
 * materializer (caseMaterialization.ts) and the Deep Review evidence loader
 * (evidence.ts) must select the SAME slice of host-provided messages:
 *
 *  - keep only messages whose decoded ULID timestamp is at or before the
 *    candidate's createdAt (the candidate is stamped after its turn's
 *    messages are persisted; later-turn messages must never leak in);
 *  - from that eligible window, pick the LATEST user message with textual
 *    content — that is the task this run was answering;
 *  - the turn is `eligible.slice(selectedTaskIndex)`: the selected task plus
 *    everything after it up to the candidate boundary (assistant/tool/
 *    system messages). Earlier tasks and earlier turns are excluded so their
 *    facts cannot be misattributed to this run.
 *
 * Hosts must pass an already-bounded window of messages (fetch-time bounds);
 * this helper only selects within what it is given.
 */
export type EvolutionMaterializationMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool" | string;
  content: unknown;
};

export type EvolutionConversationTurnSelection<
  M extends EvolutionMaterializationMessage = EvolutionMaterializationMessage,
> = {
  /**
   * All input messages at or before the candidate boundary, sorted by
   * (decoded time, id). Empty when candidate.createdAt is unparseable or
   * no message id decodes.
   */
  eligible: M[];
  /**
   * Index into `eligible` of the selected task message, or undefined when no
   * textual user task exists in the eligible window.
   */
  selectedTaskIndex?: number;
  /** The selected task message (convenience alias of eligible[selectedTaskIndex]). */
  taskMessage?: M;
  /** Extracted text of the selected task; "" when unresolved. */
  taskText: string;
  /** eligible.slice(selectedTaskIndex) — the selected turn; [] when unresolved. */
  turnMessages: M[];
};

export const extractEvolutionMessageText = (content: unknown): string => {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const record = part as Record<string, unknown>;
      return record.type === "text" && typeof record.text === "string"
        ? record.text
        : "";
    })
    .join("")
    .trim();
};

export const defaultDecodeEvolutionMessageTime = (
  messageId: string,
): number | null => {
  try {
    return decodeTime(messageId);
  } catch {
    return null;
  }
};

/**
 * Select the task + turn slice for one candidate inside a bounded message
 * window. Pure; no I/O; no persistence.
 */
export const selectEvolutionConversationTurn = <
  M extends EvolutionMaterializationMessage,
>({
  messages,
  candidateCreatedAt,
  decodeMessageTime = defaultDecodeEvolutionMessageTime,
}: {
  messages: readonly M[];
  /** candidate.createdAt — ISO string. */
  candidateCreatedAt: string;
  decodeMessageTime?: (messageId: string) => number | null;
}): EvolutionConversationTurnSelection<M> => {
  const candidateTime = Date.parse(candidateCreatedAt);

  const eligible = Number.isFinite(candidateTime)
    ? messages
        .map((message) => ({ message, atMs: decodeMessageTime(message.id) }))
        .filter(
          (entry): entry is { message: M; atMs: number } =>
            typeof entry.atMs === "number" && entry.atMs <= candidateTime,
        )
        .sort((a, b) => a.atMs - b.atMs || a.message.id.localeCompare(b.message.id))
        .map((entry) => entry.message)
    : [];

  const selectedTaskIndex = [...eligible]
    .map((message, index) => ({ message, index }))
    .reverse()
    .find(
      ({ message }) =>
        message.role === "user" &&
        Boolean(extractEvolutionMessageText(message.content)),
    )?.index;

  const taskMessage =
    typeof selectedTaskIndex === "number" ? eligible[selectedTaskIndex] : undefined;
  const taskText = taskMessage
    ? extractEvolutionMessageText(taskMessage.content)
    : "";
  const turnMessages =
    typeof selectedTaskIndex === "number" ? eligible.slice(selectedTaskIndex) : [];

  return {
    eligible,
    ...(typeof selectedTaskIndex === "number" ? { selectedTaskIndex } : {}),
    ...(taskMessage ? { taskMessage } : {}),
    taskText,
    turnMessages,
  };
};
