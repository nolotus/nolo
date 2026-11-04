import {
  resolveBillingSource,
  type AgentBillingCandidate,
  type BillingSource,
} from "./agentBilling";
import type {
  SafeAgentSummary,
  CompactSafeAgentSummary,
  UltraCompactSafeAgentSummary,
  CredentialGroupSummary,
  SafeAgentSummaryOptions,
} from "./safeAgentSummary";
import {
  sortSafeAgentSummaries,
  toCompactAgentSummary,
  toUltraCompactAgentSummary,
  toSafeAgentSummary,
  omitNullishAgentSummaryFields,
  summarizeCredentialGroups,
} from "./safeAgentSummary";
import {
  isAgentUnavailableNow,
  resolveAgentAvailability,
  DEFAULT_PROVIDER_RETRY_MS,
} from "./agentAvailabilityShared";

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
 * Default is 'all': the user's own/favorite agents plus the public catalog, so one
 * listAgents call covers both. Explicit 'preferred' stays accepted for backwards
 * compatibility even though the public schema no longer advertises it.
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

  return "all";
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
  /**
   * @deprecated 已无过滤语义：冷却/限流中的 agent 现在默认也列出（额度是参考信息）。
   * 保留该入参仅为兼容既有调用方（CLI `--show-unavailable` / server listAgents），
   * 传任何值都不再改变结果。
   */
  showUnavailable?: boolean;
  verbose?: boolean;
  compact?: boolean;
  limit?: number | string;
  offset?: number | string;
  now?: number;
  upstreamTruncated?: boolean;
  upstreamTotal?: number;
}

export function resolvePaginationArgs(args?: {
  limit?: unknown;
  offset?: unknown;
}): { limit?: number; offset?: number } {
  let limit: number | undefined;
  let offset: number | undefined;

  if (args?.limit !== undefined && args?.limit !== null) {
    const raw = args.limit;
    if (typeof raw === "boolean") {
      throw new Error(`Invalid limit '${raw}': must be a positive integer.`);
    }
    if (typeof raw === "number") {
      if (!Number.isInteger(raw) || raw <= 0) {
        throw new Error(`Invalid limit '${raw}': must be a positive integer.`);
      }
      limit = Math.min(raw, 500);
    } else if (typeof raw === "string") {
      if (raw.trim() !== "") {
        if (!/^\d+$/.test(raw.trim())) {
          throw new Error(`Invalid limit '${raw}': must be a positive integer.`);
        }
        const parsed = Number(raw.trim());
        if (!Number.isInteger(parsed) || parsed <= 0) {
          throw new Error(`Invalid limit '${raw}': must be a positive integer.`);
        }
        limit = Math.min(parsed, 500);
      }
    } else {
      throw new Error(`Invalid limit '${String(raw)}': must be a positive integer.`);
    }
  }

  if (args?.offset !== undefined && args?.offset !== null) {
    const raw = args.offset;
    if (typeof raw === "boolean") {
      throw new Error(`Invalid offset '${raw}': must be a non-negative integer.`);
    }
    if (typeof raw === "number") {
      if (!Number.isInteger(raw) || raw < 0) {
        throw new Error(`Invalid offset '${raw}': must be a non-negative integer.`);
      }
      offset = raw;
    } else if (typeof raw === "string") {
      if (raw.trim() !== "") {
        if (!/^\d+$/.test(raw.trim())) {
          throw new Error(`Invalid offset '${raw}': must be a non-negative integer.`);
        }
        const parsed = Number(raw.trim());
        if (!Number.isInteger(parsed) || parsed < 0) {
          throw new Error(`Invalid offset '${raw}': must be a non-negative integer.`);
        }
        offset = parsed;
      }
    } else {
      throw new Error(`Invalid offset '${String(raw)}': must be a non-negative integer.`);
    }
  }

  return { limit, offset };
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

/**
 * listAgents 结果形状。**字段顺序是契约的一部分**（不是排版问题）：
 * host 按字节截断超长工具输出时保留头尾，派发唯一必需的 `agents`
 * （内含必须逐字复制的 agentKey）必须排在最前，凭证分组这类
 * 大块说明性数据排在最后。历史事故：agents 在最末 + 顶层大块在前，
 * 截断后每个候选的 agentKey/tier/billingSource 全部落在被砍掉的中段。
 */
export interface AgentDiscoveryResult {
  total: number;
  offset?: number;
  limit?: number;
  truncated?: boolean;
  unavailableCount: number;
  agents: (CompactSafeAgentSummary | UltraCompactSafeAgentSummary | SafeAgentSummary)[];
  credentialGroups: CredentialGroupSummary[];
}

/**
 * Shared pipeline for agent discovery across web and server runtimes:
 * 1. Resolves scope and filters agents.
 * 2. Annotates unavailable agents (429 rate limit cooldowns) without falling back to public.
 * 3. Keeps every agent in the result; cooldown entries carry availabilityStatus /
 *    availabilityReason / nextAvailableAt as reference info (not a dispatch gate).
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

  scopedAgents = scopedAgents.map((agent) => {
    const decision = resolveAgentAvailability(agent, now);
    if (decision.status === "quota_exhausted") {
      const resetAt = decision.resetAt ?? (now + DEFAULT_PROVIDER_RETRY_MS);
      const nextAvailableAt =
        typeof agent.nextAvailableAt === "number" && agent.nextAvailableAt > resetAt
          ? agent.nextAvailableAt
          : resetAt;
      return {
        ...agent,
        nextAvailableAt,
        availableAt: nextAvailableAt,
        availabilityStatus: decision.status,
        availabilityReason: decision.reason,
      };
    }
    return {
      ...agent,
      availabilityStatus: decision.status,
      availabilityReason: decision.reason,
    };
  });

  // 冷却/限流中的 agent 也照常列出：额度/冷却是参考信息，不是可用性断言
  // （owner 决策 2026-11-03）。unavailableCount 仅作汇总标注，
  // 不构成过滤——agents 是主列表的唯一真源，避免两套并存制造重复真相。
  const unavailableCount = scopedAgents.filter((a) => isAgentUnavailableNow(a, now)).length;
  const credentialGroups = summarizeCredentialGroups(scopedAgents, now);

  const pagination = resolvePaginationArgs({
    limit: options.limit,
    offset: options.offset,
  });
  const offset = pagination.offset;
  const limit = pagination.limit;

  const sortedAgents = sortSafeAgentSummaries(scopedAgents);
  const hasQuery = Boolean(options.query && typeof options.query === "string" && options.query.trim());
  const hasFilteredCandidates = sortedAgents.length < options.agents.length;

  let total: number;
  if (hasQuery) {
    // 带 query 搜索时，在匹配集上反映实际命中总数，不可用未过滤的 upstreamTotal 覆盖。
    total = sortedAgents.length;
  } else if (hasFilteredCandidates) {
    // 候选池经过了 scope 或 availability 本地过滤，未过滤的 upstreamTotal 不再代表真实总数
    total = sortedAgents.length;
  } else if (scope === "public") {
    // scope=public 时，真实总数即公共上游总数（若可用且大于已拉取数）。
    total = typeof options.upstreamTotal === "number" && options.upstreamTotal > sortedAgents.length
      ? options.upstreamTotal
      : sortedAgents.length;
  } else if (scope === "all") {
    // scope=all 混合私有与公共：真实去重后不编造 total。
    // 只有非 public 的纯私有 agent 才需要与公共上游总数相加（避免收藏的公共 agent 重复计数）。
    const privateOnlyCount = scopedAgents.filter((a) => isPreferredAgent(a) && a.isPublic !== true).length;
    const publicPulledCount = scopedAgents.filter((a) => a.isPublic === true).length;
    const effectivePublicTotal =
      typeof options.upstreamTotal === "number" && options.upstreamTotal > publicPulledCount
        ? options.upstreamTotal
        : publicPulledCount;
    // 若公共上游未截断（已完整拉取），真实去重总数即为 sortedAgents.length，绝不虚增
    total = options.upstreamTruncated === true
      ? privateOnlyCount + effectivePublicTotal
      : sortedAgents.length;
  } else {
    // 默认或 preferred scope，在候选池未被本地过滤且上游标记截断时，如实反映上游总数
    total = typeof options.upstreamTotal === "number" && options.upstreamTotal > sortedAgents.length
      ? options.upstreamTotal
      : sortedAgents.length;
  }

  // 截断仅反映候选池是否未完整拉取：
  // 1. 上游明确标记截断（upstreamTruncated === true）
  // 2. 无过滤且上游总数确实大于拉取到的候选数
  const isTruncated =
    options.upstreamTruncated === true ||
    (!hasQuery && !hasFilteredCandidates && typeof options.upstreamTotal === "number" && options.upstreamTotal > sortedAgents.length);

  const pagedAgents =
    typeof limit === "number" || typeof offset === "number"
      ? sortedAgents.slice(
          offset ?? 0,
          (offset ?? 0) + (limit ?? sortedAgents.length),
        )
      : sortedAgents;

  const projectedAgents =
    options.verbose === true
      ? pagedAgents.map(omitNullishAgentSummaryFields)
      : options.compact === true
        ? pagedAgents.map(toUltraCompactAgentSummary)
        : pagedAgents.map(toCompactAgentSummary);

  // 键插入顺序即 JSON.stringify 的输出顺序：把 agents 放在最前，
  // credentialGroups 放到最后（见 AgentDiscoveryResult）。
  return {
    total,
    ...(typeof offset === "number" ? { offset } : {}),
    ...(typeof limit === "number" ? { limit } : {}),
    ...(isTruncated ? { truncated: true } : {}),
    unavailableCount,
    agents: projectedAgents,
    credentialGroups,
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
 * query、429 标注、credentialGroups 归纳、compact/verbose 投影）。禁止任何一端
 * 再手写 matchesAgentQuery / isAgentUnavailableNow / sortSafeAgentSummaries /
 * summarizeCredentialGroups 样板。
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
