/**
 * 缓存 Miss 可观测性与成本统计模块。
 * 纯函数，不调用 LLM、不写 DB。
 */

export const NOISE_FLOOR_TOKENS = 1024;
export const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 分钟 (300,000 ms)

export interface ModelPriceSource {
  inputPerMillion: number;
  outputPerMillion: number;
}

export type CacheMissCause = "idle" | "model_change" | "prefix_change" | "none";

export interface CalculateCacheMissInput {
  prevPrefixHash?: string | null;
  currentPrefixHash?: string | null;
  prevPrefixEstimatedTokens?: number;
  idleMs?: number;
  modelChanged?: boolean;
  idleThresholdMs?: number;
  priceSource?: ModelPriceSource;
}

export interface CacheMissReport {
  missedTokens: number;
  missedCost: number;
  idleMs: number;
  modelChanged: boolean;
  cause: CacheMissCause;
}

/**
 * 根据前后轮前缀指纹、Token数、闲置时间和模型变更状态，评估缓存 Miss 报告。
 */
export function calculateCacheMiss(
  input: CalculateCacheMissInput,
  priceSourceOverride?: ModelPriceSource,
): CacheMissReport {
  const {
    prevPrefixHash,
    currentPrefixHash,
    prevPrefixEstimatedTokens = 0,
    idleMs = 0,
    modelChanged = false,
    idleThresholdMs = DEFAULT_IDLE_TIMEOUT_MS,
    priceSource: inputPriceSource,
  } = input;

  const priceSource = priceSourceOverride ?? inputPriceSource;
  const rawMissedTokens = Math.max(0, prevPrefixEstimatedTokens);

  // 1. 判定原始原因 (raw cause)
  let rawCause: CacheMissCause = "none";

  if (modelChanged) {
    rawCause = "model_change";
  } else if (
    prevPrefixHash &&
    currentPrefixHash &&
    prevPrefixHash !== currentPrefixHash
  ) {
    rawCause = "prefix_change";
  } else if (idleMs >= idleThresholdMs) {
    rawCause = "idle";
  }

  // 2. 噪声过滤：missedTokens < NOISE_FLOOR_TOKENS (1024) 且非 prefix_change 时归为 none
  let finalCause = rawCause;
  let finalMissedTokens = rawMissedTokens;

  if (rawCause === "none" || rawMissedTokens === 0) {
    finalCause = "none";
    finalMissedTokens = 0;
  } else if (
    rawMissedTokens < NOISE_FLOOR_TOKENS &&
    rawCause !== "prefix_change"
  ) {
    finalCause = "none";
    finalMissedTokens = 0;
  }

  // 3. 成本换算
  const inputPricePerMillion = priceSource?.inputPerMillion ?? 0;
  const missedCost =
    finalMissedTokens > 0
      ? (finalMissedTokens / 1_000_000) * inputPricePerMillion
      : 0;

  return {
    missedTokens: finalMissedTokens,
    missedCost,
    idleMs,
    modelChanged,
    cause: finalCause,
  };
}
