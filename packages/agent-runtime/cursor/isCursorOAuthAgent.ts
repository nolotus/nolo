import type { AgentRuntimeAgentConfig } from "../hostAdapter";

/**
 * Detect cursor OAuth agents (apiKeyRef === "cursor").
 * Mirrors isAnthropicOAuthAgent / isAntigravityOAuthAgent.
 *
 * Kept in its own dependency-free module so callers can route on it without
 * loading cursorProvider (protobuf runtime + generated schema, ~40 MB RSS).
 */
export function isCursorOAuthAgent(
  agent: Pick<AgentRuntimeAgentConfig, "apiKeyRef">,
): boolean {
  return agent.apiKeyRef?.trim().toLowerCase() === "cursor";
}
