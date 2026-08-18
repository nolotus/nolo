import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { QuickChatMode } from "./quickChatFlow";

const realReactI18Next = { ...(await import("react-i18next")) };
const realAppStore = { ...(await import("app/store")) };
const realAppHooks = { ...(await import("app/hooks")) };
const realCandidates = {
  ...(await import("chat/hooks/useAgentPickerCandidates")),
};

/** 每个用例可改的 mock 状态：当前选中的自动模式 agent。 */
let mockAutoAgentId = "";
let mockAutoAgent: { name?: string } | undefined;
let mockCandidates: Array<{
  key: string;
  isFavorite: boolean;
  isOwned: boolean;
  isPublic: boolean;
}> = [];

const flush = async () => {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, 0);
  await promise;
};

describe("QuickChatModeSelector", () => {
  let dom: JSDOM;
  let root: Root | null;
  let container: HTMLDivElement;
  let QuickChatModeSelector: React.ComponentType<{
    mode: QuickChatMode;
    onModeChange: (mode: QuickChatMode) => void;
  }>;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;
  let previousNavigator: typeof globalThis.navigator | undefined;
  let previousNodeFilter: unknown;

  beforeEach(async () => {
    mockAutoAgentId = "";
    mockAutoAgent = undefined;
    mockCandidates = [];

    mock.module("react-i18next", () => ({
      ...realReactI18Next,
      useTranslation: () => ({
        t: (key: string, fallback?: string) =>
          typeof fallback === "string" ? fallback : key,
      }),
    }));
    mock.module("chat/hooks/useAgentPickerCandidates", () => ({
      ...realCandidates,
      useAgentPickerCandidates: () => ({
        candidates: mockCandidates,
        loading: false,
      }),
    }));
    mock.module("app/store", () => ({
      ...realAppStore,
      useAppDispatch: () => () => {},
      useAppSelector: (selector: (state: unknown) => unknown) =>
        selector({
          settings: { quickChatAutoAgentId: mockAutoAgentId },
          db: {
            ids: mockAutoAgentId ? [mockAutoAgentId] : [],
            entities: mockAutoAgentId
              ? { [mockAutoAgentId]: { id: mockAutoAgentId, ...mockAutoAgent } }
              : {},
          },
        }),
    }));
    mock.module("app/hooks", () => ({
      ...realAppHooks,
      useFetchData: () => ({
        data: mockAutoAgent,
        error: null,
        isLoading: false,
        reload: async () => {},
      }),
    }));

    const module = await import(`./QuickChatModeSelector.tsx?test=${Date.now()}`);
    QuickChatModeSelector = module.default;

    dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
      url: "http://localhost",
    });

    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousNavigator = globalThis.navigator;
    previousNodeFilter = (globalThis as any).NodeFilter;

    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
      NodeFilter: dom.window.NodeFilter,
    });
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    container = dom.window.document.getElementById("root") as HTMLDivElement;
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    mock.module("react-i18next", () => realReactI18Next);
    mock.module("chat/hooks/useAgentPickerCandidates", () => realCandidates);
    mock.module("app/store", () => realAppStore);
    mock.module("app/hooks", () => realAppHooks);
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      navigator: previousNavigator,
    });
    if (previousNodeFilter === undefined) {
      delete (globalThis as any).NodeFilter;
    } else {
      (globalThis as any).NodeFilter = previousNodeFilter;
    }
  });

  const openMenu = async () => {
    const trigger = container.querySelector(
      ".agent-picker__trigger",
    ) as HTMLButtonElement;
    await act(async () => {
      trigger.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true }),
      );
      await flush();
    });
    return trigger;
  };

  it("renders the shared agent picker trigger and opens the popover", async () => {
    const onModeChange = mock(() => {});

    await act(async () => {
      root!.render(
        <QuickChatModeSelector
          mode={{ mode: "auto" }}
          onModeChange={onModeChange}
        />,
      );
      await flush();
    });

    const trigger = container.querySelector(
      ".agent-picker__trigger",
    ) as HTMLButtonElement | null;
    expect(trigger).not.toBeNull();
    expect(trigger?.textContent).toContain("自动");
    expect(trigger?.getAttribute("aria-label")).toBe("选择对话模式：自动");
    expect(
      container.querySelector(".quick-chat-mode-selector")?.getAttribute("data-mode"),
    ).toBe("auto");

    expect(dom.window.document.querySelector(".app-popover")).toBeNull();

    await openMenu();

    const popover = dom.window.document.querySelector(
      ".app-popover.agent-picker__popover",
    );
    expect(popover).not.toBeNull();
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(
      dom.window.document.querySelector(".agent-picker__list"),
    ).not.toBeNull();
  });

  it("shows the selected favorite agent name on the trigger", async () => {
    mockAutoAgentId = "agent-fav-1";
    mockAutoAgent = { name: "Kimi K3" };
    mockCandidates = [
      {
        key: "agent-fav-1",
        isFavorite: true,
        isOwned: false,
        isPublic: true,
      },
    ];
    const onModeChange = mock(() => {});

    await act(async () => {
      root!.render(
        <QuickChatModeSelector
          mode={{ mode: "auto" }}
          onModeChange={onModeChange}
        />,
      );
      await flush();
    });

    const trigger = container.querySelector(
      ".agent-picker__trigger",
    ) as HTMLButtonElement | null;
    expect(trigger?.textContent).toContain("Kimi K3");
    expect(trigger?.textContent).not.toContain("自动");
    expect(trigger?.getAttribute("aria-label")).toBe("切换助手：Kimi K3");
    expect(
      container
        .querySelector(".quick-chat-mode-selector")
        ?.getAttribute("data-auto-agent"),
    ).toBe("true");
  });

  it("falls back to the auto label while the agent name is still loading", async () => {
    mockAutoAgentId = "agent-fav-1";
    mockAutoAgent = undefined;
    mockCandidates = [
      {
        key: "agent-fav-1",
        isFavorite: true,
        isOwned: false,
        isPublic: false,
      },
    ];
    const onModeChange = mock(() => {});

    await act(async () => {
      root!.render(
        <QuickChatModeSelector
          mode={{ mode: "auto" }}
          onModeChange={onModeChange}
        />,
      );
      await flush();
    });

    const trigger = container.querySelector(
      ".agent-picker__trigger",
    ) as HTMLButtonElement | null;
    expect(trigger?.textContent).toContain("自动");
    expect(trigger?.textContent).not.toContain("agent-fav-1");
  });
});
