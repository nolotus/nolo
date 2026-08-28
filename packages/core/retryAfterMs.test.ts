import { describe, expect, it } from "bun:test";
import {
  normalizeNonNegativeMs,
  parseRetryAfterHeaderMs,
} from "./retryAfterMs";

describe("parseRetryAfterHeaderMs pure seam", () => {
  it("returns null for missing, blank, or unparseable values", () => {
    expect(parseRetryAfterHeaderMs(null)).toBeNull();
    expect(parseRetryAfterHeaderMs(undefined)).toBeNull();
    expect(parseRetryAfterHeaderMs("")).toBeNull();
    expect(parseRetryAfterHeaderMs("   ")).toBeNull();
    expect(parseRetryAfterHeaderMs("not-a-delay")).toBeNull();
    expect(parseRetryAfterHeaderMs("-3")).toBeNull();
  });

  it("parses delta-seconds into rounded milliseconds", () => {
    expect(parseRetryAfterHeaderMs("0")).toBe(0);
    expect(parseRetryAfterHeaderMs("2")).toBe(2_000);
    expect(parseRetryAfterHeaderMs(" 1.5 ")).toBe(1_500);
  });

  it("parses HTTP-date values relative to injectable nowMs", () => {
    const nowMs = Date.parse("Wed, 15 Jul 2026 00:00:00 GMT");
    const future = "Wed, 15 Jul 2026 00:00:03 GMT";
    const past = "Wed, 14 Jul 2026 23:59:50 GMT";
    expect(parseRetryAfterHeaderMs(future, nowMs)).toBe(3_000);
    expect(parseRetryAfterHeaderMs(past, nowMs)).toBe(0);
  });
});

describe("normalizeNonNegativeMs pure seam", () => {
  it("rounds finite non-negative values and falls back otherwise", () => {
    expect(normalizeNonNegativeMs(1500, 100)).toBe(1500);
    expect(normalizeNonNegativeMs(1.6, 100)).toBe(2);
    expect(normalizeNonNegativeMs(0, 100)).toBe(0);
    expect(normalizeNonNegativeMs(-1, 100)).toBe(100);
    expect(normalizeNonNegativeMs(Number.NaN, 250)).toBe(250);
    expect(normalizeNonNegativeMs("nope", 500)).toBe(500);
    expect(normalizeNonNegativeMs(undefined, 750.4)).toBe(750);
  });
});
