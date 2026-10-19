import { devinChannelContextWindow } from "../../agent-runtime/devin/devinChannelWindows";
import { isDevinOAuthAgent } from "../../agent-runtime/devinOAuthPure";
import { findModelContextWindow } from "../llm/getModelContextWindow";
import { estimateTokenCount } from "./tokenUtils";

export type OccupancyModelRef = {
  model?: string | null;
  provider?: string | null;
  apiKeyRef?: string | null;
};

/** 内容口径与消息边界开销统一，避免调用方各自估算造成占用漂移。 */
export function estimateMessagesTokens(
  messages: readonly { role?: string; content?: unknown }[],
): number {
  return messages.reduce((total, message) => {
    const content = typeof message.content === "string"
      ? message.content
      : message.content == null
        ? ""
        : JSON.stringify(message.content);
    return total + estimateTokenCount(content) + 4;
  }, 0);
}

/**
 * 权威到达时的历史基线：当前历史估算 − 最后一条 assistant 消息估算。
 * provider 的 input 快照产生于该轮回答之前，扣掉最后一条 assistant 才能与快照对齐。
 */
export function historyTokensBeforeLatestAssistant(
  messages: readonly { role?: string; content?: unknown }[],
): number {
  const total = estimateMessagesTokens(messages);
  const latest = messages[messages.length - 1];
  if (latest?.role !== "assistant") return total;
  return Math.max(0, total - estimateMessagesTokens([latest]));
}

/** 权威 input 已是最近一次快照，只叠加快照之后的内容增量。 */
export function resolveOccupancy(input: {
  authoritativeInput?: number;
  baselineEstimate?: number;
  generatedSinceAuthority?: number;
}): { tokens: number; estimated: boolean } {
  if (input.authoritativeInput !== undefined && input.authoritativeInput > 0) {
    const generated = Math.max(0, input.generatedSinceAuthority ?? 0);
    return {
      tokens: input.authoritativeInput + generated,
      estimated: generated > 0,
    };
  }
  return {
    tokens: Math.max(0, input.baselineEstimate ?? 0),
    estimated: true,
  };
}

/** 未知窗口保持未知，避免默认值被误认为模型的真实能力。 */
export function resolveOccupancyWindow(ref: OccupancyModelRef): number | undefined {
  if (!ref.model) return undefined;
  if (isDevinOAuthAgent(ref)) {
    return devinChannelContextWindow(ref.model) ?? findModelContextWindow(ref.model, ref.provider);
  }
  return findModelContextWindow(ref.model, ref.provider);
}
