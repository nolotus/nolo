import { describe, expect, it } from "bun:test";
import { normalizeAuthorName as normalizeShareAuthorName } from "share/helpers";

describe("normalizeShareAuthorName", () => {
  it("returns empty string for unknown placeholders", () => {
    expect(normalizeShareAuthorName("unknown")).toBe("");
    expect(normalizeShareAuthorName(" Unknown ")).toBe("");
    expect(normalizeShareAuthorName("unknown user")).toBe("");
  });

  it("returns empty string for empty values", () => {
    expect(normalizeShareAuthorName("")).toBe("");
    expect(normalizeShareAuthorName("   ")).toBe("");
    expect(normalizeShareAuthorName(null)).toBe("");
    expect(normalizeShareAuthorName(undefined)).toBe("");
  });

  it("keeps valid author names", () => {
    expect(normalizeShareAuthorName("nolotus")).toBe("nolotus");
    expect(normalizeShareAuthorName(" 张三 ")).toBe("张三");
  });
});
