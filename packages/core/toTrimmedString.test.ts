import { describe, expect, it } from "bun:test";
import { toTrimmedString } from "./toTrimmedString";

describe("toTrimmedString pure seam", () => {
  it("trims strings and preserves empty after trim", () => {
    expect(toTrimmedString("")).toBe("");
    expect(toTrimmedString("   ")).toBe("");
    expect(toTrimmedString("hello")).toBe("hello");
    expect(toTrimmedString("  hello  ")).toBe("hello");
    expect(toTrimmedString("\tKeep Case\n")).toBe("Keep Case");
  });

  it("maps nullish to empty without String coercion side effects", () => {
    expect(toTrimmedString(undefined)).toBe("");
    expect(toTrimmedString(null)).toBe("");
  });

  it("String()-coerces non-null non-strings then trims", () => {
    expect(toTrimmedString(0)).toBe("0");
    expect(toTrimmedString(42)).toBe("42");
    expect(toTrimmedString(true)).toBe("true");
    expect(toTrimmedString(false)).toBe("false");
    expect(toTrimmedString({})).toBe("[object Object]");
  });
});
