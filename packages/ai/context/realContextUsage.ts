// ai/context/realContextUsage.ts

/**
 * 从逐次 provider 调用记录里提取「最后一次有效调用的真实 input_tokens」。
 *
 * 压缩触发只认 provider 自己上报的数字，估算口径只做遥测缺失时的兜底。
 * web（流结束后的 billingUsageRecords）与 CLI（saveTurn 的 usageRecords）
 * 共用同一提取逻辑，避免两端各抄一遍。
 *
 * 注意：这里只返回原始 token 数，不除窗口——换算比例由调用方用「它自己
 * 解析出的 contextWindow」完成，保证分子分母同源（避免运行 agent 与
 * 对话主 agent 窗口不一致时阈值错配）。
 */

import { normalizeUsage } from "../token/normalizeUsage";

export type UsageRecordLike = {
  usage?: Record<string, unknown> | null;
};

export const lastInputTokensFromRecords = (
  records: ReadonlyArray<UsageRecordLike> | undefined,
): number | undefined => {
  if (!Array.isArray(records) || records.length === 0) return undefined;
  for (let i = records.length - 1; i >= 0; i--) {
    const usage = records[i]?.usage;
    if (!usage) continue;
    const inputTokens = normalizeUsage(usage as any).input_tokens;
    if (
      typeof inputTokens === "number" &&
      Number.isFinite(inputTokens) &&
      inputTokens > 0
    ) {
      return inputTokens;
    }
  }
  return undefined;
};
