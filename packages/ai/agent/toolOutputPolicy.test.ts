import { describe, expect, test } from "bun:test";
import {
  DEFAULT_TOOL_OUTPUT_PROFILE,
  FRESH_TOOL_OUTPUT_MAX_CHARS,
  MAX_HISTORICAL_TOOL_CONTENT_CHARS,
  MAX_IN_TURN_TOOL_CONTENT_CHARS,
  TOOL_OUTPUT_PROFILES,
  clipToolText,
  projectToolMessageContent,
  resolveHistoricalToolContentCap,
  resolveToolOutputProfile,
} from "./toolOutputPolicy";


describe("toolOutputPolicy shared module", () => {
  test("TOOL_OUTPUT_PROFILES contains exact historical values and profiles", () => {
    expect(MAX_HISTORICAL_TOOL_CONTENT_CHARS).toBe(1600);
    expect(MAX_IN_TURN_TOOL_CONTENT_CHARS).toBe(4000);
    expect(FRESH_TOOL_OUTPUT_MAX_CHARS).toBe(32_000);

    expect(DEFAULT_TOOL_OUTPUT_PROFILE).toEqual({
      maxChars: 4000,
      headRatio: 0.5,
    });

    expect(TOOL_OUTPUT_PROFILES["readFile"]).toEqual({
      maxChars: 4800,
      headRatio: 0.68,
      historicalMaxChars: 4800,
    });
    expect(TOOL_OUTPUT_PROFILES["read_file"]).toEqual({
      maxChars: 4800,
      headRatio: 0.68,
      historicalMaxChars: 4800,
    });
    expect(TOOL_OUTPUT_PROFILES["execShell"]).toEqual({
      maxChars: 4000,
      headRatio: 0.35,
    });
  });

  test("resolveToolOutputProfile resolves same profile across paths", () => {
    expect(resolveToolOutputProfile("readFile")).toEqual({
      maxChars: 4800,
      headRatio: 0.68,
      historicalMaxChars: 4800,
    });
    expect(resolveToolOutputProfile("nonExistentTool")).toEqual(
      DEFAULT_TOOL_OUTPUT_PROFILE,
    );
    expect(resolveToolOutputProfile(undefined)).toEqual(
      DEFAULT_TOOL_OUTPUT_PROFILE,
    );
  });

  test("clipToolText preserves head and tail correctly and respects custom markers", () => {
    const input = "A".repeat(100) + "B".repeat(100);
    const clipped = clipToolText(input, 120, 0.5);
    expect(clipped.length).toBe(120);
    expect(clipped).toContain(
      "[... tool output middle omitted; head/tail preserved ...]",
    );

    const customMarker = "\n…[截断，原始长度 200 字符]";
    const freshClipped = clipToolText(input, 50, 0.5, customMarker);
    expect(freshClipped.length).toBe(50);
    expect(freshClipped).toContain("…[截断，原始长度 200 字符]");
    expect(freshClipped.startsWith("A")).toBe(true);
    expect(freshClipped.endsWith("B")).toBe(true);
  });
});

// 这些断言针对纯函数 projectToolMessageContent，而不是 compressOldToolResults 包装器。
// 原因：streamAgentChatTurn.test.ts 用 mock.module("./streamAgentChatTurnUtils") 把
// compressOldToolResults 换成了恒等桩 (messages) => messages，而 Bun 的 mock.module
// 是全局的、mock.restore() 清不掉（见该文件顶部注释）。针对包装器的断言在全量跑时
// 会被那个桩静默架空——单文件绿、全量红。纯函数不在被 mock 的模块里，mock 不掉。
describe("tool output fresh vs historical policy", () => {
  test("fresh tool output > 32,000 chars is clipped to 32,000 with truncation marker", () => {
    const hugeOutput = "START_" + "X".repeat(40000) + "_END";

    const contentStr = projectToolMessageContent({
      content: hugeOutput,
      isFresh: true,
      toolName: "readFile",
      historicalMaxChars: 800,
    });

    expect(contentStr.length).toBe(32_000);
    expect(contentStr).toContain(`…[截断，原始长度 ${hugeOutput.length} 字符]`);
    expect(contentStr.startsWith("START_")).toBe(true);
    expect(contentStr.endsWith("_END")).toBe(true);
  });

  test("fresh tool output <= 32,000 chars remains completely unchanged", () => {
    const normalOutput = "A".repeat(1000);

    expect(
      projectToolMessageContent({
        content: normalOutput,
        isFresh: true,
        toolName: "readFile",
        historicalMaxChars: 800,
      }),
    ).toBe(normalOutput);
  });

  test("historical tool results are clipped at 800 chars default unchanged", () => {
    const historicalOutput = "H".repeat(1200);

    const clipped = projectToolMessageContent({
      content: historicalOutput,
      isFresh: false,
      toolName: "execShell",
      historicalMaxChars: 800,
    });

    expect(clipped.startsWith("H".repeat(800))).toBe(true);
    expect(clipped).toContain(`…[截断，原始长度 1200 字符]`);

    // 未超过 historical 上限的不动
    const shortOutput = "S".repeat(500);
    expect(
      projectToolMessageContent({
        content: shortOutput,
        isFresh: false,
        toolName: "execShell",
        historicalMaxChars: 800,
      }),
    ).toBe(shortOutput);
  });

  test("historical read results keep their profile retention cap, not the flat budget", () => {
    // Small read results survive history intact so the model does not pay
    // another tool step to re-read unchanged content.
    const withinReadCap = "R".repeat(4800);
    expect(
      projectToolMessageContent({
        content: withinReadCap,
        isFresh: false,
        toolName: "readFile",
        historicalMaxChars: 800,
      }),
    ).toBe(withinReadCap);
    expect(
      projectToolMessageContent({
        content: withinReadCap,
        isFresh: false,
        toolName: "readPastedText",
        historicalMaxChars: 800,
      }),
    ).toBe(withinReadCap);

    const overReadCap = "R".repeat(6000);
    const clipped = projectToolMessageContent({
      content: overReadCap,
      isFresh: false,
      toolName: "readFile",
      historicalMaxChars: 800,
    });
    expect(clipped.startsWith("R".repeat(4800))).toBe(true);
    expect(clipped).toContain("…[截断，原始长度 6000 字符]");
  });

  test("resolveHistoricalToolContentCap falls back for unprofiled tools", () => {
    expect(resolveHistoricalToolContentCap("execShell", 800)).toBe(800);
    expect(resolveHistoricalToolContentCap(undefined, 800)).toBe(800);
    expect(resolveHistoricalToolContentCap("readFile", 800)).toBe(4800);
    expect(resolveHistoricalToolContentCap("readPastedText", 800)).toBe(4800);
  });
});
