import {
  canUsePlatformChatProvider,
  hasDirectOpenAiCompatibleProvider,
} from "agent-runtime";

export type DesktopAgentRuntimeEnv = Record<string, string | undefined>;

function hasDesktopLocalPersistence(env: DesktopAgentRuntimeEnv) {
  return Boolean(env.NOLO_SERVER_DB_PATH?.trim());
}

function hasDesktopProviderEndpoint(env: DesktopAgentRuntimeEnv) {
  return hasDirectOpenAiCompatibleProvider(env) || canUsePlatformChatProvider(env);
}

export function describeDesktopAgentRuntimeHostCapabilities(
  env: DesktopAgentRuntimeEnv
) {
  const hasLocalPersistence = hasDesktopLocalPersistence(env);
  return [
    ...(hasLocalPersistence ? ["leveldb-agent-config"] : []),
    ...(hasDesktopProviderEndpoint(env) ? ["local-provider"] : []),
    ...(hasLocalPersistence ? ["leveldb-persistence"] : []),
  ];
}
