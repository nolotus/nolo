import { describe, expect, it } from "bun:test";
import { normalizeUserId } from "./userId";

describe("normalizeUserId pure seam", () => {
  it("rejects non-strings as empty", () => {
    expect(normalizeUserId(undefined)).toBe("");
    expect(normalizeUserId(null)).toBe("");
    expect(normalizeUserId(0)).toBe("");
    expect(normalizeUserId(1)).toBe("");
    expect(normalizeUserId(true)).toBe("");
    expect(normalizeUserId({})).toBe("");
    expect(normalizeUserId([])).toBe("");
  });

  it("trims bare ids and preserves empty after trim", () => {
    expect(normalizeUserId("")).toBe("");
    expect(normalizeUserId("   ")).toBe("");
    expect(normalizeUserId("user123")).toBe("user123");
    expect(normalizeUserId("  user123  ")).toBe("user123");
  });

  it("strips the user: record-key prefix after trim", () => {
    expect(normalizeUserId("user:")).toBe("");
    expect(normalizeUserId("user:abc")).toBe("abc");
    expect(normalizeUserId("  user:abc  ")).toBe("abc");
    expect(normalizeUserId("user:user:nested")).toBe("user:nested");
  });

  it("does not strip case variants or partial prefixes", () => {
    expect(normalizeUserId("User:abc")).toBe("User:abc");
    expect(normalizeUserId("users:abc")).toBe("users:abc");
    expect(normalizeUserId("user")).toBe("user");
  });
});
