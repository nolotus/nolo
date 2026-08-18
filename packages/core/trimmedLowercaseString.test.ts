import { describe, expect, it } from "bun:test";
import { asTrimmedLowercaseString } from "./trimmedLowercaseString";

describe("asTrimmedLowercaseString pure seam", () => {
  it("rejects non-strings as empty", () => {
    expect(asTrimmedLowercaseString(undefined)).toBe("");
    expect(asTrimmedLowercaseString(null)).toBe("");
    expect(asTrimmedLowercaseString(0)).toBe("");
    expect(asTrimmedLowercaseString(1)).toBe("");
    expect(asTrimmedLowercaseString(true)).toBe("");
    expect(asTrimmedLowercaseString({})).toBe("");
    expect(asTrimmedLowercaseString([])).toBe("");
  });

  it("trims and lowercases strings", () => {
    expect(asTrimmedLowercaseString("")).toBe("");
    expect(asTrimmedLowercaseString("   ")).toBe("");
    expect(asTrimmedLowercaseString("Hello")).toBe("hello");
    expect(asTrimmedLowercaseString("  USER@Example.COM  ")).toBe(
      "user@example.com",
    );
    expect(asTrimmedLowercaseString("\tDelete\n")).toBe("delete");
  });

  it("pins residual rewire call-site shapes (usage/checkEnv/task-thread)", () => {
    // usageRequestOptions provider keys
    expect(asTrimmedLowercaseString("OpenRouter")).toBe("openrouter");
    expect(asTrimmedLowercaseString(null)).toBe("");
    // checkEnv tool keys
    expect(asTrimmedLowercaseString(" Gemini ")).toBe("gemini");
    expect(asTrimmedLowercaseString(undefined)).toBe("");
    // task-thread status normalization
    expect(asTrimmedLowercaseString("DONE")).toBe("done");
    expect(asTrimmedLowercaseString(" In_Progress ")).toBe("in_progress");
  });
});
