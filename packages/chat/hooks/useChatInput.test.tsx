import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

type UseChatInput = typeof import("./useChatInput").useChatInput;
type HookSnapshot = ReturnType<UseChatInput>;

const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe("useChatInput", () => {
  let moduleVersion = 0;
  let dom: JSDOM;
  let root: Root | null;
  let container: HTMLDivElement;
  let latest: HookSnapshot | null;
  let useChatInputHook: UseChatInput;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;
  let previousNavigator: typeof globalThis.navigator | undefined;
  let previousUrl: typeof globalThis.URL | undefined;
  let previousWindowUrl: typeof globalThis.URL | undefined;
  let previousActEnvironment: boolean | undefined;
  const createObjectUrlMock = mock(() => "blob:preview-1");
  const revokeObjectUrlMock = mock(() => undefined);

  const HookProbe = () => {
    latest = useChatInputHook();
    return null;
  };

  beforeEach(async () => {
    latest = null;
    createObjectUrlMock.mockClear();
    revokeObjectUrlMock.mockClear();

    dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
      url: "http://localhost",
    });

    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousNavigator = globalThis.navigator;
    previousUrl = globalThis.URL;
    previousWindowUrl = dom.window.URL;
    previousActEnvironment = (globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    }).IS_REACT_ACT_ENVIRONMENT;
    const MockUrl = class extends dom.window.URL {
      static createObjectURL = createObjectUrlMock;
      static revokeObjectURL = revokeObjectUrlMock;
    };
    dom.window.URL = MockUrl as typeof dom.window.URL;

    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
      URL: MockUrl,
    });
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    container = dom.window.document.getElementById("root") as HTMLDivElement;
    ({ useChatInput: useChatInputHook } = await import(
      `./useChatInput.ts?test=${moduleVersion++}`
    ));
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root!.unmount();
      });
    }

    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      navigator: previousNavigator,
      URL: previousUrl,
    });
    dom.window.URL = previousWindowUrl!;
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    root = null;
    mock.restore();
  });

  it("uses object URLs for image previews and revokes them on cleanup", async () => {
    await act(async () => {
      root!.render(<HookProbe />);
      await flush();
    });

    const file = new File(["image-bytes"], "photo.png", { type: "image/png" });

    await act(async () => {
      latest!.processImages([file]);
      await flush();
    });

    expect(createObjectUrlMock).toHaveBeenCalledWith(file);
    expect(latest?.imgPreviews).toHaveLength(1);
    expect(latest?.imgPreviews[0]?.url).toBe("blob:preview-1");

    await act(async () => {
      latest!.clear();
      await flush();
    });

    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:preview-1");
  });

  it("deduplicates identical files in processImages", async () => {
    await act(async () => {
      root!.render(<HookProbe />);
      await flush();
    });

    const file1 = new File(["image-bytes"], "photo.png", { type: "image/png", lastModified: 1000 });
    const file2 = new File(["image-bytes"], "photo.png", { type: "image/png", lastModified: 1000 });

    await act(async () => {
      latest!.processImages([file1, file2]);
      await flush();
    });

    expect(latest?.imgPreviews).toHaveLength(1);

    // 二次重复调用 processImages 也应跳过
    await act(async () => {
      latest!.processImages([file1]);
      await flush();
    });

    expect(latest?.imgPreviews).toHaveLength(1);
  });
});
