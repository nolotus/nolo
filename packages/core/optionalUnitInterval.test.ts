import { describe, expect, it } from "bun:test";
import { asOptionalUnitInterval } from "./optionalUnitInterval";

describe("asOptionalUnitInterval pure seam", () => {
  it("rejects non-numbers", () => {
    expect(asOptionalUnitInterval(undefined)).toBeUndefined();
    expect(asOptionalUnitInterval(null)).toBeUndefined();
    expect(asOptionalUnitInterval("")).toBeUndefined();
    expect(asOptionalUnitInterval("0")).toBeUndefined();
    expect(asOptionalUnitInterval("1")).toBeUndefined();
    expect(asOptionalUnitInterval("0.5")).toBeUndefined();
    expect(asOptionalUnitInterval(true)).toBeUndefined();
    expect(asOptionalUnitInterval({})).toBeUndefined();
    expect(asOptionalUnitInterval([])).toBeUndefined();
  });

  it("rejects out-of-range and non-finite numbers", () => {
    expect(asOptionalUnitInterval(-0.000001)).toBeUndefined();
    expect(asOptionalUnitInterval(-1)).toBeUndefined();
    expect(asOptionalUnitInterval(1.000001)).toBeUndefined();
    expect(asOptionalUnitInterval(1.5)).toBeUndefined();
    expect(asOptionalUnitInterval(2)).toBeUndefined();
    expect(asOptionalUnitInterval(Number.NaN)).toBeUndefined();
    expect(asOptionalUnitInterval(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(asOptionalUnitInterval(Number.NEGATIVE_INFINITY)).toBeUndefined();
  });

  it("returns finite numbers in [0, 1] including endpoints and floats", () => {
    expect(asOptionalUnitInterval(0)).toBe(0);
    expect(asOptionalUnitInterval(-0)).toBe(-0);
    expect(asOptionalUnitInterval(1)).toBe(1);
    expect(asOptionalUnitInterval(0.5)).toBe(0.5);
    expect(asOptionalUnitInterval(0.7)).toBe(0.7);
    expect(asOptionalUnitInterval(0.000001)).toBe(0.000001);
    expect(asOptionalUnitInterval(0.999999)).toBe(0.999999);
  });
});
