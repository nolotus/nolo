import { describe, expect, test } from "bun:test";
import { checkExecutionEconomicsBoundary } from "./economicsBoundaryCheck";

const utc = (day: number, hour = 0, minute = 0, ms = 0) =>
  Date.UTC(2026, 8, day, hour, minute, 0, ms);

const deepseekSource = {
  provider: "deepseek",
  apiSource: "custom",
  customProviderUrl: "https://api.deepseek.com/v1",
} as const;

const bigmodelSource = {
  provider: "bigmodel",
  apiSource: "custom",
  customProviderUrl: "https://open.bigmodel.cn/api/coding/paas/v4",
} as const;

describe("checkExecutionEconomicsBoundary", () => {
  test("DeepSeek does not cross within a peak window", () => {
    const result = checkExecutionEconomicsBoundary({
      source: deepseekSource,
      expectedStartAt: utc(7, 2),
      durationMs: 30 * 60 * 1000,
    });

    expect(result.crossesBoundary).toBe(false);
    expect(result.startSnapshot?.period).toBe("peak");
  });

  test("DeepSeek crosses peak → off_peak", () => {
    const result = checkExecutionEconomicsBoundary({
      source: deepseekSource,
      expectedStartAt: utc(7, 3, 50),
      durationMs: 20 * 60 * 1000,
    });

    expect(result.crossesBoundary).toBe(true);
    expect(result.boundaryAt).toBe(utc(7, 4));
    expect(result.afterBoundarySnapshot?.period).toBe("off_peak");
  });

  test("DeepSeek crosses off_peak → peak", () => {
    const result = checkExecutionEconomicsBoundary({
      source: deepseekSource,
      expectedStartAt: utc(7, 5, 50),
      durationMs: 20 * 60 * 1000,
    });

    expect(result.crossesBoundary).toBe(true);
    expect(result.boundaryAt).toBe(utc(7, 6));
    expect(result.afterBoundarySnapshot?.period).toBe("peak");
  });

  test("exact boundary end is not crossing, but one millisecond past it is", () => {
    const exact = checkExecutionEconomicsBoundary({
      source: deepseekSource,
      expectedStartAt: utc(7, 3, 50),
      durationMs: 10 * 60 * 1000,
    });
    const past = checkExecutionEconomicsBoundary({
      source: deepseekSource,
      expectedStartAt: utc(7, 3, 50),
      durationMs: 10 * 60 * 1000 + 1,
    });

    expect(exact.crossesBoundary).toBe(false);
    expect(past.crossesBoundary).toBe(true);
  });

  test("duration zero is an empty interval and does not cross", () => {
    const result = checkExecutionEconomicsBoundary({
      source: deepseekSource,
      expectedStartAt: utc(7, 3, 50),
      durationMs: 0,
    });

    expect(result.expectedEndAt).toBe(result.expectedStartAt);
    expect(result.crossesBoundary).toBe(false);
  });

  test("BigModel crosses 13:50 → 14:20 Shanghai", () => {
    const result = checkExecutionEconomicsBoundary({
      source: bigmodelSource,
      expectedStartAt: utc(9, 5, 50),
      durationMs: 30 * 60 * 1000,
    });

    expect(result.startSnapshot?.period).toBe("off_peak");
    expect(result.crossesBoundary).toBe(true);
    expect(result.afterBoundarySnapshot?.period).toBe("peak");
  });

  test("DeepSeek on Saturday does not cross a boundary", () => {
    const result = checkExecutionEconomicsBoundary({
      source: deepseekSource,
      expectedStartAt: utc(12, 2),
      durationMs: 30 * 60 * 1000,
    });

    expect(result.crossesBoundary).toBe(false);
  });

  test("unknown source returns null start snapshot without throwing", () => {
    const result = checkExecutionEconomicsBoundary({
      source: { provider: "openai" },
      expectedStartAt: utc(7, 2),
      durationMs: 30 * 60 * 1000,
    });

    expect(result.startSnapshot).toBeNull();
    expect(result.crossesBoundary).toBe(false);
  });

  test.each([-1, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid duration %p", (durationMs) => {
    expect(() =>
      checkExecutionEconomicsBoundary({
        source: deepseekSource,
        expectedStartAt: utc(7, 2),
        durationMs,
      })
    ).toThrow();
  });

  test("rejects non-finite start and overflowing end", () => {
    expect(() =>
      checkExecutionEconomicsBoundary({
        source: deepseekSource,
        expectedStartAt: Number.NaN,
        durationMs: 0,
      })
    ).toThrow();
    expect(() =>
      checkExecutionEconomicsBoundary({
        source: deepseekSource,
        expectedStartAt: Number.MAX_VALUE,
        durationMs: Number.MAX_VALUE,
      })
    ).toThrow();
  });
});
