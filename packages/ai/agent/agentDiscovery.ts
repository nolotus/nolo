import {
  resolveBillingSource,
  type AgentBillingCandidate,
  type BillingSource,
} from "./agentBilling";
import type {
  SafeAgentSummary,
  CompactSafeAgentSummary,
  UnavailableAgentSummary,
} from "./safeAgentSummary";
import {
  sortSafeAgentSummaries,
  toCompactAgentSummary,
  toUnavailableAgentSummary,
  omitNullishAgentSummaryFields,
} from "./safeAgentSummary";
import { isAgentUnavailableNow } from "./agentAvailabilityShared";

export type DiscoveryScope = "preferred" | "public" | "all";
export { resolveBillingSource };
export type { AgentBillingCandidate, BillingSource };

/**
 * Preferred agents:
 * - Favorites (user explicitly expressed preference)
 * - Owned by the current user
 * - User OAuth subscription agents
 * - User custom API agents
 * - Local / user-controlled agents
 */
export function isPreferredAgent(agent: {
  isFavorite?: boolean;
  isOwned?: boolean;
  isOAuth?: boolean;
  billingSource?: BillingSource;
}): boolean {
  return (
    agent.isFavorite === true ||
    agent.isOwned === true ||
    agent.isOAuth === true ||
    agent.billingSource === "user_subscription" ||
    agent.billingSource === "user_api" ||
    agent.billingSource === "local"
  );
}

/**
 * Public discovery agents:
 * Accessible public / shared agents, EXCLUDING those already included in preferred
 * (e.g. favorited public agents) so two-phase discovery does not repeat candidates.
 */
export function isPublicDiscoveryAgent(agent: SafeAgentSummary): boolean {
  return agent.isPublic === true && !isPreferredAgent(agent);
}

/**
 * Resolve discovery scope from tool arguments.
 * Handles legacy publicOnly backwards compatibility and rejects conflicting combinations.
 */
export function resolveDiscoveryScope(args?: {
  scope?: unknown;
  publicOnly?: unknown;
}): DiscoveryScope {
  const rawScope = typeof args?.scope === "string" ? args.scope.trim().toLowerCase() : undefined;
  const hasScope = rawScope !== undefined && rawScope !== "";
  const hasPublicOnly = typeof args?.publicOnly === "boolean";
  const publicOnly = args?.publicOnly === true;

  if (hasScope) {
    if (rawScope !== "preferred" && rawScope !== "public" && rawScope !== "all") {
      throw new Error(`Invalid scope '${args?.scope}': must be 'preferred', 'public', or 'all'.`);
    }
    const scope = rawScope as DiscoveryScope;
    if (hasPublicOnly) {
      if (publicOnly && scope !== "public") {
        throw new Error(
          `Conflicting arguments: scope='${args?.scope}' conflicts with publicOnly=true.`
        );
      }
      if (!publicOnly && scope === "public") {
        throw new Error(
          `Conflicting arguments: scope='${args?.scope}' conflicts with publicOnly=false.`
        );
      }
    }
    return scope;
  }

  if (hasPublicOnly && publicOnly) {
    return "public";
  }

  return "preferred";
}

/**
 * Filter agents according to the discovery scope.
 */
function agentIdentityKeys(agent: SafeAgentSummary): string[] {
  return [agent.agentKey, agent.publicKey, agent.id].filter(
    (key): key is string => typeof key === "string" && key.length > 0,
  );
}

export function deduplicateAgentSummaries<T extends SafeAgentSummary>(agents: T[]): T[] {
  const byIdentity = new Map<string, T>();
  for (const agent of agents) {
    const keys = agentIdentityKeys(agent);
    const existing = keys.map((key) => byIdentity.get(key)).find(Boolean);
    if (!existing) {
      for (const key of keys) byIdentity.set(key, agent);
      continue;
    }
    // Hydrated favorites carry the preferred semantics; otherwise retain the
    // first catalog record and never expose the same runnable agent twice.
    const winner = isPreferredAgent(agent) && !isPreferredAgent(existing) ? agent : existing;
    for (const key of new Set([...agentIdentityKeys(existing), ...keys])) byIdentity.set(key, winner);
  }
  return [...new Set(byIdentity.values())];
}

export function filterAgentsByScope<T extends SafeAgentSummary>(
  agents: T[],
  scope: DiscoveryScope
): T[] {
  const unique = deduplicateAgentSummaries(agents);
  if (scope === "preferred") return unique.filter((agent) => isPreferredAgent(agent));
  if (scope === "public") return unique.filter((agent) => isPublicDiscoveryAgent(agent));
  return unique.filter((agent) => isPreferredAgent(agent) || agent.isPublic === true);
}

export interface BuildAgentDiscoveryResultOptions<T extends SafeAgentSummary> {
  agents: T[];
  scope?: DiscoveryScope | string;
  publicOnly?: boolean;
  showUnavailable?: boolean;
  verbose?: boolean;
  now?: number;
}

export interface AgentDiscoveryResult {
  total: number;
  unavailableCount: number;
  unavailableAgents: UnavailableAgentSummary[];
  agents: (CompactSafeAgentSummary | SafeAgentSummary)[];
}

/**
 * Shared pipeline for agent discovery across web and server runtimes:
 * 1. Resolves scope and filters agents.
 * 2. Collects unavailable agents (429 rate limit cooldowns) without falling back to public.
 * 3. Applies availability filtering if requested.
 * 4. Sorts according to priority.
 * 5. Applies compact or verbose projection.
 */
export function buildAgentDiscoveryResult<T extends SafeAgentSummary>(
  options: BuildAgentDiscoveryResultOptions<T>
): AgentDiscoveryResult {
  const scope = resolveDiscoveryScope({
    scope: options.scope,
    publicOnly: options.publicOnly,
  });
  const now = options.now ?? Date.now();

  let scopedAgents = filterAgentsByScope(options.agents, scope);

  const unavailableList = scopedAgents.filter((a) => isAgentUnavailableNow(a, now));
  const unavailableCount = unavailableList.length;
  const unavailableAgents = sortSafeAgentSummaries(unavailableList).map(toUnavailableAgentSummary);

  if (options.showUnavailable !== true) {
    scopedAgents = scopedAgents.filter((a) => !isAgentUnavailableNow(a, now));
  }

  const sortedAgents = sortSafeAgentSummaries(scopedAgents);
  const projectedAgents =
    options.verbose === true
      ? sortedAgents.map(omitNullishAgentSummaryFields)
      : sortedAgents.map(toCompactAgentSummary);

  return {
    total: projectedAgents.length,
    unavailableCount,
    unavailableAgents,
    agents: projectedAgents,
  };
}
