import { describe, expect, it } from "bun:test";
import { asOptionalTrimmedString } from "./optionalString";

describe("asOptionalTrimmedString pure seam", () => {
  it("rejects non-strings", () => {
    expect(asOptionalTrimmedString(undefined)).toBeUndefined();
    expect(asOptionalTrimmedString(null)).toBeUndefined();
    expect(asOptionalTrimmedString(0)).toBeUndefined();
    expect(asOptionalTrimmedString(1)).toBeUndefined();
    expect(asOptionalTrimmedString(true)).toBeUndefined();
    expect(asOptionalTrimmedString({})).toBeUndefined();
    expect(asOptionalTrimmedString([])).toBeUndefined();
  });

  it("rejects empty and whitespace-only strings", () => {
    expect(asOptionalTrimmedString("")).toBeUndefined();
    expect(asOptionalTrimmedString(" ")).toBeUndefined();
    expect(asOptionalTrimmedString("\t\n")).toBeUndefined();
  });

  it("returns trimmed non-empty strings", () => {
    expect(asOptionalTrimmedString("hello")).toBe("hello");
    expect(asOptionalTrimmedString("  hello  ")).toBe("hello");
    expect(asOptionalTrimmedString("a")).toBe("a");
  });
});
