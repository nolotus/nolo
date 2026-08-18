import { describe, expect, it } from "bun:test";
import { applyTokenUsageToDayStats, type DayStats } from "./applyTokenUsageToDayStats";

const delta = {
  userId: "user-1",
  timeKey: "2026-07-31",
  model: "gpt-5",
  provider: "openai",
  input_tokens: 100,
  output_tokens: 50,
  cost: 0.01,
};

describe("applyTokenUsageToDayStats", () => {
  it("prev=null → 初始化并累加", () => {
    const result = applyTokenUsageToDayStats(null, delta);
    expect(result.userId).toBe("user-1");
    expect(result.total.count).toBe(1);
    expect(result.total.tokens.input).toBe(100);
    expect(result.total.tokens.output).toBe(50);
    expect(result.total.cost).toBe(0.01);
    expect(result.models["gpt-5"].count).toBe(1);
    expect(result.providers["openai"].count).toBe(1);
  });

  it("prev 存在 → 累加到现有", () => {
    const prev: DayStats = {
      userId: "user-1", period: "day", timeKey: "2026-07-31",
      total: { count: 5, tokens: { input: 500, output: 250 }, cost: 0.05 },
      models: { "gpt-5": { count: 5, tokens: { input: 500, output: 250 }, cost: 0.05 } },
      providers: { openai: { count: 5, tokens: { input: 500, output: 250 }, cost: 0.05 } },
    };
    const result = applyTokenUsageToDayStats(prev, delta);
    expect(result.total.count).toBe(6);
    expect(result.total.tokens.input).toBe(600);
    expect(result.models["gpt-5"].count).toBe(6);
    expect(result.providers["openai"].count).toBe(6);
  });

  it("不 mutate prev", () => {
    const prev: DayStats = {
      userId: "user-1", period: "day", timeKey: "2026-07-31",
      total: { count: 1, tokens: { input: 10, output: 5 }, cost: 0.01 },
      models: {}, providers: {},
    };
    applyTokenUsageToDayStats(prev, delta);
    expect(prev.total.count).toBe(1);
    expect(prev.total.tokens.input).toBe(10);
  });

  it("新 model 累加到新桶", () => {
    const prev: DayStats = {
      userId: "user-1", period: "day", timeKey: "2026-07-31",
      total: { count: 1, tokens: { input: 10, output: 5 }, cost: 0.01 },
      models: { "gpt-4": { count: 1, tokens: { input: 10, output: 5 }, cost: 0.01 } },
      providers: { openai: { count: 1, tokens: { input: 10, output: 5 }, cost: 0.01 } },
    };
    const result = applyTokenUsageToDayStats(prev, delta);
    expect(result.models["gpt-4"].count).toBe(1);
    expect(result.models["gpt-5"].count).toBe(1);
    expect(result.total.count).toBe(2);
  });

  it("unknown model 保留在 stats（审计可见）", () => {
    const result = applyTokenUsageToDayStats(null, { ...delta, model: undefined });
    expect(result.models["unknown"].count).toBe(1);
  });
});