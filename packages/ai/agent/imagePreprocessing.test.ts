// packages/ai/agent/imagePreprocessing.test.ts
//
// 只覆盖保留的「图片输入剥离兜底」行为；qwen 视觉描述管道已删除。
import { describe, it, expect } from "bun:test";
import {
  extractImageUrlsFromMessages,
  hasImageInRuntimeMessages,
  stripImagePartsFromContent,
  stripImagePartsFromMessages,
  stripImagePartsForTextOnlyAgent,
  IMAGE_OMITTED_PLACEHOLDER,
} from "./imagePreprocessing";
import type { AgentRuntimeChatMessage } from "../../agent-runtime/types";

function makeMsg(
  role: AgentRuntimeChatMessage["role"],
  content: AgentRuntimeMessageContentLike,
): AgentRuntimeChatMessage {
  return { role, content: content as AgentRuntimeChatMessage["content"] };
}

type AgentRuntimeMessageContentLike = unknown;

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

  it("handles string content (no images)", () => {
    const msgs = [makeMsg("user", "just text")];
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

describe("stripImagePartsFromContent", () => {
  it("keeps text and drops image_url parts", () => {
    const out = stripImagePartsFromContent([
      { type: "text", text: "hi" },
      { type: "image_url", image_url: { url: IMG1 } },
    ] as any);
    expect(out).toEqual([{ type: "text", text: "hi" }]);
  });

  it("returns placeholder when only images remain", () => {
    const out = stripImagePartsFromContent([
      { type: "image_url", image_url: { url: IMG1 } },
    ] as any);
    expect(out).toBe(IMAGE_OMITTED_PLACEHOLDER);
  });
});

describe("stripImagePartsFromMessages", () => {
  it("strips image parts from all messages", () => {
    const msgs = [makeMsg("user", [
      { type: "text", text: "hi" },
      { type: "image_url", image_url: { url: IMG1 } },
    ])];
    const out = stripImagePartsFromMessages(msgs);
    expect(out[0].content).toEqual([{ type: "text", text: "hi" }]);
  });
});

describe("stripImagePartsForTextOnlyAgent", () => {
  it("does not modify messages if agent has vision support", async () => {
    const msgs = [
      { id: "1", role: "user", content: [{ type: "image_url", image_url: { url: IMG1 } }] },
    ] as unknown as AgentRuntimeChatMessage[];
    const res = await stripImagePartsForTextOnlyAgent(
      msgs,
      { hasVision: true, model: "gemini-3.7-flash" },
    );
    expect(res.messages).toBe(msgs);
  });

  it("gracefully strips image parts when offline or without auth token", async () => {
    const msgs = [
      { id: "1", role: "user", content: [{ type: "image_url", image_url: { url: IMG1 } }] },
    ] as unknown as AgentRuntimeChatMessage[];
    const res = await stripImagePartsForTextOnlyAgent(
      msgs,
      { hasVision: false, model: "deepseek-chat" },
    );
    expect(res.messages[0].content).toBe(IMAGE_OMITTED_PLACEHOLDER);
  });
});
