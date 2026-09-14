import { asOptionalPositiveInteger } from "core/optionalPositiveInteger";
import { asOptionalPositiveFiniteNumber } from "core/optionalPositiveNumber";

/**
 * Default maxConcurrent used when an agent has no admission config.
 * v0 policy: hard-coded to 2 until per-agent config is widely adopted.
 */
export const DEFAULT_AGENT_THREAD_MAX_CONCURRENT = 2;
export const DEFAULT_AGENT_THREAD_CREDENTIAL_BUDGET = 2;

export type AgentThreadAdmissionConfig = {
  maxConcurrent?: unknown;
  credentialBudget?: unknown;
};

export type AgentThreadAdmissionAgentConfig = {
  maxConcurrent?: unknown;
  credentialBudget?: unknown;
  apiKeyRef?: string | null;
  credentialRef?: string | null;
  cliProvider?: string | null;
  admission?: AgentThreadAdmissionConfig | null;
} | null | undefined;

export type AgentThreadAdmissionDecision =
  | {
      allowed: true;
      activeThreadCount: number;
      maxConcurrent: number;
    }
  | {
      allowed: false;
      reason: "max_concurrent_reached" | "agent_temporarily_unavailable" | "credential_concurrency_exhausted";
      activeThreadCount: number;
      maxConcurrent: number;
    };

export function normalizeAgentThreadMaxConcurrent(value: unknown): number | null {
  return asOptionalPositiveInteger(value) ?? null;
}

export function resolveAgentThreadMaxConcurrent(
  agentConfig: AgentThreadAdmissionAgentConfig,
): number | null {
  const nestedLimit = normalizeAgentThreadMaxConcurrent(
    agentConfig?.admission?.maxConcurrent,
  );
  if (nestedLimit != null) return nestedLimit;
  return normalizeAgentThreadMaxConcurrent(agentConfig?.maxConcurrent);
}

export function resolveAgentThreadCredentialBudget(
  agentConfig: AgentThreadAdmissionAgentConfig,
): number | null {
  const nestedLimit = normalizeAgentThreadMaxConcurrent(
    agentConfig?.admission?.credentialBudget,
  );
  if (nestedLimit != null) return nestedLimit;
  return normalizeAgentThreadMaxConcurrent(agentConfig?.credentialBudget);
}

export function decideAgentThreadAdmission(input: {
  agentConfig: AgentThreadAdmissionAgentConfig;
  activeThreadCount: number;
  activeCredentialThreadCount?: number;
  credentialBudget?: number;
}): AgentThreadAdmissionDecision {
  const isCliProvider = !!(input.agentConfig && (input.agentConfig as any).cliProvider);

  if (input.activeCredentialThreadCount !== undefined) {
    const credBudget =
      input.credentialBudget ??
      resolveAgentThreadCredentialBudget(input.agentConfig) ??
      DEFAULT_AGENT_THREAD_CREDENTIAL_BUDGET;

    if (input.activeCredentialThreadCount >= credBudget) {
      return {
        allowed: false,
        reason: "credential_concurrency_exhausted",
        activeThreadCount: input.activeCredentialThreadCount,
        maxConcurrent: credBudget,
      };
    }
  }

  if (isCliProvider) {
    return {
      allowed: true,
      activeThreadCount: input.activeThreadCount,
      maxConcurrent: 999,
    };
  }

  const positiveActiveThreadCount = asOptionalPositiveFiniteNumber(
    input.activeThreadCount,
  );
  const activeThreadCount =
    positiveActiveThreadCount !== undefined
      ? Math.floor(positiveActiveThreadCount)
      : 0;
  const maxConcurrent =
    resolveAgentThreadMaxConcurrent(input.agentConfig) ??
    DEFAULT_AGENT_THREAD_MAX_CONCURRENT;

  if (activeThreadCount < maxConcurrent) {
    return {
      allowed: true,
      activeThreadCount,
      maxConcurrent,
    };
  }

  return {
    allowed: false,
    reason: "max_concurrent_reached",
    activeThreadCount,
    maxConcurrent,
  };
}
