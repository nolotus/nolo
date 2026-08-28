import { describe, it, expect } from "bun:test";
import type { Word } from "./types";
import { alignPunctuatedText, longestCommonSubstringLength } from "./align";

/**
 * LCS 盲区防御（handoff #5）：
 * align.ts 的 matchRatio = lcsLength / max(len)，LCS 只看公共子序列、不看相邻性。
 * 「整段改写但保留大量高频字（的/是/我/了/在）」可能让 LCS ratio 蒙混过关。
 * 防御：最长公共子串占 LCS 的比例过低时拒绝（散点匹配 = 垃圾时间戳）。
 */

function wordsFromChars(chars: string): Word[] {
  return Array.from(chars).map((ch, i) => ({
    word: ch,
    start: i * 0.5,
    end: i * 0.5 + 0.5,
  }));
}

describe("longestCommonSubstringLength", () => {
  it("返回最长公共子串长度（相邻匹配，非子序列）", () => {
    expect(longestCommonSubstringLength("abcde", "abfde")).toBe(2); // "ab" 或 "de"
    expect(longestCommonSubstringLength("abcdef", "zabcwdef")).toBe(3); // "abc"
    expect(longestCommonSubstringLength("xyz", "abc")).toBe(0);
  });

  it("空输入返回 0", () => {
    expect(longestCommonSubstringLength("", "abc")).toBe(0);
    expect(longestCommonSubstringLength("abc", "")).toBe(0);
    expect(longestCommonSubstringLength([], [])).toBe(0);
  });
});

describe("align adjacency check (LCS 盲区防御)", () => {
  it("高频字散点蒙混：LCS 达标但最长公共子串占比过低 -> 拒绝", () => {
    // words 与 punctText 共享全部高频字，但被 x/y/z 等字符隔开打散：
    // LCS = 10（所有高频字匹配），10/20 = 0.5 可通过 minMatchRatio 0.5；
    // 但最长公共子串只有 1（每个字孤立），1/10 = 0.1 < 0.3 -> 拒绝。
    const words = wordsFromChars("我他她它你我他她它你");
    const scattered = "我x他y她z它w你v我q他r她s它t你";
    const res = alignPunctuatedText(words, scattered, { minMatchRatio: 0.5 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toContain("longest-common-substring");
    }
  });

  it("正常对齐（标点插入）不被误伤", () => {
    const words = wordsFromChars("今天天气很好");
    const res = alignPunctuatedText(words, "今天天气很好！", {
      minMatchRatio: 0.5,
    });
    expect(res.ok).toBe(true);
  });

  it("ASR 局部纠错（多agent vs 多一阵）不被误伤", () => {
    // 真实样本：ASR 输出「多一阵」，标点模型纠正为「多agent」。
    // LCS 保留「第一个是」「是什么」两段连续原文，子串/LCS 仍可观。
    const words = wordsFromChars("第一个是多一阵是什么");
    const res = alignPunctuatedText(words, "第一个是多agent是什么？", {
      minMatchRatio: 0.5,
    });
    expect(res.ok).toBe(true);
  });

  it("adjacencyCheck: false 时蒙混场景放行（选项可关闭）", () => {
    const words = wordsFromChars("我他她它你我他她它你");
    const scattered = "我x他y她z它w你v我q他r她s它t你";
    const res = alignPunctuatedText(words, scattered, {
      minMatchRatio: 0.5,
      adjacencyCheck: false,
    });
    expect(res.ok).toBe(true);
  });
});
