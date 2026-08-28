import { describe, expect, it } from "bun:test";
import { escapeHtml } from "./escapeHtml";

describe("escapeHtml pure seam", () => {
  it("coerces nullish and non-strings", () => {
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(0)).toBe("0");
    expect(escapeHtml(false)).toBe("false");
  });

  it("escapes the five HTML-sensitive characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
    expect(escapeHtml(`a&b<c>d"e'f`)).toBe(
      "a&amp;b&lt;c&gt;d&quot;e&#39;f"
    );
  });

  it("leaves plain text and already-safe content unchanged", () => {
    expect(escapeHtml("hello nolo")).toBe("hello nolo");
    expect(escapeHtml("https://nolo.chat/path?x=1")).toBe(
      "https://nolo.chat/path?x=1"
    );
    expect(escapeHtml("")).toBe("");
  });

  it("escapes ampersand first so entity output is not double-broken", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
});
