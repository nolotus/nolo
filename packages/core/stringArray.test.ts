import { describe, expect, it } from "bun:test";
import {
  asNonEmptyStringArray,
  asTrimmedNonEmptyStringArray,
} from "./stringArray";

describe("asNonEmptyStringArray pure seam", () => {
  it("rejects non-arrays as empty", () => {
    expect(asNonEmptyStringArray(undefined)).toEqual([]);
    expect(asNonEmptyStringArray(null)).toEqual([]);
    expect(asNonEmptyStringArray("a")).toEqual([]);
    expect(asNonEmptyStringArray(1)).toEqual([]);
    expect(asNonEmptyStringArray({})).toEqual([]);
  });

  it("keeps non-empty strings and drops empty/whitespace/non-strings", () => {
    expect(
      asNonEmptyStringArray(["a", "", "  ", "b", 1, null, "  c  "]),
    ).toEqual(["a", "b", "  c  "]);
  });

  it("preserves order and duplicates", () => {
    expect(asNonEmptyStringArray(["x", "x", "y"])).toEqual(["x", "x", "y"]);
  });
});

describe("asTrimmedNonEmptyStringArray pure seam", () => {
  it("rejects non-arrays as empty", () => {
    expect(asTrimmedNonEmptyStringArray(undefined)).toEqual([]);
    expect(asTrimmedNonEmptyStringArray(null)).toEqual([]);
    expect(asTrimmedNonEmptyStringArray("a")).toEqual([]);
    expect(asTrimmedNonEmptyStringArray(1)).toEqual([]);
    expect(asTrimmedNonEmptyStringArray({})).toEqual([]);
  });

  it("keeps trimmed non-empty strings and drops empty/whitespace/non-strings", () => {
    expect(
      asTrimmedNonEmptyStringArray(["a", "", "  ", "b", 1, null, "  c  "]),
    ).toEqual(["a", "b", "c"]);
  });

  it("preserves order and duplicates", () => {
    expect(asTrimmedNonEmptyStringArray([" x ", "x", " y "])).toEqual([
      "x",
      "x",
      "y",
    ]);
  });
});
