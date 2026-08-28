// 共享的 usage stats 数据 hook：给定 UTC 日期区间，拉取按日聚合数据。
// 替代 UsageChart / UsageSummary / PricingSimulatorCard 各自重复的
// getTokenStats 拉取 + loading/error/reload 样板（旧 thunk 已随 Wave1 删除）。
import { useState, useEffect, useCallback } from "react";
import {
  fetchTokenStats,
  type TokenStatsItem,
  type TokenStatsParams,
} from "ai/token/usageApi";
import { useUsageApiDeps } from "./useUsageApiDeps";

interface UseUsageStatsResult {
  days: TokenStatsItem[];
  loading: boolean;
  error: string | null;
  /** 重新拉取当前区间 */
  reload: () => void;
}

export const useUsageStats = (
  params: Pick<TokenStatsParams, "startDate" | "endDate" | "period">
): UseUsageStatsResult => {
  const deps = useUsageApiDeps();
  const [days, setDays] = useState<TokenStatsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchTokenStats(deps, { period: "day", ...params })
      .then((data) => {
        if (!cancelled) setDays(data);
      })
      .catch((err: any) => {
        if (cancelled) return;
        console.error("Failed to fetch usage stats:", err);
        setDays([]);
        setError(err?.message ?? "load_failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // deps 对象每次 render 重建（selector 返回新对象）——只在 server/token 实际
    // 变化时重新拉取。用字符串拼 key 避免无谓请求。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps.server, deps.token, params.startDate, params.endDate, params.period, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return { days, loading, error, reload };
};
