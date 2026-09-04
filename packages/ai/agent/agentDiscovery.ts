import { isOAuthApiKeyRef } from "agent-runtime/serverProxyPolicy";
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

export type BillingSource =
  | "user_subscription"
  | "user_api"
  | "platform_credits"
  | "local";

export type DiscoveryScope = "preferred" | "public" | "all";

export interface AgentBillingCandidate {
  local?: boolean;
  isLocal?: boolean;
  cliProvider?: string | null;
  apiSource?: string | null;
  provider?: string | null;
  billingSource?: BillingSource | string | null;
  isOAuth?: boolean;
  apiKeyRef?: string | null;
  isOwned?: boolean;
  isPublic?: boolean;
}

/**
 * Resolve the explicit billing source for an agent.
 *
 * Rules:
 * 1. local: CLI local provider, local runtime, or explicit local flags.
 * 2. user_subscription: OAuth subscriptions (Anthropic/OpenAI/xAI OAuth via serverProxyPolicy).
 * 3. user_api: Custom API keys / endpoints configured on owned/custom agents.
 * 4. platform_credits: Public plaza agents, platform API sources, or unconfigured platform routes.
 */
export function resolveBillingSource(candidate: AgentBillingCandidate): BillingSource {
  if (
    candidate?.local === true ||
    candidate?.isLocal === true ||
    candidate?.cliProvider === "local" ||
    candidate?.apiSource === "local" ||
    candidate?.provider === "local" ||
    candidate?.billingSource === "local"
  ) {
    return "local";
  }

  // 非自有 Agent 的 OAuth/custom 信号（apiKeyRef/apiSource/billingSource）是
  // record 作者可自声明的字段，不能证明由当前用户的订阅或 API 付费。无法
  // 证明用户付费时一律保守归类 platform_credits：宁可对平台计费资源展示
  // 扣费告知，也绝不把平台计费错标成 user 免费（错标方向才是危险的）。
  if (candidate?.isOwned !== true) {
    return "platform_credits";
  }

  if (
    candidate?.isOAuth === true ||
    candidate?.billingSource === "user_subscription" ||
    candidate?.apiSource === "oauth" ||
    isOAuthApiKeyRef(candidate?.apiKeyRef)
  ) {
    return "user_subscription";
  }

  if (
    candidate?.apiSource === "custom" ||
    candidate?.billingSource === "user_api"
  ) {
    return "user_api";
  }

  return "platform_credits";
}

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
export function filterAgentsByScope<T extends SafeAgentSummary>(
  agents: T[],
  scope: DiscoveryScope
): T[] {
  if (scope === "preferred") {
    return agents.filter((agent) => isPreferredAgent(agent));
  }
  if (scope === "public") {
    return agents.filter((agent) => isPublicDiscoveryAgent(agent));
  }
  // scope === "all": deduplicated union of preferred and public agents
  return agents.filter((agent) => isPreferredAgent(agent) || agent.isPublic === true);
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
