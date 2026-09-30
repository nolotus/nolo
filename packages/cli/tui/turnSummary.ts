import { formatCreditsChip, formatTokenCount } from "../client/tokenUsage";
import { formatElapsed } from "../client/agentRunSpinner";
import { t } from "./i18n";

/**
 * 回合结束后的一行淡色收尾：`✓ 42s · 输出 3.2k · ⚡ 0.80 积分`。
 *
 * 只在「值得一提」时出现：短于 minDurationMs 的普通问答不打扰（与
 * turn-completed 终端提醒同一门槛），失败 / 中断由各自的提示负责，不走这里。
 * token 只报 output：input 是累计上下文，每轮都大，报出来是噪声。
 */
export function formatTurnSummaryLine(input: {
  durationMs: number;
  outputTokens?: number;
  credits?: number;
  minDurationMs: number;
}): string | null {
  if (!Number.isFinite(input.durationMs) || input.durationMs < input.minDurationMs) {
    return null;
  }
  const parts = [`✓ ${formatElapsed(Math.round(input.durationMs / 1000))}`];
  if (input.outputTokens && input.outputTokens > 0) {
    parts.push(t("turnSummaryOutput", formatTokenCount(input.outputTokens)));
  }
  if (input.credits && input.credits > 0) {
    parts.push(formatCreditsChip(input.credits));
  }
  return parts.join(" · ");
}
