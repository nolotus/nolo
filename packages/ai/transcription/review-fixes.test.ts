import { test, expect } from "bun:test";
import { splitCue, splitCues } from "./split";

// —— HIGH：单字符 + 超时长 cue 曾导致 splitCue 无限递归、栈溢出 ——
// 复现路径：chars.length===1 时 splitIndex 被 clamp 回 1，leftText 与入参完全相同，
// 于是 splitCue(leftCue) 无限自递归。顶部 guard 挡不住，因为 duration > maxDuration。

test("单字符且超时长的 cue 不会无限递归", () => {
  const cue = { start: 0, end: 7, text: "好" };
  expect(() => splitCue(cue, { maxChars: 24, maxDuration: 6 })).not.toThrow();
  expect(splitCue(cue, { maxChars: 24, maxDuration: 6 })).toEqual([cue]);
});

test("单字符超时长 cue 混在列表中时，整批 splitCues 不崩", () => {
  const cues = [
    { start: 0, end: 2, text: "正常一句。" },
    { start: 2, end: 12, text: "啊" },
    { start: 12, end: 14, text: "又一句。" },
  ];
  const out = splitCues(cues, { maxChars: 24, maxDuration: 6 });
  expect(out.length).toBeGreaterThanOrEqual(3);
  expect(out.some((c) => c.text === "啊")).toBe(true);
});

test("空文本 cue 不递归", () => {
  expect(() => splitCue({ start: 0, end: 9, text: "" }, {})).not.toThrow();
});

test("切分仍对正常超长 cue 生效（防止 guard 误伤）", () => {
  const long = { start: 0, end: 10, text: "这是一个很长的句子，需要被切分成多条字幕才能阅读。" };
  const out = splitCue(long, { maxChars: 12, maxDuration: 6 });
  expect(out.length).toBeGreaterThan(1);
  for (const c of out) {
    expect([...c.text].length).toBeLessThanOrEqual(12);
    expect(c.end - c.start).toBeLessThanOrEqual(6);
  }
});

// —— MEDIUM：markdown 代码围栏会绕过 matchRatio 校验，直接漏进 SRT 正文 ——
// 围栏字符属 \p{S}/\s，对齐阶段当标点跳过，所以校验发现不了。
// 这里只测剥离逻辑本身，不联网。

function stripFence(raw: string): string {
  return raw
    .replace(/^\s*```[a-zA-Z]*\r?\n?/, "")
    .replace(/\r?\n?```\s*$/, "")
    .trim();
}

test("剥离无语言标签的代码围栏", () => {
  expect(stripFence("```\n大家好，今天天气很好。\n```")).toBe("大家好，今天天气很好。");
});

test("剥离带语言标签的代码围栏", () => {
  expect(stripFence("```text\n大家好，今天天气很好。\n```")).toBe("大家好，今天天气很好。");
});

test("无围栏的正常文本不被破坏", () => {
  expect(stripFence("大家好，今天天气很好。")).toBe("大家好，今天天气很好。");
});

test("正文中间的反引号不被误删", () => {
  expect(stripFence("他说 `code` 很重要。")).toBe("他说 `code` 很重要。");
});
