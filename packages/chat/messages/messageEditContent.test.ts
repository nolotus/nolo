import { describe, expect, it } from "bun:test";
import { buildEditedMessageContent } from "./messageEditContent";
import type { Message } from "./types";

describe("buildEditedMessageContent (extracted module)", () => {
  it("replaces plain string content with the trimmed edited text", () => {
    expect(buildEditedMessageContent("before", "  after  ")).toBe("after");
  });

  it("returns empty string when the edited text is whitespace-only over string content", () => {
    expect(buildEditedMessageContent("before", "   ")).toBe("");
  });

  it("preserves non-text parts and prepends the trimmed text segment for array content", () => {
    const original: Message["content"] = [
      { type: "text", text: "before" },
      { type: "image_url", image_url: { url: "https://example.com/a.png" } },
      { type: "doc", name: "Spec", pageKey: "page-1" },
    ] as any;

    expect(buildEditedMessageContent(original, "after")).toEqual([
      { type: "text", text: "after" },
      { type: "image_url", image_url: { url: "https://example.com/a.png" } },
      { type: "doc", name: "Spec", pageKey: "page-1" },
    ] as any);
  });

  it("allows attachment-only edited messages (empty text drops the text part)", () => {
    const original: Message["content"] = [
      { type: "image_url", image_url: { url: "https://example.com/a.png" } },
    ] as any;

    expect(buildEditedMessageContent(original, "")).toEqual([
      { type: "image_url", image_url: { url: "https://example.com/a.png" } },
    ] as any);
  });
});