import type { AgentRuntimeOptions } from "./types";

export type ServerOwnedWebForegroundEligibilityInput = {
  agentConfig?: Record<string, any> | null;
  userInput: unknown;
  runtimeOptions?: AgentRuntimeOptions | null;
  currentServer?: string | null;
  token?: string | null;
  isDesktopApp?: boolean;
};

function hasConfiguredToolSurface(agent: Record<string, any>): boolean {
  if (Array.isArray(agent.tools) && agent.tools.length > 0) return true;
  if (Array.isArray(agent.toolNames) && agent.toolNames.length > 0) return true;

  const policies = [
    agent.runtimeToolPolicy,
    agent.runtimeBinding?.runtimeToolPolicy,
    agent.runtimeBinding?.runtimeToolPolicySnapshot,
  ];
  return policies.some((policy) => {
    if (!policy || typeof policy !== "object") return false;
    if (Array.isArray(policy.agentTools) && policy.agentTools.length > 0) return true;
    if (Array.isArray(policy.runtimeTools) && policy.runtimeTools.length > 0) return true;
    if (policy.shell?.enabled === true) return true;
    if (policy.workspace?.mode === "lease") return true;
    return false;
  });
}

/**
 * Conservative migration gate for ordinary Web chat.
 *
 * Direct-browser BYOK (`useServerProxy === false`), CLI/machine-bound agents,
 * every configured tool surface, rich/editing turns and runtime-specialized
 * quick-chat turns keep the legacy client-owned path until parity is proven.
 */
export function shouldUseServerOwnedWebForegroundTurn(
  input: ServerOwnedWebForegroundEligibilityInput,
): boolean {
  if (input.isDesktopApp) return false;
  if (!input.currentServer?.trim() || !input.token?.trim()) return false;
  if (typeof input.userInput !== "string" || !input.userInput.trim()) return false;

  const agent = input.agentConfig;
  if (!agent) return false;
  if (agent.useServerProxy === false) return false;
  if (agent.apiSource === "cli") return false;
  if (agent.runtimeBinding?.machineId) return false;
  if (hasConfiguredToolSurface(agent)) return false;

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
