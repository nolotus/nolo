/**
 * run 进度心跳（0 次工具调用的纯推理 run）。
 *
 * 现象：一个只做推理/诊断/评审/写作的 run 一次工具都不调，工具调用数恒为 0。
 * 面板上「工具数」这一栏要么是空的、要么是「0 tools」，剩下的只有一个运行时长——
 * 用户看不出它是在思考、在等上游，还是已经卡死。
 *
 * 这里只做两件事，不新增任何数据采集：
 *   1. 工具信息为空时，用「模型调用次数」（activity.counters.llmCalls）当心跳；
 *   2. 依据 activity.lastEventAt 判定「停滞」——次数不涨才是真正的异常。
 *
 * 数据来源全是 `~/.nolo/runs/<runId>.json` 里已经写好的字段：
 *   - activity.counters.llmCalls → 模型调用次数
 *   - activity.lastEventAt      → 最后一次事件时刻
 *   - activity.inFlight         → 此刻在做什么（判定「长时间单次调用」用）
 */

import type { AgentRunSnapshot } from "../client/agentRunSnapshot";
import { isAgentRunTerminalStatus } from "../../ai/tools/agent/agentRunDisplayHelpers";
import { t } from "./i18n";

/**
 * 停滞阈值：最后一次事件距今超过 3 分钟就算「可疑」。
 *
 * 取 3 分钟的理由：正常的模型调用/工具往返远小于这个量级，而一条卡住的
 * run 会在这里露馅。阈值可调，但必须远小于用户愿意盯着一条 run 的时长。
 */
export const RUN_STALL_AFTER_MS = 180_000;

/**
 * 单次长调用的上限。
 *
 * 一次模型调用期间 lastEventAt 也不会更新（事件只在 llm-start/llm-end 时打），
 * 所以「长时间没事件」不等于「卡住」——只要 inFlight 还在、且它自己也没超过
 * 这个上限，就认为 run 正在跑一次长调用，不报停滞。
 */
export const RUN_LONG_INFLIGHT_MS = 600_000;

/**
 * 这个 run 有没有工具侧的活动。
 *
 * 三种证据都算：工具调用计数 > 0、记录过工具名、此刻正在跑一个工具。
 */
export function hasToolProgress(snapshot: AgentRunSnapshot): boolean {
  const count = snapshot.toolCallCount;
  if (typeof count === "number" && Number.isFinite(count) && count > 0) return true;
  if ((snapshot.lastToolNames?.length ?? 0) > 0) return true;
  return snapshot.inFlight?.kind === "tool";
}

/**
 * 工具/心跳事实串。
 *
 * - 有工具活动：保持原样（`12 tools`），工具名由调用方另行渲染。
 * - 工具信息为空（0 次工具调用）：改用模型调用次数当心跳（`3 次模型调用`）。
 * - 连模型调用次数都没有（老记录/服务端快照）：退回旧的 `0 tools` 行为，
 *   不凭空显示「0 次模型调用」。
 */
export function formatToolProgressFact(
  snapshot: AgentRunSnapshot
): string | undefined {
  const raw = snapshot.toolCallCount;
  const toolCount =
    typeof raw === "number" && Number.isFinite(raw) ? raw : undefined;
  if (toolCount !== undefined && toolCount > 0) {
    return t("runToolsCount", String(toolCount));
  }
  // 有工具名/在途工具但没有计数：工具名由调用方渲染，这里不重复。
  if (toolCount !== undefined && hasToolProgress(snapshot)) return undefined;
  const llm = snapshot.llmCallCount;
  if (typeof llm === "number" && Number.isFinite(llm) && llm > 0) {
    return t("runLlmCalls", String(llm));
  }
  // 工具数明确是 0 而模型调用数也没有：保持旧的「0 tools」文案。
  if (toolCount !== undefined) return t("runToolsCount", "0");
  // 什么都不知道（老记录 / 服务端快照）：宁缺勿错，不显示任何工具文案。
  return undefined;
}

/**
 * 「停滞」判定：事件计数不再增长。
 *
 * 只对在跑的 run 有意义——终态 run 的记录不会再更新，lastEventAt 天然是旧的，
 * 拿它判停滞会给一条已完成的 run 挂上「可能卡住」。
 */
export function runProgressStalled(
  snapshot: AgentRunSnapshot,
  now: number
): boolean {
  if (isAgentRunTerminalStatus(snapshot.status)) return false;
  const lastEventAt = snapshot.lastEventAt;
  if (
    typeof lastEventAt !== "number" ||
    !Number.isFinite(lastEventAt) ||
    lastEventAt <= 0
  ) {
    return false;
  }
  if (now - lastEventAt <= RUN_STALL_AFTER_MS) return false;
  // 一次长调用中：inFlight 还在、且它自己也没超过长调用上限 → 仍在跑，不报。
  const inFlight = snapshot.inFlight;
  if (
    inFlight &&
    typeof inFlight.startedAt === "number" &&
    Number.isFinite(inFlight.startedAt) &&
    now - inFlight.startedAt <= RUN_LONG_INFLIGHT_MS
  ) {
    return false;
  }
  return true;
}

/** 停滞提示文案；没停滞时返回 undefined（调用方不该显示任何东西）。 */
export function formatStallFact(
  snapshot: AgentRunSnapshot,
  now: number
): string | undefined {
  return runProgressStalled(snapshot, now) ? t("runStalled") : undefined;
}
