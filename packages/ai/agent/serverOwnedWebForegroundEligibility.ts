import type { EffectiveToolSurface } from "ai/tools/effectiveToolSurface";
import { resolveEffectiveToolSurface } from "ai/tools/effectiveToolSurface";
import {
  DURABLE_WEB_FOREGROUND_INTERACTIVE_TOOL_NAMES,
  DURABLE_WEB_FOREGROUND_READ_ONLY_TOOL_NAMES,
  DURABLE_WEB_FOREGROUND_TOOL_NAMES,
  hasProvenDurableWebForegroundSemantics,
  hasProvenServerReadOnlySemantics,
} from "ai/tools/toolExecutionSemantics";
import { canonicalizeToolName } from "ai/tools/toolNameAliases";
import type { AgentRuntimeOptions } from "./types";
import type { TurnToolContext } from "./turnToolContext";

export type ServerOwnedWebForegroundEligibilityInput = {
  /** Explicit caller surface. This gate is Web-only; not-desktop is not enough. */
  surface?: string | null;
  agentConfig?: Record<string, any> | null;
  /**
   * Exact post-filter Web surface when the caller can resolve it. Direct unit
   * callers may omit this and fall back to the requested/configured surface.
   */
  effectiveToolSurface?: EffectiveToolSurface | null;
  /** Turn-level late-bound tool and reference resolution context. */
  turnToolContext?: TurnToolContext | null;
  userInput: unknown;
  runtimeOptions?: AgentRuntimeOptions | null;
  currentServer?: string | null;
  token?: string | null;
  isDesktopApp?: boolean;
};

// Re-export contract-derived sets from the historic import location for callers
// that only need product admission names. There is no second durable name list
// in this module; add/remove durable tools in toolExecutionSemantics.ts.
export {
  DURABLE_WEB_FOREGROUND_INTERACTIVE_TOOL_NAMES,
  DURABLE_WEB_FOREGROUND_READ_ONLY_TOOL_NAMES,
  DURABLE_WEB_FOREGROUND_TOOL_NAMES,
};

/**
 * Historical Web host defaults already present when P0.1 server-owned foreground
 * shipped. This is deliberately a frozen audit baseline, NOT a claim that every
 * tool below has durable tool-card parity. If Web defaults gain a new tool, the
 * server-owned plane falls back to legacy until that host-surface change is
 * explicitly reviewed here.
 */
export const AUDITED_WEB_FOREGROUND_HOST_BASELINE_TOOL_NAMES = new Set([
  // TOOL_PACKS.CORE
  "read",
  "readFile",
  "createDoc",
  "updateDoc",
  "search_workspace",
  "updateSelf",
  "ask_user",
  // show_interaction: CORE 宿主注入；服务端纯函数展示（parse + fallback，无 I/O、无客户端通道），只读展示语义，不执行卡片动作
  "show_interaction",
  "createAgentAutomation",
  "updateAgentAutomation",
  "deleteAgentAutomation",
  "notifyUser",
  // ALWAYS_ON_PACK_IDS: long-term-memory + skills
  "queryMemory",
  "rememberMemory",
  "deleteMemory",
  "loadSkill",
  "readSkillDoc",
  // Default system capabilities
  "exa_search",
  "fetchWebpage",
  "startAgentRun",
  "controlAgentRun",
  "listAgents",
]);

function isDurableRequestedToolName(name: unknown): boolean {
  if (typeof name !== "string") return false;
  return hasProvenDurableWebForegroundSemantics(canonicalizeToolName(name));
}

export function hasConsistentDurableWebForegroundSemantics(): boolean {
  for (const name of DURABLE_WEB_FOREGROUND_READ_ONLY_TOOL_NAMES) {
    if (!hasProvenServerReadOnlySemantics(name)) return false;
  }
  for (const name of DURABLE_WEB_FOREGROUND_INTERACTIVE_TOOL_NAMES) {
    if (!hasProvenDurableWebForegroundSemantics(name)) return false;
  }
  return true;
}

function hasSupportedDurableToolSurface(
  agent: Record<string, any>,
  suppliedSurface?: EffectiveToolSurface | null,
): boolean {
  const surface =
    suppliedSurface ??
    resolveEffectiveToolSurface({
      agent,
    });

  if (surface.shellEnabled || surface.workspaceLease) return false;

  if (!surface.requestedNames.every(isDurableRequestedToolName)) {
    return false;
  }

  return surface.hostInjectedNames.every((name) =>
    AUDITED_WEB_FOREGROUND_HOST_BASELINE_TOOL_NAMES.has(canonicalizeToolName(name)),
  );
}

/**
 * Conservative migration gate for ordinary Web chat.
 *
 * This plane is explicitly Web-only. Desktop, RN/mobile and TUI have their own
 * execution ownership and must not become server-owned merely because an auth
 * token exists. Direct-browser BYOK, CLI/machine-bound agents, unproven tool
 * surfaces, rich/editing turns and runtime-specialized quick-chat turns keep
 * their established client/device-owned path.
 */
export function shouldUseServerOwnedWebForegroundTurn(
  input: ServerOwnedWebForegroundEligibilityInput,
): boolean {
  if (input.surface !== "web") return false;
  if (input.isDesktopApp) return false;
  if (!input.currentServer?.trim() || !input.token?.trim()) return false;
  if (typeof input.userInput !== "string" || !input.userInput.trim()) return false;

  if (input.turnToolContext) {
    if (!input.turnToolContext.complete) return false;
    if (input.turnToolContext.unresolvedReasons?.length) return false;
    if (!input.effectiveToolSurface) {
      const lateBound = [
        ...input.turnToolContext.referencedToolNames,
        ...input.turnToolContext.mentionedToolNames,
      ];
      if (lateBound.some((name) => !isDurableRequestedToolName(name))) {
        return false;
      }
    }
  }

  const agent = input.agentConfig;
  if (!agent) return false;
  if (agent.useServerProxy === false) return false;
  if (agent.apiSource === "cli") return false;
  if (agent.runtimeBinding?.machineId) return false;
  if (!hasSupportedDurableToolSurface(agent, input.effectiveToolSurface)) return false;

  const runtimeOptions = input.runtimeOptions;
  if (runtimeOptions?.extraTools?.length) {
    if (!input.effectiveToolSurface) return false;
    if (runtimeOptions.extraTools.some((name) => !isDurableRequestedToolName(name))) {
      return false;
    }
  }
  if (runtimeOptions?.editingTarget) return false;
  if (runtimeOptions?.imageConfigOverride) return false;
  if (runtimeOptions?.quickChatModelOverride) return false;
  if (runtimeOptions?.workspaceToolsHint) return false;
  if (runtimeOptions?.cwd) return false;
  if (runtimeOptions?.restrictShellToWorkspace) return false;

  return true;
}
