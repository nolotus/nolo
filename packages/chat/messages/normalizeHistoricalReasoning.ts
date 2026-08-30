import {
  EMPTY_ASSISTANT_FALLBACK_MESSAGE,
  LENGTH_TRUNCATED_FALLBACK_MESSAGE,
  STREAM_TRUNCATED_FALLBACK_MESSAGE,
  REPETITION_LOOP_FALLBACK_MESSAGE,
  STAGNANT_TOOL_CALLS_FALLBACK_MESSAGE,
} from "agent-runtime/emptyAssistantRepair";
import type { Message } from "./types";

export const HISTORICAL_REASONING_FALLBACK_MESSAGES: ReadonlySet<string> =
  new Set([
    EMPTY_ASSISTANT_FALLBACK_MESSAGE,
    LENGTH_TRUNCATED_FALLBACK_MESSAGE,
    STREAM_TRUNCATED_FALLBACK_MESSAGE,
    REPETITION_LOOP_FALLBACK_MESSAGE,
    STAGNANT_TOOL_CALLS_FALLBACK_MESSAGE,
  ]);

/**
 * 历史截断轮 reasoning 的装载期展示归一化（纯展示层，不写 DB / 不改消息存储记录）。
 *
 * 背景：
 * 历史截断轮（如 2026-08-29 前的 kimi-k3 截断事故轮）中，模型思考过程留存在
 * `reasoning_content` 字段，但落盘时没有 `thinkContent` 字段。前端思考折叠组件
 * `ThinkingSection` 仅消费 `thinkContent`，导致历史截断轮的思考内容在前端完全黑洞。
 *
 * 约束：
 * 1. 仅对 `role === "assistant"` 生效；
 * 2. 仅在 `!thinkContent`（未填充或仅空白）且 `reasoning_content` 非空有效字符串时生效；
 * 3. 严格范围约束：`content` 必须命中 emptyAssistantRepair 导出的 fallback 兜底文案之一，
 *    避免把正常历史轮的 reasoning 全量上屏改变阅读密度；
 * 4. 纯函数：不修改原对象，返回带有 `thinkContent = reasoning_content` 的浅拷贝或原引用。
 */
export function normalizeHistoricalReasoningMessage<T extends Partial<Message>>(
  message: T
): T {
  if (!message || typeof message !== "object") {
    return message;
  }

  if (message.role !== "assistant") {
    return message;
  }

  if (
    typeof message.thinkContent === "string" &&
    message.thinkContent.trim().length > 0
  ) {
    return message;
  }

  const reasoning = (message as { reasoning_content?: unknown })
    .reasoning_content;
  if (typeof reasoning !== "string" || reasoning.trim().length === 0) {
    return message;
  }

  const content = message.content;
  if (
    typeof content !== "string" ||
    !HISTORICAL_REASONING_FALLBACK_MESSAGES.has(content)
  ) {
    return message;
  }

  return {
    ...message,
    thinkContent: reasoning,
  };
}
