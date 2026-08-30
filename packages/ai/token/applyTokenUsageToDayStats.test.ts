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


  it("accumulates mixed billing categories into categories and modelCategories partitions", () => {
    // First usage: platform billing with cost
    const day1 = applyTokenUsageToDayStats(null, {
      userId: "user-1",
      timeKey: "2026-08-30",
      model: "glm-5.3",
      provider: "zai",
      input_tokens: 1000,
      output_tokens: 500,
      cost: 0.05,
      billingCategory: "platform",
    });

    expect(day1.total.count).toBe(1);
    expect(day1.total.cost).toBe(0.05);
    expect(day1.models["glm-5.3"].count).toBe(1);
    expect(day1.categories?.["platform"].count).toBe(1);
    expect(day1.categories?.["platform"].cost).toBe(0.05);
    expect(day1.modelCategories?.["glm-5.3:::platform"].count).toBe(1);
    expect(day1.modelCategories?.["glm-5.3:::platform"].cost).toBe(0.05);

    // Second usage: subscription with 0 credits
    const day2 = applyTokenUsageToDayStats(day1, {
      userId: "user-1",
      timeKey: "2026-08-30",
      model: "glm-5.3",
      provider: "zai",
      input_tokens: 2000,
      output_tokens: 800,
      cost: 0,
      billingCategory: "subscription",
    });

    // Total and model aggregations combine both
    expect(day2.total.count).toBe(2);
    expect(day2.total.tokens.input).toBe(3000);
    expect(day2.total.tokens.output).toBe(1300);
    expect(day2.total.cost).toBe(0.05);
    expect(day2.models["glm-5.3"].count).toBe(2);
    expect(day2.models["glm-5.3"].cost).toBe(0.05);

    // Categories split cleanly
    expect(day2.categories?.["platform"].count).toBe(1);
    expect(day2.categories?.["platform"].cost).toBe(0.05);
    expect(day2.categories?.["platform"].tokens.input).toBe(1000);

    expect(day2.categories?.["subscription"].count).toBe(1);
    expect(day2.categories?.["subscription"].cost).toBe(0);
    expect(day2.categories?.["subscription"].tokens.input).toBe(2000);

    // modelCategories partition correctly
    expect(day2.modelCategories?.["glm-5.3:::platform"].count).toBe(1);
    expect(day2.modelCategories?.["glm-5.3:::platform"].cost).toBe(0.05);
    expect(day2.modelCategories?.["glm-5.3:::subscription"].count).toBe(1);
    expect(day2.modelCategories?.["glm-5.3:::subscription"].cost).toBe(0);
  });

  it("normalizes legacy DayStats without billingCategory by defaulting to platform", () => {
    const legacyStats: any = {
      userId: "user-1",
      period: "day",
      timeKey: "2026-08-01",
      total: {
        count: 5,
        tokens: { input: 500, output: 250, cacheRead: 0, cacheCreation: 0 },
        cost: 0.05,
        failedCount: 0,
      },
      models: {
        "legacy-glm": {
          count: 5,
          tokens: { input: 500, output: 250, cacheRead: 0, cacheCreation: 0 },
          cost: 0.05,
          failedCount: 0,
        },
      },
      providers: {
        zai: {
          count: 5,
          tokens: { input: 500, output: 250, cacheRead: 0, cacheCreation: 0 },
          cost: 0.05,
          failedCount: 0,
        },
      },
      agents: {},
      entryPaths: {},
    };

    // When new subscription usage is appended on top of legacy data:
    const updated = applyTokenUsageToDayStats(legacyStats, {
      userId: "user-1",
      timeKey: "2026-08-01",
      model: "legacy-glm",
      provider: "zai",
      input_tokens: 300,
      output_tokens: 100,
      cost: 0,
      billingCategory: "subscription",
    });

    expect(updated.total.count).toBe(6);
    expect(updated.models["legacy-glm"].count).toBe(6);
    // Legacy total migrated to platform category without polluting subscription
    expect(updated.categories?.["platform"].count).toBe(5);
    expect(updated.categories?.["platform"].cost).toBe(0.05);
    expect(updated.modelCategories?.["legacy-glm:::platform"].count).toBe(5);
    // New subscription usage goes to subscription category
    expect(updated.categories?.["subscription"].count).toBe(1);
    expect(updated.categories?.["subscription"].cost).toBe(0);
    expect(updated.modelCategories?.["legacy-glm:::subscription"].count).toBe(1);
  });

  it("records failed calls in categories and modelCategories", () => {
    const day = applyTokenUsageToDayStats(null, {
      userId: "user-1",
      timeKey: "2026-08-30",
      model: "glm-5.3",
      provider: "zai",
      input_tokens: 0,
      output_tokens: 0,
      cost: 0,
      status: "failed",
      billingCategory: "subscription",
    });

    expect(day.total.failedCount).toBe(1);
    expect(day.total.count).toBe(0);
    expect(day.categories?.["subscription"].failedCount).toBe(1);
    expect(day.categories?.["subscription"].count).toBe(0);
    expect(day.modelCategories?.["glm-5.3:::subscription"].failedCount).toBe(1);
    expect(day.modelCategories?.["glm-5.3:::subscription"].count).toBe(0);
  });

  it("forces cost to 0 for subscription category even if delta.cost was non-zero", () => {
    const day = applyTokenUsageToDayStats(null, {
      userId: "user-1",
      timeKey: "2026-08-30",
      model: "deepseek-r1",
      provider: "deepinfra",
      input_tokens: 10000,
      output_tokens: 5000,
      cost: 0.99, // theoretical unbilled cost
      billingCategory: "subscription",
    });

    expect(day.total.cost).toBe(0);
    expect(day.categories?.["subscription"].cost).toBe(0);
    expect(day.modelCategories?.["deepseek-r1:::subscription"].cost).toBe(0);
    expect(day.models["deepseek-r1"].cost).toBe(0);
    expect(day.total.tokens.input).toBe(10000);
  });
});
