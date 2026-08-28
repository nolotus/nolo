import { describe, expect, test } from "bun:test";
import { redactXhsSensitiveValue, containsSensitiveValue } from "./redaction";

describe("redactXhsSensitiveValue", () => {
  test("redacts xsecToken key", () => {
    const input = {
      noteId: "abc123",
      xsecToken: "super_secret_token_value",
    };
    const result = redactXhsSensitiveValue(input) as Record<string, unknown>;
    expect(result.noteId).toBe("abc123");
    expect(result.xsecToken).toBe("[REDACTED]");
  });

  test("redacts xsec_token key", () => {
    const input = { xsec_token: "secret", normal: "visible" };
    const result = redactXhsSensitiveValue(input) as Record<string, unknown>;
    expect(result.xsec_token).toBe("[REDACTED]");
    expect(result.normal).toBe("visible");
  });

  test("redacts cookie key", () => {
    const input = {
      cookie: "a1=abc123; web_session=xyz789",
      content: "normal text",
    };
    const result = redactXhsSensitiveValue(input) as Record<string, unknown>;
    expect(result.cookie).toBe("[REDACTED]");
    expect(result.content).toBe("normal text");
  });

  test("redacts nested sensitive keys", () => {
    const input = {
      headers: {
        cookie: "a1=abc123",
        "content-type": "application/json",
      },
      body: {
        noteId: "abc",
        xsecToken: "secret",
      },
    };
    const result = redactXhsSensitiveValue(input) as Record<string, any>;
    expect(result.headers.cookie).toBe("[REDACTED]");
    expect(result.headers["content-type"]).toBe("application/json");
    expect(result.body.noteId).toBe("abc");
    expect(result.body.xsecToken).toBe("[REDACTED]");
  });

  test("redacts cookie-like substrings in strings", () => {
    const input = "Request with a1=abc123 in the text";
    const result = redactXhsSensitiveValue(input) as string;
    expect(result).toContain("a1=[REDACTED]");
    expect(result).not.toContain("abc123");
  });

  test("redacts web_session in strings", () => {
    const input = "cookie: web_session=xyz789";
    const result = redactXhsSensitiveValue(input) as string;
    expect(result).toContain("web_session=[REDACTED]");
    expect(result).not.toContain("xyz789");
  });

  test("redacts xsec_token in URL strings", () => {
    const input =
      "https://www.xiaohongshu.com/explore/abc123?xsec_token=secretval&other=keep";
    const result = redactXhsSensitiveValue(input) as string;
    expect(result).toContain("xsec_token=[REDACTED]");
    expect(result).not.toContain("secretval");
    expect(result).toContain("other=keep");
  });

  test("handles arrays", () => {
    const input = [
      { cookie: "a1=abc", normal: "ok" },
      "Bearer token123",
    ];
    const result = redactXhsSensitiveValue(input) as any[];
    expect(result[0].cookie).toBe("[REDACTED]");
    expect(result[0].normal).toBe("ok");
    // Bearer tokens are not XHS-specific, but strings pass through unchanged
    expect(result[1]).toBe("Bearer token123");
  });

  test("handles null and undefined", () => {
    expect(redactXhsSensitiveValue(null)).toBe(null);
    expect(redactXhsSensitiveValue(undefined)).toBe(undefined);
  });

  test("handles numbers and booleans", () => {
    expect(redactXhsSensitiveValue(42)).toBe(42);
    expect(redactXhsSensitiveValue(true)).toBe(true);
  });

  test("does not mutate original object", () => {
    const input = { xsecToken: "secret", normal: "ok" };
    redactXhsSensitiveValue(input);
    expect(input.xsecToken).toBe("secret");
  });
});

describe("containsSensitiveValue", () => {
  test("detects cookie patterns", () => {
    expect(containsSensitiveValue("a1=abc123")).toBe(true);
    expect(containsSensitiveValue("web_session=xyz789")).toBe(true);
  });

  test("detects xsec_token in URLs", () => {
    expect(
      containsSensitiveValue(
        "https://example.com?xsec_token=secret",
      ),
    ).toBe(true);
  });

  test("detects xsecToken field assignment", () => {
    expect(containsSensitiveValue('xsecToken: "abc"')).toBe(true);
    expect(containsSensitiveValue("xsec_token=abc")).toBe(true);
  });

  test("returns false for clean strings", () => {
    expect(containsSensitiveValue("hello world")).toBe(false);
    expect(containsSensitiveValue("noteId=abc123")).toBe(false);
    expect(containsSensitiveValue("normal text")).toBe(false);
  });
});
