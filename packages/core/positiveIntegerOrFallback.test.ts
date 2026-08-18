import { describe, expect, it } from "bun:test";
import { parsePositiveIntegerOrFallback } from "./positiveIntegerOrFallback";

describe("parsePositiveIntegerOrFallback pure seam", () => {
  it("returns fallback for missing, blank, non-numeric, and non-finite inputs", () => {
    expect(parsePositiveIntegerOrFallback(undefined, 20)).toBe(20);
    expect(parsePositiveIntegerOrFallback(null, 20)).toBe(20);
    expect(parsePositiveIntegerOrFallback("", 20)).toBe(20);
    expect(parsePositiveIntegerOrFallback("   ", 20)).toBe(20);
    expect(parsePositiveIntegerOrFallback("not-a-number", 20)).toBe(20);
    expect(parsePositiveIntegerOrFallback(Number.NaN, 20)).toBe(20);
    expect(parsePositiveIntegerOrFallback(Number.POSITIVE_INFINITY, 20)).toBe(
      20,
    );
    expect(parsePositiveIntegerOrFallback({}, 3)).toBe(3);
  });

  it("returns fallback for zero, negatives, and non-integer numbers", () => {
    expect(parsePositiveIntegerOrFallback(0, 60_000)).toBe(60_000);
    expect(parsePositiveIntegerOrFallback("0", 60_000)).toBe(60_000);
    expect(parsePositiveIntegerOrFallback(-1, 3)).toBe(3);
    expect(parsePositiveIntegerOrFallback("-5", 3)).toBe(3);
    expect(parsePositiveIntegerOrFallback(3.5, 20)).toBe(20);
    expect(parsePositiveIntegerOrFallback("12.7", 20)).toBe(20);
  });

  it("preserves positive integers including string digits", () => {
    expect(parsePositiveIntegerOrFallback(1, 20)).toBe(1);
    expect(parsePositiveIntegerOrFallback(20, 3)).toBe(20);
    expect(parsePositiveIntegerOrFallback(60_000, 3)).toBe(60_000);
    expect(parsePositiveIntegerOrFallback("3", 20)).toBe(3);
    expect(parsePositiveIntegerOrFallback("42", 20)).toBe(42);
  });
});
