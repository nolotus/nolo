import { estimateTokenCount } from "../../ai/context/tokenUtils";

export interface LiveTurnTrackerOptions {
  throttleMs?: number;
  now?: () => number;
}

export interface LiveTurnTracker {
  onStreamChunk(currentContent?: string): { updated: boolean; liveTokens?: number };
  getLiveTokens(): number | undefined;
}

/**
 * 轮内流式生成阶段的 token 占用追踪器：
 * - 节流 ≥200ms（或自定义 throttleMs）避免高频打满状态栏重绘
 * - 单调递增：流式生成量只涨不跌
 * - 输入未变时不触发状态变更
 * - 轮次独立：每轮新建 tracker 实例，生命周期在 turn 结束时自然终止
 */
export function createLiveTurnTracker(options?: LiveTurnTrackerOptions): LiveTurnTracker {
  const throttleMs = options?.throttleMs ?? 200;
  const nowFn = options?.now ?? Date.now;
  let lastEstimateTime = 0;
  let liveTurnEstimatedTokens: number | undefined = undefined;

  return {
    onStreamChunk(currentContent?: string): { updated: boolean; liveTokens?: number } {
      const now = nowFn();
      if (now - lastEstimateTime < throttleMs) {
        return { updated: false, liveTokens: liveTurnEstimatedTokens };
      }
      lastEstimateTime = now;
      const text = currentContent ?? "";
      const estimatedDelta = estimateTokenCount(text);
      if (
        estimatedDelta > 0 &&
        (liveTurnEstimatedTokens === undefined || estimatedDelta > liveTurnEstimatedTokens)
      ) {
        liveTurnEstimatedTokens = estimatedDelta;
        return { updated: true, liveTokens: liveTurnEstimatedTokens };
      }
      return { updated: false, liveTokens: liveTurnEstimatedTokens };
    },
    getLiveTokens(): number | undefined {
      return liveTurnEstimatedTokens;
    },
  };
}
