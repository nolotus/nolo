import { describe, expect, it, mock } from "bun:test";
import React from "react";

import { renderInDom } from "../../../testing/domRender";

let moduleVersion = 0;

async function loadMessageContent() {
  mock.module("./ThinkingSection", () => ({
    ThinkingSection: () => null,
  }));
  mock.module("./ImagePreview", () => ({
    ImagePreview: () => null,
  }));
  mock.module("./FileItem", () => ({
    FileItem: () => null,
  }));
  mock.module("render/canvas/CanvasSnapshotMessage", () => ({
    default: () => null,
  }));
  mock.module("render/web/ui/modal/DocxPreviewDialog", () => ({
    default: () => null,
  }));
  mock.module("render/web/ui/modal/TablePreviewDialog", () => ({
    default: () => null,
  }));
  mock.module("render/web/ui/modal/ImagePreviewModal", () => ({
    default: () => null,
  }));

  const mod = await import(`./MessageContent?test=${moduleVersion++}`);
  mock.restore();
  return mod.MessageContent;
}

describe("MessageContent empty assistant fallback", () => {
  it("does not duplicate whitespace-only assistant text with the empty fallback", async () => {
    const MessageContent = await loadMessageContent();
    const view = await renderInDom(
      <MessageContent content="   " thinkContent="" role="other" isStreaming={false} />
    );

    try {
      expect(view.getByText("未收到回复内容，请重试。")).toBeTruthy();
      expect(view.container.querySelector(".message-text")).toBeNull();
    } finally {
      await view.cleanup();
    }
  });

  it("renders fallback copy when a finished assistant message has no content", async () => {
    const MessageContent = await loadMessageContent();
    const view = await renderInDom(
      <MessageContent content="" thinkContent="" role="other" isStreaming={false} />
    );

    try {
      expect(view.getByText("未收到回复内容，请重试。")).toBeTruthy();
    } finally {
      await view.cleanup();
    }
  });
});

describe("MessageContent image waiting state", () => {
  it("renders explicit waiting copy for empty streaming image messages", async () => {
    const MessageContent = await loadMessageContent();
    const view = await renderInDom(
      <MessageContent
        content=""
        thinkContent=""
        role="other"
        isStreaming
        imageGenerationState={{
          kind: "image_generation",
          stage: "generating",
          startedAt: Date.now() - 5000,
          waitHint: "通常需要 25-60 秒",
        }}
      />
    );

    try {
      expect(view.getByText("正在生成图片")).toBeTruthy();
      expect(view.getByText("通常需要 25-60 秒")).toBeTruthy();
      expect(view.container.textContent).toContain("已等待");
    } finally {
      await view.cleanup();
    }
  });
});
