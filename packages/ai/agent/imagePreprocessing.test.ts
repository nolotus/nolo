// packages/ai/agent/imagePreprocessing.test.ts
import { describe, it, expect, vi } from "bun:test";
import {
  extractImageUrlsFromMessages,
  hasImageInRuntimeMessages,
  preprocessImagesForTextOnlyAgent,
  type DescribeImageFn,
} from "./imagePreprocessing";
import type { AgentRuntimeChatMessage } from "../../agent-runtime/types";

// Helper: 构造一条含 text + image_url 的消息
function makeMsg(role: AgentRuntimeChatMessage["role"], content: AgentRuntimeChatMessage["content"]): AgentRuntimeChatMessage {
  return { role, content };
}

const IMG1 = "data:image/png;base64,aaa";
const IMG2 = "data:image/png;base64,bbb";

describe("extractImageUrlsFromMessages", () => {
  it("returns empty for text-only messages", () => {
    const msgs = [makeMsg("user", [{ type: "text", text: "hello" }])];
    expect(extractImageUrlsFromMessages(msgs)).toEqual([]);
  });

  it("extracts single image url", () => {
    const msgs = [makeMsg("user", [
      { type: "text", text: "look at this" },
      { type: "image_url", image_url: { url: IMG1 } },
    ])];
    expect(extractImageUrlsFromMessages(msgs)).toEqual([IMG1]);
  });

  it("extracts multiple urls across messages", () => {
    const msgs = [
      makeMsg("user", [{ type: "image_url", image_url: { url: IMG1 } }]),
      makeMsg("assistant", [{ type: "text", text: "ok" }]),
      makeMsg("user", [{ type: "image_url", image_url: { url: IMG2 } }]),
    ];
    expect(extractImageUrlsFromMessages(msgs)).toEqual([IMG1, IMG2]);
  });

  it("skips empty url strings", () => {
    const msgs = [makeMsg("user", [
      { type: "image_url", image_url: { url: "  " } },
      { type: "image_url", image_url: { url: IMG1 } },
    ])];
    expect(extractImageUrlsFromMessages(msgs)).toEqual([IMG1]);
  });

  it("handles string content (no images)", () => {
    const msgs = [makeMsg("user", "just text")];
    expect(extractImageUrlsFromMessages(msgs)).toEqual([]);
  });

  it("handles null content", () => {
    const msgs = [makeMsg("user", null)];
    expect(extractImageUrlsFromMessages(msgs)).toEqual([]);
  });
});

describe("hasImageInRuntimeMessages", () => {
  it("returns false for text-only", () => {
    expect(hasImageInRuntimeMessages([makeMsg("user", "hello")])).toBe(false);
  });

  it("returns true when image_url present", () => {
    expect(hasImageInRuntimeMessages([
      makeMsg("user", [{ type: "image_url", image_url: { url: IMG1 } }]),
    ])).toBe(true);
  });
});

describe("preprocessImagesForTextOnlyAgent", () => {
  it("returns original messages when no images", async () => {
    const msgs = [makeMsg("user", [{ type: "text", text: "hello" }])];
    const describe: DescribeImageFn = vi.fn();
    const result = await preprocessImagesForTextOnlyAgent(msgs, describe);
    expect(result).toBe(msgs);
    expect(describe).not.toHaveBeenCalled();
  });

  it("replaces image_url with text description on success", async () => {
    const msgs = [makeMsg("user", [
      { type: "text", text: "what is this?" },
      { type: "image_url", image_url: { url: IMG1 } },
    ])];
    const describe: DescribeImageFn = vi.fn().mockResolvedValue("A cat sitting on a chair");
    const result = await preprocessImagesForTextOnlyAgent(msgs, describe);

    expect(result).not.toBe(msgs);
    expect(Array.isArray(result[0].content)).toBe(true);
    const content = result[0].content as any[];
    expect(content).toHaveLength(2);
    expect(content[0]).toEqual({ type: "text", text: "what is this?" });
    expect(content[1]).toEqual({ type: "text", text: "[图片描述] A cat sitting on a chair" });
  });

  it("returns original messages when describeImage returns null", async () => {
    const msgs = [makeMsg("user", [
      { type: "image_url", image_url: { url: IMG1 } },
    ])];
    const describe: DescribeImageFn = vi.fn().mockResolvedValue(null);
    const result = await preprocessImagesForTextOnlyAgent(msgs, describe);
    expect(result).toBe(msgs);
  });

  it("returns original messages when describeImage returns empty string", async () => {
    const msgs = [makeMsg("user", [
      { type: "image_url", image_url: { url: IMG1 } },
    ])];
    const describe: DescribeImageFn = vi.fn().mockResolvedValue("   ");
    const result = await preprocessImagesForTextOnlyAgent(msgs, describe);
    expect(result).toBe(msgs);
  });

  it("replaces multiple images across messages", async () => {
    const msgs = [
      makeMsg("user", [
        { type: "image_url", image_url: { url: IMG1 } },
        { type: "text", text: "and this" },
        { type: "image_url", image_url: { url: IMG2 } },
      ]),
      makeMsg("assistant", [{ type: "text", text: "I see" }]),
    ];
    const describe: DescribeImageFn = vi.fn().mockResolvedValue("Two images: a cat and a dog");
    const result = await preprocessImagesForTextOnlyAgent(msgs, describe);

    const userContent = result[0].content as any[];
    expect(userContent[0]).toEqual({ type: "text", text: "[图片描述] Two images: a cat and a dog" });
    expect(userContent[1]).toEqual({ type: "text", text: "and this" });
    expect(userContent[2]).toEqual({ type: "text", text: "[图片描述] Two images: a cat and a dog" });

    // assistant message unchanged
    expect(result[1]).toBe(msgs[1]);
  });

  it("handles image-only message (no text part)", async () => {
    const msgs = [makeMsg("user", [
      { type: "image_url", image_url: { url: IMG1 } },
    ])];
    const describe: DescribeImageFn = vi.fn().mockResolvedValue("A landscape");
    const result = await preprocessImagesForTextOnlyAgent(msgs, describe);

    const content = result[0].content as any[];
    expect(content).toHaveLength(1);
    expect(content[0]).toEqual({ type: "text", text: "[图片描述] A landscape" });
  });

  it("passes all unique urls to describeImage", async () => {
    const msgs = [
      makeMsg("user", [{ type: "image_url", image_url: { url: IMG1 } }]),
      makeMsg("assistant", [{ type: "text", text: "ok" }]),
      makeMsg("user", [{ type: "image_url", image_url: { url: IMG2 } }]),
    ];
    const describe: DescribeImageFn = vi.fn().mockResolvedValue("description");
    await preprocessImagesForTextOnlyAgent(msgs, describe);
    expect(describe).toHaveBeenCalledWith([IMG1, IMG2]);
  });
});