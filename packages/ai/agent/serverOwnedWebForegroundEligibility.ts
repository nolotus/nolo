import type { AgentRuntimeOptions } from "./types";

export type ServerOwnedWebForegroundEligibilityInput = {
  agentConfig?: Record<string, any> | null;
  userInput: unknown;
  runtimeOptions?: AgentRuntimeOptions | null;
  currentServer?: string | null;
  token?: string | null;
  isDesktopApp?: boolean;
};

const FIRST_DURABLE_WEB_TOOL = "ask_user";

function readToolName(value: unknown): string | null {
  if (typeof value === "string") {
    const name = value.trim();
    return name || null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, any>;
  const candidate =
    (typeof record.name === "string" && record.name) ||
    (typeof record.toolName === "string" && record.toolName) ||
    (typeof record.function?.name === "string" && record.function.name) ||
    "";
  const name = candidate.trim();
  return name || null;
}

function configuredToolNames(agent: Record<string, any>): string[] {
  const values: unknown[] = [];
  if (Array.isArray(agent.tools)) values.push(...agent.tools);
  if (Array.isArray(agent.toolNames)) values.push(...agent.toolNames);

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

/**
 * P0.2 rollout gate: tool-free turns plus the first proven interactive tool
 * (`ask_user`) may use the server-owned Web foreground plane. Any other tool,
 * hosted shell/workspace surface, or mixed surface remains on the legacy path
 * until its live-card + refresh parity is independently proven.
 */
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
  return names.length === 0 || names.every((name) => name === FIRST_DURABLE_WEB_TOOL);
}

/**
 * Conservative migration gate for ordinary Web chat.
 *
 * Direct-browser BYOK (`useServerProxy === false`), CLI/machine-bound agents,
 * unproven tool surfaces, rich/editing turns and runtime-specialized quick-chat
 * turns keep the legacy client-owned path. `ask_user` is intentionally the first
 * tool admitted because its server wire + persisted card + reload interaction
 * are covered by the durable foreground slice.
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
