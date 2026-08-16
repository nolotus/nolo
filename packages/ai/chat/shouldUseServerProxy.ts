import type { Agent } from "app/types";
import { shouldUseServerProxy as shouldUseServerProxyPolicy } from "agent-runtime/serverProxyPolicy";

/**
 * Client-facing server-proxy decision.
 *
 * Implementation lives in the pure `agent-runtime/serverProxyPolicy` seam so
 * agentCallPlan transport and account-sync OAuth allowlists cannot drift.
 */
export const shouldUseServerProxy = (
  agentConfig: Pick<Agent, "provider" | "useServerProxy" | "apiKeyRef">,
  requestProvider?: string,
): boolean => shouldUseServerProxyPolicy(agentConfig, requestProvider);
