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

// Helper: build a DayStats with all new fields populated.
const mkStats = (overrides: Partial<DayStats> = {}): DayStats => ({
  userId: "user-1",
  period: "day",
  timeKey: "2026-07-31",
  total: { count: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 }, cost: 0, failedCount: 0 },
  models: {},
  providers: {},
  agents: {},
  entryPaths: {},
  ...overrides,
});

const mkBucket = (count: number, input: number, output: number, cost: number) => ({
  count,
  tokens: { input, output, cacheRead: 0, cacheCreation: 0 },
  cost,
  failedCount: 0,
});

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
    const prev = mkStats({
      total: mkBucket(5, 500, 250, 0.05),
      models: { "gpt-5": mkBucket(5, 500, 250, 0.05) },
      providers: { openai: mkBucket(5, 500, 250, 0.05) },
    });
    const result = applyTokenUsageToDayStats(prev, delta);
    expect(result.total.count).toBe(6);
    expect(result.total.tokens.input).toBe(600);
    expect(result.models["gpt-5"].count).toBe(6);
    expect(result.providers["openai"].count).toBe(6);
  });

  it("不 mutate prev", () => {
    const prev = mkStats({
      total: mkBucket(1, 10, 5, 0.01),
    });
    applyTokenUsageToDayStats(prev, delta);
    expect(prev.total.count).toBe(1);
    expect(prev.total.tokens.input).toBe(10);
  });

  it("新 model 累加到新桶", () => {
    const prev = mkStats({
      total: mkBucket(1, 10, 5, 0.01),
      models: { "gpt-4": mkBucket(1, 10, 5, 0.01) },
      providers: { openai: mkBucket(1, 10, 5, 0.01) },
    });
    const result = applyTokenUsageToDayStats(prev, delta);
    expect(result.models["gpt-4"].count).toBe(1);
    expect(result.models["gpt-5"].count).toBe(1);
    expect(result.total.count).toBe(2);
  });

  it("unknown model 保留在 stats（审计可见）", () => {
    const result = applyTokenUsageToDayStats(null, { ...delta, model: undefined });
    expect(result.models["unknown"].count).toBe(1);
  });

  it("cache fields are accumulated when provided", () => {
    const result = applyTokenUsageToDayStats(null, {
      ...delta,
      cache_read_input_tokens: 80,
      cache_creation_input_tokens: 10,
    });
    expect(result.total.tokens.cacheRead).toBe(80);
    expect(result.total.tokens.cacheCreation).toBe(10);
    expect(result.models["gpt-5"].tokens.cacheRead).toBe(80);
  });

  it("cache fields default to 0 when not provided (backward compatible)", () => {
    const result = applyTokenUsageToDayStats(null, delta);
    expect(result.total.tokens.cacheRead).toBe(0);
    expect(result.total.tokens.cacheCreation).toBe(0);
  });

  it("agentId dimension is populated when provided", () => {
    const result = applyTokenUsageToDayStats(null, {
      ...delta,
      agentId: "agent-user-1-myagent",
    });
    expect(result.agents["agent-user-1-myagent"].count).toBe(1);
    expect(result.agents["agent-user-1-myagent"].tokens.input).toBe(100);
  });

  it("entry_path dimension is populated when provided", () => {
    const result = applyTokenUsageToDayStats(null, {
      ...delta,
      entry_path: "agent-run",
    });
    expect(result.entryPaths["agent-run"].count).toBe(1);
    expect(result.entryPaths["agent-run"].tokens.input).toBe(100);
  });

  it("agentId/entryPath omitted → those dimensions stay empty", () => {
    const result = applyTokenUsageToDayStats(null, delta);
    expect(Object.keys(result.agents)).toHaveLength(0);
    expect(Object.keys(result.entryPaths)).toHaveLength(0);
  });

  it("normalizes legacy DayStats missing cache/agents/entryPaths fields", () => {
    // Simulate an old record from LevelDB that lacks the new fields
    const legacyPrev = {
      userId: "user-1",
      period: "day" as const,
      timeKey: "2026-07-31",
      total: { count: 3, tokens: { input: 300, output: 150 }, cost: 0.03 , failedCount: 0 },
      models: { "gpt-4": { count: 3, tokens: { input: 300, output: 150 }, cost: 0.03 , failedCount: 0 } },
      providers: {},
    };
    const result = applyTokenUsageToDayStats(legacyPrev as DayStats, delta);
    expect(result.total.count).toBe(4);
    expect(result.total.tokens.cacheRead).toBe(0); // normalized from legacy
    expect(result.agents).toBeDefined();
    expect(result.entryPaths).toBeDefined();
  });
  it("counts failed records separately without polluting count/tokens/cost (US-3.3)", () => {
    const day = applyTokenUsageToDayStats(null, {
      userId: "user-1",
      timeKey: "2026-08-21",
      model: "deepseek-v4-flash",
      provider: "opencode-go",
      input_tokens: 1000,
      output_tokens: 500,
      cost: 0.02,
    });
    const afterFailure = applyTokenUsageToDayStats(day, {
      userId: "user-1",
      timeKey: "2026-08-21",
      model: "deepseek-v4-flash",
      provider: "opencode-go",
      input_tokens: 0,
      output_tokens: 0,
      cost: 0,
      status: "failed",
    });

    expect(afterFailure.total.count).toBe(1);
    expect(afterFailure.total.failedCount).toBe(1);
    expect(afterFailure.total.tokens.input).toBe(1000);
    expect(afterFailure.total.cost).toBe(0.02);
    expect(afterFailure.models["deepseek-v4-flash"].failedCount).toBe(1);
    expect(afterFailure.providers["opencode-go"].failedCount).toBe(1);
  });

});