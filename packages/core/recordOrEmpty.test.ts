import { describe, expect, it } from "bun:test";
import { asRecordOrEmpty } from "./recordOrEmpty";

describe("asRecordOrEmpty pure seam", () => {
  it("returns empty object for nullish, primitives, and arrays", () => {
    expect(asRecordOrEmpty(undefined)).toEqual({});
    expect(asRecordOrEmpty(null)).toEqual({});
    expect(asRecordOrEmpty("")).toEqual({});
    expect(asRecordOrEmpty("obj")).toEqual({});
    expect(asRecordOrEmpty(0)).toEqual({});
    expect(asRecordOrEmpty(1)).toEqual({});
    expect(asRecordOrEmpty(true)).toEqual({});
    expect(asRecordOrEmpty(false)).toEqual({});
    expect(asRecordOrEmpty([])).toEqual({});
    expect(asRecordOrEmpty([1, 2])).toEqual({});
  });

  it("returns the same plain object reference when already a record", () => {
    const bag = { a: 1, nested: { b: 2 } };
    expect(asRecordOrEmpty(bag)).toBe(bag);
    expect(asRecordOrEmpty({})).toEqual({});
  });

  it("accepts Object.create(null) and class instances as records", () => {
    const nullProto = Object.create(null);
    nullProto.x = 1;
    expect(asRecordOrEmpty(nullProto)).toBe(nullProto);
    const err = new Error("x");
    expect(asRecordOrEmpty(err)).toBe(err);
  });

  it("never returns a shared mutable empty singleton", () => {
    const a = asRecordOrEmpty(undefined);
    const b = asRecordOrEmpty(null);
    expect(a).toEqual({});
    expect(b).toEqual({});
    expect(a).not.toBe(b);
    a.poison = true;
    expect(asRecordOrEmpty(false)).toEqual({});
  });
});
