import { describe, expect, it } from "bun:test";

import {
  inlineImageUrlsForCustomProvider,
  shouldInlineImageUrlsForAgent,
} from "./inlineImageUrlsForCustomProvider";

describe("inlineImageUrlsForCustomProvider", () => {
  it("inlines file content image URLs for custom agents", async () => {
    const body = {
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "what is this?" },
            {
              type: "image_url",
              image_url: {
                url: "https://nolo.chat/api/v1/db/file/content/01IMAGE",
              },
            },
          ],
        },
      ],
    };

    const result = await inlineImageUrlsForCustomProvider(body, {
      shouldInline: true,
      fetchImage: async () => ({
        ok: true,
        mimeType: "image/png",
        bytes: new Uint8Array([65, 66, 67, 68]),
      }),
    });

    expect(result).not.toBe(body);
    expect((result as any).messages[0].content[1].image_url.url).toBe(
      "data:image/png;base64,QUJDRA==",
    );
    expect((body as any).messages[0].content[1].image_url.url).toBe(
      "https://nolo.chat/api/v1/db/file/content/01IMAGE",
    );
  });

  it("leaves non-custom requests unchanged", async () => {
    const body = {
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: "https://nolo.chat/api/v1/db/file/content/01IMAGE" },
            },
          ],
        },
      ],
    };

    const result = await inlineImageUrlsForCustomProvider(body, {
      shouldInline: false,
      fetchImage: async () => {
        throw new Error("should not fetch");
      },
    });

    expect(result).toBe(body);
  });

  it("does not inline existing data URLs or unrelated image URLs", async () => {
    const body = {
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: "data:image/png;base64,QUJD" },
            },
            {
              type: "image_url",
              image_url: { url: "https://example.com/image.png" },
            },
          ],
        },
      ],
    };

    const result = await inlineImageUrlsForCustomProvider(body, {
      shouldInline: true,
      fetchImage: async () => {
        throw new Error("should not fetch");
      },
    });

    expect(result).toBe(body);
  });
});

describe("shouldInlineImageUrlsForAgent", () => {
  it("enables inlining for custom providers, nolo/Ollama, and OpenRouter MiniMax M3", () => {
    expect(shouldInlineImageUrlsForAgent({ provider: "custom" })).toBe(true);
    expect(shouldInlineImageUrlsForAgent({ apiSource: "custom" })).toBe(true);
    expect(shouldInlineImageUrlsForAgent({ provider: "nolo" })).toBe(true);
    // Legacy records use "ollama-cloud"; "nolo-hosted" is retired.
    expect(shouldInlineImageUrlsForAgent({ provider: "ollama-cloud" })).toBe(
      true,
    );
    expect(
      shouldInlineImageUrlsForAgent({
        provider: "openrouter",
        model: "minimax/minimax-m3",
      }),
    ).toBe(true);
    expect(shouldInlineImageUrlsForAgent({ provider: "openai" })).toBe(false);
    expect(
      shouldInlineImageUrlsForAgent({
        provider: "openrouter",
        model: "x-ai/grok-4.3",
      }),
    ).toBe(false);
  });
});
