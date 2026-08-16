import { describe, expect, it } from "bun:test";
import { toTimestampMs } from "./timestamp";

describe("toTimestampMs pure seam", () => {
  it("rejects non-number non-string values as 0", () => {
    expect(toTimestampMs(undefined)).toBe(0);
    expect(toTimestampMs(null)).toBe(0);
    expect(toTimestampMs(true)).toBe(0);
    expect(toTimestampMs({})).toBe(0);
    expect(toTimestampMs([])).toBe(0);
  });

  it("rejects non-finite numbers as 0", () => {
    expect(toTimestampMs(Number.NaN)).toBe(0);
    expect(toTimestampMs(Number.POSITIVE_INFINITY)).toBe(0);
    expect(toTimestampMs(Number.NEGATIVE_INFINITY)).toBe(0);
  });

  it("returns finite numbers including zero and negatives", () => {
    expect(toTimestampMs(0)).toBe(0);
    expect(toTimestampMs(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(toTimestampMs(-1)).toBe(-1);
  });

  it("parses ISO / date strings to epoch ms", () => {
    expect(toTimestampMs("1970-01-01T00:00:00.000Z")).toBe(0);
    expect(toTimestampMs("2024-01-01T00:00:00.000Z")).toBe(
      Date.parse("2024-01-01T00:00:00.000Z"),
    );
  });

  it("rejects unparsable strings as 0", () => {
    expect(toTimestampMs("")).toBe(0);
    expect(toTimestampMs("not-a-date")).toBe(0);
    expect(toTimestampMs("   ")).toBe(0);
  });
});
