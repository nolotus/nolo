// ai/token/observedSpeedResolver.ts
//
// 纯函数 observed-speed resolver：从既有 TokenUsageData / TokenRecord 的
// authoritative observed timing 事实（firstOutputMs / callDurationMs，见
// ai/token/providerCallTiming.ts）解析出观测速度。
//
// 输入契约（newest-first）：`records` 必须由调用方按「最新在前」排序传入
// （例如按 createdAt 降序的最近 token 记录）。本函数是纯函数——不排序、
// 不查询存储、不过滤身份；它只按传入顺序取前 `limit` 条并逐条判读。
//
// 明确不做：selector、profile、score、baseline、reliability、UI、独立
// performance DB。旧记录（或非流式记录）没有 firstOutputMs 时依然可解析
// ——只是对应的中位数缺样本。
//
// 结果字段：
//   - firstOutputSampleCount：支撑 medianFirstOutputMs 的合法 first-output
//     观测数（evidence count）。
//   - throughputSampleCount：支撑 medianOutputTokensPerSecond 的合法吞吐
//     观测数（evidence count）。
//   - medianFirstOutputMs / medianOutputTokensPerSecond：分别只由各自合法
//     观测支撑的中位数。
//     TPS = outputTokens / ((callDurationMs - firstOutputMs) / 1000)，
//     仅当 outputTokens > 0、数值有限、生成窗口 ≥ MIN_THROUGHPUT_WINDOW_MS
//     且 TPS ≤ MAX_PLAUSIBLE_OUTPUT_TPS；无效/不可信值忽略，不除零。
//     first-output 样本不受吞吐过滤影响。

import { normalizeTimingMs } from "./providerCallTiming";
import type { TokenRecord, TokenUsageData } from "./types";

export const DEFAULT_OBSERVED_SPEED_SAMPLE_SIZE = 20;

/**
 * 吞吐样本的最短生成窗口（callDurationMs - firstOutputMs，毫秒）。
 *
 * 理由：部分通道（如 codex responses 的 GPT 系）首个有效输出到达时整段输出
 * 已经一次性到齐，生成窗口≈0–1ms，算出 15 万～84 万 tok/s 的假值；窗口过短时
 * 计时抖动（ms 取整、事件循环调度）也会主导分母。低于此窗口的样本不进 TPS，
 * 但其 firstOutputMs 仍是可信观测，照常进 first-output 样本。
 */
export const MIN_THROUGHPUT_WINDOW_MS = 200;

/**
 * 单次流式调用可信的输出吞吐上限（tokens/秒）。
 *
 * 理由：当前最快的公开推理服务（Cerebras / Groq 类专用硬件）单流峰值约
 * 2–3k tok/s；超过 3000 的样本几乎必然是缓冲后突发到达（生成窗口被压扁），
 * 不是真实生成速度，丢弃。
 */
export const MAX_PLAUSIBLE_OUTPUT_TPS = 3_000;

export interface ObservedSpeedResult {
  /** 合法 first-output 观测数（支撑 medianFirstOutputMs 的 evidence count）。 */
  firstOutputSampleCount: number;
  /** 合法吞吐观测数（支撑 medianOutputTokensPerSecond 的 evidence count）。 */
  throughputSampleCount: number;
  /** 合法 firstOutputMs 样本的中位数（整毫秒）；无合法样本时缺省。 */
  medianFirstOutputMs?: number;
  /** 合法 TPS 样本的中位数（tokens/秒，保留 2 位小数）；无合法样本时缺省。 */
  medianOutputTokensPerSecond?: number;
}

/** TokenUsageData 与 TokenRecord 上解析所需字段的最小公共形状。 */
export type ObservedSpeedRecordInput = Partial<
  Pick<
    TokenUsageData | TokenRecord,
    "firstOutputMs" | "callDurationMs" | "output_tokens"
  >
>;

export interface ResolveObservedSpeedOptions {
  /** 最近样本窗口大小；缺省 20。 */
  limit?: number;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const medianOf = (values: number[]): number | undefined => {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

export function resolveObservedSpeed(
  records: readonly (ObservedSpeedRecordInput | null | undefined)[] | null | undefined,
  options: ResolveObservedSpeedOptions = {},
): ObservedSpeedResult {
  const limit = isFiniteNumber(options.limit)
    ? Math.max(0, Math.floor(options.limit))
    : DEFAULT_OBSERVED_SPEED_SAMPLE_SIZE;
  // newest-first 契约：调用方保证 records[0] 最新；这里只切窗口，不排序。
  const sample = Array.isArray(records)
    ? records.slice(0, limit)
    : [];

  const firstOutputSamples: number[] = [];
  const tpsSamples: number[] = [];

  for (const record of sample) {
    if (!record || typeof record !== "object") continue;
    const { firstOutputMs, callDurationMs, output_tokens: outputTokens } = record;

    // timing 数值统一走共享归一化：无效/负值 → undefined（不进任何样本）。
    const firstOutput = normalizeTimingMs(firstOutputMs);
    const callDuration = normalizeTimingMs(callDurationMs);

    // first-output 样本：有合法观测即可（独立于 callDuration 是否存在）。
    if (firstOutput !== undefined) {
      firstOutputSamples.push(firstOutput);
    }

    // 吞吐样本：仅 outputTokens > 0、有限、callDuration > firstOutput（不除零）。
    // 合理性过滤：生成窗口 < MIN_THROUGHPUT_WINDOW_MS 或 TPS > MAX_PLAUSIBLE_OUTPUT_TPS
    // 的样本不可信，只丢吞吐，不影响上面的 first-output 样本。
    if (
      firstOutput !== undefined &&
      callDuration !== undefined &&
      callDuration - firstOutput >= MIN_THROUGHPUT_WINDOW_MS &&
      isFiniteNumber(outputTokens) &&
      outputTokens > 0
    ) {
      const seconds = (callDuration - firstOutput) / 1000;
      const tokensPerSecond = outputTokens / seconds;
      if (isFiniteNumber(tokensPerSecond) && tokensPerSecond <= MAX_PLAUSIBLE_OUTPUT_TPS) {
        tpsSamples.push(tokensPerSecond);
      }
    }
  }

  const medianFirstOutputMs = medianOf(firstOutputSamples);
  const medianTps = medianOf(tpsSamples);

  return {
    firstOutputSampleCount: firstOutputSamples.length,
    throughputSampleCount: tpsSamples.length,
    ...(medianFirstOutputMs !== undefined
      ? { medianFirstOutputMs: Math.round(medianFirstOutputMs) }
      : {}),
    ...(medianTps !== undefined
      ? { medianOutputTokensPerSecond: Math.round(medianTps * 100) / 100 }
      : {}),
  };
}
