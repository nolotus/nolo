/**
 * Vertical rhythm between message-list rows. Distance carries hierarchy:
 * a new user turn gets the widest gap, the reply sits closer to its question,
 * and the steps of one assistant turn (narration, tools, final answer) stay
 * tight so they read as one unit instead of unrelated cards.
 */
export type MessageRowSpacing = "turn" | "reply" | "step" | "default";

type SpacingEntry = { type: string; message?: { role?: string } };

function roleOf(entry: SpacingEntry | undefined): string | null {
  if (!entry) return null;
  if (entry.type === "tool-group") return "tool";
  if (entry.type === "wake-event") return "event";
  return entry.message?.role ?? null;
}

const ASSISTANT_WORK = new Set(["assistant", "tool"]);

export function messageRowSpacing(
  entries: SpacingEntry[],
  index: number,
): MessageRowSpacing | null {
  if (index <= 0) return null;
  const prev = roleOf(entries[index - 1]);
  const cur = roleOf(entries[index]);
  if (cur === "user") return "turn";
  if (prev === "user" && cur && ASSISTANT_WORK.has(cur)) return "reply";
  if (prev && cur && ASSISTANT_WORK.has(prev) && ASSISTANT_WORK.has(cur)) return "step";
  return "default";
}
