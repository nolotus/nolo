import { describe, expect, it } from "bun:test";
import {
  EMPTY_ASSISTANT_FALLBACK_MESSAGE,
  LENGTH_TRUNCATED_FALLBACK_MESSAGE,
  STREAM_TRUNCATED_FALLBACK_MESSAGE,
  REPETITION_LOOP_FALLBACK_MESSAGE,
  STAGNANT_TOOL_CALLS_FALLBACK_MESSAGE,
} from "agent-runtime/emptyAssistantRepair";
import {
  HISTORICAL_REASONING_FALLBACK_MESSAGES,
  normalizeHistoricalReasoningMessage,
} from "./normalizeHistoricalReasoning";
import type { Message } from "./types";

describe("normalizeHistoricalReasoningMessage", () => {
  it("exports expected fallback message constants matching emptyAssistantRepair", () => {
    expect(HISTORICAL_REASONING_FALLBACK_MESSAGES.has(STREAM_TRUNCATED_FALLBACK_MESSAGE)).toBe(true);
    expect(HISTORICAL_REASONING_FALLBACK_MESSAGES.has(LENGTH_TRUNCATED_FALLBACK_MESSAGE)).toBe(true);
    expect(HISTORICAL_REASONING_FALLBACK_MESSAGES.has(EMPTY_ASSISTANT_FALLBACK_MESSAGE)).toBe(true);
    expect(HISTORICAL_REASONING_FALLBACK_MESSAGES.has(REPETITION_LOOP_FALLBACK_MESSAGE)).toBe(true);
    expect(HISTORICAL_REASONING_FALLBACK_MESSAGES.has(STAGNANT_TOOL_CALLS_FALLBACK_MESSAGE)).toBe(true);
    expect(HISTORICAL_REASONING_FALLBACK_MESSAGES.size).toBe(5);
  });

  describe("① 历史截断轮归一化", () => {
    it("maps reasoning_content to thinkContent when assistant content matches STREAM_TRUNCATED_FALLBACK_MESSAGE and thinkContent is empty", () => {
      const historicalTruncatedMessage: Message = {
        id: "msg-hist-01",
        dbKey: "dialog-user-1-dialog-1-msg-01",
        role: "assistant",
        content: STREAM_TRUNCATED_FALLBACK_MESSAGE,
        reasoning_content: "这是 2026-08-29 截断事故中保存在 reasoning_content 的完整方案思维链",
      };

      const normalized = normalizeHistoricalReasoningMessage(historicalTruncatedMessage);

      expect(normalized.thinkContent).toBe(
        "这是 2026-08-29 截断事故中保存在 reasoning_content 的完整方案思维链"
      );
      // 原消息记录不被破坏，保持纯展示层映射
      expect(normalized.content).toBe(STREAM_TRUNCATED_FALLBACK_MESSAGE);
      expect(normalized.reasoning_content).toBe(
        "这是 2026-08-29 截断事故中保存在 reasoning_content 的完整方案思维链"
      );
      expect(historicalTruncatedMessage.thinkContent).toBeUndefined();
    });

    it("maps reasoning_content to thinkContent for all other emptyAssistantRepair fallback constants", () => {
      const fallbacks = [
        EMPTY_ASSISTANT_FALLBACK_MESSAGE,
        LENGTH_TRUNCATED_FALLBACK_MESSAGE,
        REPETITION_LOOP_FALLBACK_MESSAGE,
        STAGNANT_TOOL_CALLS_FALLBACK_MESSAGE,
      ];

      for (const fallbackText of fallbacks) {
        const msg: Message = {
          id: `msg-${fallbackText.slice(0, 4)}`,
          dbKey: "dialog-user-1-dialog-1-msg-xx",
          role: "assistant",
          content: fallbackText,
          reasoning_content: `Reasoning for ${fallbackText}`,
        };
        const normalized = normalizeHistoricalReasoningMessage(msg);
        expect(normalized.thinkContent).toBe(`Reasoning for ${fallbackText}`);
      }
    });

    it("handles whitespace-only thinkContent by replacing it with reasoning_content", () => {
      const msg: Message = {
        id: "msg-whitespace-think",
        dbKey: "dialog-user-1-dialog-1-msg-02",
        role: "assistant",
        content: STREAM_TRUNCATED_FALLBACK_MESSAGE,
        thinkContent: "   \n\t  ",
        reasoning_content: "有效思考内容",
      };

      const normalized = normalizeHistoricalReasoningMessage(msg);
      expect(normalized.thinkContent).toBe("有效思考内容");
    });
  });

  describe("② 正常历史轮保持不变（避免全量上屏改变阅读密度）", () => {
    it("does not modify normal assistant messages even if reasoning_content is present", () => {
      const normalAssistantMessage: Message = {
        id: "msg-normal-01",
        dbKey: "dialog-user-1-dialog-1-msg-03",
        role: "assistant",
        content: "这是正常的模型回答内容，已完整生成。",
        reasoning_content: "这是正常回复背后的思维链，不应在无 thinkContent 时被强制归一化上屏",
      };

      const normalized = normalizeHistoricalReasoningMessage(normalAssistantMessage);

      expect(normalized).toBe(normalAssistantMessage);
      expect(normalized.thinkContent).toBeUndefined();
    });

    it("preserves already-existing thinkContent on newer truncated turns", () => {
      const alreadyHasThinkMessage: Message = {
        id: "msg-new-truncated-01",
        dbKey: "dialog-user-1-dialog-1-msg-04",
        role: "assistant",
        content: STREAM_TRUNCATED_FALLBACK_MESSAGE,
        thinkContent: "[nolo] [stream_truncated_reasoning_tail]\n现有新格式思考尾部",
        reasoning_content: "完整思维链原文",
      };

      const normalized = normalizeHistoricalReasoningMessage(alreadyHasThinkMessage);

      expect(normalized).toBe(alreadyHasThinkMessage);
      expect(normalized.thinkContent).toBe(
        "[nolo] [stream_truncated_reasoning_tail]\n现有新格式思考尾部"
      );
    });

    it("does not modify assistant message if reasoning_content is empty or whitespace", () => {
      const emptyReasoningMessage: Message = {
        id: "msg-empty-reasoning",
        dbKey: "dialog-user-1-dialog-1-msg-05",
        role: "assistant",
        content: STREAM_TRUNCATED_FALLBACK_MESSAGE,
        reasoning_content: "   \n  ",
      };

      const normalized = normalizeHistoricalReasoningMessage(emptyReasoningMessage);

      expect(normalized).toBe(emptyReasoningMessage);
      expect(normalized.thinkContent).toBeUndefined();
    });

    it("does not modify assistant message if reasoning_content is undefined", () => {
      const noReasoningMessage: Message = {
        id: "msg-no-reasoning",
        dbKey: "dialog-user-1-dialog-1-msg-06",
        role: "assistant",
        content: STREAM_TRUNCATED_FALLBACK_MESSAGE,
      };

      const normalized = normalizeHistoricalReasoningMessage(noReasoningMessage);

      expect(normalized).toBe(noReasoningMessage);
      expect(normalized.thinkContent).toBeUndefined();
    });
  });

  describe("③ non-assistant 消息（user/tool/system）不受影响", () => {
    it("does not modify user messages even if content matches fallback string and reasoning_content is attached", () => {
      const userMessage: Message = {
        id: "msg-user-01",
        dbKey: "dialog-user-1-dialog-1-msg-07",
        role: "user",
        content: STREAM_TRUNCATED_FALLBACK_MESSAGE,
        reasoning_content: "用户消息里的 reasoning_content 字段（可能为误传或元数据）",
      };

      const normalized = normalizeHistoricalReasoningMessage(userMessage);

      expect(normalized).toBe(userMessage);
      expect(normalized.thinkContent).toBeUndefined();
    });

    it("does not modify system messages", () => {
      const systemMessage: Message = {
        id: "msg-sys-01",
        dbKey: "dialog-user-1-dialog-1-msg-08",
        role: "system",
        content: STREAM_TRUNCATED_FALLBACK_MESSAGE,
        reasoning_content: "系统消息里的思考",
      };

      const normalized = normalizeHistoricalReasoningMessage(systemMessage);

      expect(normalized).toBe(systemMessage);
      expect(normalized.thinkContent).toBeUndefined();
    });

    it("does not modify tool messages", () => {
      const toolMessage: Message = {
        id: "msg-tool-01",
        dbKey: "dialog-user-1-dialog-1-msg-09",
        role: "tool",
        content: STREAM_TRUNCATED_FALLBACK_MESSAGE,
        reasoning_content: "工具输出里的思考",
      };

      const normalized = normalizeHistoricalReasoningMessage(toolMessage);

      expect(normalized).toBe(toolMessage);
      expect(normalized.thinkContent).toBeUndefined();
    });

    it("gracefully handles invalid / non-object input", () => {
      expect(normalizeHistoricalReasoningMessage(undefined as any)).toBeUndefined();
      expect(normalizeHistoricalReasoningMessage(null as any)).toBeNull();
      expect(normalizeHistoricalReasoningMessage("string" as any)).toBe("string" as any);
    });
  });
});
