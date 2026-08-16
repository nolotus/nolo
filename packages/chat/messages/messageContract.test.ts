import { describe, expect, it } from "bun:test";

import {
  appendSaveFailureToContent,
  countImageParts,
  finalizeAssistantMessageContent,
  summarizeMessagesForDebug,
} from "./messageContract";

describe("messageContract", () => {
  it("keeps structured image content as the visible assistant message payload", () => {
    const imagePart = {
      type: "image_url" as const,
      image_url: { url: "https://example.com/cat.jpg" },
      google_native: {
        inlineData: { mimeType: "image/jpeg", data: "abc" },
        thoughtSignature: "sig-1",
      },
    };

    const result = finalizeAssistantMessageContent(
      [{ type: "text", text: "Blue cat" }, imagePart] as any,
      "",
    );

    expect(result.visibleContent).toEqual([
      { type: "text", text: "Blue cat" },
      imagePart,
    ] as any);
    expect(result.imagePartCount).toBe(1);
  });

  it("summarizes image-bearing assistant messages for debug logs", () => {
    expect(
      summarizeMessagesForDebug([
        { role: "user", content: "hello" },
        {
          role: "assistant",
          content: [
            {
              type: "image_url",
              image_url: { url: "https://example.com/1.jpg" },
            },
          ],
        },
      ]),
    ).toEqual({
      count: 2,
      roles: ["user", "assistant"],
      imageMessageCount: 1,
    });
    expect(
      countImageParts([
        {
          type: "image_url",
          image_url: { url: "https://example.com/2.jpg" },
        },
      ]),
    ).toBe(1);
  });

  it("appends save-failure text without stringifying structured content", () => {
    expect(
      appendSaveFailureToContent([
        {
          type: "image_url",
          image_url: { url: "https://example.com/cat.png" },
        },
      ]),
    ).toEqual([
      {
        type: "image_url",
        image_url: { url: "https://example.com/cat.png" },
      },
      {
        type: "text",
        text: "[Failed to save message]",
      },
    ]);
  });
});
