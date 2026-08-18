import { afterEach, describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "app/routing";

import { MessageText } from "./MessageText";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// 含完整 ```tsx preview 代码块的示例内容，用于回归「流结束后预览不消失」。
const TSX_PREVIEW_CONTENT = [
  "已生成页面：",
  "",
  "```tsx preview",
  "function Example() {",
  "  const [tab, setTab] = useState('about');",
  "  return <div data-artifact-section>hello</div>;",
  "}",
  "```",
  "",
  "可以告诉我调整哪里。",
].join("\n");

describe("MessageText", () => {
  let root: Root | null = null;
  let dom: JSDOM | null = null;

  function setup() {
    dom = new JSDOM("<!doctype html><div id='root'></div>", {
      url: "http://127.0.0.1/",
    });
    (globalThis as any).window = dom.window;
    (globalThis as any).document = dom.window.document;
    (globalThis as any).Element = dom.window.Element;
    (globalThis as any).HTMLElement = dom.window.HTMLElement;
    (globalThis as any).SVGElement = dom.window.SVGElement;

    const container = dom.window.document.getElementById("root");
    if (!container) throw new Error("missing root");
    root = createRoot(container);
    return container;
  }

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    root = null;
    dom?.window.close();
    dom = null;
    delete (globalThis as any).window;
    delete (globalThis as any).document;
    delete (globalThis as any).HTMLElement;
    delete (globalThis as any).SVGElement;
  });

  it("renders assistant markdown without injecting editor style text into the message", () => {
    const container = setup();

    const content = [
      "已完成分析。",
      "",
      "| 国家 | 增长率 |",
      "| --- | ---: |",
      "| India | 300% |",
      "",
      "可视化：",
      "India ****** 300%",
    ].join("\n");

    act(() => {
      root?.render(
        <MemoryRouter>
          <MessageText content={content} role="other" />
        </MemoryRouter>
      );
    });

    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelector("style")).toBeNull();
    expect(container.textContent).toContain("India");
    expect(container.textContent).toContain("300%");
    expect(container.textContent).not.toContain("okaidia theme");
    expect(container.textContent).not.toContain(".nolo-editor-container");
  });

  // 回归：流结束后（isStreaming=false）若 content 里含 ```tsx preview 代码块，
  // 仍应走 StreamingInlineReactArtifact 渲染预览，而不是把代码块当普通 markdown 显示。
  // 此前根因：MessageText 只在 isStreaming=true 时调 StreamingInlineReactArtifact，
  // 流结束切到 StreamingStructuredMarkdown / simple-text，tsx preview 预览消失。
  it("keeps rendering the inline artifact preview after streaming ends when content has a tsx preview block", () => {
    const container = setup();

    act(() => {
      root?.render(
        <MemoryRouter>
          <MessageText
            content={TSX_PREVIEW_CONTENT}
            role="other"
            isStreaming={false}
          />
        </MemoryRouter>
      );
    });

    // StreamingInlineReactArtifact 把代码块抽走。jsdom 下 lazy iframe 走 Suspense
    // fallback，显示 "正在生成预览…"。visibleText 在非流式下应静态渲染（不走
    // useStreamingReveal 的逐字吐字），立即可见，且源码不泄漏。
    expect(container.textContent).toContain("正在生成预览…");
    expect(container.textContent).toContain("已生成页面：");
    expect(container.textContent).toContain("可以告诉我调整哪里。");
    expect(container.textContent).not.toContain("function Example");
    expect(container.textContent).not.toContain("data-artifact-section");
  });

  // 反向：普通 markdown（无 tsx preview）在非流式下不应误判为 artifact，
  // 仍走 StreamingStructuredMarkdown / simple-text，保留 table 渲染。
  it("does not treat plain markdown without tsx preview as an inline artifact", () => {
    const container = setup();

    const plain = [
      "已完成分析。",
      "",
      "| 国家 | 增长率 |",
      "| --- | ---: |",
      "| India | 300% |",
    ].join("\n");

    act(() => {
      root?.render(
        <MemoryRouter>
          <MessageText content={plain} role="other" isStreaming={false} />
        </MemoryRouter>
      );
    });

    expect(container.querySelector("table")).not.toBeNull();
    expect(container.textContent).toContain("India");
  });

  // 回归：流式输出中（isStreaming=true）即使还没出现 tsx preview 块，也必须走
  // StreamingInlineReactArtifact（而非 InlineArtifactVisibleText）。否则当流式内容
  // 后续出现 preview 块时 hasInlineArtifact 由 false→true，组件类型从
  // InlineArtifactVisibleText 切到 StreamingInlineReactArtifact，React unmount 旧组件，
  // useStreamingReveal 状态丢失，已输出文字瞬间缩回并从头重播打字机。
  it("uses StreamingInlineReactArtifact throughout streaming even before a preview block appears", () => {
    const container = setup();
    const streamingNoArtifact = "正在生成页面，稍等…";
    act(() => {
      root?.render(
        <MemoryRouter>
          <MessageText
            content={streamingNoArtifact}
            role="other"
            isStreaming={true}
          />
        </MemoryRouter>
      );
    });
    // StreamingInlineReactArtifact 的外层容器 class，证明走了稳定分支。
    // textContent 为空是正常的：useStreamingReveal 初始 visibleContent="" ，
    // 需 12ms 定时器才吐字，同步 act 后还看不到文字——但组件类型已稳定。
    expect(container.querySelector(".streaming-inline-artifact")).not.toBeNull();
  });
});
