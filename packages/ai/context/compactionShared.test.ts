import { describe, expect, it } from "bun:test";
import {
  COMPACTION_SUMMARY_SYSTEM_PROMPT,
  formatMessagesForSummary,
  formatMessagesForSummaryWithTruncation,
  truncateContentForSummary,
  buildCompactionUserContent,
  formatFileOperationsFromMessages,
  extractFileOperationsFromCalls,
  TOOL_RESULT_TRUNCATE_CHARS,
  buildCompactionMetrics,
  formatCompactionMetricsLog,
  type CompactionMetrics,
} from "./compactionShared";

describe("compactionShared", () => {
  describe("COMPACTION_SUMMARY_SYSTEM_PROMPT", () => {
    it("is a non-empty string with three section titles", () => {
      expect(COMPACTION_SUMMARY_SYSTEM_PROMPT).toContain("关键事实档案");
      expect(COMPACTION_SUMMARY_SYSTEM_PROMPT).toContain("对话进展与待办");
      expect(COMPACTION_SUMMARY_SYSTEM_PROMPT).toContain("文件操作清单");
      expect(COMPACTION_SUMMARY_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    });

    it("contains first-person handoff guidance (P0-3)", () => {
      // 字符串断言仅作防回退（防止误删关键词），行为质量靠真实 LLM 人工验证。
      expect(COMPACTION_SUMMARY_SYSTEM_PROMPT).toContain("第一人称");
      expect(COMPACTION_SUMMARY_SYSTEM_PROMPT).toContain("续作笔记");
      expect(COMPACTION_SUMMARY_SYSTEM_PROMPT).toContain("不要写成第三方观察报告");
      // 精确短语锁死语义
      expect(COMPACTION_SUMMARY_SYSTEM_PROMPT).toContain("（待验证）");
      expect(COMPACTION_SUMMARY_SYSTEM_PROMPT).toContain("我做了");
      expect(COMPACTION_SUMMARY_SYSTEM_PROMPT).toContain("用户要求");
      expect(COMPACTION_SUMMARY_SYSTEM_PROMPT).toContain("下一步我需要");
    });

    it("requires preserving exact values (P0-3)", () => {
      expect(COMPACTION_SUMMARY_SYSTEM_PROMPT).toContain("确切值");
      expect(COMPACTION_SUMMARY_SYSTEM_PROMPT).toContain("端口号");
      expect(COMPACTION_SUMMARY_SYSTEM_PROMPT).toContain("版本号");
      expect(COMPACTION_SUMMARY_SYSTEM_PROMPT).toContain("错误信息原文");
      expect(COMPACTION_SUMMARY_SYSTEM_PROMPT).toContain("不要概括");
    });

    it("requires flagging unverified work (P0-3)", () => {
      expect(COMPACTION_SUMMARY_SYSTEM_PROMPT).toContain("待验证");
      expect(COMPACTION_SUMMARY_SYSTEM_PROMPT).toContain("不要默认信任");
    });
  });

  describe("formatMessagesForSummary", () => {
    it("formats role + content pairs joined by newline", () => {
      const msgs = [
        { role: "user", content: "hello" },
        { role: "assistant", content: "hi there" },
      ];
      expect(formatMessagesForSummary(msgs)).toBe("user: hello\nassistant: hi there");
    });

    it("falls back to tool_calls names when content is empty", () => {
      const msgs = [
        {
          role: "assistant",
          content: "",
          tool_calls: [{ function: { name: "readFile" } }],
        },
      ];
      expect(formatMessagesForSummary(msgs)).toBe("assistant: [tool_calls:readFile]");
    });

    it("falls back to [非文本内容] for empty content without tool_calls", () => {
      const msgs = [{ role: "user", content: "" }];
      expect(formatMessagesForSummary(msgs)).toBe("user: [非文本内容]");
    });
  });

  describe("truncateContentForSummary", () => {
    it("does not truncate non-tool messages", () => {
      const long = "x".repeat(10_000);
      expect(truncateContentForSummary("user", long)).toBe(long);
    });

    it("does not truncate short tool results", () => {
      expect(truncateContentForSummary("tool", "short")).toBe("short");
    });

    it("truncates tool results exceeding the limit and adds marker", () => {
      const long = "x".repeat(TOOL_RESULT_TRUNCATE_CHARS + 1000);
      const result = truncateContentForSummary("tool", long);
      expect(result.length).toBeLessThan(long.length);
      expect(result).toContain("[... 1000 chars truncated ...]");
    });

    it("respects custom maxChars", () => {
      const result = truncateContentForSummary("tool", "x".repeat(200), 100);
      expect(result).toContain("[... 100 chars truncated ...]");
      expect(result.startsWith("x")).toBe(true);
    });
  });

  describe("formatMessagesForSummaryWithTruncation", () => {
    it("truncates tool results but not user messages", () => {
      const longToolResult = "x".repeat(TOOL_RESULT_TRUNCATE_CHARS + 5000);
      const msgs = [
        { role: "user", content: "short question" },
        { role: "tool", content: longToolResult },
      ];
      const formatted = formatMessagesForSummaryWithTruncation(msgs);
      expect(formatted).toContain("user: short question");
      expect(formatted).toContain("[... 5000 chars truncated ...]");
      expect(formatted.length).toBeLessThan(longToolResult.length);
    });
  });

  describe("buildCompactionUserContent", () => {
    it("includes all three sections when fileOpsText is provided", () => {
      const content = buildCompactionUserContent({
        previousSummary: "old memory",
        messagesText: "user: hi",
        fileOpsText: "- 读取: src/a.ts",
      });
      expect(content).toContain("【现有记忆】：\nold memory");
      expect(content).toContain("【文件操作清单】：\n- 读取: src/a.ts");
      expect(content).toContain("【新增对话】：\nuser: hi");
    });

    it("omits file ops section when fileOpsText is undefined", () => {
      const content = buildCompactionUserContent({
        previousSummary: "old",
        messagesText: "user: hi",
      });
      expect(content).toContain("【现有记忆】");
      expect(content).toContain("【新增对话】");
      expect(content).not.toContain("【文件操作清单】");
    });

    it("uses (无) placeholder for empty previousSummary", () => {
      const content = buildCompactionUserContent({
        previousSummary: "",
        messagesText: "user: hi",
      });
      expect(content).toContain("【现有记忆】：\n(无)");
    });
  });

  describe("extractFileOperationsFromCalls", () => {
    const identity = (name: string) => name;

    it("extracts read/write/edit with dedup", () => {
      const calls = [
        { function: { name: "readFile", arguments: JSON.stringify({ path: "a.ts" }) } },
        { function: { name: "readFile", arguments: JSON.stringify({ path: "a.ts" }) } },
        { function: { name: "editFile", arguments: { path: "b.ts" } } },
      ];
      const ops = extractFileOperationsFromCalls(calls, identity);
      expect(ops).toEqual([
        { type: "read", path: "a.ts" },
        { type: "edit", path: "b.ts" },
      ]);
    });

    it("ignores non-file tools", () => {
      const calls = [
        { function: { name: "readDoc", arguments: JSON.stringify({ path: "doc.md" }) } },
        { function: { name: "queryTableRows", arguments: JSON.stringify({ table: "t1" }) } },
      ];
      expect(extractFileOperationsFromCalls(calls, identity)).toEqual([]);
    });

    it("accepts filePath and file as path field names", () => {
      const calls = [
        { function: { name: "readFile", arguments: JSON.stringify({ filePath: "c.ts" }) } },
        { function: { name: "writeFile", arguments: JSON.stringify({ file: "d.ts" }) } },
      ];
      const ops = extractFileOperationsFromCalls(calls, identity);
      expect(ops).toEqual([
        { type: "read", path: "c.ts" },
        { type: "write", path: "d.ts" },
      ]);
    });

    it("uses canonicalize function to resolve tool name aliases", () => {
      const canonicalize = (name: string) =>
        name === "read" ? "readFile" : name;
      const calls = [
        { function: { name: "read", arguments: JSON.stringify({ path: "e.ts" }) } },
      ];
      const ops = extractFileOperationsFromCalls(calls, canonicalize);
      expect(ops).toEqual([{ type: "read", path: "e.ts" }]);
    });
  });

  describe("formatFileOperationsFromMessages", () => {
    const identity = (name: string) => name;

    it("returns '无' when no tool_calls exist", () => {
      expect(formatFileOperationsFromMessages([{ role: "user", content: "hi" }], identity)).toBe("无");
    });

    it("formats multiple file ops with Chinese labels", () => {
      const msgs = [
        {
          role: "assistant",
          content: "",
          tool_calls: [
            { function: { name: "readFile", arguments: JSON.stringify({ path: "a.ts" }) } },
            { function: { name: "writeFile", arguments: JSON.stringify({ path: "b.ts" }) } },
          ],
        },
      ];
      expect(formatFileOperationsFromMessages(msgs, identity)).toBe(
        "- 读取: a.ts\n- 写入: b.ts",
      );
    });
  });

  describe("buildCompactionMetrics", () => {
    const estimateTokens = (text: string) => Math.ceil(text.length / 4);
    const estimateMessageTokens = (msg: unknown) =>
      estimateTokens(typeof msg === "string" ? msg : JSON.stringify(msg));

    it("builds metrics with correct token counts", () => {
      const metrics = buildCompactionMetrics({
        reason: "context_budget",
        previousSummary: "old summary",
        msgsToCompress: [{ content: "msg1" }, { content: "msg2" }],
        msgsToKeep: [{ content: "msg3" }],
        newSummary: "new summary",
        estimateTokens,
        estimateMessageTokens,
      });
      expect(metrics.reason).toBe("context_budget");
      expect(metrics.previousSummaryTokens).toBe(3); // "old summary" = 12 chars / 4
      expect(metrics.compressedCount).toBe(2);
      expect(metrics.retainedCount).toBe(1);
      expect(metrics.newSummaryTokens).toBe(3);
      expect(metrics.hadPreviousSummary).toBe(true);
    });

    it("detects first compaction (no previous summary)", () => {
      const metrics = buildCompactionMetrics({
        reason: "manual",
        previousSummary: "",
        msgsToCompress: [{ content: "a" }],
        msgsToKeep: [{ content: "b" }],
        newSummary: "first",
        estimateTokens,
        estimateMessageTokens,
      });
      expect(metrics.hadPreviousSummary).toBe(false);
    });

    it("includes summaryUsage when provided", () => {
      const metrics = buildCompactionMetrics({
        reason: "context_budget",
        previousSummary: "",
        msgsToCompress: [],
        msgsToKeep: [],
        newSummary: "x",
        summaryUsage: { input_tokens: 1000, output_tokens: 200 },
        estimateTokens,
        estimateMessageTokens,
      });
      expect(metrics.summaryUsage).toEqual({ input_tokens: 1000, output_tokens: 200 });
    });
  });

  describe("formatCompactionMetricsLog", () => {
    it("formats a readable single-line log", () => {
      const metrics: CompactionMetrics = {
        reason: "context_budget",
        previousSummaryTokens: 500,
        compressedTokens: 10000,
        retainedTokens: 2000,
        newSummaryTokens: 800,
        compressedCount: 15,
        retainedCount: 3,
        hadPreviousSummary: true,
      };
      const log = formatCompactionMetricsLog(metrics);
      expect(log).toContain("reason=context_budget");
      expect(log).toContain("compressed=15->3");
      expect(log).toContain("tokens=10500->2800");
      expect(log).toContain("ratio=0.27");
      expect(log).not.toContain("summary_llm");
    });

    it("includes LLM usage when present", () => {
      const metrics: CompactionMetrics = {
        reason: "manual",
        previousSummaryTokens: 0,
        compressedTokens: 5000,
        retainedTokens: 1000,
        newSummaryTokens: 500,
        compressedCount: 5,
        retainedCount: 1,
        summaryUsage: { input_tokens: 8000, output_tokens: 300 },
        hadPreviousSummary: false,
      };
      const log = formatCompactionMetricsLog(metrics);
      expect(log).toContain("summary_llm_in=8000");
      expect(log).toContain("out=300");
    });
  });
});