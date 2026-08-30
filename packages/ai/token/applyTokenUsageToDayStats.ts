// ai/token/applyTokenUsageToDayStats.ts
// 统计聚合的唯一纯函数实现。prev + delta → newStats，无 I/O。
// 六条写入路径收敛到这里统一维护日统计投影：
// 1. serverTokenWriter.ts (Server daily token-stats projection)
// 2. updateTokensAction.ts (Client local daily token-stats projection)
// 3. dataHandlers.ts (CLI cli-local token-stats projection)
// 4. desktopAgentRuntimeAdapter.ts (Desktop local agent runtime token projection)
// 5. localRuntimeDialog.ts (CLI local runtime dialog token projection)
// 6. externalToolCost.ts (External tool cost charge and daily token-stats projection)
import type { TokenUsageData } from "./types";

export interface TokenCount {
  input: number;
  output: number;
  /** Cache hit tokens (cache_read_input_tokens). 0 when not reported. */
  cacheRead: number;
  /** Cache creation tokens (cache_creation_input_tokens). 0 when not reported. */
  cacheCreation: number;
}

export interface ModelStats {
  count: number;
  tokens: TokenCount;
  cost: number;
  /** 失败调用数（US-3.3）：status=failed 的记录只计此值，不进 count/tokens/cost */
  failedCount: number;
}

export type BillingCategory = "platform" | "subscription";

export interface DayStats {
  userId: string;
  period: "day";
  timeKey: string;
  total: ModelStats;
  models: Record<string, ModelStats>;
  providers: Record<string, ModelStats>;
  /** Per-agent breakdown. Keyed by agentId (falls back to "unknown"). */
  agents: Record<string, ModelStats>;
  /** Per-entry-path breakdown. Keyed by entry_path (falls back to "unknown"). */
  entryPaths: Record<string, ModelStats>;
  /** Per-billing-category breakdown ("platform" | "subscription"). */
  categories?: Record<string, ModelStats>;
  /** Per-model by billing category breakdown. Keyed by `${model}:::${billingCategory}`. */
  modelCategories?: Record<string, ModelStats>;
}

const ZERO_STATS: ModelStats = {
  count: 0,
  tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
  cost: 0,
  failedCount: 0,
};

/**
 * Normalize a legacy ModelStats (pre-cache-fields) into the current shape.
 * Old records loaded from LevelDB may lack `cacheRead` / `cacheCreation`
 * on `tokens` and `agents` / `entryPaths` on the top-level object.
 */
export function normalizeStats(s: ModelStats | undefined | null): ModelStats {
  if (!s) return { ...ZERO_STATS };
  const t = s.tokens as any;
  return {
    count: s.count ?? 0,
    tokens: {
      input: t?.input ?? 0,
      output: t?.output ?? 0,
      cacheRead: t?.cacheRead ?? t?.cache_read ?? 0,
      cacheCreation: t?.cacheCreation ?? t?.cache_creation ?? 0,
    },
    cost: s.cost ?? 0,
    failedCount: s.failedCount ?? 0,
  };
}

export function normalizeDayStats(prev: DayStats | null, userId: string, timeKey: string): DayStats {
  if (!prev) {
    return {
      userId,
      period: "day" as const,
      timeKey,
      total: { ...ZERO_STATS },
      models: {},
      providers: {},
      agents: {},
      entryPaths: {},
      categories: {},
      modelCategories: {},
    };
  }
  const normalizeMap = (m: Record<string, ModelStats> | undefined): Record<string, ModelStats> => {
    if (!m) return {};
    const out: Record<string, ModelStats> = {};
    for (const [k, v] of Object.entries(m)) out[k] = normalizeStats(v);
    return out;
  };

  const normalizedTotal = normalizeStats(prev.total);
  const normalizedModels = normalizeMap(prev.models);
  const normalizedProviders = normalizeMap(prev.providers);
  const normalizedAgents = normalizeMap((prev as any).agents);
  const normalizedEntryPaths = normalizeMap((prev as any).entryPaths);

  let categories = normalizeMap((prev as any).categories);
  let modelCategories = normalizeMap((prev as any).modelCategories);

  // 兼容性决策：
  // 旧数据无 billingCategory / modelCategories 字段时，normalizeDayStats 保守归入 "platform"。
  // 取舍理由：历史存量数据本就以平台计费为主，归入 platform 可避免「订阅 0 积分」被旧数据污染，
  // 同时保证日聚合数字、历史回放与旧逻辑完全一致。
  const hasCategories = Object.keys(categories).length > 0;
  const hasModelCategories = Object.keys(modelCategories).length > 0;

  if (!hasCategories) {
    const hasActivity =
      normalizedTotal.count > 0 ||
      normalizedTotal.failedCount > 0 ||
      normalizedTotal.cost > 0 ||
      normalizedTotal.tokens.input > 0 ||
      normalizedTotal.tokens.output > 0;
    if (hasActivity) {
      categories = { platform: { ...normalizedTotal } };
    }
  }

  if (!hasModelCategories && Object.keys(normalizedModels).length > 0) {
    const legacyModelCats: Record<string, ModelStats> = {};
    for (const [modelKey, modelStat] of Object.entries(normalizedModels)) {
      legacyModelCats[`${modelKey}:::platform`] = { ...modelStat };
    }
    modelCategories = legacyModelCats;
  }

  return {
    ...prev,
    total: normalizedTotal,
    models: normalizedModels,
    providers: normalizedProviders,
    agents: normalizedAgents,
    entryPaths: normalizedEntryPaths,
    categories,
    modelCategories,
  };
}

/**
 * 累加一条 token 用量到每日统计。纯函数：不读不写 store。
 * - 当 prev 为 null 时按 userId/timeKey 初始化
 * - 始终返回新对象，不 mutate prev
 * - cache/agentId/entryPath/billingCategory 参数可选，向后兼容旧调用点
 * - 自动兼容旧 DayStats（无 cacheRead/cacheCreation/agents/entryPaths/categories/modelCategories 字段）
 */
export function applyTokenUsageToDayStats(
  prev: DayStats | null,
  delta: {
    userId: string;
    timeKey: string;
    model?: string;
    provider?: string;
    input_tokens: number;
    output_tokens: number;
    cost: number;
    /** Cache hit tokens. Defaults to 0 (backward compatible). */
    cache_read_input_tokens?: number;
    /** Cache creation tokens. Defaults to 0 (backward compatible). */
    cache_creation_input_tokens?: number;
    /** Agent identity for per-agent breakdown. Omit to skip agent dimension. */
    agentId?: string;
    /** Entry path for per-entry-path breakdown. Omit to skip entry dimension. */
    entry_path?: string;
    /** 调用终态（US-3.3）："failed" 时只计 failedCount，不进 count/tokens/cost */
    status?: "success" | "failed";
    /** 计费分类：platform（平台计费） | subscription（订阅 0 积分），缺省归入 platform */
    billingCategory?: BillingCategory;
  }
): DayStats {
  const base = normalizeDayStats(prev, delta.userId, delta.timeKey);

  const modelName = delta.model || "unknown";
  const providerName = delta.provider || "unknown";
  const cacheRead = delta.cache_read_input_tokens ?? 0;
  const cacheCreation = delta.cache_creation_input_tokens ?? 0;
  const isFailed = delta.status === "failed";
  const category: BillingCategory = delta.billingCategory || "platform";
  const modelCategoryKey = `${modelName}:::${category}`;

  const inc = (s: ModelStats | undefined): ModelStats => {
    const n = normalizeStats(s);
    if (isFailed) {
      // 失败记录只有计数语义：不进调用次数/成本口径（零污染）
      return {
        ...n,
        failedCount: n.failedCount + 1,
      };
    }
    return {
      count: n.count + 1,
      tokens: {
        input: n.tokens.input + delta.input_tokens,
        output: n.tokens.output + delta.output_tokens,
        cacheRead: n.tokens.cacheRead + cacheRead,
        cacheCreation: n.tokens.cacheCreation + cacheCreation,
      },
      // 非计费记录（订阅/OAuth/CLI，billable=false）不向平台积分统计贡献 cost：
      // 订阅已付费、不按 token 计费，若不归零，图表「成本」视图会把订阅用量误显示为积分消耗。
      cost: Number((n.cost + (category === "subscription" ? 0 : delta.cost)).toFixed(6)),
      failedCount: n.failedCount,
    };
  };

  const result: DayStats = {
    ...base,
    total: inc(base.total),
    models: {
      ...base.models,
      [modelName]: inc(base.models[modelName]),
    },
    providers: {
      ...base.providers,
      [providerName]: inc(base.providers[providerName]),
    },
    categories: {
      ...base.categories,
      [category]: inc(base.categories?.[category]),
    },
    modelCategories: {
      ...base.modelCategories,
      [modelCategoryKey]: inc(base.modelCategories?.[modelCategoryKey]),
    },
  };

  // Only add agent/entryPath breakdowns when the caller provides them.
  if (delta.agentId !== undefined) {
    const agentKey = delta.agentId || "unknown";
    result.agents = {
      ...base.agents,
      [agentKey]: inc(base.agents[agentKey]),
    };
  }
  if (delta.entry_path !== undefined) {
    const entryKey = delta.entry_path || "unknown";
    result.entryPaths = {
      ...base.entryPaths,
      [entryKey]: inc(base.entryPaths[entryKey]),
    };
  }

  return result;
}
