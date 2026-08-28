import { describe, expect, it } from "bun:test";
import { parsePositiveFiniteNumberOrFallback } from "./positiveFiniteNumberOrFallback";

describe("parsePositiveFiniteNumberOrFallback pure seam", () => {
  it("returns fallback for missing, blank, non-numeric, and non-finite inputs", () => {
    expect(parsePositiveFiniteNumberOrFallback(undefined, 1)).toBe(1);
    expect(parsePositiveFiniteNumberOrFallback(null, 1)).toBe(1);
    expect(parsePositiveFiniteNumberOrFallback("", 1)).toBe(1);
    expect(parsePositiveFiniteNumberOrFallback("   ", 1)).toBe(1);
    expect(parsePositiveFiniteNumberOrFallback("not-a-number", 1)).toBe(1);
    expect(parsePositiveFiniteNumberOrFallback(Number.NaN, 1)).toBe(1);
    expect(parsePositiveFiniteNumberOrFallback(Number.POSITIVE_INFINITY, 5)).toBe(
      5,
    );
    expect(parsePositiveFiniteNumberOrFallback({}, 5)).toBe(5);
  });

  it("returns fallback for zero and negatives", () => {
    expect(parsePositiveFiniteNumberOrFallback(0, 1)).toBe(1);
    expect(parsePositiveFiniteNumberOrFallback("0", 1)).toBe(1);
    expect(parsePositiveFiniteNumberOrFallback(-1, 5)).toBe(5);
    expect(parsePositiveFiniteNumberOrFallback("-0.5", 5)).toBe(5);
  });

  it("preserves positive finite numbers including floats and string digits", () => {
    expect(parsePositiveFiniteNumberOrFallback(1, 5)).toBe(1);
    expect(parsePositiveFiniteNumberOrFallback(5, 1)).toBe(5);
    expect(parsePositiveFiniteNumberOrFallback(0.25, 1)).toBe(0.25);
    expect(parsePositiveFiniteNumberOrFallback("3", 1)).toBe(3);
    expect(parsePositiveFiniteNumberOrFallback("1.5", 1)).toBe(1.5);
    expect(parsePositiveFiniteNumberOrFallback("12.7", 1)).toBe(12.7);
  });
});
