import { describe, expect, it } from "bun:test";
import { clipMultilineText } from "./clipMultilineText";

describe("clipMultilineText pure seam", () => {
  it("trims without truncating short text", () => {
    expect(clipMultilineText("  hello world  ", 100)).toBe("hello world");
    expect(clipMultilineText("plain\nline", 20)).toBe("plain\nline");
    expect(clipMultilineText("exact", 5)).toBe("exact");
  });

  it("truncates with truncated-N-chars suffix and preserves prefix newlines", () => {
    expect(clipMultilineText("abcdefghij", 5)).toBe(
      "abcde\n...[truncated 5 chars]",
    );
    expect(clipMultilineText("line1\nline2\nline3", 8)).toBe(
      "line1\nli\n...[truncated 9 chars]",
    );
  });

  it("returns empty for blank-only input", () => {
    expect(clipMultilineText("", 10)).toBe("");
    expect(clipMultilineText("   \n\t  ", 10)).toBe("");
  });

  it("does not reserve suffix length from the slice budget", () => {
    // Prefix is always max chars; suffix is additive.
    expect(clipMultilineText("0123456789", 0)).toBe(
      "\n...[truncated 10 chars]",
    );
    expect(clipMultilineText("0123456789", 1)).toBe(
      "0\n...[truncated 9 chars]",
    );
  });
});
