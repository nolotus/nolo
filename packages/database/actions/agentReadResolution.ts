import {
  NOLO_CLUSTER_SERVERS,
  normalizeKnownServerOrigin,
} from "database/config";
import { isBuiltinPlatformAgentKey as isCoreBuiltinPlatformAgentKey } from "core/builtinAgents";
export { BUILTIN_PLATFORM_AGENT_KEYS } from "core/builtinAgents";
import { normalizeServerOrigin } from "core/serverOrigin";

const normalizeServer = (server: string): string =>
  normalizeKnownServerOrigin(server) ?? normalizeServerOrigin(server);

export const isBuiltinPlatformAgentKey = (dbKey: string): boolean =>
  isCoreBuiltinPlatformAgentKey(dbKey);

export const resolveAgentReadServers = ({
  dbKey,
  configuredServers,
}: {
  dbKey: string;
  configuredServers: string[];
}): string[] => {
  const normalized = configuredServers.map(normalizeServer);
  if (!isBuiltinPlatformAgentKey(dbKey)) {
    return Array.from(new Set(normalized));
  }
  return Array.from(new Set([...normalized, ...NOLO_CLUSTER_SERVERS]));
};
