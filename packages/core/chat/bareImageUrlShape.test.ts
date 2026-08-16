import { describe, expect, test } from "bun:test";
import {
  requiresBareImageUrl,
  toBareImageUrlContent,
  toBareImageUrlMessages,
} from "./bareImageUrlShape";

const imagePart = {
  type: "image_url",
  image_url: { url: "data:image/png;base64,AAA" },
};

describe("requiresBareImageUrl", () => {
  test("matches gpt-* on the opencode-go provider", () => {
    expect(requiresBareImageUrl({ provider: "opencode-go", model: "gpt-5.6-luna" })).toBe(true);
  });

  test("matches gpt-* by endpoint host", () => {
    expect(
      requiresBareImageUrl({
        endpoint: "https://opencode.ai/zen/go/v1/chat/completions",
        model: "gpt-5.6-luna",
      }),
    ).toBe(true);
  });

  test("does not reach OpenCode Zen, which is a different, untested route", () => {
    expect(
      requiresBareImageUrl({
        endpoint: "https://opencode.ai/zen/v1/chat/completions",
        model: "gpt-5.6-luna",
      }),
    ).toBe(false);
  });

  test("leaves the gateway's non-gpt models on the standard object form", () => {
    // glm-5.2 answers 422 and minimax-m3 answers 400 for the bare-string form.
    expect(requiresBareImageUrl({ provider: "opencode-go", model: "glm-5.2" })).toBe(false);
    expect(requiresBareImageUrl({ provider: "opencode-go", model: "minimax-m3" })).toBe(false);
  });

  test("does not touch gpt models on other providers", () => {
    expect(
      requiresBareImageUrl({
        endpoint: "https://api.openai.com/v1/chat/completions",
        provider: "openai",
        model: "gpt-5.6",
      }),
    ).toBe(false);
  });
});

describe("toBareImageUrlContent", () => {
  test("flattens image_url objects and keeps other parts", () => {
    expect(
      toBareImageUrlContent([{ type: "text", text: "hi" }, imagePart]),
    ).toEqual([
      { type: "text", text: "hi" },
      { type: "image_url", image_url: "data:image/png;base64,AAA" },
    ]);
  });

  test("returns the same reference when there is nothing to rewrite", () => {
    const content = [{ type: "text", text: "hi" }];
    expect(toBareImageUrlContent(content)).toBe(content);
    expect(toBareImageUrlContent("plain")).toBe("plain");
  });

  test("leaves already-bare image parts alone", () => {
    const content = [{ type: "image_url", image_url: "data:image/png;base64,AAA" }];
    expect(toBareImageUrlContent(content)).toBe(content);
  });
});

describe("toBareImageUrlMessages", () => {
  test("rewrites only the messages that carry image parts", () => {
    const text: { role: string; content: unknown } = { role: "user", content: "hello" };
    const withImage: { role: string; content: unknown } = {
      role: "user",
      content: [imagePart],
    };
    const out = toBareImageUrlMessages([text, withImage]);

    expect(out[0]).toBe(text);
    expect(out[1].content).toEqual([
      { type: "image_url", image_url: "data:image/png;base64,AAA" },
    ]);
    expect(withImage.content).toEqual([imagePart]);
  });
});
