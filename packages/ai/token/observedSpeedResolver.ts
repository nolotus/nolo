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
//     仅当 outputTokens > 0、数值有限、callDurationMs > firstOutputMs；
//     无效值忽略，不除零。

import { normalizeTimingMs } from "./providerCallTiming";
import type { TokenRecord, TokenUsageData } from "./types";

export const DEFAULT_OBSERVED_SPEED_SAMPLE_SIZE = 20;

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
    if (
      firstOutput !== undefined &&
      callDuration !== undefined &&
      callDuration > firstOutput &&
      isFiniteNumber(outputTokens) &&
      outputTokens > 0
    ) {
      const seconds = (callDuration - firstOutput) / 1000;
      const tokensPerSecond = outputTokens / seconds;
      if (isFiniteNumber(tokensPerSecond)) {
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
