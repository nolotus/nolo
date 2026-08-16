import { describe, expect, it } from "bun:test";
import { asOptionalFiniteNumber } from "./optionalNumber";

describe("asOptionalFiniteNumber pure seam", () => {
  it("rejects non-numbers", () => {
    expect(asOptionalFiniteNumber(undefined)).toBeUndefined();
    expect(asOptionalFiniteNumber(null)).toBeUndefined();
    expect(asOptionalFiniteNumber("")).toBeUndefined();
    expect(asOptionalFiniteNumber("1")).toBeUndefined();
    expect(asOptionalFiniteNumber(true)).toBeUndefined();
    expect(asOptionalFiniteNumber({})).toBeUndefined();
    expect(asOptionalFiniteNumber([])).toBeUndefined();
  });

  it("rejects non-finite numbers", () => {
    expect(asOptionalFiniteNumber(Number.NaN)).toBeUndefined();
    expect(asOptionalFiniteNumber(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(asOptionalFiniteNumber(Number.NEGATIVE_INFINITY)).toBeUndefined();
  });

  it("returns finite numbers including zero and negatives", () => {
    expect(asOptionalFiniteNumber(0)).toBe(0);
    expect(asOptionalFiniteNumber(-0)).toBe(-0);
    expect(asOptionalFiniteNumber(1)).toBe(1);
    expect(asOptionalFiniteNumber(-2.5)).toBe(-2.5);
    expect(asOptionalFiniteNumber(1e-9)).toBe(1e-9);
  });
});
