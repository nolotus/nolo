import { describe, expect, it } from "bun:test";

import {
  buildMessageTextPreview,
  extractTextFromContent,
} from "./extractTextFromContent";

describe("extractTextFromContent pure seam", () => {
  it("returns raw strings unchanged", () => {
    expect(extractTextFromContent("hello")).toBe("hello");
    expect(extractTextFromContent("  spaced  ")).toBe("  spaced  ");
    expect(extractTextFromContent("")).toBe("");
  });

  it("joins multimodal text parts and ignores non-text parts", () => {
    expect(
      extractTextFromContent([
        { type: "text", text: "a" },
        { type: "image_url", image_url: { url: "https://example.com/x.png" } },
        { type: "text", text: "b" },
      ])
    ).toBe("ab");
  });

  it("accepts a single text-part object", () => {
    expect(extractTextFromContent({ type: "text", text: "solo" })).toBe("solo");
  });

  it("rejects nullish, primitives, and non-text objects", () => {
    expect(extractTextFromContent(undefined)).toBe("");
    expect(extractTextFromContent(null)).toBe("");
    expect(extractTextFromContent(0)).toBe("");
    expect(extractTextFromContent(true)).toBe("");
    expect(extractTextFromContent({ type: "image_url" })).toBe("");
    expect(extractTextFromContent([{ type: "text", text: 1 }])).toBe("");
    expect(extractTextFromContent([{ text: "missing-type" }])).toBe("");
  });
});

describe("buildMessageTextPreview pure seam", () => {
  it("returns empty when content has no text", () => {
    expect(buildMessageTextPreview(undefined, 20)).toBe("");
    expect(buildMessageTextPreview([], 20)).toBe("");
    expect(buildMessageTextPreview(null, 20)).toBe("");
  });

  it("clips long text with an ellipsis and keeps short text intact", () => {
    expect(buildMessageTextPreview("short", 20)).toBe("short");
    expect(buildMessageTextPreview("abcdefghijklmnopqrstuvwxyz", 10)).toBe(
      "abcdefghij…"
    );
  });

  it("clips multimodal content after joining text parts", () => {
    expect(
      buildMessageTextPreview(
        [
          { type: "text", text: "hello " },
          { type: "text", text: "world!!!" },
        ],
        8
      )
    ).toBe("hello wo…");
  });
});
