import { describe, expect, it } from "bun:test";

import { parseApiError } from "../parseApiError";

describe("parseApiError", () => {
  it("normalizes context overflow errors into a short actionable message", async () => {
    const response = new Response(
      JSON.stringify({
        msg: "This endpoint's maximum context length is 1000000 tokens. However, you requested about 1530978 tokens.",
        code: "UPSTREAM_400",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );

    await expect(parseApiError(response)).resolves.toBe(
      "上下文过长：本轮消息或工具结果太大。请缩小范围，或先读取更小片段后再继续。",
    );
  });

  it("truncates generic error payloads", async () => {
    const response = new Response(`boom:${"x".repeat(500)}`, { status: 500 });
    const message = await parseApiError(response);

    expect(message.startsWith("API请求失败: boom:")).toBe(true);
    expect(message.length).toBeLessThan(360);
  });
});
