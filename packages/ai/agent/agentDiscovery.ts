import { DISPATCH_TIER_RANK, resolveModelTier, type DispatchDifficulty, type ModelTier } from "./dispatchSelectionPolicy";
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
  promoteSharedCredentialGroupQuota,
  type CompactAgentQuota,
} from "./safeAgentSummary";
import {
  isAgentUnavailableNow,
  isSubscriptionPeriodWindow,
  resolveAgentAvailability,
  DEFAULT_PROVIDER_RETRY_MS,
} from "./agentAvailabilityShared";
import { resolveAgentSelectionPriority } from "./agentSelectionPriority";

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

/** Host-owned identity, never taken from listAgents tool arguments. */
export interface PlanningCaller {
  agentKey?: string;
  effectiveModel?: string;
  runKind?: "interactive" | "subtask";
  /**
   * 调用者自身所属凭据池（可选透传，主要供测试或已知凭据的宿主使用）。
   * 未传时由 agentKey 在候选集内反查——不引入任何新增网络或存储读取。
   */
  credentialGroup?: string | null;
}

/**
 * 调用者自身的 `credentialGroup`：显式传参优先，其次按 agentKey 在候选集内反查。
 * 只认非空字符串；解析不出就是「未知」，不参与任何异池判定。
 */
function resolveCallerCredentialGroup<T extends SafeAgentSummary>(
  agents: T[],
  caller: PlanningCaller | undefined,
): string | undefined {
  const explicit = caller?.credentialGroup;
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  const callerKey = typeof caller?.agentKey === "string" && caller.agentKey.trim()
    ? caller.agentKey : undefined;
  if (!callerKey) return undefined;
  const own = agents.find((agent) => agent.agentKey === callerKey);
  const group = own?.credentialGroup;
  return typeof group === "string" && group.length > 0 ? group : undefined;
}

/** 池姿态调用者身份：configured agentKey（用于排除自身）+ 实际运行模型。 */
export interface FreePoolCaller {
  /** 调用者自己的 agentKey；与候选同 key 时该候选不参与「外部更高档」比较。 */
  agentKey?: string | null;
  /** 调用者**实际运行**的模型（可能与自身配置模型不同，例如配置 kimi-k3 实跑 flash）。 */
  model?: string | null;
}

/** 池姿态候选的最小形状（server/CLI 端由 toSafeAgentSummary 投影而来）。 */
export interface FreePoolCandidate {
  agentKey?: string | null;
  model?: unknown;
  requiresPaidApproval?: boolean;
}

const asCallerModel = (
  caller: FreePoolCaller | string | null | undefined,
): string | null | undefined =>
  typeof caller === "string" ? caller : caller?.model ?? null;

const asCallerAgentKey = (
  caller: FreePoolCaller | string | null | undefined,
): string => {
  if (typeof caller === "string" || !caller) return "";
  return typeof caller.agentKey === "string" ? caller.agentKey.trim() : "";
};

/**
 * 相对池姿态推导（纯函数，零 I/O）：当前调用者是否已是「免付费池顶」。
 *
 * 首参兼容两种形态：旧式 `string | null | undefined`（调用者模型），或
 * `{ model, agentKey }` 对象（推荐——带上 agentKey 才能严格排除自身）。
 *
 * 三态（保守优先不误判）：
 * - 候选池为空 → undefined（无结论，调用方按既有行为走）；
 * - 调用者模型档位推不出（unknown）→ undefined；
 * - 过滤掉自身（agentKey 相同）后没有外部候选 → true（单模型池，自身即池顶）；
 * - 存在 requiresPaidApproval === false 且档位**严格更高**的外部候选 → false；
 * - 存在无法排除为「更高免付费档」的外部候选（requiresPaidApproval !== true 且
 *   [档位推不出，或扣费未知但档位更高]）→ undefined；
 * - 否则（外部候选要么明确需付费，要么已知档位 <= 自身）→ true。
 *
 * 「排除自身」是关键：实际运行模型与自身配置模型不一致时（配置 kimi-k3、实跑
 * flash），不排除自身会把自身那条更高档配置当成外部免费升档 → 误判 false。
 */
export function isCallerAtFreePoolTop(
  caller: FreePoolCaller | string | null | undefined,
  candidates: ReadonlyArray<FreePoolCandidate>,
): boolean | undefined {
  if (candidates.length === 0) return undefined;
  const currentTier = resolveModelTier(asCallerModel(caller));
  if (currentTier === "unknown") return undefined;
  const currentRank = DISPATCH_TIER_RANK[currentTier];
  const callerAgentKey = asCallerAgentKey(caller);
  // 自身只有「两边都有 agentKey 且相同」才算自身；缺 key 时不做身份猜测。
  const external = candidates.filter(
    (candidate) =>
      !(
        typeof candidate.agentKey === "string" &&
        candidate.agentKey &&
        callerAgentKey &&
        candidate.agentKey === callerAgentKey
      ),
  );
  // 过滤自身后池内只剩自身（单模型池）：没有可比的外部候选，自身即池顶。
  if (external.length === 0) return true;

  const hasStrictlyHigherFree = external.some((candidate) => {
    if (candidate.requiresPaidApproval !== false) return false;
    const tier = resolveModelTier(candidate.model);
    return tier !== "unknown" && DISPATCH_TIER_RANK[tier] > currentRank;
  });
  if (hasStrictlyHigherFree) return false;

  // 任何「既不确定要付费、也无法证明档位不高于自己」的外部候选都让结论不可下。
  const hasUnresolvableCandidate = external.some((candidate) => {
    if (candidate.requiresPaidApproval === true) return false;
    const tier = resolveModelTier(candidate.model);
    if (tier === "unknown") return true;
    if (candidate.requiresPaidApproval === undefined) {
      return DISPATCH_TIER_RANK[tier] > currentRank;
    }
    return false;
  });
  if (hasUnresolvableCandidate) return undefined;

  return true;
}

export interface PlanningRecommendation {
  /** Conditional advice only: the model decides whether planning and domain fit apply. */
  condition: "when_planning_needed_and_candidate_suitable";
  action: "self" | "delegate";
  reason: "bounded_subtask" | "caller_unknown" | "caller_tier_unknown" | "pool_incomplete"
    | "higher_suitable_agent" | "no_higher_suitable_agent" | "paid_approval_required";
  currentTier: ModelTier;
  agentKey?: string;
  recommendedTier?: ModelTier;
  poolComplete: boolean;
  requiresPaidApproval: boolean;
}

function recommendPlanning(
  agents: SafeAgentSummary[], caller: PlanningCaller | undefined, poolComplete: boolean,
): PlanningRecommendation {
  const callerKey = typeof caller?.agentKey === "string" && caller.agentKey.trim()
    ? caller.agentKey : undefined;
  // Missing identities must not match a candidate whose runnable key is also absent.
  const current = callerKey ? agents.find(a => a.agentKey === callerKey) : undefined;
  const currentTier = callerKey ? resolveModelTier(caller?.effectiveModel ?? current?.model) : "unknown";
  const base = {
    condition: "when_planning_needed_and_candidate_suitable" as const,
    action: "self" as const, currentTier, poolComplete, requiresPaidApproval: false,
  };
  if (caller?.runKind === "subtask") return { ...base, reason: "bounded_subtask" };
  if (!callerKey) return { ...base, reason: "caller_unknown" };
  if (currentTier === "unknown") return { ...base, reason: "caller_tier_unknown" };
  if (!poolComplete) return { ...base, reason: "pool_incomplete" };
  // Tier is weak guidance, not a domain/quality score. Keep domain fit conditional.
  // Availability annotations are advisory; do not turn stale quota/cooldown into gates.
  const higher = agents.filter(a => a.agentKey && a.agentKey !== callerKey
    && a.modelTier !== "unknown" && DISPATCH_TIER_RANK[a.modelTier] > DISPATCH_TIER_RANK[currentTier]);
  const free = higher.filter(a => a.requiresPaidApproval === false);
  free.sort((a, b) => DISPATCH_TIER_RANK[b.modelTier as DispatchDifficulty] - DISPATCH_TIER_RANK[a.modelTier as DispatchDifficulty]);
  const best = free[0];
  if (best) return { ...base, action: "delegate", reason: "higher_suitable_agent",
    agentKey: best.agentKey, recommendedTier: best.modelTier };
  if (higher.length) return { ...base, reason: "paid_approval_required", requiresPaidApproval: true };
  return { ...base, reason: "no_higher_suitable_agent" };
}

export interface BuildAgentDiscoveryResultOptions<T extends SafeAgentSummary> {
  agents: T[];
  caller?: PlanningCaller;
  /** Host-side scope filtering (for example a space) makes the pool partial. */
  poolRestricted?: boolean;
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
  availableCount: number;
  agents: (CompactSafeAgentSummary | UltraCompactSafeAgentSummary | SafeAgentSummary)[];
  planningRecommendation: PlanningRecommendation;
  tierHints?: Partial<Record<DispatchDifficulty, { agentKey: string; name: string; model: string | null }>>;
  credentialGroups: CredentialGroupSummary[];
}

/** Infinity leaves candidates without a usable reset signal in existing list order. */
function nearestFundedSubscriptionReset(agent: SafeAgentSummary, now: number): number {
  let nearest = Infinity;
  if (agent.billingSource !== "user_subscription") return nearest;
  for (const window of agent.quota?.windows ?? []) {
    const { resetAt, remaining, utilization } = window;
    if (typeof resetAt === "number" && resetAt > now && resetAt < nearest &&
        isSubscriptionPeriodWindow(window) &&
        ((typeof remaining === "number" && remaining > 0) ||
         (typeof utilization === "number" && utilization < 0.95))) {
      nearest = resetAt;
    }
  }
  return nearest;
}

function meteredUnitPrice(agent: SafeAgentSummary): number {
  if (agent.billingSource === "user_subscription" || agent.billingSource === "owner_subscription") return Infinity;
  const input = agent.inputPrice !== null && Number.isFinite(agent.inputPrice) ? agent.inputPrice : 0;
  const output = agent.outputPrice !== null && Number.isFinite(agent.outputPrice) ? agent.outputPrice : 0;
  return input > 0 || output > 0 ? input + output : Infinity;
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

  // compact:true 的额外压缩：同一 credentialGroup 下窗口内容相同的 quota 只留一份，
  // 提升到 credentialGroups[] 上（凭据级事实不该在 4~6 个 agent 条目里各抄一遍）。
  // 只动输出投影，不动 sortedAgents：total/tierHints/availableCount 仍按完整摘要算。
  // 注：下游按字节预算裁剪的分页器会在**实际交付的前缀**上重跑同一提升逻辑
  // （candidateSpeedContext.ts），这里只负责不走分页时的整页结论。
  type CompactQuotaCarrier = {
    credentialGroup?: string;
    isOwned?: boolean;
    quota?: CompactAgentQuota;
    quotaRef?: string;
  };
  const compacted =
    options.compact === true && options.verbose !== true
      ? (promoteSharedCredentialGroupQuota(
          projectedAgents as unknown as CompactQuotaCarrier[],
          credentialGroups,
        ) as unknown as { agents: typeof projectedAgents; groups: typeof credentialGroups })
      : { agents: projectedAgents, groups: credentialGroups };

  const tierHints: NonNullable<AgentDiscoveryResult["tierHints"]> = {};
  const tierHintPreferences =
    new Map<DispatchDifficulty, { priority: number; differentGroup: boolean; resetAt: number; price: number }>();
  const callerCredentialGroup = resolveCallerCredentialGroup(sortedAgents, options.caller);
  for (const agent of sortedAgents) {
    const { agentKey, name, model, modelTier, requiresPaidApproval, availabilityStatus } = agent;
    if (!agentKey || requiresPaidApproval !== false || modelTier === "unknown" ||
        availabilityStatus === "quota_exhausted" || availabilityStatus === "rate_limited") continue;

    const priority = resolveAgentSelectionPriority(agent);
    const current = tierHintPreferences.get(modelTier);
    // Sorted agents are already grouped by priority; never replace a higher-priority hint.
    if (current && current.priority !== priority) continue;
    // 同档同优先级内优先与调用者异池（例如 Antigravity/Claude/ChatGPT OAuth 主座
    // 优先把执行任务交给 DeepSeek/GLM 等独立池通道）。未知 credentialGroup 的候选
    // 不算「确认异池」，不因缺少凭据信息插队；调用者凭据未知时整条规则不生效。
    const differentGroup = callerCredentialGroup !== undefined &&
      Boolean(agent.credentialGroup) && agent.credentialGroup !== callerCredentialGroup;
    const resetAt = nearestFundedSubscriptionReset(agent, now);
    const price = resetAt === Infinity ? meteredUnitPrice(agent) : Infinity;
    if (current && current.differentGroup !== differentGroup) {
      if (current.differentGroup) continue;
    } else if (current && (resetAt > current.resetAt || (resetAt === current.resetAt && price >= current.price))) {
      continue;
    }
    tierHintPreferences.set(modelTier, { priority, differentGroup, resetAt, price });
    tierHints[modelTier] = { agentKey, name, model };
  }

  // 键插入顺序即 JSON.stringify 的输出顺序：把 agents 放在最前，
  // credentialGroups 放到最后（见 AgentDiscoveryResult）。
  return {
    total,
    ...(typeof offset === "number" ? { offset } : {}),
    ...(typeof limit === "number" ? { limit } : {}),
    ...(isTruncated ? { truncated: true } : {}),
    unavailableCount,
    availableCount: sortedAgents.length,
    agents: compacted.agents,
    planningRecommendation: recommendPlanning(
      sortedAgents, options.caller,
      !isTruncated && scope === "all" && !hasQuery && !options.poolRestricted,
    ),
    ...(Object.keys(tierHints).length > 0 ? { tierHints } : {}),
    credentialGroups: compacted.groups,
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
