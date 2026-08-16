import { describe, expect, it } from "bun:test";

import { asOptionalJsonRecord } from "./parseJsonRecord";

describe("asOptionalJsonRecord pure seam", () => {
  it("parses JSON object strings", () => {
    expect(asOptionalJsonRecord('{"a":1}')).toEqual({ a: 1 });
    expect(asOptionalJsonRecord('  {"ok":true}  ')).toEqual({ ok: true });
  });

  it("accepts already-parsed plain objects", () => {
    expect(asOptionalJsonRecord({ x: "y" })).toEqual({ x: "y" });
    expect(asOptionalJsonRecord(Object.create(null))).toEqual({});
  });

  it("rejects empty, invalid, arrays, and primitives", () => {
    expect(asOptionalJsonRecord(undefined)).toBeUndefined();
    expect(asOptionalJsonRecord(null)).toBeUndefined();
    expect(asOptionalJsonRecord("")).toBeUndefined();
    expect(asOptionalJsonRecord("   ")).toBeUndefined();
    expect(asOptionalJsonRecord("not-json")).toBeUndefined();
    expect(asOptionalJsonRecord("[]")).toBeUndefined();
    expect(asOptionalJsonRecord("[1,2]")).toBeUndefined();
    expect(asOptionalJsonRecord([])).toBeUndefined();
    expect(asOptionalJsonRecord(0)).toBeUndefined();
    expect(asOptionalJsonRecord(true)).toBeUndefined();
    expect(asOptionalJsonRecord('"str"')).toBeUndefined();
    expect(asOptionalJsonRecord("null")).toBeUndefined();
  });
});
