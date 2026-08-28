import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

// Snapshot named exports before mock.module (namespace objects are live-bound).
// Bun mock.restore() does not clear mock.module — reinstall real surfaces after.
const realAuthSlice = { ...(await import("auth/authSlice")) };
const realDbSlice = { ...(await import("database/dbSlice")) };
const realFavoriteSlice = { ...(await import("app/favorite/favoriteStore")) };
const realStore = { ...(await import("app/store")) };
const realToast = { ...(await import("app/utils/toast")) };
const realAgentPickerCandidates = {
  ...(await import("chat/hooks/useAgentPickerCandidates")),
};

let moduleVersion = 0;
let QuickChat: React.ComponentType<{ isEmptyState?: boolean }>;

const runtimeProps: Array<{ initialText?: string; initialAgentId?: string | null; autoSend?: boolean }> = [];
const dispatchCalls: unknown[] = [];

const restoreLeakedModuleMocks = () => {
  mock.module("auth/authSlice", () => realAuthSlice);
  mock.module("database/dbSlice", () => realDbSlice);
  mock.module("app/favorite/favoriteStore", () => realFavoriteSlice);
  mock.module("app/store", () => realStore);
  mock.module("app/utils/toast", () => realToast);
  mock.module("chat/hooks/useAgentPickerCandidates", () => realAgentPickerCandidates);
};

interface TestState {
  auth: { currentUser: { userId: string } | null };
  settings: { defaultAgentId: string };
  db: { entities: Record<string, unknown> };
  favorite: { initialized: boolean; favoriteIds: string[] };
}

interface TestAction {
  type: string;
  payload?: { dbKey?: string };
}

function isDbRead(action: unknown): action is TestAction {
  if (action === null || typeof action !== "object") return false;
  if (!("type" in action) || action.type !== "db/read") return false;
  if (
    !("payload" in action) ||
    action.payload === null ||
    typeof action.payload !== "object"
  ) {
    return false;
  }
  if (!("dbKey" in action.payload)) return false;
  return action.payload.dbKey === "agent-pub-01NOLOAPPBLD000000019KCKT0";
}

const waitForRuntimeMount = async (container: HTMLDivElement) => {
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    if (container.querySelector('[data-testid="quick-chat-runtime"]')) {
      return;
    }
  }
};

const loadQuickChat = async () => {
  const actualReactI18Next = await import("react-i18next");
  const actualStore = await import("app/store");
  const actualSettingSlice = await import("app/settings/settingSlice");
  const actualRouting = await import("app/routing");

  mock.module("react-i18next", () => ({
    ...actualReactI18Next,
    useTranslation: () => ({
      t: (key: string, fallbackOrOptions?: unknown) => {
        if (typeof fallbackOrOptions === "string") return fallbackOrOptions;
        if (key === "quickChat.defaultAgentName") return "nolo";
        if (key === "quickChat.placeholder") return "Ask nolo";
        if (key === "quickChat.placeholderAuto") return "输入消息，自动匹配最优模型";
        return key;
      },
      i18n: { language: "zh-CN" },
    }),
  }));

  mock.module("./QuickChatRuntime", () => ({
    default: ({
      initialText = "",
      initialAgentId = null,
      autoSend = false,
    }: {
      initialText?: string;
      initialAgentId?: string | null;
      autoSend?: boolean;
    }) => {
      runtimeProps.push({ initialText, initialAgentId, autoSend });
      return <div data-testid="quick-chat-runtime">{initialText}</div>;
    },
  }));

  // Shell/runtime both mount the shared AgentPickerControl path; stub the
  // selector so this suite stays focused on QuickChat activation flow.
  mock.module("./QuickChatModeSelector", () => ({
    default: () => <div data-testid="quick-chat-mode-selector" />,
  }));
  mock.module("chat/hooks/useAgentPickerCandidates", () => ({
    ...realAgentPickerCandidates,
    useAgentPickerCandidates: () => ({ candidates: [], loading: false }),
  }));

  mock.module("app/store", () => ({
    ...actualStore,
    useAppDispatch: () => (action: unknown) => {
      dispatchCalls.push(action);
      return Promise.resolve(action);
    },
    useAppSelector: (selector: (state: TestState) => unknown) =>
      selector({
        auth: { currentUser: { userId: "user-01" } },
        settings: {
          defaultAgentId: "agent-pub-01NOLOAPPBLD000000019KCKT0",
          quickChatAutoAgentId: "",
        },
        db: { entities: {} },
        favorite: { initialized: true, favoriteIds: [] },
      }),
  }));

  mock.module("auth/authSlice", () => ({
    selectUserId: (state: TestState) => state.auth.currentUser?.userId ?? null,
  }));

  mock.module("app/favorite/favoriteStore", () => ({
    useFavoritesInitialized: () => true,
    useFavoriteAgentIds: () => [] as string[],
    useFavoriteDeps: () => ({ token: "mock", servers: [] }),
    initFavorites: async () => {},
  }));

  mock.module("database/dbSlice", () => ({
    read: (payload: unknown) => ({ type: "db/read", payload }),
  }));

  mock.module("app/routing", () => ({
    ...actualRouting,
    useNavigate: () => () => {},
  }));

  mock.module("app/utils/toast", () => ({
    toast: { error: () => {} },
  }));

  const module = await import(`./QuickChat.tsx?test=${moduleVersion++}`);
  // mock.restore() does not clear mock.module; leave hermetic restore to afterEach.
  mock.restore();
  return module.default;
};

describe("QuickChat", () => {
  let dom: JSDOM;
  let root: Root;
  let container: HTMLDivElement;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;
  let previousNavigator: typeof globalThis.navigator | undefined;
  let previousLocalStorage: Storage | undefined;
  let previousLocalStorageDesc: PropertyDescriptor | undefined;
  let previousActEnvironment: boolean | undefined;

  beforeEach(async () => {
    runtimeProps.length = 0;
    dispatchCalls.length = 0;
    QuickChat = await loadQuickChat();

    dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
      url: "http://localhost",
    });

    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousNavigator = globalThis.navigator;
    previousLocalStorage = globalThis.localStorage;
    previousLocalStorageDesc = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    previousActEnvironment = (globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    }).IS_REACT_ACT_ENVIRONMENT;

    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
      // Bare `localStorage` (not only window.localStorage) is read by module-level
      // helpers such as useUserData's debugPerf gate.
      localStorage: dom.window.localStorage,
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
      root.unmount();
    });

    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      navigator: previousNavigator,
    });
    if (previousLocalStorageDesc) {
      Object.defineProperty(globalThis, "localStorage", previousLocalStorageDesc);
    } else if (previousLocalStorage !== undefined) {
      Object.assign(globalThis, { localStorage: previousLocalStorage });
    } else {
      // Avoid leaving a defined-but-undefined binding (ReferenceError → TypeError sticky).
      try {
        delete (globalThis as { localStorage?: Storage }).localStorage;
      } catch {
        Object.defineProperty(globalThis, "localStorage", {
          value: undefined,
          configurable: true,
          writable: true,
        });
      }
    }
    mock.restore();
    restoreLeakedModuleMocks();
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  afterAll(() => {
    restoreLeakedModuleMocks();
  });

  it("stays on the shell before activation", async () => {
    await act(async () => {
      root.render(<QuickChat />);
    });

    expect(container.querySelector('[data-testid="quick-chat-shell"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="quick-chat-input"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="quick-chat-send"]')).not.toBeNull();
    expect(container.querySelector("textarea")?.getAttribute("placeholder")).toBe("输入消息，自动匹配最优模型");
    expect(container.querySelector('[data-testid="quick-chat-runtime"]')).toBeNull();
    expect(runtimeProps).toEqual([]);
    expect(dispatchCalls.some(isDbRead)).toBe(true);
  });

  it("renders empty-state chips and personalization entry", async () => {
    await act(async () => {
      root.render(<QuickChat isEmptyState />);
    });

    expect(container.textContent).toContain("今天一起做什么？");
    expect(container.textContent).toContain("头脑风暴");
    expect(container.textContent).toContain("创建agent");
    expect(container.textContent).toContain("创建应用");
    // 反馈入口已移到侧边栏用户菜单，不再作为 chip 出现。
    expect(container.textContent).not.toContain("我想反馈");
  });

  it("keeps ordinary and empty-state users on the same entry chips", async () => {
    await act(async () => {
      root.render(<QuickChat />);
    });

    expect(container.textContent).toContain("今天一起做什么？");
    expect(container.textContent).toContain("头脑风暴");
    expect(container.textContent).toContain("创建agent");
    expect(container.textContent).toContain("创建应用");
    expect(container.textContent).not.toContain("我想反馈");
  });

  it("routes brainstorm and specialist chips through the Nolo quick chat", async () => {
    await act(async () => {
      root.render(<QuickChat />);
    });

    const buttons = Array.from(container.querySelectorAll(".quick-chat-chip"));
    const brainstormButton = buttons.find((button) =>
      button.textContent?.includes("头脑风暴")
    );
    const createAgentButton = buttons.find((button) =>
      button.textContent?.includes("创建agent")
    );
    expect(brainstormButton).toBeTruthy();
    expect(createAgentButton).toBeTruthy();

    await act(async () => {
      brainstormButton!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, 0);
      await promise;
    });

    expect(runtimeProps.at(-1)!).toEqual({
      initialText: "帮我做一次头脑风暴",
      initialAgentId: null,
      autoSend: true,
    });

    await act(async () => {
      createAgentButton!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, 0);
      await promise;
    });

    expect(runtimeProps.at(-1)!).toEqual({
      initialText: "帮我创建一个Agent",
      initialAgentId: "agent-pub-01NOLOAGENTCRT000000000001",
      autoSend: true,
    });
  });

  it("mounts the runtime after idle preload settles", async () => {
    await act(async () => {
      root.render(<QuickChat />);
    });

    expect(container.querySelector('[data-testid="quick-chat-runtime"]')).toBeNull();

    await waitForRuntimeMount(container);

    expect(container.querySelector('[data-testid="quick-chat-runtime"]')).not.toBeNull();
  });

  it("activates the runtime when the shell send button is clicked", async () => {
    await act(async () => {
      root.render(<QuickChat />);
    });

    const sendButton = container.querySelector('[data-testid="quick-chat-send"]');
    expect(sendButton).not.toBeNull();

    await act(async () => {
      sendButton!.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(runtimeProps.at(-1)!).toEqual({
      initialText: "",
      initialAgentId: null,
      autoSend: false,
    });
  });
});
