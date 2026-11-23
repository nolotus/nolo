// ai/agent/recentRunHealth.ts
//
// 坏通道快败感知（recent fast-fail health, advisory only）。
//
// 背景：`speedContext` 只说「这条通道跑多快」，它建立在真实 token 记录上；而一条
// 会在 ~3 秒内以 `toolCallCount=0` 失败的通道根本不产生 token 记录，于是在速度视图里
// 完全隐形，被反复派发。这里补的是一个**纯统计**信号：近 24h 终态样本里，短时限内
// 零工具调用的失败占比过高，就输出一条紧凑告警。
//
// 边界（刻意保守）：
//   - 纯函数、零 I/O；不引入 `RunRecord` 依赖，调用方传摘要投影即可。
//   - 只统计终态样本（终态轴复用 `isAgentRunTerminalStatus` 单一真值），进行中/未知状态
//     既不进分子也不进分母。
//   - 「快败」必须同时满足：status=failed、时长 ∈ [0, 15s)、工具调用计数为 0。慢失败、
//     有工具调用的失败、超时/被杀/孤儿都不算——它们不代表通道起来就废。
//   - 样本量门槛（≥3）与占比门槛（≥0.6）都是「偶发一次失败绝不报警」的下限保护。
//   - 输出只是参考标注：不排序、不过滤、不当成不可用拦截；无异常通道时返回 `undefined`
//     （零字节开销）。

import { isAgentRunTerminalStatus } from "../tools/agent/agentRunDisplayHelpers";

/** 统计窗口：近 24 小时。 */
export const RECENT_RUN_HEALTH_WINDOW_HOURS = 24;
/** 「快败」的时长上界（不含）：15 秒。 */
export const FAST_FAIL_MAX_DURATION_MS = 15_000;
/** 触发告警所需的最少终态样本数。 */
export const FAST_FAIL_MIN_TOTAL_RUNS = 3;
/** 触发告警所需的最低快败占比。 */
export const FAST_FAIL_MIN_RATIO = 0.6;
/** 计入「快败」的唯一状态。 */
export const FAST_FAIL_STATUS = "failed";

/** 调用方给的近期 run 摘要（`RunRecord` 的最小子集，字段名与落盘记录一致）。 */
export type RecentRunHealthSample = {
  agentKey: string;
  status: string;
  startedAt: string | number | Date;
  endedAt?: string | number | Date | null;
  toolCallCount?: number | null;
};

/** 一条紧凑健康告警：仅事实计数，不含任何新分类或推测。 */
export type RecentRunHealthAlert = {
  agentKey: string;
  fastFailCount: number;
  totalCount: number;
  windowHours: number;
};

export type RecentRunHealthOptions = {
  /** 参照时刻；缺省 = 调用时 `Date.now()`。 */
  now?: string | number | Date;
  /** 统计窗口（小时）；缺省 24，只为测试与复用留口。 */
  windowHours?: number;
};

function toMillis(value: unknown): number | undefined {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : undefined;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim()) {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : undefined;
  }
  return undefined;
}

function normalizeAgentKey(value: unknown): string {
  // 记录里的 agentKey 来自本地文件：去掉控制字符，避免一行告警被注入多行。
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim() : "";
}

function resolveWindowHours(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : RECENT_RUN_HEALTH_WINDOW_HOURS;
}

/**
 * 单条样本是否算「快败」：状态必须是 failed、时长已知且落在 [0, 15s)、工具调用计数为 0。
 * 终态之外的判定不在这里做（调用方 `aggregateRecentRunHealth` 已过滤终态）。
 */
export function isFastFailRunSample(sample: RecentRunHealthSample): boolean {
  if (sample.status !== FAST_FAIL_STATUS) return false;
  if ((sample.toolCallCount ?? 0) !== 0) return false;
  const startedMs = toMillis(sample.startedAt);
  const endedMs = toMillis(sample.endedAt);
  if (startedMs === undefined || endedMs === undefined) return false;
  const durationMs = endedMs - startedMs;
  return durationMs >= 0 && durationMs < FAST_FAIL_MAX_DURATION_MS;
}

/**
 * 按 agentKey 聚合近期终态样本，返回达到门槛的快败告警。
 *
 * 门槛：窗口内终态样本 total ≥ 3 且 fastFail / total ≥ 0.6。顺序固定（快败数降序、
 * 再按 agentKey 升序），保证同样输入产生同样文本。
 */
export function aggregateRecentRunHealth(
  samples: readonly RecentRunHealthSample[] | undefined | null,
  options: RecentRunHealthOptions = {},
): RecentRunHealthAlert[] {
  if (!samples || samples.length === 0) return [];
  const windowHours = resolveWindowHours(options.windowHours);
  const nowMs = toMillis(options.now) ?? Date.now();
  const sinceMs = nowMs - windowHours * 3_600_000;

  const totals = new Map<string, { totalCount: number; fastFailCount: number }>();
  for (const sample of samples) {
    if (!sample || typeof sample.status !== "string") continue;
    if (!isAgentRunTerminalStatus(sample.status)) continue;
    const startedMs = toMillis(sample.startedAt);
    if (startedMs === undefined || startedMs < sinceMs) continue;
    const agentKey = normalizeAgentKey(sample.agentKey);
    if (!agentKey) continue;
    const bucket = totals.get(agentKey) ?? { totalCount: 0, fastFailCount: 0 };
    bucket.totalCount += 1;
    if (isFastFailRunSample(sample)) bucket.fastFailCount += 1;
    totals.set(agentKey, bucket);
  }

  const alerts: RecentRunHealthAlert[] = [];
  for (const [agentKey, { totalCount, fastFailCount }] of totals) {
    if (fastFailCount === 0 || totalCount < FAST_FAIL_MIN_TOTAL_RUNS) continue;
    if (fastFailCount / totalCount < FAST_FAIL_MIN_RATIO) continue;
    alerts.push({ agentKey, fastFailCount, totalCount, windowHours });
  }
  alerts.sort((a, b) =>
    b.fastFailCount - a.fastFailCount ||
    b.fastFailCount / b.totalCount - a.fastFailCount / a.totalCount ||
    (a.agentKey < b.agentKey ? -1 : a.agentKey > b.agentKey ? 1 : 0)
  );
  return alerts;
}

/**
 * 紧凑上下文文本；没有告警时返回 `undefined`（调用方据此完全省略该字段，零字节开销）。
 *
 * 形状（stderr 无关的纯文本，与 `speedContext` 同口径的参考标注）：
 *
 *     recentFastFail (24h, <15s & 0 toolCalls, advisory only):
 *       agent-u-x: 21/22 failed
 */
export function formatRecentRunHealthContext(
  alerts: readonly RecentRunHealthAlert[] | undefined | null,
): string | undefined {
  const lines: string[] = [];
  let windowHours = RECENT_RUN_HEALTH_WINDOW_HOURS;
  for (const alert of alerts ?? []) {
    if (!alert || !(alert.fastFailCount > 0) || !(alert.totalCount > 0)) continue;
    const agentKey = normalizeAgentKey(alert.agentKey);
    if (!agentKey) continue;
    if (lines.length === 0) windowHours = resolveWindowHours(alert.windowHours);
    lines.push(`  ${agentKey}: ${alert.fastFailCount}/${alert.totalCount} failed`);
  }
  if (lines.length === 0) return undefined;
  return [`recentFastFail (${windowHours}h, <15s & 0 toolCalls, advisory only):`, ...lines].join("\n");
}
