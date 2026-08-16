import { describe, expect, test } from "bun:test";
import { describeProviderFailure, providerHttpFailure } from "./providerFailureMessage";

describe("describeProviderFailure", () => {
  test("leads with the upstream error message when there is one", () => {
    const out = describeProviderFailure({
      body: { error: { message: "No endpoints found that support image input" } },
    });
    expect(out.startsWith("No endpoints found that support image input | ")).toBe(true);
  });

  test("names the success-shaped rejection OpenCode Go returns", () => {
    const out = describeProviderFailure({
      body: {
        id: "chatcmpl_x",
        choices: [{ index: 0, message: { role: "assistant" }, finish_reason: null }],
      },
    });
    expect(out).toContain("上游拒绝了请求但没给错误信息");
    expect(out).not.toContain("图片");
  });

  test("points at the image payload when the request carried one", () => {
    const out = describeProviderFailure({
      body: { choices: [{ message: { role: "assistant" } }] },
      hadImageParts: true,
    });
    expect(out).toContain("带了图片");
  });

  test("falls back to the raw body for anything else", () => {
    expect(describeProviderFailure({ body: "upstream boom" })).toBe('"upstream boom"');
  });

  test("clips very long bodies", () => {
    const out = describeProviderFailure({ body: { blob: "x".repeat(2000) } });
    expect(out.length).toBeLessThan(500);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("providerHttpFailure", () => {
  test("labels the adapter, keeps the status, and explains the body", () => {
    const error = providerHttpFailure({
      label: "local provider",
      status: 400,
      raw: '{"choices":[{"message":{"role":"assistant"}}]}',
      messages: [{ content: [{ type: "image_url", image_url: { url: "data:…" } }] }],
    });
    expect(error.message).toStartWith("local provider failed: HTTP 400 ");
    expect(error.message).toContain("带了图片");
  });

  test("survives a non-JSON body", () => {
    const error = providerHttpFailure({
      label: "desktop platform provider",
      status: 502,
      raw: "<html>bad gateway</html>",
      messages: [],
    });
    expect(error.message).toBe(
      'desktop platform provider failed: HTTP 502 "<html>bad gateway</html>"',
    );
  });
});
