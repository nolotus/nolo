import { describe, expect, it } from "bun:test";
import React from "react";
import { act } from "react";
import { MemoryRouter } from "app/routing";
import { flushDomUpdates, renderInDom } from "../../../testing/domRender";
import { StreamingMessageText } from "./StreamingMessageText";

async function advanceReveal(ms: number, stepMs = 20) {
  let remaining = ms;

  while (remaining > 0) {
    const delay = Math.min(stepMs, remaining);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, delay));
    });

    remaining -= delay;
  }
}

function getVisibleText(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("style").forEach((node) => node.remove());
  return clone.textContent ?? "";
}

async function waitForVisibleText(
  container: HTMLElement,
  expectedText: string,
  timeoutMs = 320
) {
  let elapsed = 0;

  while (elapsed < timeoutMs) {
    if (getVisibleText(container) === expectedText) {
      return;
    }

    await advanceReveal(20);
    elapsed += 20;
  }

  expect(getVisibleText(container)).toBe(expectedText);
}

function renderStreaming(content: string) {
  return renderInDom(
    <MemoryRouter>
      <StreamingMessageText content={content} />
    </MemoryRouter>
  );
}

describe("StreamingMessageText", () => {
  it("softens large streaming updates without stretching them into a long reveal", async () => {
    const content =
      "这是一段一次性到达的大 chunk，用来验证 streaming 文本不会整段直接蹦出来，而是会经过短暂的逐步 reveal。";

    const view = await renderStreaming("");

    try {
      await view.rerender(
        <MemoryRouter>
          <StreamingMessageText content={content} />
        </MemoryRouter>
      );
      await advanceReveal(40);

      const intermediateText = getVisibleText(view.container);
      expect(intermediateText.length).toBeGreaterThan(0);
      expect(intermediateText.length).toBeLessThan(content.length);

      await waitForVisibleText(view.container, content, 2_000);
    } finally {
      await view.cleanup();
    }
  });

  it("reveals small appended chunks progressively", async () => {
    const view = await renderStreaming("你好");

    try {
      await view.rerender(
        <MemoryRouter>
          <StreamingMessageText content="你好，世界" />
        </MemoryRouter>
      );
      await advanceReveal(40);

      expect(getVisibleText(view.container).length).toBeLessThan("你好，世界".length);
      await waitForVisibleText(view.container, "你好，世界", 500);
    } finally {
      await view.cleanup();
    }
  });

  it("renders common markdown structures during streaming instead of leaving them as raw markdown", async () => {
    const content = [
      "# 标题",
      "",
      "- 列表项",
      "",
      "> 引用内容",
      "",
      "```ts",
      "const value = 1;",
      "```",
    ].join("\n");

    const view = await renderStreaming(content);

    try {
      await waitForVisibleText(view.container, "标题列表项引用内容const value = 1;", 2_000);

      expect(view.container.querySelector("h1")).not.toBeNull();
      expect(view.container.querySelector("ul")).not.toBeNull();
      expect(view.container.querySelector("blockquote")).not.toBeNull();
      expect(view.container.querySelector("pre")).not.toBeNull();
      expect(getVisibleText(view.container)).not.toContain("# 标题");
      expect(getVisibleText(view.container)).not.toContain("- 列表项");
      expect(getVisibleText(view.container)).not.toContain("> 引用内容");
      expect(getVisibleText(view.container)).not.toContain("```ts");
    } finally {
      await view.cleanup();
    }
  });

  it("renders inline markdown styling during streaming instead of raw markers", async () => {
    const content = "这里有 **加粗**、`内联代码` 和 [链接](/demo)。";

    const view = await renderStreaming(content);

    try {
      await waitForVisibleText(view.container, "这里有 加粗、内联代码 和 链接。", 1_000);

      expect(view.container.querySelector("strong")).not.toBeNull();
      expect(view.container.querySelector("code")).not.toBeNull();
      expect(view.container.querySelector("a")).not.toBeNull();
      expect(getVisibleText(view.container)).not.toContain("**加粗**");
      expect(getVisibleText(view.container)).not.toContain("`内联代码`");
      expect(getVisibleText(view.container)).not.toContain("[链接](/demo)");
    } finally {
      await view.cleanup();
    }
  });

  it("treats inline-only markdown as structured content during streaming", async () => {
    const content = "这里只有 **加粗** 和 `内联代码`。";

    const view = await renderStreaming(content);

    try {
      await waitForVisibleText(view.container, "这里只有 加粗 和 内联代码。", 1_000);

      expect(view.container.querySelector("strong")).not.toBeNull();
      expect(view.container.querySelector("code")).not.toBeNull();
      expect(getVisibleText(view.container)).not.toContain("**加粗**");
      expect(getVisibleText(view.container)).not.toContain("`内联代码`");
    } finally {
      await view.cleanup();
    }
  });
});
