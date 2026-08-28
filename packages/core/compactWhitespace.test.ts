import { describe, expect, it } from "bun:test";
import { compactWhitespace } from "./compactWhitespace";

describe("compactWhitespace pure seam", () => {
  it("collapses runs of whitespace and trims ends", () => {
    expect(compactWhitespace("  hello   world  ")).toBe("hello world");
    expect(compactWhitespace("a\t\tb")).toBe("a b");
    expect(compactWhitespace("a\nb\r\nc")).toBe("a b c");
    expect(compactWhitespace("a \n \t b")).toBe("a b");
  });

  it("leaves single spaces and plain text unchanged", () => {
    expect(compactWhitespace("hello world")).toBe("hello world");
    expect(compactWhitespace("x")).toBe("x");
    expect(compactWhitespace("https://nolo.chat/path?x=1")).toBe(
      "https://nolo.chat/path?x=1"
    );
  });

  it("returns empty for blank-only input", () => {
    expect(compactWhitespace("")).toBe("");
    expect(compactWhitespace("   ")).toBe("");
    expect(compactWhitespace("\n\t\r")).toBe("");
  });

  it("does not alter non-whitespace characters", () => {
    expect(compactWhitespace("a&b<c>d\"e'f")).toBe("a&b<c>d\"e'f");
    expect(compactWhitespace("中文  空格")).toBe("中文 空格");
  });
});
