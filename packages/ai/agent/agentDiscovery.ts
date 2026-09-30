import {
  resolveBillingSource,
  type AgentBillingCandidate,
  type BillingSource,
} from "./agentBilling";
import type {
  SafeAgentSummary,
  CompactSafeAgentSummary,
  UnavailableAgentSummary,
  CredentialGroupSummary,
  SafeAgentSummaryOptions,
} from "./safeAgentSummary";
import {
  sortSafeAgentSummaries,
  toCompactAgentSummary,
  toSafeAgentSummary,
  toUnavailableAgentSummary,
  omitNullishAgentSummaryFields,
  summarizeCredentialGroups,
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
  query?: string;
  publicOnly?: boolean;
  showUnavailable?: boolean;
  verbose?: boolean;
  now?: number;
}

export function matchesAgentQuery(agent: SafeAgentSummary, query?: string): boolean {
  if (!query || typeof query !== "string") return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const candidates = [
    agent.name,
    agent.model,
    agent.provider,
    agent.handle,
    agent.agentKey,
    agent.publicKey,
    agent.id,
  ];

  return candidates.some((text) => typeof text === "string" && text.toLowerCase().includes(q));
}

export interface AgentDiscoveryResult {
  total: number;
  unavailableCount: number;
  unavailableAgents: UnavailableAgentSummary[];
  credentialGroups: CredentialGroupSummary[];
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

  if (options.query && typeof options.query === "string" && options.query.trim()) {
    scopedAgents = scopedAgents.filter((a) => matchesAgentQuery(a, options.query));
  }

  const unavailableList = scopedAgents.filter((a) => isAgentUnavailableNow(a, now));
  const unavailableCount = unavailableList.length;
  const unavailableAgents = sortSafeAgentSummaries(unavailableList).map(toUnavailableAgentSummary);
  const credentialGroups = summarizeCredentialGroups(scopedAgents, now);

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
    credentialGroups,
    agents: projectedAgents,
  };
}

/**
 * Record → safe-summary normalization shared by all three listAgents callers.
 * `toSafeAgentSummary` already trusts an explicit `record.publicRecordExists
 * === false` to suppress the derived publicKey, so one projector covers raw
 * records (server / client) and pre-normalized ListedAgent-shaped records
 * (CLI) alike. `publicRecordExists === true` additionally forwards as an
 * option so raw favorites-hydrated records keep the confirmed publicKey even
 * when the shape would otherwise drop it.
 */
export function toDiscoverySafeAgentSummary(
  record: any,
  options?: SafeAgentSummaryOptions
): SafeAgentSummary {
  const mergedOptions: SafeAgentSummaryOptions | undefined =
    record?.publicRecordExists === true
      ? { ...options, publicRecordExists: true }
      : options;
  return toSafeAgentSummary(record, mergedOptions);
}

export interface AssembleAgentDiscoveryOptions<TRecord = any>
  extends Omit<BuildAgentDiscoveryResultOptions<SafeAgentSummary>, "agents"> {
  records: TRecord[];
  /**
   * Options forwarded to toSafeAgentSummary per record (favoritesMap, userId).
   * May also be a function for per-record options (e.g. publicRecordExists).
   */
  summaryOptions?:
    | SafeAgentSummaryOptions
    | ((record: TRecord) => SafeAgentSummaryOptions | undefined);
}

/**
 * 三端（server listAgents / client listAgentsFunc / CLI --safe）共用的唯一装配
 * 契约：record 集合 → toSafeAgentSummary → buildAgentDiscoveryResult（scope、
 * query、429 过滤、credentialGroups 归纳、compact/verbose 投影）。禁止任何一端
 * 再手写 matchesAgentQuery / isAgentUnavailableNow / sortSafeAgentSummaries /
 * toUnavailableAgentSummary / summarizeCredentialGroups 样板。
 */
export function assembleAgentDiscoveryResult<TRecord = any>(
  options: AssembleAgentDiscoveryOptions<TRecord>
): AgentDiscoveryResult {
  const { records, summaryOptions, ...discoveryOptions } = options;
  const agents = records.map((record) =>
    toDiscoverySafeAgentSummary(
      record,
      typeof summaryOptions === "function" ? summaryOptions(record) : summaryOptions
    )
  );
  return buildAgentDiscoveryResult({ ...discoveryOptions, agents });
}
