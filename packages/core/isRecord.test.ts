import { describe, expect, it } from "bun:test";
import { isRecord } from "./isRecord";

describe("isRecord pure seam", () => {
  it("rejects nullish, primitives, and arrays", () => {
    expect(isRecord(undefined)).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord("")).toBe(false);
    expect(isRecord("obj")).toBe(false);
    expect(isRecord(0)).toBe(false);
    expect(isRecord(1)).toBe(false);
    expect(isRecord(true)).toBe(false);
    expect(isRecord(false)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord([1, 2])).toBe(false);
    expect(isRecord(Object.create(null))).toBe(true);
  });

  it("accepts plain objects and class instances", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord(new Error("x"))).toBe(true);
    expect(isRecord(new Date())).toBe(true);
  });
});
