// packages/chat/web/composerSuggestions.ts
// Unified trigger state for the composer suggestion surface. Provider
// matching stays in the provider modules (messageInputMention for agent
// @mentions, messageSlashCommands for /command completion); this module only
// composes them behind one state shape so the menu and key handling stay
// provider-agnostic.

import {
  resolveAgentMentionState,
  moveMentionHighlightIndex,
} from "./messageInputMention";
import { resolveSlashCommandTriggerState } from "./messageSlashCommands";

export type ComposerSuggestionKind = "agent" | "slash-command";

export interface ComposerSuggestionState {
  active: boolean;
  kind: ComposerSuggestionKind | null;
  query: string;
  startIndex: number;
}

export const createInactiveComposerSuggestionState =
  (): ComposerSuggestionState => ({
    active: false,
    kind: null,
    query: "",
    startIndex: -1,
  });

/**
 * Resolves the active suggestion provider at the cursor. Agent @mention
 * detection keeps its existing semantics (email-like at-signs and
 * whitespace-broken mentions stay inactive); slash commands only trigger at
 * input start or after whitespace. @ wins when both could match.
 */
export const resolveComposerSuggestionState = (
  value: string,
  cursorIndex: number
): ComposerSuggestionState => {
  const agentState = resolveAgentMentionState(value, cursorIndex);
  if (agentState.active) {
    return agentState;
  }
  return resolveSlashCommandTriggerState(value, cursorIndex);
};

export const moveSuggestionHighlightIndex = moveMentionHighlightIndex;

/**
 * Clamps a suggestion highlight index into the valid item range [0, itemCount - 1].
 * Returns -1 when itemCount is zero or negative.
 */
export const clampSuggestionHighlightIndex = (
  highlightIndex: number,
  itemCount: number
): number => {
  if (itemCount <= 0) return -1;
  return Math.min(Math.max(highlightIndex, 0), itemCount - 1);
};

/** One presentation row of the unified suggestion menu. */
export interface ComposerSuggestionItem {
  /** Stable identity, e.g. `agent:<agentKey>` or `command:/new`. */
  key: string;
  label: string;
  description?: string;
}
