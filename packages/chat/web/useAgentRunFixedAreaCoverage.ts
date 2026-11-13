// packages/chat/web/useAgentRunFixedAreaCoverage.ts
// 读侧：固定运行区当前**逐行覆盖**的 runId 集合。

import { useSyncExternalStore } from "react";
import {
  getAgentRuns,
  getAgentRunsVersion,
  getRemoteTasks,
  subscribeAgentRuns,
  type AgentRunScope,
} from "./agentRunStore";
import {
  AGENT_RUN_FIXED_AREA_VISIBLE_ROWS,
  getAgentRunFixedAreaVersion,
  isAgentRunFixedAreaMountedFor,
  subscribeAgentRunFixedArea,
} from "./agentRunFixedArea";

const EMPTY_COVERED_RUN_IDS: ReadonlySet<string> = new Set();

function subscribeCoverage(listener: () => void): () => void {
  const offRuns = subscribeAgentRuns(listener);
  const offArea = subscribeAgentRunFixedArea(listener);
  return () => {
    offRuns();
    offArea();
  };
}

/**
 * 纯计算：固定运行区逐行覆盖的 runId（hook 与测试共用同一实现）。
 *
 * 三条硬约束：
 * 1. 固定区未挂载 → 空集（没有覆盖，调用方必须保留回执）。
 * 2. 只算逐行展示的前 `AGENT_RUN_FIXED_AREA_VISIBLE_ROWS` 条，
 *    `+N` 汇总行里的 run 不算已被覆盖。
 * 3. 只读 store，不发起 hydration / 定时器：拉取接线仍归固定区自己。
 */
export function computeCoveredAgentRunIds(
  scope?: AgentRunScope,
): ReadonlySet<string> {
  if (!scope || !scope.userId || !isAgentRunFixedAreaMountedFor(scope)) {
    return EMPTY_COVERED_RUN_IDS;
  }
  const ids = new Set<string>();
  // 与 `AgentRunsPanel` 的渲染顺序/slice 保持一致：远程任务行在前，run 行在后。
  for (const card of getRemoteTasks(scope).slice(
    0,
    AGENT_RUN_FIXED_AREA_VISIBLE_ROWS,
  )) {
    ids.add(card.runId);
  }
  for (const run of getAgentRuns(scope).slice(
    0,
    AGENT_RUN_FIXED_AREA_VISIBLE_ROWS,
  )) {
    ids.add(run.runId);
  }
  return ids;
}

/** 订阅 store + 固定区挂载状态的覆盖集合（render 侧入口）。 */
export function useAgentRunFixedAreaCoveredIds(
  scope?: AgentRunScope,
): ReadonlySet<string> {
  const snapshot = useSyncExternalStore(
    subscribeCoverage,
    () => `${getAgentRunsVersion()}:${getAgentRunFixedAreaVersion()}`,
    () => `${getAgentRunsVersion()}:${getAgentRunFixedAreaVersion()}`,
  );
  void snapshot;
  return computeCoveredAgentRunIds(scope);
}
