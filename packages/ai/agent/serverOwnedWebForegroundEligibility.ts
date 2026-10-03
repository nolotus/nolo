import type { EffectiveToolSurface } from "ai/tools/effectiveToolSurface";
import { resolveEffectiveToolSurface } from "ai/tools/effectiveToolSurface";
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

/**
 * Human-interaction boundary with proven durable semantics. blocking ask_user
 * intentionally ends the current execution and resumes in a new execution
 * after the user chooses.
 */
export const DURABLE_WEB_FOREGROUND_INTERACTIVE_TOOL_NAMES = new Set([
  "ask_user",
]);

/**
 * Canonical side-effect-free tools with proven server-hosted execution. These
 * may finish inside the current execution, project a completed transient card,
 * and then let the model continue.
 *
 * Keep aliases out of this set. For example `readPage` canonicalizes to
 * `readDoc`; effective-surface resolution and tool projection both use the
 * shared canonicalizer before consulting this contract. `read`/`readFile` are
 * intentionally excluded because their execution-location semantics can
 * resolve to filesystem reads.
 */
export const DURABLE_WEB_FOREGROUND_READ_ONLY_TOOL_NAMES = new Set([
  // Network read-only tools.
  "exa_search",
  "fetchWebpage",
  // Dialog search backed by the server workspace executor.
  "searchDialogMessages",
  // Nolo workspace read/query tools.
  "listDialogs",
  "readDialog",
  "queryDialogsBySubjectRef",
  "listAgents",
  "readAgent",
  "listSpaces",
  "readSpace",
  "readDoc",
  "readSkillDoc",
  "listTables",
  "queryTableRows",
]);

/**
 * Requested tools with proven durable Web foreground parity. Adding a tool here
 * means its live projection, refresh recovery, persistence and side-effect
 * semantics have been verified.
 */
export const DURABLE_WEB_FOREGROUND_TOOL_NAMES = new Set([
  ...DURABLE_WEB_FOREGROUND_INTERACTIVE_TOOL_NAMES,
  ...DURABLE_WEB_FOREGROUND_READ_ONLY_TOOL_NAMES,
]);

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
  "setTodoList",
  "startAgentRun",
  "controlAgentRun",
  "listAgents",
]);

function isDurableRequestedToolName(name: unknown): boolean {
  return typeof name === "string" &&
    DURABLE_WEB_FOREGROUND_TOOL_NAMES.has(canonicalizeToolName(name));
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
