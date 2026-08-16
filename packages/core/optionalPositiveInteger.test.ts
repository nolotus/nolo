import { describe, expect, it } from "bun:test";
import { asOptionalPositiveInteger } from "./optionalPositiveInteger";

describe("asOptionalPositiveInteger pure seam", () => {
  it("rejects non-numbers", () => {
    expect(asOptionalPositiveInteger(undefined)).toBeUndefined();
    expect(asOptionalPositiveInteger(null)).toBeUndefined();
    expect(asOptionalPositiveInteger("")).toBeUndefined();
    expect(asOptionalPositiveInteger("1")).toBeUndefined();
    expect(asOptionalPositiveInteger(true)).toBeUndefined();
    expect(asOptionalPositiveInteger({})).toBeUndefined();
    expect(asOptionalPositiveInteger([])).toBeUndefined();
  });

  it("rejects non-positive and non-integer numbers", () => {
    expect(asOptionalPositiveInteger(0)).toBeUndefined();
    expect(asOptionalPositiveInteger(-1)).toBeUndefined();
    expect(asOptionalPositiveInteger(-0)).toBeUndefined();
    expect(asOptionalPositiveInteger(1.5)).toBeUndefined();
    expect(asOptionalPositiveInteger(Number.NaN)).toBeUndefined();
    expect(asOptionalPositiveInteger(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(asOptionalPositiveInteger(Number.NEGATIVE_INFINITY)).toBeUndefined();
  });

  it("returns positive integers", () => {
    expect(asOptionalPositiveInteger(1)).toBe(1);
    expect(asOptionalPositiveInteger(2)).toBe(2);
    expect(asOptionalPositiveInteger(300)).toBe(300);
    expect(asOptionalPositiveInteger(Number.MAX_SAFE_INTEGER)).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });
});
