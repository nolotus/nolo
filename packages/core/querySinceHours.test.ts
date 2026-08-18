import { describe, expect, it } from "bun:test";
import { parseOptionalSinceHours } from "./querySinceHours";

describe("parseOptionalSinceHours pure seam", () => {
  it("returns fallback for missing, empty, and falsy values", () => {
    expect(parseOptionalSinceHours(undefined)).toBe(24);
    expect(parseOptionalSinceHours(null)).toBe(24);
    expect(parseOptionalSinceHours("")).toBe(24);
    expect(parseOptionalSinceHours(undefined, 12)).toBe(12);
    expect(parseOptionalSinceHours(null, 6)).toBe(6);
  });

  it("parses finite positive numbers including fractional hours", () => {
    expect(parseOptionalSinceHours("1")).toBe(1);
    expect(parseOptionalSinceHours("24")).toBe(24);
    expect(parseOptionalSinceHours("48.5")).toBe(48.5);
    expect(parseOptionalSinceHours("168")).toBe(168);
  });

  it("throws on non-finite, zero, and negative values", () => {
    expect(() => parseOptionalSinceHours("0")).toThrow("invalid sinceHours: 0");
    expect(() => parseOptionalSinceHours("-1")).toThrow("invalid sinceHours: -1");
    expect(() => parseOptionalSinceHours("not-a-number")).toThrow(
      "invalid sinceHours: not-a-number",
    );
    expect(() => parseOptionalSinceHours("Infinity")).toThrow(
      "invalid sinceHours: Infinity",
    );
    expect(() => parseOptionalSinceHours("   ")).toThrow("invalid sinceHours:    ");
  });
});
