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
import { resolveAgentContextWindow } from "../client/tokenUsage";
import { estimateDefaultCliContextTokens } from "../client/estimateCliContext";

/** Apply an already validated target; runtime cache/persistence belong to the host. */
export function applyAgentSwitchState(
  state: TuiState,
  target: { name: string; key: string; model?: string },
): TuiState {
  return {
    ...state,
    agentName: target.name,
    agentKey: target.key,
    contextWindow: resolveAgentContextWindow({ agentKey: target.key, agentName: target.name, model: target.model }),
    estimatedContextTokens: estimateDefaultCliContextTokens({
      cwd: state.cwd, agentKey: target.key, agentName: target.name,
      model: target.model, userLanguage: state.userLanguage,
    }),
    cachedMemoryOverlay: undefined,
  };
}

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

  if (trimmed.match(new RegExp(`^${LEARN_COMMAND}(?:\\s|$)`)) && trimmed !== LEARN_COMMAND) {
    const value = trimmed.slice(LEARN_COMMAND.length).trim();
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 100) {
      return { nextState: state, output: "Usage: /learn or /learn <1-100>" };
    }
    return { nextState: state, output: "", action: { type: "learn-history", limit: Number(value) } };
  }

  const result = handleBaseTuiInput(input, state, historyTurns);
  const switchMatch = trimmed.match(/^\/(?:switch|agent)\s+(.+)$/s);
  if (switchMatch && !["list", "current", "show"].includes(switchMatch[1]!)) {
    const target = switchMatch[1]!;
    // Unknown names and unverified raw keys must resolve in the catalog before
    // any state/cache/profile changes. The base resolver accepts arbitrary keys.
    if (result.nextState === state || result.nextState.agentName === result.nextState.agentKey) {
      return { nextState: state, output: "", action: { type: "switch-agent", target } };
    }
    return {
      ...result,
      nextState: {
        ...applyAgentSwitchState(state, {
          key: result.nextState.agentKey, name: result.nextState.agentName,
        }),
        // The synchronous platform resolver already has the model identity.
        contextWindow: result.nextState.contextWindow,
        estimatedContextTokens: result.nextState.estimatedContextTokens,
      },
    };
  }
  return result;
}
