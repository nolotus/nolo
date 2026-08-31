import { describe, expect, it } from "bun:test";

import {
  getPlatformHostedDeepSeekV4Price,
  isDeepSeekOffPeakBeijingTime,
  PLATFORM_HOSTED_DEEPSEEK_FLASH_OFF_PEAK_PRICE,
  PLATFORM_HOSTED_DEEPSEEK_FLASH_PEAK_PRICE,
  PLATFORM_HOSTED_DEEPSEEK_PRO_MODEL,
  PLATFORM_HOSTED_DEEPSEEK_FLASH_VISION_EXP_MODEL,
  PLATFORM_HOSTED_DEEPSEEK_PRO_PRICE,
  PLATFORM_HOSTED_GLM_53_FLASH_MODEL,
  PLATFORM_HOSTED_GLM_53_FLASH_PRICE,
  PLATFORM_HOSTED_GLM_53_MODEL,
  PLATFORM_HOSTED_GLM_PRICE,
  platformHostedModels,
  resolvePlatformDeepseekFlashRoute,
  resolvePlatformHostedRouting,
} from "./platformHosted";

const planRoute = (
  overrides: Partial<Parameters<typeof resolvePlatformDeepseekFlashRoute>[0]> = {},
) =>
  resolvePlatformDeepseekFlashRoute({
    provider: "nolo",
    model: "deepseek-v4-flash",
    endpoint: "https://ollama.com/v1/chat/completions",
    isCustomApi: false,
    hasExplicitCredential: false,
    hasDeepseekKey: true,
    ...overrides,
  });

describe("resolvePlatformDeepseekFlashRoute", () => {
  it("routes hosted Flash and its vision experiment to official Responses API with nolo billing identity", () => {
    expect(planRoute()).toEqual({
      kind: "hosted",
      primaryProvider: "nolo",
      credentialProvider: "deepseek",
      wire: "responses",
    });
    expect(planRoute({ model: PLATFORM_HOSTED_DEEPSEEK_FLASH_VISION_EXP_MODEL })).toEqual({
      kind: "hosted",
      primaryProvider: "nolo",
      credentialProvider: "deepseek",
      wire: "responses",
    });
  });

  it("routes legacy deepseek-provider records to the same hosted upstream", () => {
    expect(planRoute({ provider: "deepseek" })).toEqual({
      kind: "hosted",
      primaryProvider: "nolo",
      credentialProvider: "deepseek",
      wire: "responses",
    });
  });

  it("reports missing hosted credentials without inventing a route", () => {
    expect(planRoute({ hasDeepseekKey: false })).toEqual({ kind: "missing_key" });
  });

  it("keeps an explicit Responses endpoint on its configured route", () => {
    expect(
      planRoute({ endpoint: "https://api.deepseek.com/v1/responses" }),
    ).toEqual({ kind: "configured" });
  });

  it("treats the platform default DeepSeek Responses endpoint as hosted (not explicit)", () => {
    expect(
      planRoute({
        endpoint: "https://api.deepseek.com/responses",
      }),
    ).toEqual({
      kind: "hosted",
      primaryProvider: "nolo",
      credentialProvider: "deepseek",
      wire: "responses",
    });
  });

  it("keeps custom, explicitly credentialed, and non-Flash requests configured", () => {
    expect(planRoute({ isCustomApi: true })).toEqual({ kind: "configured" });
    expect(planRoute({ hasExplicitCredential: true })).toEqual({ kind: "configured" });
  });

  it("keeps hosted Pro on configured route for resolvePlatformDeepseekFlashRoute (routes via RunInfra instead)", () => {
    expect(
      planRoute({ model: PLATFORM_HOSTED_DEEPSEEK_PRO_MODEL }),
    ).toEqual({ kind: "configured" });
  });

  it("routes hosted Pro to RunInfra chat.completions in platform hosted routing table", () => {
    expect(resolvePlatformHostedRouting(PLATFORM_HOSTED_DEEPSEEK_PRO_MODEL)).toEqual({
      endpoint: "https://api.runinfra.ai/v1/chat/completions",
      usageProvider: "runinfra",
      keyName: "runinfra",
      wire: "chat.completions",
      agentRunHosted: true,
    });
  });

  it("keeps unknown DeepSeek models on their configured route", () => {
    expect(planRoute({ model: "deepseek-v3" })).toEqual({ kind: "configured" });
  });
});

describe("DeepSeek V4 official pricing", () => {
  // 2026-08-17 为周一（工作日），2026-08-22/23 为周六/周日（周末）。
  // at(day, utcHour, utcMinute) 构造 UTC 时刻；北京 = UTC + 8。
  const at = (day: number, utcHour: number, utcMinute = 0) =>
    Date.UTC(2026, 7, day, utcHour, utcMinute);

  it("treats weekday off-peak windows as off-peak Beijing time", () => {
    // 00:00-09:00
    expect(isDeepSeekOffPeakBeijingTime(at(17, 0, 0))).toBe(true); // 08:00 北京
    expect(isDeepSeekOffPeakBeijingTime(at(17, 0, 59))).toBe(true); // 08:59 北京
    // 12:00-14:00
    expect(isDeepSeekOffPeakBeijingTime(at(17, 4, 0))).toBe(true); // 12:00 北京
    expect(isDeepSeekOffPeakBeijingTime(at(17, 5, 59))).toBe(true); // 13:59 北京
    // 18:00-24:00
    expect(isDeepSeekOffPeakBeijingTime(at(17, 10, 0))).toBe(true); // 18:00 北京
    expect(isDeepSeekOffPeakBeijingTime(at(17, 15, 0))).toBe(true); // 23:00 北京
  });

  it("treats weekday peak windows (9:00-12:00, 14:00-18:00) as peak Beijing time", () => {
    expect(isDeepSeekOffPeakBeijingTime(at(17, 1, 0))).toBe(false); // 09:00 北京
    expect(isDeepSeekOffPeakBeijingTime(at(17, 3, 59))).toBe(false); // 11:59 北京
    expect(isDeepSeekOffPeakBeijingTime(at(17, 6, 0))).toBe(false); // 14:00 北京
    expect(isDeepSeekOffPeakBeijingTime(at(17, 9, 59))).toBe(false); // 17:59 北京
  });

  it("treats all-day weekends as off-peak Beijing time even in peak windows", () => {
    // 周六 08-22
    expect(isDeepSeekOffPeakBeijingTime(at(22, 1, 0))).toBe(true); // 09:00 周六
    expect(isDeepSeekOffPeakBeijingTime(at(22, 7, 0))).toBe(true); // 15:00 周六
    expect(isDeepSeekOffPeakBeijingTime(at(22, 15, 0))).toBe(true); // 23:00 周六
    // 周日 08-23
    expect(isDeepSeekOffPeakBeijingTime(at(23, 1, 0))).toBe(true); // 09:00 周日
    expect(isDeepSeekOffPeakBeijingTime(at(23, 7, 0))).toBe(true); // 15:00 周日
    expect(isDeepSeekOffPeakBeijingTime(at(23, 15, 0))).toBe(true); // 23:00 周日
  });

  it("treats UTC/Beijing cross-day anchors correctly (UTC hour >= 16)", () => {
    // UTC 周五 16:00 = 北京周六 00:00（跨日，属周末）-> 低谷
    expect(isDeepSeekOffPeakBeijingTime(at(21, 16, 0))).toBe(true);
    // UTC 周日 16:00 = 北京周一 00:00（跨日，属工作日凌晨）-> 低谷
    expect(isDeepSeekOffPeakBeijingTime(at(23, 16, 0))).toBe(true);
  });

  it("calculates peak and off-peak prices based on Beijing time", () => {
    const peak = at(17, 1, 0); // 周一 09:00 北京 -> 高峰
    const offPeak = at(17, 5, 0); // 周一 13:00 北京 -> 低谷（12-14 间隙）
    const weekendPeakHour = at(22, 1, 0); // 周六 09:00 北京 -> 周末低谷
    expect(getPlatformHostedDeepSeekV4Price("deepseek-v4-flash", peak)).toEqual(
      PLATFORM_HOSTED_DEEPSEEK_FLASH_PEAK_PRICE,
    );
    expect(getPlatformHostedDeepSeekV4Price("deepseek-v4-flash", offPeak)).toEqual(
      PLATFORM_HOSTED_DEEPSEEK_FLASH_OFF_PEAK_PRICE,
    );
    // 周末即使落在"工作日高峰时段"内也按低谷计费
    expect(getPlatformHostedDeepSeekV4Price("deepseek-v4-flash", weekendPeakHour)).toEqual(
      PLATFORM_HOSTED_DEEPSEEK_FLASH_OFF_PEAK_PRICE,
    );
  });
});

describe("platform hosted DeepSeek V4 catalog", () => {
  it("keeps V4 Flash and adds V4 Pro to the nolo catalog", () => {
    expect(platformHostedModels.map((model) => model.name)).toContain(
      "deepseek-v4-flash",
    );
    expect(platformHostedModels.map((model) => model.name)).toContain(
      PLATFORM_HOSTED_DEEPSEEK_PRO_MODEL,
    );
    expect(platformHostedModels.map((model) => model.name)).toContain(
      PLATFORM_HOSTED_DEEPSEEK_FLASH_VISION_EXP_MODEL,
    );
  });

  it("publishes V4 Pro capabilities and pricing", () => {
    const pro = platformHostedModels.find(
      (model) => model.name === PLATFORM_HOSTED_DEEPSEEK_PRO_MODEL,
    );
    expect(pro).toMatchObject({
      name: PLATFORM_HOSTED_DEEPSEEK_PRO_MODEL,
      displayName: "DeepSeek V4 Pro",
      hasVision: false,
      contextWindow: 1_000_000,
      maxOutputTokens: 384_000,
      supportsTool: true,
      supportsReasoningEffort: true,
      price: PLATFORM_HOSTED_DEEPSEEK_PRO_PRICE,
    });
    expect((pro as any)?.peakPrice).toBeUndefined();
    expect((pro as any)?.offPeakPrice).toBeUndefined();
  });

  it("publishes V4 Flash in the catalog at peak price by default", () => {
    const flash = platformHostedModels.find(
      (model) => model.name === "deepseek-v4-flash",
    );
    expect(flash?.price).toEqual(PLATFORM_HOSTED_DEEPSEEK_FLASH_PEAK_PRICE);
  });
});

describe("platform hosted GLM 5.3 Flash catalog (RunInfra flash tier)", () => {
  it("publishes GLM 5.3 Flash capabilities and pricing", () => {
    expect(platformHostedModels.map((model) => model.name)).toContain(
      PLATFORM_HOSTED_GLM_53_FLASH_MODEL,
    );
    expect(
      platformHostedModels.find(
        (model) => model.name === PLATFORM_HOSTED_GLM_53_FLASH_MODEL,
      ),
    ).toMatchObject({
      name: PLATFORM_HOSTED_GLM_53_FLASH_MODEL,
      displayName: "GLM 5.3 Flash",
      hasVision: true,
      contextWindow: 1_048_576,
      maxOutputTokens: 98304,
      supportsTool: true,
      supportsReasoningEffort: false,
      price: PLATFORM_HOSTED_GLM_53_FLASH_PRICE,
    });
  });
});

describe("platform hosted GLM 5.3 catalog (crof Z.ai tier)", () => {
  it("publishes GLM 5.3 capabilities and pricing", () => {
    expect(platformHostedModels.map((model) => model.name)).toContain(
      PLATFORM_HOSTED_GLM_53_MODEL,
    );
    expect(
      platformHostedModels.find(
        (model) => model.name === PLATFORM_HOSTED_GLM_53_MODEL,
      ),
    ).toMatchObject({
      name: PLATFORM_HOSTED_GLM_53_MODEL,
      displayName: "GLM 5.3",
      hasVision: true,
      contextWindow: 1_050_000,
      maxOutputTokens: 131072,
      supportsTool: true,
      supportsReasoningEffort: true,
      price: PLATFORM_HOSTED_GLM_PRICE,
    });
  });
});
