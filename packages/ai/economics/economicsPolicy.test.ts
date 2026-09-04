import { describe, expect, test } from "bun:test";
import {
  BIGMODEL_GLM_CODING_PLAN_POLICY,
  BIGMODEL_CODING_PLAN_OVERVIEW,
  BIGMODEL_CODING_PLAN_USAGE_NOTES,
  DEEPSEEK_API_POLICY,
  DEEPSEEK_PRICING_DOC,
  ECONOMICS_POLICIES,
  resolveEconomicsSourceId,
  type EconomicsPolicy,
} from "./economicsPolicy";

describe("economics policy registry (versioned, evidence-backed)", () => {
  test("encodes exactly the two officially evidenced sources", () => {
    expect(ECONOMICS_POLICIES.map((policy) => policy.id).sort()).toEqual([
      "bigmodel_glm_coding_plan",
      "deepseek_api",
    ]);
    for (const policy of ECONOMICS_POLICIES) {
      expect(policy.version).toBeTruthy();
      expect(policy.sourceUrl).toMatch(/^https:\/\//);
      for (const window of policy.windows) {
        expect(window.startMinute).toBeLessThan(window.endMinute);
        expect(window.endMinute).toBeLessThanOrEqual(24 * 60);
        for (const weekday of window.weekdays) {
          expect(weekday).toBeGreaterThanOrEqual(0);
          expect(weekday).toBeLessThanOrEqual(6);
        }
      }
    }
  });

  test("DeepSeek API policy: UTC Mon–Fri 01:00–04:00 + 06:00–10:00 peak, peak = 2× off-peak", () => {
    expect(DEEPSEEK_API_POLICY.windows).toEqual([
      { timezone: "UTC", weekdays: [1, 2, 3, 4, 5], startMinute: 60, endMinute: 240 },
      { timezone: "UTC", weekdays: [1, 2, 3, 4, 5], startMinute: 360, endMinute: 600 },
    ]);
    expect(DEEPSEEK_API_POLICY.peakPriceMultiplier).toBe(2);
    expect(DEEPSEEK_API_POLICY.offPeakPriceMultiplier).toBe(1);
    expect(DEEPSEEK_API_POLICY.sourceUrl).toBe(DEEPSEEK_PRICING_DOC);
  });

  test("BigModel GLM Coding Plan policy: Asia/Shanghai Mon–Fri 14:00–18:00 peak, off-peak quota at 0.5×", () => {
    expect(BIGMODEL_GLM_CODING_PLAN_POLICY.windows).toEqual([
      { timezone: "Asia/Shanghai", weekdays: [1, 2, 3, 4, 5], startMinute: 840, endMinute: 1080 },
    ]);
    expect(BIGMODEL_GLM_CODING_PLAN_POLICY.peakQuotaMultiplier).toBe(1);
    expect(BIGMODEL_GLM_CODING_PLAN_POLICY.offPeakQuotaMultiplier).toBe(0.5);
    expect(BIGMODEL_GLM_CODING_PLAN_POLICY.sourceUrl).toBe(BIGMODEL_CODING_PLAN_USAGE_NOTES);
    expect(BIGMODEL_CODING_PLAN_OVERVIEW).toContain("docs.bigmodel.cn");
  });

  test("unconfirmed facts are not encoded: no effectiveUntil promos, no capacity/concurrency fields", () => {
    for (const policy of ECONOMICS_POLICIES) {
      // BigModel 夜间活动未确认 effectiveUntil；DeepSeek 窗口无官方起止日期。
      expect(policy.effectiveUntil).toBeUndefined();
      expect(policy.effectiveFrom).toBeUndefined();
    }
    const serialized = JSON.stringify(ECONOMICS_POLICIES);
    // 并发额度（2500/500/2500）与动态并发 capacityClass 一律不入 policy。
    expect(serialized).not.toContain("capacity");
    expect(serialized).not.toContain("concurrency");
    expect(serialized).not.toContain("2500");
  });
});

describe("resolveEconomicsSourceId (conservative source matching)", () => {
  test("matches the official DeepSeek API", () => {
    expect(resolveEconomicsSourceId({ provider: "deepseek" })).toBe("deepseek_api");
    expect(resolveEconomicsSourceId({ provider: " DeepSeek " })).toBe("deepseek_api");
    expect(
      resolveEconomicsSourceId({
        provider: "deepseek",
        customProviderUrl: "https://api.deepseek.com/v1",
      })
    ).toBe("deepseek_api");
  });

  test("does not match third-party proxies that merely host DeepSeek models", () => {
    expect(
      resolveEconomicsSourceId({
        provider: "deepseek",
        customProviderUrl: "https://api.siliconflow.cn/v1",
      })
    ).toBeNull();
  });

  test("matches only the BigModel GLM Coding Plan endpoint (not the metered API)", () => {
    expect(
      resolveEconomicsSourceId({
        provider: "bigmodel",
        customProviderUrl: "https://open.bigmodel.cn/api/coding/paas/v4",
      })
    ).toBe("bigmodel_glm_coding_plan");
    // bigmodel.cn 同域的按量计费 API 不共享 coding plan 证据。
    expect(
      resolveEconomicsSourceId({
        provider: "bigmodel",
        customProviderUrl: "https://open.bigmodel.cn/api/paas/v4",
      })
    ).toBeNull();
    // 缺端点无法证明 coding plan → neutral。
    expect(resolveEconomicsSourceId({ provider: "bigmodel" })).toBeNull();
  });

  test("stays neutral for unknown / unevidenced sources", () => {
    // 国际版 Z.AI 计划的证据只有 docs.bigmodel.cn → 不匹配。
    expect(
      resolveEconomicsSourceId({
        provider: "zai",
        customProviderUrl: "https://api.z.ai/api/coding/paas/v4",
      })
    ).toBeNull();
    // 平台托管（nolo）跑 DeepSeek/GLM 模型不是官方直连。
    expect(resolveEconomicsSourceId({ provider: "nolo", model: "deepseek-v4-flash:cloud" })).toBeNull();
    expect(resolveEconomicsSourceId({ provider: "openai" })).toBeNull();
    expect(resolveEconomicsSourceId({ cliProvider: "claude" })).toBeNull();
    expect(resolveEconomicsSourceId({})).toBeNull();
    expect(resolveEconomicsSourceId({ provider: "" })).toBeNull();
    expect(resolveEconomicsSourceId({ provider: undefined })).toBeNull();
  });

  test("a synthetic policy type stays assignable (version evolution shape)", () => {
    const nextVersion: EconomicsPolicy = {
      ...DEEPSEEK_API_POLICY,
      version: "test-next",
      effectiveFrom: Date.UTC(2026, 9, 1),
      effectiveUntil: undefined,
    };
    expect(nextVersion.id).toBe("deepseek_api");
  });
});
