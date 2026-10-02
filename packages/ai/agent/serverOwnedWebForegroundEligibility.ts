import { canonicalizeToolName } from "ai/tools/toolNameAliases";
import { expandEnabledPacks } from "ai/tools/toolPacks";
import { resolveAgentRequiredPackIds } from "ai/tools/agentSkillConfig";
import type { AgentRuntimeOptions } from "./types";

export type ServerOwnedWebForegroundEligibilityInput = {
  /** Explicit caller surface. This gate is Web-only; not-desktop is not enough. */
  surface?: string | null;
  agentConfig?: Record<string, any> | null;
  userInput: unknown;
  runtimeOptions?: AgentRuntimeOptions | null;
  currentServer?: string | null;
  token?: string | null;
  isDesktopApp?: boolean;
};

/**
 * Explicit rollout allowlist for configured tools that have proven durable Web
 * foreground parity. Keep this list small: adding a tool means its live card,
 * refresh recovery, persistence and side-effect semantics have been verified.
 */
export const DURABLE_WEB_FOREGROUND_TOOL_NAMES = new Set([
  "ask_user",
  "exa_search",
  "fetchWebpage",
]);

function readToolName(value: unknown): string | null {
  if (typeof value === "string") {
    const name = canonicalizeToolName(value.trim());
    return name || null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, any>;
  const candidate =
    (typeof record.name === "string" && record.name) ||
    (typeof record.toolName === "string" && record.toolName) ||
    (typeof record.function?.name === "string" && record.function.name) ||
    "";
  const name = canonicalizeToolName(candidate.trim());
  return name || null;
}

function configuredToolNames(agent: Record<string, any>): string[] {
  const values: unknown[] = [];
  if (Array.isArray(agent.tools)) values.push(...agent.tools);
  if (Array.isArray(agent.toolNames)) values.push(...agent.toolNames);

  // Mirror the actual runtime's skills/enabledPacks expansion before deciding
  // whether the configured tool surface is proven durable on Web.
  const requiredPackIds = resolveAgentRequiredPackIds(agent as any);
  values.push(...expandEnabledPacks(requiredPackIds));

  const policies = [
    agent.runtimeToolPolicy,
    agent.runtimeBinding?.runtimeToolPolicy,
    agent.runtimeBinding?.runtimeToolPolicySnapshot,
  ];
  for (const policy of policies) {
    if (!policy || typeof policy !== "object") continue;
    if (Array.isArray(policy.agentTools)) values.push(...policy.agentTools);
    if (Array.isArray(policy.runtimeTools)) values.push(...policy.runtimeTools);
  }

  return [...new Set(values.map(readToolName).filter((name): name is string => !!name))];
}

function hasSupportedDurableToolSurface(agent: Record<string, any>): boolean {
  const policies = [
    agent.runtimeToolPolicy,
    agent.runtimeBinding?.runtimeToolPolicy,
    agent.runtimeBinding?.runtimeToolPolicySnapshot,
  ];
  if (
    policies.some(
      (policy) =>
        policy &&
        typeof policy === "object" &&
        (policy.shell?.enabled === true || policy.workspace?.mode === "lease"),
    )
  ) {
    return false;
  }

  const names = configuredToolNames(agent);
  return names.length === 0 || names.every((name) => DURABLE_WEB_FOREGROUND_TOOL_NAMES.has(name));
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

  const agent = input.agentConfig;
  if (!agent) return false;
  if (agent.useServerProxy === false) return false;
  if (agent.apiSource === "cli") return false;
  if (agent.runtimeBinding?.machineId) return false;
  if (!hasSupportedDurableToolSurface(agent)) return false;

  const runtimeOptions = input.runtimeOptions;
  if (runtimeOptions?.extraTools?.length) return false;
  if (runtimeOptions?.editingTarget) return false;
  if (runtimeOptions?.imageConfigOverride) return false;
  if (runtimeOptions?.quickChatModelOverride) return false;
  if (runtimeOptions?.workspaceToolsHint) return false;
  if (runtimeOptions?.cwd) return false;
  if (runtimeOptions?.restrictShellToWorkspace) return false;

  return true;
}
