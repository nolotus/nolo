// ai/token/pricingSimulator.ts
// Pricing simulator & break-even cache hit calculator.
// 纯函数，零 I/O 依赖。输入是聚合后的 workload 数字 + 定价表，输出成本和阈值。
//
// 架构原则：billing 是金融真值，本模块只是 observability projection。
// 不参与计费，不修改 TokenRecord，不调用 store。

/**
 * 定价方案：每百万 token 的单价。
 * input = miss tokens 单价（未命中 cache 的 input）
 * cachedInput = cache hit tokens 单价
 * output = output tokens 单价
 *
 * 注意：inputPerMillion 是 miss tokens 的单价，不是 total input 的单价。
 * 因为 cache hit 的部分按 cachedInputPerMillion 单独计价，不能重复收费。
 */
export interface Pricing {
  inputPerMillion: number;
  cachedInputPerMillion: number;
  outputPerMillion: number;
}

/**
 * 聚合后的 workload 数字。可以从 DayStats.total 或 TokenRecord 聚合得到。
 * inputTokens = total input（含 cache hit）
 * cachedInputTokens = cache_read_input_tokens
 * outputTokens = output tokens
 */
export interface Workload {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

/**
 * 从 Workload 计算衍生指标。
 */
export interface WorkloadFingerprint {
  calls: number;
  inputTokens: number;
  cachedInputTokens: number;
  missInputTokens: number;
  outputTokens: number;
  cacheHitRate: number;
  outputInputRatio: number;
}

/**
 * 单个定价方案下的模拟成本结果。
 */
export interface PricingReplayResult {
  name: string;
  cost: number;
  costPerCall: number;
}

/**
 * Break-even 分析结果。
 */
export interface BreakEvenResult {
  pricingA: Pricing;
  pricingB: Pricing;
  /** A 和 B 成本相等时的 cache hit rate（0-1）。 */
  breakEvenHitRate: number | null;
  /** 当前 workload 的 cache hit rate。 */
  currentHitRate: number;
  /** 当前 hit rate 下 A 是否比 B 便宜。 */
  aIsCheaper: boolean;
  /** 安全余量（百分点）。正值 = A 安全，负值 = A 已不划算。 */
  safetyMarginPp: number | null;
}

// ---- DayStats → Workload aggregation ----

/**
 * 聚合多个 DayStats 为一个 Workload。
 * 从 DayStats.total.tokens 读取 input/cacheRead/output，兼容旧字段名 cache_read。
 * 纯函数，可在前端和后端共用。
 */
export const aggregateWorkload = (dayStats: { total?: { tokens?: any } }[]): Workload => {
  let inputTokens = 0;
  let cachedInputTokens = 0;
  let outputTokens = 0;
  for (const ds of dayStats) {
    const t = (ds.total?.tokens ?? {}) as any;
    inputTokens += t.input ?? 0;
    cachedInputTokens += t.cacheRead ?? t.cache_read ?? 0;
    outputTokens += t.output ?? 0;
  }
  return { inputTokens, cachedInputTokens, outputTokens };
};

// ---- 纯函数 ----

/**
 * 计算 miss tokens = max(0, input - cached)。
 */
export const missTokens = (w: Workload): number =>
  Math.max(0, w.inputTokens - w.cachedInputTokens);

/**
 * 计算 cache hit rate = cached / input。input 为 0 时返回 0。
 */
export const cacheHitRate = (w: Workload): number =>
  w.inputTokens > 0 ? w.cachedInputTokens / w.inputTokens : 0;

/**
 * 计算 output/input ratio。input 为 0 时返回 0。
 */
export const outputInputRatio = (w: Workload): number =>
  w.inputTokens > 0 ? w.outputTokens / w.inputTokens : 0;

/**
 * 从 Workload 生成 fingerprint。
 * calls 需要外部传入（Workload 不含 calls，因为它是聚合后的数字）。
 */
export const workloadFingerprint = (w: Workload, calls = 0): WorkloadFingerprint => ({
  calls,
  inputTokens: w.inputTokens,
  cachedInputTokens: w.cachedInputTokens,
  missInputTokens: missTokens(w),
  outputTokens: w.outputTokens,
  cacheHitRate: cacheHitRate(w),
  outputInputRatio: outputInputRatio(w),
});

/**
 * 给定 workload 和定价方案，计算总成本。
 *
 * cost = missTokens / 1M * inputPerMillion
 *      + cachedTokens / 1M * cachedInputPerMillion
 *      + outputTokens / 1M * outputPerMillion
 *
 * 注意：inputTokens 包含 cached tokens，但 cached 部分按 cachedInputPerMillion 单独计价，
 * 所以 miss = input - cached，不重复收费。
 */
export const pricingReplay = (w: Workload, pricing: Pricing): number => {
  const miss = missTokens(w);
  return (
    (miss / 1_000_000) * pricing.inputPerMillion +
    (w.cachedInputTokens / 1_000_000) * pricing.cachedInputPerMillion +
    (w.outputTokens / 1_000_000) * pricing.outputPerMillion
  );
};

/**
 * 批量 pricing replay：多个定价方案对比。
 */
export const pricingReplayBatch = (
  w: Workload,
  scenarios: { name: string; pricing: Pricing }[],
  calls = 0,
): PricingReplayResult[] => {
  const results = scenarios.map(({ name, pricing }) => {
    const cost = pricingReplay(w, pricing);
    return { name, cost, costPerCall: calls > 0 ? cost / calls : 0 };
  });
  // 按 cost 升序排序
  return results.sort((a, b) => a.cost - b.cost);
};

/**
 * 计算 break-even cache hit rate：A 和 B 成本相等时的 hit rate。
 *
 * 给定 output/input ratio（固定），成本只随 hit rate 变化：
 *   cost_A(h) = (1-h) * input * P_A.input / 1M + h * input * P_A.cache / 1M + outputRatio * input * P_A.output / 1M
 *   cost_B(h) = (1-h) * input * P_B.input / 1M + h * input * P_B.cache / 1M + outputRatio * input * P_B.output / 1M
 *
 * 令 cost_A(h) = cost_B(h)，解 h（hit rate）：
 *   h * (P_B.input - P_A.input + P_A.cache - P_B.cache) = P_B.input - P_A.input + outputRatio * (P_B.output - P_A.output)
 *
 * 如果分母为 0，说明 A 和 B 的 cache 价格差等于 input 价格差，break-even 不存在（或处处相等）。
 *
 * @param currentWorkload 当前 workload（用其 outputInputRatio 和 cacheHitRate）
 * @param pricingA 方案 A
 * @param pricingB 方案 B
 */
export const breakEvenHitRate = (
  currentWorkload: Workload,
  pricingA: Pricing,
  pricingB: Pricing,
): BreakEvenResult => {
  const currentHitRate = cacheHitRate(currentWorkload);
  const outputRatio = outputInputRatio(currentWorkload);

  // cost_A(h) = cost_B(h) 解方程
  // 令 D_input = P_B.input - P_A.input
  // 令 D_cache = P_A.cache - P_B.cache  (注意方向：A 的 cache 优势)
  // 令 D_output = P_B.output - P_A.output
  // h * (D_input + D_cache) = D_input + outputRatio * D_output
  const D_input = pricingB.inputPerMillion - pricingA.inputPerMillion;
  const D_cache = pricingA.cachedInputPerMillion - pricingB.cachedInputPerMillion;
  const D_output = pricingB.outputPerMillion - pricingA.outputPerMillion;

  const denominator = D_input + D_cache;
  const numerator = D_input + outputRatio * D_output;

  let breakEvenHitRate: number | null;
  if (Math.abs(denominator) < 1e-12) {
    breakEvenHitRate = null; // 不存在唯一 break-even
  } else {
    breakEvenHitRate = numerator / denominator;
    // clip to [0, 1]
    breakEvenHitRate = Math.max(0, Math.min(1, breakEvenHitRate));
  }

  // 判断当前 hit rate 下 A 是否更便宜
  const costA = pricingReplay(currentWorkload, pricingA);
  const costB = pricingReplay(currentWorkload, pricingB);
  const aIsCheaper = costA < costB;

  // Safety margin: positive when A is cheaper and has room before becoming
  // more expensive; negative when A is already more expensive than B.
  // Use abs(distance) so the sign is determined solely by aIsCheaper,
  // avoiding sign flips from the break-even direction.
  const distance =
    breakEvenHitRate !== null
      ? Math.abs(currentHitRate - breakEvenHitRate) * 100
      : 0;
  const safetyMarginPp =
    breakEvenHitRate !== null ? (aIsCheaper ? distance : -distance) : null;

  return {
    pricingA,
    pricingB,
    breakEvenHitRate,
    currentHitRate,
    aIsCheaper,
    safetyMarginPp,
  };
};