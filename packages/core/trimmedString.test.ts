import { describe, expect, it } from "bun:test";
import { asTrimmedString } from "./trimmedString";

describe("asTrimmedString pure seam", () => {
  it("rejects non-strings as empty", () => {
    expect(asTrimmedString(undefined)).toBe("");
    expect(asTrimmedString(null)).toBe("");
    expect(asTrimmedString(0)).toBe("");
    expect(asTrimmedString(1)).toBe("");
    expect(asTrimmedString(true)).toBe("");
    expect(asTrimmedString({})).toBe("");
    expect(asTrimmedString([])).toBe("");
  });

  it("trims strings and preserves empty after trim", () => {
    expect(asTrimmedString("")).toBe("");
    expect(asTrimmedString("   ")).toBe("");
    expect(asTrimmedString("hello")).toBe("hello");
    expect(asTrimmedString("  hello  ")).toBe("hello");
    expect(asTrimmedString("\tKeep Case\n")).toBe("Keep Case");
  });
});
