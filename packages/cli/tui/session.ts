/**
 * TUI session — stable public surface.
 *
 * Most implementation lives in focused modules. This barrel also hosts the
 * very small `/learn` wrapper so the command can reuse the existing chat
 * action/current dialog without growing a second runtime or Evolution path.
 */

import type { TuiInputResult, TuiState } from "./sessionTypes";
import { handleTuiInput as handleBaseTuiInput } from "./sessionDispatch";
import { TUI_LEARN_REVIEW_PROMPT } from "./learnPrompt";

// Types
export type {
  TuiState,
  TuiAction,
  TuiInputResult,
  TuiKeyInfo,
  TuiInputKeyResult,
} from "./sessionTypes";

// Rendering
export {
  renderStatusLine,
  renderCreditsDebug,
  renderWelcome,
  renderPrompt,
  renderTuiHelp,
  renderContextPanel,
  renderKnownAgents,
  formatElapsedSeconds,
} from "./sessionRender";

const LEARN_COMMAND = "/learn" as const;

// Input handling
export {
  PASTE_TOKEN_PREFIX,
  applyTuiInputKey,
  SLASH_COMMANDS,
  completeSlashPrefix,
  completeSlashCommand,
  isBackspaceSequence,
  isLikelySlashCommand,
  stripImageTokens,
} from "./sessionInput";

// Dispatch & state
export {
  DEFAULT_TUI_AGENT_KEY,
  DEFAULT_TUI_SERVER_URL,
  createInitialTuiState,
} from "./sessionDispatch";

/**
 * `/learn` is deliberately just another chat turn in the same dialog.
 * That keeps provider/context cache reuse possible and gives the current agent
 * access to the work it just did. It never creates a new dialog and never
 * mutates Evolution state by itself.
 */
export function handleTuiInput(
  input: string,
  state: TuiState,
  historyTurns?: ReadonlyArray<{ role?: string; content?: string }>,
): TuiInputResult {
  const trimmed = input.trim();

  if (trimmed === LEARN_COMMAND) {
    if (!state.dialogId) {
      return {
        nextState: state,
        output: "Nothing to review yet. Finish at least one chat turn first.",
      };
    }
    return {
      nextState: state,
      output: "",
      action: {
        type: "chat",
        message: TUI_LEARN_REVIEW_PROMPT,
        agentKey: state.agentKey,
        runtimeMode: state.runtimeMode,
        continueDialogId: state.dialogId,
      },
    };
  }

  if (trimmed.startsWith(`${LEARN_COMMAND} `)) {
    return {
      nextState: state,
      output: "/learn takes no arguments.",
    };
  }

  return handleBaseTuiInput(input, state, historyTurns);
}
