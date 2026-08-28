import { describe, test, expect } from "bun:test";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { clipHeadAndTail } from "./clipHeadAndTail";

describe("toolOutput clipHeadAndTail", () => {
  test("returns original content when below threshold", () => {
    const text = "Short output";
    const res = clipHeadAndTail(text, { maxTotalBytes: 100 });
    expect(res.clipped).toBe(false);
    expect(res.content).toBe(text);
  });

  test("clips content using Head+Tail when above threshold and saves temp log", () => {
    const head = "START_HEADER_LINE_1234567890\n".repeat(50);
    const middle = "MIDDLE_NOISE_LINE_1234567890\n".repeat(200);
    const tail = "END_TAIL_LINE_1234567890\n".repeat(50);
    const fullText = head + middle + tail;
    const res = clipHeadAndTail(fullText, {
      maxHeadBytes: 100,
      maxTailBytes: 100,
      maxTotalBytes: 300,
      toolCallId: "test-tool-call-1",
    });
    expect(res.clipped).toBe(true);
    expect(res.content).toContain("START_HEADER");
    expect(res.content).toContain("END_TAIL");
    expect(res.content).toContain("[... truncated");
    expect(res.logPath).toBeDefined();
    if (res.logPath && existsSync(res.logPath)) {
      const savedContent = readFileSync(res.logPath, "utf8");
      expect(savedContent).toBe(fullText);
      unlinkSync(res.logPath);
    }
  });

  test("protects UTF-8 multi-byte character boundaries during clipping", () => {
    const chineseText = "测试中文字符截断，确保不会出现乱码字符。".repeat(20);
    const res = clipHeadAndTail(chineseText, {
      maxHeadBytes: 11, // Split in middle of 3-byte char if unaligned
      maxTailBytes: 11,
      maxTotalBytes: 30,
      saveTempLog: false,
    });
    expect(res.clipped).toBe(true);
    expect(res.content).not.toContain("\uFFFD");
  });
});