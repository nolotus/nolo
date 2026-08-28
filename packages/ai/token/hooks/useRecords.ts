import { useState, useCallback, useEffect, useRef } from "react";
import {
  fetchUsageRecordsPage,
  fetchAllUsageRecords,
} from "ai/token/usageApi";
import { ALL_MODELS } from "ai/token/usageConstants";
import { TokenRecord } from "ai/token/types";
import { useUsageApiDeps } from "./useUsageApiDeps";

const PAGE_SIZE = 50;

export interface RecordsFilter {
  /** inclusive UTC start boundary, epoch ms */
  startTime: number;
  /** inclusive UTC end boundary, epoch ms */
  endTime: number;
  model: string;
}

interface UseRecordsOptions {
  /** 自动循环拉完所有页（用于「今天的全部消耗」这类汇总）；默认 false = 单页 + loadMore */
  all?: boolean;
}

interface UseRecordsReturn {
  records: TokenRecord[];
  /** 首屏 / 窗口或筛选变化后的重置加载 */
  loading: boolean;
  /** 「加载更多」进行中 */
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  /** 手动重置（清空并重拉第一页） */
  reset: () => void;
}

export const useRecords = (
  filter: RecordsFilter,
  options: UseRecordsOptions = {}
): UseRecordsReturn => {
  const deps = useUsageApiDeps();
  const all = Boolean(options.all);

  const [records, setRecords] = useState<TokenRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // 竞态护栏：窗口/筛选/服务器变化时 seq 递增使在途响应作废。
  // 注意：loadMore 有意复用同一 seq（不自增）——它属于当前窗口，
  // 只有窗口切换（loadFromStart 触发 seq++）才会让旧 loadMore 作废。
  // 若误改成 loadMore 自增，会让列表后续追加被「自己」作废，列表永远停在第一页。
  const seqRef = useRef(0);

  const apiParams = useCallback(
    () => ({
      startTime: filter.startTime,
      endTime: filter.endTime,
      model: filter.model === ALL_MODELS ? undefined : filter.model,
    }),
    [filter.startTime, filter.endTime, filter.model]
  );

  const loadFromStart = useCallback(async () => {
    const seq = ++seqRef.current;
    try {
      setLoading(true);
      setLoadingMore(false);
      const result = await fetchUsageRecordsPage(deps, {
        ...apiParams(),
        pageSize: PAGE_SIZE,
      });
      if (seq !== seqRef.current) return;

      setRecords(result.records);
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);

      // all 模式：服务端游标循环到末尾（usageApi 内建 1 万条上限）。
      if (all) {
        const { records: allRecords } = await fetchAllUsageRecords(deps, apiParams());
        if (seq !== seqRef.current) return;
        setRecords(allRecords);
        setNextCursor(null);
        setHasMore(false);
      }
    } catch {
      if (seq !== seqRef.current) return;
      setRecords([]);
      setNextCursor(null);
      setHasMore(false);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [deps, apiParams, all]);

  // 首屏 + deps(server/token)/窗口/模型变化 → 从第一页重新加载。
  useEffect(() => {
    loadFromStart();
  }, [loadFromStart]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || !nextCursor) return;
    const seq = seqRef.current;
    try {
      setLoadingMore(true);
      const result = await fetchUsageRecordsPage(deps, {
        ...apiParams(),
        pageSize: PAGE_SIZE,
        cursor: nextCursor,
      });
      if (seq !== seqRef.current) return;
      setRecords((prev) => [...prev, ...result.records]);
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch {
      // 保持现状，下次点「加载更多」可重试
    } finally {
      if (seq === seqRef.current) setLoadingMore(false);
    }
  }, [deps, apiParams, loading, loadingMore, hasMore, nextCursor]);

  const reset = useCallback(() => {
    seqRef.current += 1;
    setRecords([]);
    setNextCursor(null);
    setHasMore(false);
    loadFromStart();
  }, [loadFromStart]);

  return {
    records,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    reset,
  };
};
