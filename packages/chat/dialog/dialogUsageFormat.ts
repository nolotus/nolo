/** Compact token counts for usage UI (1.2k / 1.5M). */
export const formatCompactTokenCount = (count: number): string => {
  const safe = Math.max(0, count);
  if (safe < 1000) return String(safe);
  if (safe < 1_000_000) {
    const val = safe / 1000;
    return val % 1 === 0 ? `${val}k` : `${val.toFixed(1)}k`;
  }
  const val = safe / 1_000_000;
  return val % 1 === 0 ? `${val}M` : `${val.toFixed(1)}M`;
};

export const getDialogTokenTotal = (inputTokens: number, outputTokens: number): number =>
  Math.max(0, inputTokens) + Math.max(0, outputTokens);

export const getContextWindowUsagePercent = (
  usedTokens: number,
  contextWindow: number
): number => {
  if (!Number.isFinite(contextWindow) || contextWindow <= 0) return 0;
  return Math.min(100, Math.round((usedTokens / contextWindow) * 100));
};