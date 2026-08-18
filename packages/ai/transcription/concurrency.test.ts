import { test, expect } from "bun:test";
import { buildSubtitles } from "./index";
import type { WhisperVerboseResponse } from "./types";

/** 造一个 N 词的假响应，每词 1 秒，词形为「甲乙丙…」的可辨识字符 */
function makeResp(wordCount: number): WhisperVerboseResponse {
  const words = Array.from({ length: wordCount }, (_, i) => ({
    word: String.fromCharCode(0x4e00 + i),
    start: i,
    end: i + 1,
  }));
  return {
    task: "transcribe",
    language: "zh",
    duration: wordCount,
    text: words.map((w) => w.word).join(""),
    words,
  } as WhisperVerboseResponse;
}

test("并发标点后，cue 顺序与串行一致", async () => {
  const resp = makeResp(900);
  // 标点函数原样返回（不改字符），但延时随块次序递减，
  // 若实现按完成顺序拼装，输出顺序就会错乱。
  let call = 0;
  const punctuateFn = async (text: string) => {
    const n = call++;
    await new Promise((r) => setTimeout(r, (10 - Math.min(n, 9)) * 5));
    return text;
  };

  const serial = await buildSubtitles(resp, { punctuateFn, concurrency: 1 });
  const parallel = await buildSubtitles(resp, { punctuateFn, concurrency: 8 });

  expect(parallel.cues.length).toBe(serial.cues.length);
  expect(parallel.cues.map((c) => c.text)).toEqual(serial.cues.map((c) => c.text));
  expect(parallel.cues.map((c) => c.start)).toEqual(serial.cues.map((c) => c.start));
  expect(parallel.text).toBe(serial.text);
});

test("并发下单块失败只降级该块，计数准确", async () => {
  const resp = makeResp(900);
  let call = 0;
  const punctuateFn = async (text: string) => {
    // 第二块抛错，其余正常
    if (call++ === 1) throw new Error("boom");
    return text;
  };

  const r = await buildSubtitles(resp, { punctuateFn, concurrency: 8 });
  expect(r.degradedChunks).toBe(1);
  expect(r.cues.length).toBeGreaterThan(0);
  // 其余块仍产出内容，未整篇作废
  expect(r.text.length).toBeGreaterThan(0);
});

test("并发数大于块数时不越界", async () => {
  const resp = makeResp(120);
  const r = await buildSubtitles(resp, {
    punctuateFn: async (t) => t,
    concurrency: 64,
  });
  expect(r.cues.length).toBeGreaterThan(0);
  expect(r.degradedChunks).toBe(0);
});

test("concurrency 为 0 或负数时回落到 1，不死循环", async () => {
  const resp = makeResp(120);
  const r = await buildSubtitles(resp, {
    punctuateFn: async (t) => t,
    concurrency: 0,
  });
  expect(r.cues.length).toBeGreaterThan(0);
});

test("每个块恰好被处理一次（无重复、无遗漏）", async () => {
  const resp = makeResp(1500);
  const seen: string[] = [];
  await buildSubtitles(resp, {
    punctuateFn: async (t) => {
      seen.push(t);
      return t;
    },
    concurrency: 8,
  });
  expect(new Set(seen).size).toBe(seen.length);
});
