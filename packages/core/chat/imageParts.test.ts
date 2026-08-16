import { describe, expect, test } from "bun:test";
import { hasImageParts, isImageUrlPart } from "./imageParts";

describe("isImageUrlPart", () => {
  test("matches only image_url parts", () => {
    expect(isImageUrlPart({ type: "image_url", image_url: { url: "data:…" } })).toBe(true);
    expect(isImageUrlPart({ type: "image_url", image_url: "data:…" })).toBe(true);
    expect(isImageUrlPart({ type: "text", text: "hi" })).toBe(false);
    expect(isImageUrlPart("image_url")).toBe(false);
    expect(isImageUrlPart(null)).toBe(false);
  });
});

describe("hasImageParts", () => {
  test("detects image parts and ignores plain text messages", () => {
    const messages: Array<{ role: string; content: unknown }> = [
      { role: "user", content: "hello" },
      { role: "user", content: [{ type: "image_url", image_url: { url: "data:…" } }] },
    ];
    expect(hasImageParts(messages)).toBe(true);
    expect(hasImageParts([{ content: [{ type: "text", text: "hi" }] }])).toBe(false);
    expect(hasImageParts([{ content: "hi" }])).toBe(false);
    expect(hasImageParts([])).toBe(false);
  });
});
