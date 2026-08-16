import { describe, expect, it } from "bun:test";
import { parseOptionalTimestampMs } from "./queryTimestampMs";

describe("parseOptionalTimestampMs pure seam", () => {
  it("returns null for missing, empty, and whitespace-only values", () => {
    expect(parseOptionalTimestampMs(undefined)).toBeNull();
    expect(parseOptionalTimestampMs(null)).toBeNull();
    expect(parseOptionalTimestampMs("")).toBeNull();
    expect(parseOptionalTimestampMs("   ")).toBeNull();
    expect(parseOptionalTimestampMs("\t\n")).toBeNull();
  });

  it("parses all-digit strings as epoch milliseconds", () => {
    expect(parseOptionalTimestampMs("0")).toBe(0);
    expect(parseOptionalTimestampMs("1700000000000")).toBe(1_700_000_000_000);
    expect(parseOptionalTimestampMs("  42  ")).toBe(42);
  });

  it("parses ISO / Date.parse-able strings", () => {
    expect(parseOptionalTimestampMs("2024-01-15T00:00:00.000Z")).toBe(
      Date.parse("2024-01-15T00:00:00.000Z"),
    );
    expect(parseOptionalTimestampMs("  2024-06-01T12:00:00Z  ")).toBe(
      Date.parse("2024-06-01T12:00:00Z"),
    );
  });

  it("throws on non-empty unparseable timestamps", () => {
    expect(() => parseOptionalTimestampMs("not-a-date")).toThrow(
      "invalid timestamp: not-a-date",
    );
    expect(() => parseOptionalTimestampMs("  bogus  ")).toThrow(
      "invalid timestamp:   bogus  ",
    );
  });
});
