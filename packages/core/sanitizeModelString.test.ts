import { describe, expect, it } from "bun:test";
import { sanitizeOptionalModelString } from "./sanitizeModelString";

describe("sanitizeOptionalModelString", () => {
  it("returns empty for non-string values", () => {
    expect(sanitizeOptionalModelString(undefined)).toBe("");
    expect(sanitizeOptionalModelString(null)).toBe("");
    expect(sanitizeOptionalModelString(0)).toBe("");
    expect(sanitizeOptionalModelString(123)).toBe("");
    expect(sanitizeOptionalModelString(true)).toBe("");
    expect(sanitizeOptionalModelString({})).toBe("");
    expect(sanitizeOptionalModelString([])).toBe("");
  });

  it("returns empty for empty and whitespace-only strings", () => {
    expect(sanitizeOptionalModelString("")).toBe("");
    expect(sanitizeOptionalModelString("   ")).toBe("");
    expect(sanitizeOptionalModelString("\t\n")).toBe("");
  });

  it("returns empty for pseudo-strings (case-insensitive)", () => {
    expect(sanitizeOptionalModelString("undefined")).toBe("");
    expect(sanitizeOptionalModelString("UNDEFINED")).toBe("");
    expect(sanitizeOptionalModelString("Undefined")).toBe("");
    expect(sanitizeOptionalModelString("null")).toBe("");
    expect(sanitizeOptionalModelString("NULL")).toBe("");
    expect(sanitizeOptionalModelString("Null")).toBe("");
    expect(sanitizeOptionalModelString("nan")).toBe("");
    expect(sanitizeOptionalModelString("NaN")).toBe("");
    expect(sanitizeOptionalModelString("NaN  ")).toBe("");
    expect(sanitizeOptionalModelString("  undefined  ")).toBe("");
  });

  it("returns trimmed value for normal strings", () => {
    expect(sanitizeOptionalModelString("qwen3.8")).toBe("qwen3.8");
    expect(sanitizeOptionalModelString("  qwen3.8  ")).toBe("qwen3.8");
    expect(sanitizeOptionalModelString("gpt-4o")).toBe("gpt-4o");
    expect(sanitizeOptionalModelString("claude-sonnet-4")).toBe("claude-sonnet-4");
  });
});