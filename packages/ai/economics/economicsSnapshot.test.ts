import { describe, expect, test } from "bun:test";
import {
  DEEPSEEK_API_POLICY,
  type EconomicsPolicy,
} from "./economicsPolicy";
import {
  findNextEconomicsBoundary,
  getZonedWallClock,
  resolveEconomicsPeriod,
  resolveEconomicsSnapshot,
  selectEconomicsPolicyVersion,
  zonedWallClockToEpochMs,
} from "./economicsSnapshot";

/** 2026-09-07 is a Monday; 2026-09-04 a Friday (verified via Date arithmetic below). */
const utc = (day: number, hour = 0, minute = 0, ms = 0) => Date.UTC(2026, 8, day, hour, minute, 0, ms);

const EFFECTIVE = Date.UTC(2026, 7, 16, 16, 0, 0);
const deepseekInput = {
  provider: "deepseek",
  apiSource: "custom",
  customProviderUrl: "https://api.deepseek.com/v1",
} as const;

const bigmodelInput = {
  provider: "bigmodel",
  apiSource: "custom",
  customProviderUrl: "https://open.bigmodel.cn/api/coding/paas/v4",
} as const;

describe("timezone primitives", () => {
  test("wall-clock fields follow the target timezone, not the host", () => {
    // Mon 2026-09-07 02:00 UTC
    const utcClock = getZonedWallClock("UTC", utc(7, 2));
    expect(utcClock).toMatchObject({ hour: 2, minute: 0, weekday: 1 });
    // Same instant in Shanghai is 10:00, still Monday.
    const shClock = getZonedWallClock("Asia/Shanghai", utc(7, 2));
    expect(shClock).toMatchObject({ hour: 10, minute: 0, weekday: 1 });
    // UTC Sunday 17:00 = Shanghai Monday 01:00 (day flips across timezones).
    expect(getZonedWallClock("UTC", utc(6, 17)).weekday).toBe(0);
    expect(getZonedWallClock("Asia/Shanghai", utc(6, 17)).weekday).toBe(1);
    // Sanity anchor for the weekday claims used across this file.
    expect(new Date(utc(4)).getUTCDay()).toBe(5); // 2026-09-04 Friday
    expect(new Date(utc(7)).getUTCDay()).toBe(1); // 2026-09-07 Monday
  });

  test("zonedWallClockToEpochMs converts Shanghai wall clock back to the exact UTC instant", () => {
    // 14:00 Shanghai on Wed 2026-09-09 == 06:00 UTC.
    expect(zonedWallClockToEpochMs("Asia/Shanghai", 2026, 9, 9, 840)).toBe(utc(9, 6));
    expect(zonedWallClockToEpochMs("UTC", 2026, 9, 9, 840)).toBe(utc(9, 14));
  });
});

describe("DeepSeek API windows (UTC, half-open [start,end))", () => {
  test("period flips exactly at window boundaries", () => {
    expect(resolveEconomicsPeriod(DEEPSEEK_API_POLICY, utc(7, 0, 59))).toBe("off_peak");
    expect(resolveEconomicsPeriod(DEEPSEEK_API_POLICY, utc(7, 1, 0))).toBe("peak"); // start inclusive
    expect(resolveEconomicsPeriod(DEEPSEEK_API_POLICY, utc(7, 3, 59, 999))).toBe("peak");
    expect(resolveEconomicsPeriod(DEEPSEEK_API_POLICY, utc(7, 4, 0))).toBe("off_peak"); // end exclusive
    expect(resolveEconomicsPeriod(DEEPSEEK_API_POLICY, utc(7, 5, 59))).toBe("off_peak");
    expect(resolveEconomicsPeriod(DEEPSEEK_API_POLICY, utc(7, 6, 0))).toBe("peak"); // second window
    expect(resolveEconomicsPeriod(DEEPSEEK_API_POLICY, utc(7, 9, 59, 999))).toBe("peak");
    expect(resolveEconomicsPeriod(DEEPSEEK_API_POLICY, utc(7, 10, 0))).toBe("off_peak");
  });

  test("weekday gating: windows never bleed into Saturday/Sunday", () => {
    expect(resolveEconomicsPeriod(DEEPSEEK_API_POLICY, utc(11, 6, 0))).toBe("peak"); // Fri 06:00
    expect(resolveEconomicsPeriod(DEEPSEEK_API_POLICY, utc(12, 2, 0))).toBe("off_peak"); // Sat 02:00
    expect(resolveEconomicsPeriod(DEEPSEEK_API_POLICY, utc(12, 7, 0))).toBe("off_peak"); // Sat 07:00
    expect(resolveEconomicsPeriod(DEEPSEEK_API_POLICY, utc(13, 7, 0))).toBe("off_peak"); // Sun 07:00
  });

  test("cross-midnight stays off-peak (windows do not wrap)", () => {
    expect(resolveEconomicsPeriod(DEEPSEEK_API_POLICY, utc(7, 23, 59))).toBe("off_peak");
    expect(resolveEconomicsPeriod(DEEPSEEK_API_POLICY, utc(8, 0, 0))).toBe("off_peak");
    expect(resolveEconomicsPeriod(DEEPSEEK_API_POLICY, utc(13, 23, 30))).toBe("off_peak"); // Sun night
    // Friday night after the second window into Saturday morning.
    expect(resolveEconomicsPeriod(DEEPSEEK_API_POLICY, utc(11, 23, 59))).toBe("off_peak");
    expect(resolveEconomicsPeriod(DEEPSEEK_API_POLICY, utc(12, 0, 30))).toBe("off_peak");
  });

  test("snapshot multiplier: peak 2×, off-peak 1×, with next-boundary", () => {
    const peak = resolveEconomicsSnapshot(deepseekInput, utc(7, 2));
    expect(peak).toEqual({
      source: "deepseek_api",
      policyVersion: DEEPSEEK_API_POLICY.version,
      period: "peak",
      priceMultiplier: 2,
      changesAt: utc(7, 4), // Mon 02:00 → window ends 04:00 UTC
    });
    const gap = resolveEconomicsSnapshot(deepseekInput, utc(7, 5));
    expect(gap?.period).toBe("off_peak");
    expect(gap?.priceMultiplier).toBe(1);
    expect(gap?.changesAt).toBe(utc(7, 6)); // second window starts 06:00
    const evening = resolveEconomicsSnapshot(deepseekInput, utc(7, 11));
    expect(evening?.changesAt).toBe(utc(8, 1)); // Tue 01:00 UTC
  });

  test("off-peak outside all windows: Saturday afternoon next boundary is Monday 01:00 UTC", () => {
    const saturday = resolveEconomicsSnapshot(deepseekInput, utc(12, 12));
    expect(saturday?.period).toBe("off_peak");
    expect(saturday?.changesAt).toBe(Date.UTC(2026, 8, 14, 1)); // Mon 2026-09-14 01:00 UTC
  });
});

describe("BigModel GLM Coding Plan windows (Asia/Shanghai, half-open [start,end))", () => {
  test("period flips exactly at 14:00/18:00 Shanghai on weekdays", () => {
    expect(resolveEconomicsSnapshot(bigmodelInput, utc(9, 5, 59))?.period).toBe("off_peak"); // 13:59 SH
    expect(resolveEconomicsSnapshot(bigmodelInput, utc(9, 6, 0))?.period).toBe("peak"); // 14:00 SH
    expect(resolveEconomicsSnapshot(bigmodelInput, utc(9, 9, 59, 999))?.period).toBe("peak"); // 17:59 SH
    expect(resolveEconomicsSnapshot(bigmodelInput, utc(9, 10, 0))?.period).toBe("off_peak"); // 18:00 SH
  });

  test("Friday 16:00 peak, Saturday 16:00 off-peak (weekday gating across Fri→Sat)", () => {
    expect(resolveEconomicsSnapshot(bigmodelInput, utc(11, 8))?.period).toBe("peak"); // Fri 16:00 SH
    expect(resolveEconomicsSnapshot(bigmodelInput, utc(12, 8))?.period).toBe("off_peak"); // Sat 16:00 SH
  });

  test("cross-midnight in Shanghai stays off-peak", () => {
    expect(resolveEconomicsSnapshot(bigmodelInput, utc(9, 15, 59))?.period).toBe("off_peak"); // 23:59 SH
    expect(resolveEconomicsSnapshot(bigmodelInput, utc(9, 16))?.period).toBe("off_peak"); // Thu 00:00 SH
    expect(resolveEconomicsSnapshot(bigmodelInput, utc(9, 16, 30))?.period).toBe("off_peak"); // 00:30 SH
  });

  test("snapshot multiplier: peak 1×, off-peak quotaMultiplier 0.5×", () => {
    const peak = resolveEconomicsSnapshot(bigmodelInput, utc(9, 7)); // 15:00 SH Wed
    expect(peak).toMatchObject({
      source: "bigmodel_glm_coding_plan",
      period: "peak",
      quotaMultiplier: 1,
    });
    expect(peak?.changesAt).toBe(utc(9, 10)); // 18:00 SH == 10:00 UTC
    const offPeak = resolveEconomicsSnapshot(bigmodelInput, utc(9, 11)); // 19:00 SH Wed
    expect(offPeak).toMatchObject({ period: "off_peak", quotaMultiplier: 0.5 });
    expect(offPeak?.changesAt).toBe(utc(10, 6)); // Thu 14:00 SH == 06:00 UTC
  });
});

describe("different sources do not share policy state", () => {
  test("same instant resolves to different phases/multipliers per source", () => {
    // Wed 2026-09-09 02:00 UTC: DeepSeek in 01:00–04:00 peak window;
    // BigModel is 10:00 Shanghai — outside 14:00–18:00 → off-peak.
    const at = utc(9, 2);
    const deepseek = resolveEconomicsSnapshot(deepseekInput, at);
    const bigmodel = resolveEconomicsSnapshot(bigmodelInput, at);
    expect(deepseek?.source).toBe("deepseek_api");
    expect(bigmodel?.source).toBe("bigmodel_glm_coding_plan");
    expect(deepseek?.period).toBe("peak");
    expect(bigmodel?.period).toBe("off_peak");
    expect(deepseek?.priceMultiplier).toBe(2);
    expect(bigmodel?.quotaMultiplier).toBe(0.5);
    expect(deepseek?.changesAt).not.toBe(bigmodel?.changesAt);
    // During DeepSeek's second window (06:00–10:00 UTC) BigModel is in its
    // 14:00–18:00 Shanghai peak too — the windows coincide in UTC, but each
    // source keeps its own multiplier semantics and policy version.
    const evening = utc(9, 8); // 08:00 UTC == 16:00 Shanghai
    const deepseekEvening = resolveEconomicsSnapshot(deepseekInput, evening);
    const bigmodelEvening = resolveEconomicsSnapshot(bigmodelInput, evening);
    expect(deepseekEvening?.period).toBe("peak");
    expect(bigmodelEvening?.period).toBe("peak");
    expect(deepseekEvening?.priceMultiplier).toBe(2);
    expect(bigmodelEvening?.quotaMultiplier).toBe(1);
    expect(deepseekEvening?.policyVersion).not.toBe(bigmodelEvening?.policyVersion);
  });
});

describe("effectiveFrom and source identity", () => {
  test("DeepSeek policy is inactive before its documented start and active at it", () => {
    expect(resolveEconomicsSnapshot(deepseekInput, EFFECTIVE - 1)).toBeNull();
    expect(resolveEconomicsSnapshot(deepseekInput, EFFECTIVE)?.policyVersion).toBe(DEEPSEEK_API_POLICY.version);
  });

  test("platform and malformed or deceptive endpoints fail closed", () => {
    expect(resolveEconomicsSnapshot({ ...deepseekInput, apiSource: "platform" }, EFFECTIVE)).toBeNull();
    expect(resolveEconomicsSnapshot({ provider: "bigmodel", apiSource: "platform", customProviderUrl: "https://open.bigmodel.cn/api/coding/paas/v4" }, EFFECTIVE)).toBeNull();
    expect(resolveEconomicsSnapshot({ provider: "deepseek", apiSource: "custom", customProviderUrl: "https://deepseek.com.evil.example/v1" }, EFFECTIVE)).toBeNull();
    expect(resolveEconomicsSnapshot({ provider: "deepseek", apiSource: "custom", customProviderUrl: "not a url" }, EFFECTIVE)).toBeNull();
  });
});

describe("unknown sources stay neutral", () => {
  test("no snapshot is produced without sufficient evidence", () => {
    expect(resolveEconomicsSnapshot({}, utc(7, 2))).toBeNull();
    expect(resolveEconomicsSnapshot({ provider: "openai" }, utc(7, 2))).toBeNull();
    expect(resolveEconomicsSnapshot({ provider: "nolo", model: "glm-5.3-flash" }, utc(7, 2))).toBeNull();
    expect(
      resolveEconomicsSnapshot({ provider: "deepseek", customProviderUrl: "https://proxy.example.net/v1" }, utc(7, 2))
    ).toBeNull();
  });
});

describe("versioned policy selection (effectiveFrom/effectiveUntil)", () => {
  const T = utc(7, 2); // Mon 2026-09-07 02:00 UTC, inside the first peak window
  const basePolicy: EconomicsPolicy = {
    ...DEEPSEEK_API_POLICY,
    version: "v1",
    peakPriceMultiplier: 2,
    effectiveUntil: T,
  };
  const nextPolicy: EconomicsPolicy = {
    ...DEEPSEEK_API_POLICY,
    version: "v2",
    peakPriceMultiplier: 3,
    effectiveFrom: T,
  };

  test("effectiveUntil is exclusive, effectiveFrom is inclusive", () => {
    const before = resolveEconomicsSnapshot(deepseekInput, T - 1, [basePolicy, nextPolicy]);
    expect(before?.policyVersion).toBe("v1");
    expect(before?.priceMultiplier).toBe(2);
    const atBoundary = resolveEconomicsSnapshot(deepseekInput, T, [basePolicy, nextPolicy]);
    expect(atBoundary?.policyVersion).toBe("v2");
    expect(atBoundary?.priceMultiplier).toBe(3);
  });

  test("expired-only policy resolves to neutral (null)", () => {
    expect(resolveEconomicsSnapshot(deepseekInput, T, [basePolicy])).toBeNull();
    expect(selectEconomicsPolicyVersion([basePolicy], "deepseek_api", T)).toBeNull();
  });

  test("when versions overlap, the latest effectiveFrom wins", () => {
    const older: EconomicsPolicy = { ...nextPolicy, version: "v0", effectiveFrom: T - 1000 };
    const selected = selectEconomicsPolicyVersion([older, nextPolicy], "deepseek_api", T + 1);
    expect(selected?.version).toBe("v2");
  });

  test("version selection is scoped per source id", () => {
    expect(selectEconomicsPolicyVersion([basePolicy], "bigmodel_glm_coding_plan", T - 1)).toBeNull();
  });

  test("changesAt is the earliest policy or window boundary", () => {
    const v1: EconomicsPolicy = { ...DEEPSEEK_API_POLICY, version: "v1", effectiveFrom: T - 10_000, effectiveUntil: T + 30 * 60_000 };
    const v2: EconomicsPolicy = { ...DEEPSEEK_API_POLICY, version: "v2", effectiveFrom: T + 30 * 60_000 };
    expect(resolveEconomicsSnapshot(deepseekInput, T + 15 * 60_000, [v1, v2])?.changesAt).toBe(T + 30 * 60_000);

    const gapV2: EconomicsPolicy = { ...v2, effectiveFrom: T + 90 * 60_000 };
    expect(resolveEconomicsSnapshot(deepseekInput, T + 15 * 60_000, [v1, gapV2])?.changesAt).toBe(T + 30 * 60_000);
  });
});
