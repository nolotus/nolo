import { describe, expect, test } from "bun:test";

import { parseUpstreamErrorBody } from "./upstreamErrorBody";

describe("parseUpstreamErrorBody", () => {
  // 核心回归：冷却时长的唯一准确来源是上游的结构化字段。把整段响应压进
  // error.message 会让它退化成字符串，冷却回落到 5 分钟默认值。
  test("preserves structured upstream fields", () => {
    const upstream = {
      error: {
        type: "usage_limit_reached",
        message: "The usage limit has been reached",
        resets_at: 1788140204,
      },
    };
    expect(parseUpstreamErrorBody(JSON.stringify(upstream), "Too Many Requests")).toEqual(
      upstream,
    );
  });

  // Google 形状：冷却信息藏在 details[].retryInfo.retryDelay，必须整体保留。
  test("preserves nested google-style details", () => {
    const upstream = {
      error: {
        code: 429,
        message: "Resource exhausted",
        status: "RESOURCE_EXHAUSTED",
        details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "30s" }],
      },
    };
    const parsed = parseUpstreamErrorBody(JSON.stringify(upstream), "");
    expect((parsed.error as any).details[0].retryDelay).toBe("30s");
  });

  test("keeps sibling top-level fields alongside error", () => {
    const upstream = { error: { message: "nope" }, requestId: "req-1" };
    expect(parseUpstreamErrorBody(JSON.stringify(upstream), "")).toEqual(upstream);
  });

  describe("falls back to the message wrapper", () => {
    const cases: Array<[string, string, string, unknown]> = [
      ["non-JSON error page", "<html>bad gateway</html>", "Bad Gateway", "<html>bad gateway</html>"],
      ["empty body uses statusText", "", "Internal Server Error", "Internal Server Error"],
      ["error is a string", '{"error":"plain"}', "", '{"error":"plain"}'],
      ["error is null", '{"error":null}', "", '{"error":null}'],
      ["top-level array", '[{"error":{"message":"x"}}]', "", '[{"error":{"message":"x"}}]'],
      ["no error key at all", '{"detail":"nope"}', "", '{"detail":"nope"}'],
    ];
    for (const [label, text, statusText, expectedMessage] of cases) {
      test(label, () => {
        expect(parseUpstreamErrorBody(text, statusText)).toEqual({
          error: { message: expectedMessage },
        });
      });
    }
  });

  test("never throws on malformed input", () => {
    expect(() => parseUpstreamErrorBody("{not json", "S")).not.toThrow();
    expect(() => parseUpstreamErrorBody("null", "S")).not.toThrow();
  });
});
