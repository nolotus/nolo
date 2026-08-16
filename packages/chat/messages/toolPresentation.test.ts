import { describe, expect, it } from "bun:test";

import {
  buildRunStreamingAgentHandoffPresentation,
  estimateToolContentChars,
  isHiddenOrchestratorToolMessage,
  normalizeToolDisplaySummary,
  previewToolText,
  shouldPreviewToolText,
  shouldToolMessageRowStartCollapsed,
  shouldToolMessageStartCollapsed,
  TOOL_FORCE_COLLAPSE_CONTENT_CHARS,
  TOOL_OUTPUT_PREVIEW_CHARS,
} from "./toolPresentation";

describe("tool presentation helpers", () => {

  it("falls back to compact key-value text for generic summary objects", () => {
    expect(
      normalizeToolDisplaySummary(
        { palaceCount: 12, mingZhu: "破军", shenZhu: "文昌" },
        "ziweiChart"
      )
    ).toBe("palaceCount: 12 · mingZhu: 破军 · shenZhu: 文昌");
  });

  it("does not hide handoff tool rows", () => {
    expect(
      isHiddenOrchestratorToolMessage({
        role: "tool",
        toolName: "startAgentRun",
      })
    ).toBe(false);
    expect(
      isHiddenOrchestratorToolMessage({
        role: "tool",
        toolName: "runStreamingAgent",
      })
    ).toBe(false);
    expect(
      isHiddenOrchestratorToolMessage({
        role: "tool",
        toolName: "readDoc",
      })
    ).toBe(false);
  });
  it("hides browser-runtime-only server tool error rows", () => {
    expect(
      isHiddenOrchestratorToolMessage({
        role: "tool",
        toolName: "queryModelUsage",
      })
    ).toBe(true);
    expect(
      isHiddenOrchestratorToolMessage({
        role: "tool",
        toolName: "createAgentAutomation",
      })
    ).toBe(true);
    expect(
      isHiddenOrchestratorToolMessage({
        role: "assistant",
        toolName: "queryModelUsage",
      })
    ).toBe(false);
  });

  it("keeps image tool rows expanded by default", () => {
    expect(shouldToolMessageStartCollapsed("geminiFlashImage")).toBe(false);
    expect(shouldToolMessageStartCollapsed("openAIGptImage")).toBe(false);
    expect(shouldToolMessageStartCollapsed("openAIGptImageGenerate")).toBe(false);
    expect(shouldToolMessageStartCollapsed("chatgptWebImageGenerate")).toBe(false);
    expect(shouldToolMessageStartCollapsed("openAIGptImageEdit")).toBe(false);
    expect(shouldToolMessageStartCollapsed("read_x_post")).toBe(false);
    expect(shouldToolMessageStartCollapsed("runStreamingAgent")).toBe(false);
    expect(shouldToolMessageStartCollapsed("createTable")).toBe(false);
    expect(shouldToolMessageStartCollapsed("readDoc")).toBe(true);
  });

  it("builds compact handoff presentation without exposing full JSON", () => {
    const presentation = buildRunStreamingAgentHandoffPresentation({
      rawData: {
        agentKey: "agent-user-frontend",
        agentName: "前端实现员",
        userInput:
          "请检查 MessageList 和 ToolMessageItem 的展示逻辑，并实现一个很长很长的状态摘要。",
        dialogKey: "dialog-user-child",
        spaceId: "space-1",
      },
      toolPayload: {
        status: "succeeded",
        input: {
          userInput: "raw input should not be preferred",
        },
      },
      isStreaming: false,
      isError: false,
    });

    expect(presentation.summary).toBe("已交给 前端实现员 处理");
    expect(presentation.agentKey).toBe("agent-user-frontend");
    expect(presentation.targetDialogKey).toBe("dialog-user-child");
    expect(presentation.targetSpaceId).toBe("space-1");
    expect(presentation.statusLabel).toBe("已交接");
    expect(presentation.inputSummary).toContain("请检查 MessageList");
    expect(presentation.inputSummary).not.toContain("{");
  });

  it("uses readable labels for built-in handoff agents", () => {
    const presentation = buildRunStreamingAgentHandoffPresentation({
      rawData: {
        agentKey: "agent-pub-01ECOMMERCEAG00000001PYQ2J",
        userInput: "查询京东商品参数",
      },
      isStreaming: false,
      isError: false,
    });

    expect(presentation.summary).toBe("已交给 电商商品参数助手 处理");
    expect(presentation.agentKey).toBe("agent-pub-01ECOMMERCEAG00000001PYQ2J");
  });

  it("previews long tool text under char and line limits", () => {
    const short = "ok\nline2";
    expect(shouldPreviewToolText(short)).toBe(false);
    expect(previewToolText(short).truncated).toBe(false);
    expect(previewToolText(short).preview).toBe(short);

    const longLine = "x".repeat(TOOL_OUTPUT_PREVIEW_CHARS + 500);
    expect(shouldPreviewToolText(longLine)).toBe(true);
    const longPreview = previewToolText(longLine);
    expect(longPreview.truncated).toBe(true);
    expect(longPreview.preview.length).toBeLessThanOrEqual(TOOL_OUTPUT_PREVIEW_CHARS);
    expect(longPreview.totalChars).toBe(longLine.length);

    const manyLines = Array.from({ length: 200 }, (_, i) => `line-${i}`).join("\n");
    const linePreview = previewToolText(manyLines);
    expect(linePreview.truncated).toBe(true);
    expect(linePreview.preview.split("\n").length).toBeLessThanOrEqual(120);
  });

  it("force-collapses oversized payloads even for default-expanded tools", () => {
    const huge = "y".repeat(TOOL_FORCE_COLLAPSE_CONTENT_CHARS + 10);
    expect(
      shouldToolMessageRowStartCollapsed({
        toolName: "createTable",
        content: huge,
      })
    ).toBe(true);
    expect(
      shouldToolMessageRowStartCollapsed({
        toolName: "createTable",
        content: "small",
      })
    ).toBe(false);
    expect(
      shouldToolMessageRowStartCollapsed({
        toolName: "readDoc",
        content: "small",
      })
    ).toBe(true);
    expect(
      shouldToolMessageRowStartCollapsed({
        toolName: "readDoc",
        content: huge,
        isError: true,
      })
    ).toBe(false);
    expect(estimateToolContentChars(huge)).toBe(huge.length);
  });
});
