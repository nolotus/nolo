import { describe, expect, it } from "bun:test";

import {
  buildDialogFallbackTitleFromMessages,
  buildDialogFallbackTitleFromUserInput,
  normalizeDialogTitle,
  resolveDialogTitle,
} from "./dialogTitle";

describe("dialogTitle", () => {
  it("prefers the leading clause before a detailed prompt body", () => {
    expect(
      buildDialogFallbackTitleFromUserInput(
        "生成一张最简单的测试图：使用最小分辨率，1:1 构图，白色背景。"
      )
    ).toBe("生成一张最简单的测试图");
  });

  it("falls back to the first user message in message context", () => {
    expect(
      buildDialogFallbackTitleFromMessages([
        { role: "assistant", content: "[图片]" },
        {
          role: "user",
          content: "把背景改成很浅的蓝色：姿态和构图尽量保持不变。",
        },
      ])
    ).toBe("把背景改成很浅的蓝色");
  });

  it("normalizes generated titles down to a single clean line", () => {
    expect(normalizeDialogTitle('  "AI 邮件助手取舍"\n再来一行  ')).toBe(
      "AI 邮件助手取舍"
    );
  });

  it("falls back when the generated title is empty", () => {
    expect(resolveDialogTitle("", "最简单的测试图")).toBe("最简单的测试图");
  });

  it("keeps short CJK titles unchanged", () => {
    expect(normalizeDialogTitle("AI 邮件助手取舍")).toBe("AI 邮件助手取舍");
  });

  it("truncates long CJK titles at code point boundary without trailing punctuation", () => {
    const longTitle = "这是一个非常非常非常非常非常超过二十八个字符的中文对话标题需要被截断：；，";
    const normalized = normalizeDialogTitle(longTitle);
    expect(Array.from(normalized).length).toBeLessThanOrEqual(28);
    expect(normalized).toBe("这是一个非常非常非常非常非常超过二十八个字符的中文对话…");
    expect(normalized.endsWith("…")).toBe(true);
    expect(normalized.endsWith("：…")).toBe(false);
  });

  it("truncates long English titles at word boundary with <= 6 words and caps code points to <= maxChars", () => {
    const longEnTitle = "Fix critical visual alignment bug in button component right now";
    const normalized = normalizeDialogTitle(longEnTitle);
    expect(normalized).toBe("Fix critical visual alignme…");
    expect(Array.from(normalized).length).toBeLessThanOrEqual(28);
    expect(normalized.split(" ").length).toBeLessThanOrEqual(6);
  });

  it("truncates long English title exceeding maxChars during fallback to <= maxChars code points ending with ellipsis", () => {
    const longEnSingleWord = "SupercalifragilisticexpialidociousWithExtraLongWordWithoutAnySpacesInItAndItHas69Chars";
    expect(Array.from(longEnSingleWord).length).toBeGreaterThanOrEqual(69);
    const fallbackTitle = buildDialogFallbackTitleFromUserInput(longEnSingleWord);
    expect(Array.from(fallbackTitle).length).toBeLessThanOrEqual(24);
    expect(fallbackTitle.endsWith("…")).toBe(true);
  });

  it("safely handles emoji boundaries without splitting surrogate pairs", () => {
    const emojiTitle = "AI 助手重构 🚀🤖🔥✨🎉👍💡📦🛠️🎨⚡️💯🌟🎯";
    const normalized = normalizeDialogTitle(emojiTitle);
    expect(normalized.includes("\ufffd")).toBe(false);
    expect(Array.from(normalized).length).toBeLessThanOrEqual(28);
  });

  it("cleans trailing punctuation before adding ellipsis", () => {
    expect(normalizeDialogTitle("重复扣费退款：，；！")).toBe("重复扣费退款");
    const longWithPunct = "这是一个超过二十八个字符且截断点带有全角标点的标题：，！测试文本字符串";
    const normalized = normalizeDialogTitle(longWithPunct);
    expect(normalized.includes("：…")).toBe(false);
    expect(normalized.includes("，…")).toBe(false);
    expect(normalized.includes("！…")).toBe(false);
  });

  it("handles empty and whitespace inputs gracefully", () => {
    expect(normalizeDialogTitle("")).toBe("");
    expect(normalizeDialogTitle("   \n\t  ")).toBe("");
    expect(normalizeDialogTitle(null)).toBe("");
    expect(normalizeDialogTitle(undefined)).toBe("");
    expect(buildDialogFallbackTitleFromUserInput("")).toBe("");
  });
});
