import {
  hasVisibleAssistantContent,
  isAssistantToolStub,
} from "../assistantMessageFacts";
import { isHiddenOrchestratorToolMessage } from "../toolPresentation";

export {
  hasVisibleAssistantContent,
  isAssistantToolStub,
} from "../assistantMessageFacts";

/**
 * Intermediate assistant progress in a tool loop — short narration that is
 * either still binding tool_calls, or is immediately followed by tools.
 * These rows should not offer MessageActions (copy/save/branch); only the
 * real final answer needs them.
 */
export function isIntermediateAssistantProgress(
  entries: Array<{ type: string; message?: any }>,
  index: number
): boolean {
  const entry = entries[index];
  if (!entry || entry.type !== "single" || !entry.message) return false;
  const msg = entry.message;
  if (msg.role !== "assistant") return false;

  if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
    return true;
  }

  for (let j = index + 1; j < entries.length; j += 1) {
    const next = entries[j];
    if (next.type === "tool-group") return true;
    if (next.type !== "single" || !next.message) continue;
    const role = next.message.role;
    if (role === "tool") return true;
    if (role === "user" || role === "assistant") return false;
  }

  return false;
}

/**
 * True while the agent loop is running and the user has not yet received a
 * visible assistant row (hidden tool stubs do not count as a visible reply).
 */
export function isAwaitingVisibleAssistantReply(
  messages: any[],
  isRunning: boolean
): boolean {
  if (!isRunning || messages.length === 0) return false;

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (!msg) continue;
    if (isHiddenOrchestratorToolMessage(msg)) continue;

    if (msg.role === "user") return true;

    if (isAssistantToolStub(msg)) continue;

    return false;
  }

  return false;
}

export type ToolGroupCollapseEntry =
  | { type: "tool-group" }
  | { type: "single"; message: any }
  | { type: string; message?: any };

/**
 * Attention-first presentation contract:
 *
 * Tool activity is machine work, not user work. Keep the group collapsed by
 * default in both active and historical turns; the compact header continues to
 * expose running / success / failure state and the user can explicitly drill
 * into the full trajectory at any time.
 *
 * This deliberately replaces the old "watch the agent work" contract that kept
 * the active tool batch expanded until a final assistant reply arrived. As
 * agents become more autonomous and task volume grows, successful read/edit/
 * shell activity must not consume attention merely because it is happening.
 * Interactive approval/decision surfaces are not ordinary tool groups and keep
 * their dedicated presentation paths.
 */
export function shouldAutoCollapseToolGroup(_args: {
  entries: ToolGroupCollapseEntry[];
  groupIndex: number;
  isRunning: boolean;
  hasStreamingMessage: boolean;
}): boolean {
  return true;
}
