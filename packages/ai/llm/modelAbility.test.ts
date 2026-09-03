import { describe, expect, it } from "bun:test";

import { getModelAbility, normalizeModelName } from "./modelAbility";
import { ALL_MODELS } from "./models";

describe("modelAbility", () => {
  it("contains the screenshot benchmark values", () => {
    expect(getModelAbility("claude-opus-5")).toEqual({ passAt1: 74, benchmarkScore: 61, writingScore: 82 });
    expect(getModelAbility("claude-opus-4-6")).toEqual({ passAt1: 65, benchmarkScore: 68, writingScore: 78 });
    expect(getModelAbility("gpt-5.6-sol")).toEqual({ passAt1: 73, benchmarkScore: 59, writingScore: 80 });
    expect(getModelAbility("gpt-5.6-terra")).toEqual({ passAt1: 70, benchmarkScore: 55 });
    expect(getModelAbility("gpt-5.5")).toEqual({ passAt1: 67 });
    expect(getModelAbility("claude-fable-5")).toEqual({ passAt1: 70 });
    expect(getModelAbility("kimi-k3")).toEqual({ passAt1: 69, benchmarkScore: 57, writingScore: 81 });
    expect(getModelAbility("grok-4.5")).toEqual({ passAt1: 54, benchmarkScore: 54 });
    expect(getModelAbility("grok-4.6")).toEqual({ passAt1: 67 });
    expect(getModelAbility("claude-sonnet-5")).toEqual({ passAt1: 54, benchmarkScore: 53 });
    expect(getModelAbility("deepseek-v4-flash")).toEqual({ passAt1: 53 });
    expect(getModelAbility("deepseek-v4-pro")).toEqual({ passAt1: 63, writingScore: 79 });
    expect(getModelAbility("gpt-5.6-luna")).toEqual({ passAt1: 67, benchmarkScore: 51 });
    expect(getModelAbility("glm-5.2")).toEqual({ passAt1: 44, benchmarkScore: 51 });
    expect(getModelAbility("gemini-3.6-flash")).toEqual({ passAt1: 49, benchmarkScore: 50 });
    expect(getModelAbility("gemini-3.7-flash")).toEqual({ passAt1: 58, benchmarkScore: 65, writingScore: 88 });
    // 3.8 基准快照未出，暂沿用 3.7 分数占位（见 MODEL_ABILITY_TABLE TODO）
    expect(getModelAbility("gemini-3.8-flash")).toEqual({ passAt1: 58, benchmarkScore: 65, writingScore: 88 });
    expect(getModelAbility("qwen3.8-max")).toEqual({ passAt1: 57, writingScore: 77 });
    expect(getModelAbility("muse-spark-1.2")).toEqual({ passAt1: 55 });
    expect(getModelAbility("muse-spark-1.1")).toEqual({ passAt1: 53 });
    expect(getModelAbility("gpt-5.4")).toEqual({ passAt1: 52 });
  });

  it("resolves Gemini 3.7 capability with high writing score and benchmark values", () => {
    expect(getModelAbility("gemini-3.7-flash")).toEqual({
      passAt1: 58,
      benchmarkScore: 65,
      writingScore: 88,
    });
  });

  it("normalizes provider prefixes, thinking/tier variants and effort suffixes", () => {
    expect(getModelAbility("anthropic/claude-sonnet-5")).toEqual({ passAt1: 54, benchmarkScore: 53 });
    expect(getModelAbility("gemini-3.6-flash-high")).toEqual({ passAt1: 49, benchmarkScore: 50 });
    expect(getModelAbility("openai/gpt-5.6-sol-medium")).toEqual({ passAt1: 73, benchmarkScore: 59, writingScore: 80 });
    expect(getModelAbility("claude-opus-4-6-thinking")).toEqual({ passAt1: 65, benchmarkScore: 68, writingScore: 78 });
    expect(getModelAbility("gemini-3.7-flash-tiered")).toEqual({ passAt1: 58, benchmarkScore: 65, writingScore: 88 });
    expect(getModelAbility("gemini-3.8-flash-tiered")).toEqual({ passAt1: 58, benchmarkScore: 65, writingScore: 88 });
    expect(getModelAbility("kimi-k3:cloud")).toEqual({ passAt1: 69, benchmarkScore: 57, writingScore: 81 });
    expect(normalizeModelName("  GLM-5.2  ")).toBe("glm-5.2");
  });

  it("returns no score for unknown models", () => {
    expect(getModelAbility("totally-unknown-model-xyz")).toBeUndefined();
    expect(getModelAbility("")).toBeUndefined();
    expect(getModelAbility("claude-opus-4")).toBeUndefined();
  });

  it("attaches known ability metadata to ALL_MODELS without changing pricing", () => {
    const flash = ALL_MODELS.find((model) => model.name === "deepseek-v4-flash");
    expect(flash?.ability).toEqual({ passAt1: 53 });
    expect(flash?.price).toBeDefined();
    expect(typeof flash?.hasVision).toBe("boolean");
  });
});
