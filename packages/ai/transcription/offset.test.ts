import { describe, it, expect } from "bun:test";
import type { Word } from "./types";
import { offsetWords, mergeWordChunks } from "./offset";

describe("offsetWords", () => {
  it("为空数组时返回空", () => {
    expect(offsetWords([], 5)).toEqual([]);
  });

  it("偏移量为 0 时返回原时间戳副本", () => {
    const words: Word[] = [{ word: "你好", start: 1.0, end: 2.0 }];
    const out = offsetWords(words, 0);
    expect(out).toEqual(words);
    expect(out).not.toBe(words);
  });

  it("每个 word 的 start/end 都加上偏移", () => {
    const words: Word[] = [
      { word: "第", start: 0.0, end: 0.2 },
      { word: "二", start: 0.2, end: 0.4 },
    ];
    expect(offsetWords(words, 12.5)).toEqual([
      { word: "第", start: 12.5, end: 12.7 },
      { word: "二", start: 12.7, end: 12.9 },
    ]);
  });
});

describe("mergeWordChunks", () => {
  it("为空数组时返回空", () => {
    expect(mergeWordChunks([])).toEqual([]);
  });

  it("空 words 段被跳过", () => {
    const chunks = [
      { words: [] as Word[], offsetSec: 0 },
      { words: [{ word: "一", start: 0, end: 1 }], offsetSec: 0 },
    ];
    expect(mergeWordChunks(chunks)).toEqual([{ word: "一", start: 0, end: 1 }]);
  });

  it("两段连续合并无重叠", () => {
    const chunks = [
      {
        words: [
          { word: "第", start: 0.0, end: 0.2 },
          { word: "一", start: 0.2, end: 0.4 },
        ],
        offsetSec: 0,
      },
      {
        words: [
          { word: "第", start: 0.0, end: 0.2 },
          { word: "二", start: 0.2, end: 0.4 },
        ],
        offsetSec: 0.4,
      },
    ];
    const out = mergeWordChunks(chunks);
    // 浮点加法有精度误差（0.2+0.4=0.6000000000000001），用 closeTo 断言
    const expected = [
      { word: "第", start: 0.0, end: 0.2 },
      { word: "一", start: 0.2, end: 0.4 },
      { word: "第", start: 0.4, end: 0.6 },
      { word: "二", start: 0.6, end: 0.8 },
    ];
    expect(out).toHaveLength(expected.length);
    for (let i = 0; i < expected.length; i++) {
      expect(out[i].word).toBe(expected[i].word);
      expect(out[i].start).toBeCloseTo(expected[i].start, 10);
      expect(out[i].end).toBeCloseTo(expected[i].end, 10);
    }

    // 时间戳单调不减
    for (let i = 1; i < out.length; i++) {
      expect(out[i].start).toBeGreaterThanOrEqual(out[i - 1].end);
    }
  });

  it("三段偏移累加后仍连续", () => {
    const chunks = [
      { words: [{ word: "A", start: 0, end: 1 }], offsetSec: 0 },
      { words: [{ word: "B", start: 0, end: 1 }], offsetSec: 1 },
      { words: [{ word: "C", start: 0, end: 1 }], offsetSec: 2 },
    ];
    expect(mergeWordChunks(chunks)).toEqual([
      { word: "A", start: 0, end: 1 },
      { word: "B", start: 1, end: 2 },
      { word: "C", start: 2, end: 3 },
    ]);
  });

  it("段 k 的起始偏移 = 前 k-1 段时长之和", () => {
    const chunks = [
      {
        words: [
          { word: "a", start: 0, end: 1 },
          { word: "b", start: 1, end: 2.5 },
        ],
        offsetSec: 0,
      },
      {
        words: [
          { word: "c", start: 0, end: 1 },
          { word: "d", start: 1, end: 2 },
        ],
        offsetSec: 2.5, // 第一段总时长
      },
      {
        words: [{ word: "e", start: 0, end: 0.5 }],
        offsetSec: 4.5, // 前两段总时长
      },
    ];
    const out = mergeWordChunks(chunks);
    expect(out[out.length - 1].end).toBe(5.0);
  });
});
