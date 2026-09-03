import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";

import { useThinkingVisibility } from "./useThinkingVisibility";

type Snapshot = readonly [boolean, () => void, number | null];

interface ProbeProps {
  isStreaming: boolean;
  content: any;
  think: string;
  messageId?: string;
}

describe("useThinkingVisibility", () => {
  let dom: JSDOM;
  let root: Root | null;
  let container: HTMLDivElement;
  let latest: Snapshot | null;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;
  let previousActEnvironment: boolean | undefined;

  const HookProbe = (props: ProbeProps) => {
    latest = useThinkingVisibility(
      props.isStreaming,
      props.content,
      props.think,
      props.messageId
    );
    return null;
  };

  const renderProbe = (props: ProbeProps) => {
    act(() => {
      root!.render(<HookProbe {...props} />);
    });
  };

  beforeEach(async () => {
    latest = null;
    dom = new JSDOM(
      "<!doctype html><html><body><div id='root'></div></body></html>",
      { url: "http://localhost" }
    );
    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousActEnvironment = (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;

    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
    });
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    container = dom.window.document.getElementById("root") as HTMLDivElement;
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root!.unmount();
      });
      root = null;
    }
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
    });
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  const flush = async (ms: number) => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, ms));
    });
  };

  it("思考中（isStreaming + think 内容、正文未开始）默认展开", () => {
    renderProbe({ isStreaming: true, content: null, think: "" });
    expect(latest![0]).toBe(false); // 还没有 think 内容时不展开

    renderProbe({ isStreaming: true, content: null, think: "先分析一下" });
    expect(latest![0]).toBe(true);
  });

  it("正文到达后延迟自动折叠", async () => {
    renderProbe({ isStreaming: true, content: null, think: "推理中" });
    expect(latest![0]).toBe(true);

    renderProbe({ isStreaming: true, content: "正文", think: "推理中" });
    expect(latest![0]).toBe(true); // 400ms 宽限期内仍展开

    await flush(450);
    expect(latest![0]).toBe(false);
    expect(latest![2]).toBeGreaterThanOrEqual(1); // elapsed 已结算
  });

  it("手动 toggle 后自动行为不再覆盖用户选择", async () => {
    renderProbe({ isStreaming: true, content: null, think: "推理中" });
    expect(latest![0]).toBe(true);

    act(() => {
      latest![1](); // 手动折叠
    });
    expect(latest![0]).toBe(false);

    await flush(450);
    expect(latest![0]).toBe(false); // 仍保持用户折叠，不被再次展开
  });

  it("历史消息（非流式）不展开、elapsed 为空", () => {
    renderProbe({
      isStreaming: false,
      content: "正文",
      think: "历史思考",
      messageId: "m-history-1",
    });
    expect(latest![0]).toBe(false);
    expect(latest![2]).toBe(null);
  });
});
