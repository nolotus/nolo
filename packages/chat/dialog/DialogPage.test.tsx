import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";
import { fileURLToPath } from "node:url";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  patchMessageSession,
  resetMessageSessionStoreForTests,
} from "chat/messages/messageSessionStore";
import {
  clearDialogConfigError,
  resetDialogRuntimeStoreForTests,
  setActiveDialogKey,
  setDialogConfigError,
} from "chat/dialog/dialogRuntimeStore";

const ensureGlobalElementForPrism = () => {
  const globalWithDom = globalThis as typeof globalThis & {
    Element?: typeof Element;
    HTMLElement?: typeof HTMLElement;
  };
  if (typeof globalWithDom.Element === "undefined") {
    class TestElement {}
    (TestElement as unknown as { prototype: { matches?: () => boolean } })
      .prototype.matches = () => false;
    globalWithDom.Element = TestElement as unknown as typeof Element;
  }
  if (typeof globalWithDom.HTMLElement === "undefined") {
    globalWithDom.HTMLElement = globalWithDom.Element as unknown as typeof HTMLElement;
  }
};

ensureGlobalElementForPrism();

type MockState = {
  auth: {
    currentUser: { userId: string } | null;
    currentToken: string | null;
  };
  settings: {
    currentServer: string;
  };
  dialog: {
    currentDialogKey: string | null;
    configError?: string | null;
    currentDialogConfig: {
      dbKey: string;
      title?: string;
      inheritedFromDialogKey?: string;
      inheritedFromDialogTitle?: string;
    } | null;
  };
  message: {
    dialogStateById: Record<
      string,
      {
        msgs: { ids: string[]; entities: Record<string, unknown> };
      }
    >;
  };
  space: {
    memberSpaces: Array<{ spaceId: string }>;
  };
};

const dispatchCalls: unknown[] = [];
let moduleVersion = 0;
let DialogPage: React.ComponentType<{ pageKey: string; routeSpaceId?: string | null }>;
let mockRouteParams: Record<string, string | undefined> = {};
let mockLocationState: unknown = null;
let mockAuthState = {
  user: { userId: "user-1" } as { userId: string } | null,
  isLoggedIn: true,
};
/** When false, bootstrap thunks stay pending until flushPendingBootstrap(). */
let bootstrapSettlesImmediately = true;
const pendingBootstrapResolvers: Array<(value: unknown) => void> = [];
const ensureDialogSpaceActionCalls: Array<{
  pageKey: string;
  routeSpaceId: string | null | undefined;
}> = [];

const flushPendingBootstrap = async () => {
  const resolvers = pendingBootstrapResolvers.splice(0, pendingBootstrapResolvers.length);
  for (const resolve of resolvers) {
    resolve({ ok: true });
  }
  await Promise.resolve();
};

const createMessageBucket = (
  overrides: Partial<MockState["message"]["dialogStateById"][string]> = {}
) => ({
  msgs: { ids: [], entities: {} },
  ...overrides,
});

const createMockMessageState = (): MockState["message"] => ({
  dialogStateById: {
    global: createMessageBucket(),
  },
});

let mockState: MockState = {
  auth: {
    currentUser: { userId: "user-1" },
    currentToken: "token-1",
  },
  settings: {
    currentServer: "http://localhost",
  },
  dialog: {
    currentDialogKey: null,
    configError: null,
    currentDialogConfig: null,
  },
  message: createMockMessageState(),
  space: {
    memberSpaces: [],
  },
};

const syncDialogRuntimeFromMockState = () => {
  setActiveDialogKey(mockState.dialog.currentDialogKey);
  if (mockState.dialog.configError) {
    setDialogConfigError(mockState.dialog.configError);
  } else {
    clearDialogConfigError();
  }
};

const dialogSlicePath = fileURLToPath(new URL("./dialogSlice.ts", import.meta.url));
const editorPath = fileURLToPath(new URL("../../create/editor/Editor.tsx", import.meta.url));
const syntaxHighlightingPath = fileURLToPath(
  new URL("../../create/editor/syntaxHighlighting.tsx", import.meta.url)
);
const loadDialogPage = async () => {
  ensureGlobalElementForPrism();
  const editorMock = {
    default: () => <div data-testid="editor" />,
  };
  const prismMock = {
    default: {
      languages: {},
      tokenize: () => [],
    },
    languages: {},
    tokenize: () => [],
  };
  const syntaxHighlightingMock = {
    useDecorate: () => () => [],
    SetNodeToDecorations: () => null,
  };
  mock.module("prismjs", () => prismMock);
  for (const component of [
    "javascript",
    "jsx",
    "typescript",
    "tsx",
    "json",
    "yaml",
    "python",
    "markup-templating",
    "php",
    "sql",
    "java",
    "markdown",
    "diff",
    "mermaid",
  ]) {
    mock.module(`prismjs/components/prism-${component}`, () => ({}));
  }
  mock.module("create/editor/Editor", () => editorMock);
  mock.module(editorPath, () => editorMock);
  mock.module("create/editor/syntaxHighlighting", () => syntaxHighlightingMock);
  mock.module(syntaxHighlightingPath, () => syntaxHighlightingMock);

  const actualDialogSlice = await import(`${dialogSlicePath}?actual=${moduleVersion}`);
  const actualReactRouterDom = await import("app/routing");
  const actualReactI18Next = await import("react-i18next");

  // Stable dispatch identity — DialogPage bootstrap effect depends on dispatch;
  // a new function every render would re-fire the effect → setState loop.
  const stableDispatch = (action: unknown) => {
    dispatchCalls.push(action);
    return {
      abort() {},
      unwrap: () => {
        if (bootstrapSettlesImmediately) {
          return Promise.resolve(action);
        }
        return new Promise((resolve) => {
          pendingBootstrapResolvers.push(resolve);
        });
      },
    };
  };
  mock.module("app/store", () => ({
    useAppDispatch: () => stableDispatch,
    useAppSelector: (selector: (state: MockState) => unknown) => selector(mockState),
  }));

  mock.module("identity", () => ({
    useIdentity: () => ({
      currentUser: mockAuthState.user,
      userId: mockAuthState.user?.userId,
      isLoggedIn: mockAuthState.isLoggedIn,
      isInitialized: true,
      token: "token-1",
    }),
    useUserId: () => mockAuthState.user?.userId,
    useCurrentUser: () => mockAuthState.user,
    useIsLoggedIn: () => mockAuthState.isLoggedIn,
    useToken: () => "token-1",
    useCouldEdit: () => false,
  }));

  mock.module("react-i18next", () => ({
    ...actualReactI18Next,
    useTranslation: () => ({
      t: (
        key: string,
        defaultValueOrOptions?: string | Record<string, unknown>,
        maybeOptions?: Record<string, unknown>
      ) => {
        if (typeof defaultValueOrOptions === "string") {
          const title = typeof maybeOptions?.title === "string"
            ? maybeOptions.title
            : "";
          return defaultValueOrOptions.replace("{{title}}", title);
        }

        return key;
      },
    }),
  }));

  mock.module("app/routing", () => ({
    ...actualReactRouterDom,
    useLocation: () => ({
      state: mockLocationState,
      search: "",
    }),
    useNavigate: () => () => undefined,
    useParams: () => mockRouteParams,
    Link: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => <a {...props}>{children}</a>,
    NavLink: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => <a {...props}>{children}</a>,
  }));

  // Keep dialogRuntimeStore re-exports real (Bun mock live-bindings poison the
  // store). Tests sync key/error via syncDialogRuntimeFromMockState().
  mock.module("chat/dialog/dialogSlice", () => ({
    ...actualDialogSlice,
    selectCurrentDialogConfig: () => mockState.dialog.currentDialogConfig,
  }));
  mock.module(dialogSlicePath, () => ({
    ...actualDialogSlice,
    selectCurrentDialogConfig: () => mockState.dialog.currentDialogConfig,
  }));
  mock.module("chat/dialog/useCurrentDialogConfig", () => ({
    useCurrentDialogConfig: () => mockState.dialog.currentDialogConfig,
  }));

  mock.module("chat/web/ChatArea", () => ({
    ChatArea: ({ dialogId }: { dialogId: string }) => (
      <div data-testid="chat-area">{dialogId}</div>
    ),
  }));

  mock.module("./ensureDialogSpaceAction", () => ({
    ensureDialogSpaceAction: (pageKey: string, routeSpaceId?: string | null) => {
      ensureDialogSpaceActionCalls.push({ pageKey, routeSpaceId });
      return {
        kind: "ensureDialogSpaceAction",
        pageKey,
        routeSpaceId,
      };
    },
  }));

  mock.module("render/web/ui/PageLoading", () => ({
    default: ({ message }: { message?: string }) => (
      <div data-testid="page-loading">{message ?? "loading"}</div>
    ),
  }));

  mock.module("render/web/ui/GuestGuide", () => ({
    default: ({
      title,
      description,
    }: {
      title?: string;
      description?: string;
    }) => (
      <div data-testid="guest-guide">
        <h2>{title ?? "guest-title"}</h2>
        <p>{description ?? "guest-description"}</p>
      </div>
    ),
  }));

  mock.module("chat/dialog/hooks/useStreamingSymbol", () => ({
    useStreamingSymbol: () => null,
  }));

  // The observer panel polls agent threads over the network; these tests only
  // exercise DialogPage loading states, so stub it out.
  mock.module("./ChildRunObserverPanel", () => ({
    ChildRunObserverPanel: () => null,
  }));
  mock.module("chat/dialog/ChildRunObserverPanel", () => ({
    ChildRunObserverPanel: () => null,
  }));

  const module = await import(`./DialogPage.tsx?test=${moduleVersion++}`);
  return module.default;
};

describe("DialogPage loading state", () => {
  let dom: JSDOM;
  let root: Root;
  let container: HTMLDivElement;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;
  let previousNavigator: typeof globalThis.navigator | undefined;
  let previousElement: typeof globalThis.Element | undefined;
  let previousHTMLElement: typeof globalThis.HTMLElement | undefined;
  let previousLocalStorageDesc: PropertyDescriptor | undefined;

  beforeEach(async () => {
    dispatchCalls.length = 0;
    ensureDialogSpaceActionCalls.length = 0;
    bootstrapSettlesImmediately = true;
    pendingBootstrapResolvers.length = 0;
    mockRouteParams = {};
    mockLocationState = null;
    mockAuthState = {
      user: { userId: "user-1" },
      isLoggedIn: true,
    };
    resetMessageSessionStoreForTests();
    resetDialogRuntimeStoreForTests();
    mockState = {
      auth: {
        currentUser: { userId: "user-1" },
        currentToken: "token-1",
      },
      settings: {
        currentServer: "http://localhost",
      },
      dialog: {
        currentDialogKey: null,
        configError: null,
        currentDialogConfig: null,
      },
      message: createMockMessageState(),
      space: {
        memberSpaces: [],
      },
    };
    syncDialogRuntimeFromMockState();

    dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
      url: "http://localhost",
    });

    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousNavigator = globalThis.navigator;
    previousElement = globalThis.Element;
    previousHTMLElement = globalThis.HTMLElement;
    previousLocalStorageDesc = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
      Element: dom.window.Element,
      HTMLElement: dom.window.HTMLElement,
      // Suite isolation: prior tests may leave window set without a bare localStorage
      // binding; module-level `localStorage.getItem` (e.g. useUserData debugPerf) needs it.
      localStorage: dom.window.localStorage,
    });

    DialogPage = await loadDialogPage();

    container = dom.window.document.getElementById("root") as HTMLDivElement;
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      navigator: previousNavigator,
      Element: previousElement,
      HTMLElement: previousHTMLElement,
    });
    if (previousLocalStorageDesc) {
      Object.defineProperty(globalThis, "localStorage", previousLocalStorageDesc);
    } else {
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
  });

  it("keeps showing loading while the selected dialog config is still resolving", async () => {
    bootstrapSettlesImmediately = false;
    mockState.dialog.currentDialogKey = "dialog-user-1";
    syncDialogRuntimeFromMockState();
    mockState.dialog.currentDialogConfig = null;
    mockState.message.dialogStateById["user-1"] = createMessageBucket();
    patchMessageSession("user-1", { isLoadingInitial: false });

    await act(async () => {
      root.render(<DialogPage pageKey="dialog-user-1" />);
    });

    expect(container.textContent).toContain("加载对话数据");
    expect(container.textContent).not.toContain("selectADialog");

    await act(async () => {
      await flushPendingBootstrap();
    });
  });

  it("shows loading on the first render before dialog init starts", async () => {
    bootstrapSettlesImmediately = false;
    mockState.dialog.currentDialogKey = null;
    syncDialogRuntimeFromMockState();
    mockState.dialog.currentDialogConfig = null;
    mockState.message.dialogStateById["user-1"] = createMessageBucket();
    patchMessageSession("user-1", { isLoadingInitial: false });

    await act(async () => {
      root.render(<DialogPage pageKey="dialog-user-1" />);
    });

    expect(container.textContent).toContain("加载对话数据");
    expect(container.textContent).not.toContain("selectADialog");

    await act(async () => {
      await flushPendingBootstrap();
    });
  });

  it("renders a new quick-chat dialog shell while bootstrap is still resolving", async () => {
    mockLocationState = {
      isNew: true,
      quickChatFirstMessage: {
        text: "hello from quick chat",
      },
    };
    mockState.dialog.currentDialogKey = null;
    syncDialogRuntimeFromMockState();
    mockState.dialog.currentDialogConfig = null;
    mockState.message.dialogStateById["user-1"] = createMessageBucket();
    patchMessageSession("user-1", { isLoadingInitial: true });

    await act(async () => {
      root.render(<DialogPage pageKey="dialog-user-1" />);
    });

    expect(container.querySelector('[data-testid="chat-area"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="page-loading"]')).toBeNull();
  });

  it("mounts chat-area while initMsgs is still loading once dialog config is ready (FE-09 TTFI)", async () => {
    mockState.dialog.currentDialogKey = "dialog-user-1";
    syncDialogRuntimeFromMockState();
    mockState.dialog.currentDialogConfig = {
      dbKey: "dialog-user-1",
      title: "Ready config",
    };
    mockState.message.dialogStateById["user-1"] = createMessageBucket();
    patchMessageSession("user-1", { isLoadingInitial: true });

    await act(async () => {
      root.render(<DialogPage pageKey="dialog-user-1" />);
    });

    // Bootstrap effect marks load started; config already present so resolving
    // is false and isLoadingInitial must not keep the full-page spinner.
    await act(async () => {
      root.render(<DialogPage pageKey="dialog-user-1" />);
    });

    expect(container.querySelector('[data-testid="chat-area"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="page-loading"]')).toBeNull();
    expect(container.textContent).not.toContain("加载对话数据");
  });

  it("passes the routed space id into ensureDialogSpaceAction", async () => {
    mockRouteParams = { spaceId: "space-01TEST" };

    await act(async () => {
      root.render(
        <DialogPage
          pageKey="dialog-user-1"
          routeSpaceId="space-01TEST"
        />
      );
    });

    expect(ensureDialogSpaceActionCalls.some((call) =>
      call.pageKey === "dialog-user-1" && call.routeSpaceId === "01TEST"
    )).toBe(true);
  });

  it("shows the empty state when no dialog is selected", async () => {
    mockState.dialog.currentDialogKey = null;
    syncDialogRuntimeFromMockState();
    mockState.dialog.currentDialogConfig = null;
    mockState.message.dialogStateById["user-1"] = createMessageBucket();
    patchMessageSession("user-1", { isLoadingInitial: false });

    await act(async () => {
      root.render(<DialogPage pageKey="" />);
    });

    expect(container.textContent).toContain("selectADialog");
  });

  it("explains that direct dialog routes are private for guests", async () => {
    mockAuthState = {
      user: null,
      isLoggedIn: false,
    };

    await act(async () => {
      root.render(<DialogPage pageKey="dialog-user-1" />);
    });

    await act(async () => {
      root.render(<DialogPage pageKey="dialog-user-1" />);
    });

    expect(container.textContent).toContain("这是私有对话链接");
    expect(container.textContent).toContain("/share/<token>");
  });

  it("shows a persisted inherited-context banner for branched dialogs", async () => {
    mockState.dialog.currentDialogKey = "dialog-user-2";
    syncDialogRuntimeFromMockState();
    mockState.dialog.currentDialogConfig = {
      dbKey: "dialog-user-2",
      title: "Follow-up",
      inheritedFromDialogKey: "dialog-user-1",
      inheritedFromDialogTitle: "Original Chat",
    };
    mockState.message.dialogStateById["user-2"] = createMessageBucket();
    patchMessageSession("user-2", { isLoadingInitial: false });

    await act(async () => {
      root.render(<DialogPage pageKey="dialog-user-2" />);
    });

    await act(async () => {
      root.render(<DialogPage pageKey="dialog-user-2" />);
    });

    expect(container.textContent).toContain(
      "此对话继承自“Original Chat”的上下文"
    );
    expect(container.textContent).toContain("查看原对话");
  });

  it("retries dialog space recovery after member spaces load later", async () => {
    mockState.dialog.currentDialogKey = "dialog-user-1";
    syncDialogRuntimeFromMockState();
    mockState.dialog.currentDialogConfig = null;
    mockState.message.dialogStateById["user-1"] = createMessageBucket();
    patchMessageSession("user-1", { isLoadingInitial: false });
    mockState.space = { memberSpaces: [] };

    await act(async () => {
      root.render(<DialogPage pageKey="dialog-user-1" />);
    });

    const initialCalls = ensureDialogSpaceActionCalls.filter(
      ({ pageKey }) => pageKey === "dialog-user-1"
    ).length;
    expect(initialCalls).toBeGreaterThan(0);

    // Reselect memoizes on root-state identity; replace mockState entirely so
    // selectAllMemberSpaces recomputes and ensureDialogSpace re-runs.
    mockState = {
      ...mockState,
      space: { memberSpaces: [{ spaceId: "demo-space" }] },
    };

    await act(async () => {
      root.render(<DialogPage pageKey="dialog-user-1" />);
    });

    const updatedCalls = ensureDialogSpaceActionCalls.filter(
      ({ pageKey }) => pageKey === "dialog-user-1"
    ).length;
    expect(updatedCalls).toBeGreaterThan(initialCalls);
  });
});
