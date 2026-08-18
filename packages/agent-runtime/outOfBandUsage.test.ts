import { expect, test } from "bun:test";
import { addOutOfBandUsage } from "./localLoop";

// 自动压缩的摘要生成是一次独立的计费 LLM 调用。它的用量必须并入本轮 usage，
// 否则只出现在 provider 账单上、我们自己的 token 记账完全看不到（计费盲区）。
//
// 不能复用 mergeTurnUsage：它的 input 取 `right.input || left.input`（最后一次
// 非零值，为多轮工具循环设计——每轮 input 是累积上下文，相加会重复计数）。
// 对带外调用必须相加，否则 input 会被静默丢掉。

test("带外用量的 input 是相加，不是取最后一次", () => {
  const turn = { input_tokens: 5000, output_tokens: 300 };
  const summary = { input_tokens: 40_000, output_tokens: 800 };
  const out = addOutOfBandUsage(turn, summary)!;
  expect(out.input_tokens).toBe(45_000); // 相加，而非 40000 或 5000
  expect(out.output_tokens).toBe(1100);
});

test("缓存命中/未命中也相加", () => {
  const out = addOutOfBandUsage(
    { cache_read_input_tokens: 1000, cache_creation_input_tokens: 200 },
    { cache_read_input_tokens: 3000, cache_creation_input_tokens: 50 },
  )!;
  expect(out.cache_read_input_tokens).toBe(4000);
  expect(out.cache_creation_input_tokens).toBe(250);
});

test("没有带外用量时原样返回（未触发压缩的轮次不受影响）", () => {
  const turn = { input_tokens: 5000, output_tokens: 300 };
  expect(addOutOfBandUsage(turn, undefined)).toBe(turn);
});

test("兼容 prompt_tokens / completion_tokens 命名", () => {
  const out = addOutOfBandUsage(
    { prompt_tokens: 100, completion_tokens: 10 },
    { prompt_tokens: 900, completion_tokens: 90 },
  )!;
  expect(out.input_tokens).toBe(1000);
  expect(out.output_tokens).toBe(100);
});
