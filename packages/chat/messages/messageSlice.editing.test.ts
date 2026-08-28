import { describe, expect, it } from "bun:test";
import { buildEditedMessageContent } from "./messageSlice";

describe("buildEditedMessageContent", () => {
  it("replaces plain string content with the edited text", () => {
    expect(buildEditedMessageContent("before", "after")).toBe("after");
  });

  it("preserves non-text parts while replacing the text segment", () => {
    expect(
      buildEditedMessageContent(
        [
          { type: "text", text: "before" },
          { type: "image_url", image_url: { url: "https://example.com/a.png" } },
          { type: "doc", name: "Spec", pageKey: "page-1" },
        ] as any,
        "after"
      )
    ).toEqual([
      { type: "text", text: "after" },
      { type: "image_url", image_url: { url: "https://example.com/a.png" } },
      { type: "doc", name: "Spec", pageKey: "page-1" },
    ] as any);
  });

  it("allows attachment-only edited messages", () => {
    expect(
      buildEditedMessageContent(
        [{ type: "image_url", image_url: { url: "https://example.com/a.png" } }] as any,
        ""
      )
    ).toEqual([
      { type: "image_url", image_url: { url: "https://example.com/a.png" } },
    ]);
  });
});
