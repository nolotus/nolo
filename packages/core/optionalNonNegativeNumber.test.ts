import { describe, expect, it } from "bun:test";
import { asOptionalNonNegativeFiniteNumber } from "./optionalNonNegativeNumber";

describe("asOptionalNonNegativeFiniteNumber pure seam", () => {
  it("rejects non-numbers", () => {
    expect(asOptionalNonNegativeFiniteNumber(undefined)).toBeUndefined();
    expect(asOptionalNonNegativeFiniteNumber(null)).toBeUndefined();
    expect(asOptionalNonNegativeFiniteNumber("")).toBeUndefined();
    expect(asOptionalNonNegativeFiniteNumber("0")).toBeUndefined();
    expect(asOptionalNonNegativeFiniteNumber("1")).toBeUndefined();
    expect(asOptionalNonNegativeFiniteNumber(true)).toBeUndefined();
    expect(asOptionalNonNegativeFiniteNumber({})).toBeUndefined();
    expect(asOptionalNonNegativeFiniteNumber([])).toBeUndefined();
  });

  it("rejects negatives and non-finite numbers", () => {
    expect(asOptionalNonNegativeFiniteNumber(-1)).toBeUndefined();
    expect(asOptionalNonNegativeFiniteNumber(-0.000001)).toBeUndefined();
    expect(asOptionalNonNegativeFiniteNumber(Number.NaN)).toBeUndefined();
    expect(
      asOptionalNonNegativeFiniteNumber(Number.POSITIVE_INFINITY),
    ).toBeUndefined();
    expect(
      asOptionalNonNegativeFiniteNumber(Number.NEGATIVE_INFINITY),
    ).toBeUndefined();
  });

  it("returns zero and positive finite numbers including floats", () => {
    expect(asOptionalNonNegativeFiniteNumber(0)).toBe(0);
    expect(asOptionalNonNegativeFiniteNumber(-0)).toBe(-0);
    expect(asOptionalNonNegativeFiniteNumber(1)).toBe(1);
    expect(asOptionalNonNegativeFiniteNumber(0.000001)).toBe(0.000001);
    expect(asOptionalNonNegativeFiniteNumber(1.5)).toBe(1.5);
    expect(asOptionalNonNegativeFiniteNumber(300.25)).toBe(300.25);
  });
});
