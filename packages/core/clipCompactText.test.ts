import { describe, expect, it } from "bun:test";
import { clipCompactText } from "./clipCompactText";

describe("clipCompactText pure seam", () => {
  it("compacts whitespace without truncating short text", () => {
    expect(clipCompactText("  hello   world  ", 100)).toBe("hello world");
    expect(clipCompactText("a\n\tb", 10)).toBe("a b");
    expect(clipCompactText("plain", 5)).toBe("plain");
  });

  it("truncates with default ASCII ellipsis reserving three chars", () => {
    expect(clipCompactText("abcdefghij", 8)).toBe("abcde...");
    expect(clipCompactText("  foo   bar   baz  ", 10)).toBe("foo bar...");
  });

  it("supports custom ellipsis length math (unicode …)", () => {
    expect(clipCompactText("abcdefghij", 8, "…")).toBe("abcdefg…");
    expect(clipCompactText("abcdefghij", 1, "…")).toBe("a");
    expect(clipCompactText("abcdefghij", 0, "…")).toBe("");
  });

  it("returns empty for blank-only input", () => {
    expect(clipCompactText("", 10)).toBe("");
    expect(clipCompactText("   \n\t  ", 10)).toBe("");
  });

  it("does not alter non-whitespace characters inside the budget", () => {
    expect(clipCompactText("a&b<c>d\"e'f", 20)).toBe("a&b<c>d\"e'f");
    expect(clipCompactText("中文  空格", 20)).toBe("中文 空格");
  });
});
