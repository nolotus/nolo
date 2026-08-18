import {
  buildAgentRuntimeDecisionInput,
  canUsePlatformChatProvider,
  hasDirectOpenAiCompatibleProvider,
  type AgentRuntimeDecisionInput,
} from "agent-runtime";
import type { AgentRuntimeCapabilityFacts } from "agent-runtime/runtimeFacts";

export type DesktopAgentRuntimeEnv = Record<string, string | undefined>;

function hasDesktopLevelDbPersistence(env: DesktopAgentRuntimeEnv) {
  return Boolean(env.NOLO_SERVER_DB_PATH?.trim());
}

function hasDesktopProviderRequestEndpoint(env: DesktopAgentRuntimeEnv) {
  return hasDirectOpenAiCompatibleProvider(env) || canUsePlatformChatProvider(env);
}

export function describeDesktopAgentRuntimeHostFacts(
  env: DesktopAgentRuntimeEnv
): AgentRuntimeCapabilityFacts {
  const hasLevelDbPersistence = hasDesktopLevelDbPersistence(env);
  const hasProviderRequestEndpoint = hasDesktopProviderRequestEndpoint(env);

  return {
    host: "desktop",
    capabilities: [
      ...(hasLevelDbPersistence ? ["leveldb-agent-config"] : []),
      ...(hasProviderRequestEndpoint ? ["local-provider"] : []),
      ...(hasLevelDbPersistence ? ["leveldb-persistence"] : []),
    ],
    serverFallbackAvailable: true,
  };
}

export function buildDesktopAgentRuntimeDecisionInput(
  env: DesktopAgentRuntimeEnv
): AgentRuntimeDecisionInput {
  return buildAgentRuntimeDecisionInput(describeDesktopAgentRuntimeHostFacts(env));
}
