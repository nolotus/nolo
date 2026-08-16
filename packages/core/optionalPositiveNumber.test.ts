import { describe, expect, it } from "bun:test";
import { asOptionalPositiveFiniteNumber } from "./optionalPositiveNumber";

describe("asOptionalPositiveFiniteNumber pure seam", () => {
  it("rejects non-numbers", () => {
    expect(asOptionalPositiveFiniteNumber(undefined)).toBeUndefined();
    expect(asOptionalPositiveFiniteNumber(null)).toBeUndefined();
    expect(asOptionalPositiveFiniteNumber("")).toBeUndefined();
    expect(asOptionalPositiveFiniteNumber("1")).toBeUndefined();
    expect(asOptionalPositiveFiniteNumber(true)).toBeUndefined();
    expect(asOptionalPositiveFiniteNumber({})).toBeUndefined();
    expect(asOptionalPositiveFiniteNumber([])).toBeUndefined();
  });

  it("rejects non-positive and non-finite numbers", () => {
    expect(asOptionalPositiveFiniteNumber(0)).toBeUndefined();
    expect(asOptionalPositiveFiniteNumber(-0)).toBeUndefined();
    expect(asOptionalPositiveFiniteNumber(-1)).toBeUndefined();
    expect(asOptionalPositiveFiniteNumber(-2.5)).toBeUndefined();
    expect(asOptionalPositiveFiniteNumber(Number.NaN)).toBeUndefined();
    expect(
      asOptionalPositiveFiniteNumber(Number.POSITIVE_INFINITY),
    ).toBeUndefined();
    expect(
      asOptionalPositiveFiniteNumber(Number.NEGATIVE_INFINITY),
    ).toBeUndefined();
  });

  it("returns positive finite numbers including floats", () => {
    expect(asOptionalPositiveFiniteNumber(1)).toBe(1);
    expect(asOptionalPositiveFiniteNumber(0.000001)).toBe(0.000001);
    expect(asOptionalPositiveFiniteNumber(1.5)).toBe(1.5);
    expect(asOptionalPositiveFiniteNumber(300.25)).toBe(300.25);
    expect(asOptionalPositiveFiniteNumber(Number.MIN_VALUE)).toBe(
      Number.MIN_VALUE,
    );
  });
});
