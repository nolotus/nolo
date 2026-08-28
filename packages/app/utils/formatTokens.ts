// app/utils/formatTokens.ts
// 格式化 token 数字为人类可读的短格式：1.2M / 12.3k / 123
// 在 UsageChart / UsageRecord / PricingSimulatorCard 共用，避免重复实现。

/**
 * 将 token 数量格式化为短字符串。
 * - ≥1M:  "11.2M"（≥10M 时去掉小数）
 * - ≥1k:  "12.3k"（≥10k 时去掉小数）
 * - 其他: "123"
 */
export const formatTokens = (n: number): string => {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(n));
};