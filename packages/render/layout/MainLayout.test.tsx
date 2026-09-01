import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";
import { JSDOM } from "jsdom";
import React, { act, useContext, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";

import RightSidebarContext from "./RightSidebarContext";

// Value-copy snapshot — Bun mock.restore() does not clear mock.module,
// 粘性 mock 会污染同进程后续 suite 文件（create/space 的 runtime 测试等）。
const realSpaceCurrentStore = {
  ...(await import("create/space/spaceCurrentStore")),
};

afterAll(() => {
  mock.module("create/space/spaceCurrentStore", () => realSpaceCurrentStore);
});

type MockState = {
  settings: {
    sidebarWidth: number;
  };
  space: {
    viewMode: "all" | "categories";
  };
};

let moduleVersion = 0;
let MainLayout: React.ComponentType;
let mockState: MockState;
let mockPathname = "/chat";
let mockIsMobile = false;
const dispatchCalls: unknown[] = [];
const setViewModeCalls: string[] = [];

const dispatchPointerEvent = (
  target: EventTarget,
  type: string,
  init: MouseEventInit = {},
) => {
  const event = new window.MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  Object.defineProperty(event, "pointerId", {
    configurable: true,
    value: 1,
  });
  target.dispatchEvent(event);
  return event;
};

const RightSidebarOpener = () => {
  const rightSidebar = useContext(RightSidebarContext);

  useEffect(() => {
    rightSidebar?.open(<div id="right-sidebar-content">Right panel</div>, {
      width: 360,
      closeOnRouteChange: false,
      id: "test-right",
    });
  }, []);

  return <div id="outlet-content">Outlet content</div>;
};

const loadMainLayout = async () => {
  const actualStore = await import("app/store");
  const actualReactRouterDom = await import("app/routing");
  mock.module("identity", () => ({
    useIsLoggedIn: () => true,
    isCloudEdition: true,
  }));

  // Mock useAppDispatch on app/store directly. Relying on react-redux mock fails when
  // earlier suite files leave a polluted app/store mock (Bun mock.restore does not
  // clear mock.module overrides; live bindings keep identity dispatch).
  mock.module("app/store", () => ({
    ...actualStore,
    useAppDispatch: () => (action: unknown) => {
      dispatchCalls.push(action);
      return action;
    },
    useAppSelector: (selector: (state: MockState) => unknown) =>
      selector(mockState),
  }));

  mock.module("app/settings/settingSlice", () => ({
    setSidebarWidth: (width: number) => ({
      type: "settings/setSidebarWidth",
      payload: width,
    }),
    selectSidebarWidth: (state: MockState) => state.settings.sidebarWidth,
  }));

  // setViewMode is a module-store mutator now (called directly, not dispatched),
  // so record its calls separately instead of via the dispatch log.
  mock.module("create/space/spaceCurrentStore", () => ({
    useViewMode: () => mockState.space.viewMode,
    setViewMode: (viewMode: "all" | "categories") => {
      (mockState as any).space = (mockState as any).space || {};
      (mockState as any).space.viewMode = viewMode;
      setViewModeCalls.push(viewMode);
    },
  }));

  mock.module("chat/web/ChatSidebar", () => ({
    default: () => <div id="chat-sidebar">Chat sidebar</div>,
  }));

  // Desktop-shell sidebar footer; earlier suite files may leak noloDesktop=1
  // on the shared document, so keep it inert here.
  mock.module("chat/web/sidebar/SidebarUserSection", () => ({
    default: () => null,
  }));

  mock.module("chat/web/ChatErrorBoundary", () => ({
    default: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  }));

  mock.module("life/LifeSidebar", () => ({
    default: () => (
      <div id="life-sidebar">
        <div id="life-sidebar-nav">Life nav</div>
        <div id="sidebar-user-section">User section</div>
      </div>
    ),
  }));

  mock.module("app/hooks/useIsMobile", () => ({
    useIsMobile: () => mockIsMobile,
  }));

  mock.module("app/hooks/useHasMounted", () => ({
    useHasMounted: () => true,
  }));

  mock.module("./TopBar", () => ({
    default: () => <div id="topbar">Topbar</div>,
  }));

  mock.module("./PageContentErrorBoundary", () => ({
    default: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  }));

  mock.module("../web/ui/PageLoading", () => ({
    default: () => <div id="page-loading">Loading</div>,
  }));

  mock.module("app/routing", () => ({
    ...actualReactRouterDom,
    useLocation: () => ({
      pathname: mockPathname,
      search: "",
      hash: "",
      state: null,
      key: "test",
    }),
    useNavigate: () => () => undefined,
    useParams: () => ({}),
    Outlet: () => <RightSidebarOpener />,
  }));

  const module = await import(`./MainLayout.tsx?test=${moduleVersion++}`);
  mock.restore();
  return module.default;
};

describe("MainLayout drag resize", () => {
  let dom: JSDOM;
  let root: Root;
  let container: HTMLDivElement;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;
  let previousNavigator: typeof globalThis.navigator | undefined;
  let previousHTMLElement: typeof globalThis.HTMLElement | undefined;
  let previousRequestAnimationFrame:
    | typeof globalThis.requestAnimationFrame
    | undefined;
  let previousCancelAnimationFrame:
    | typeof globalThis.cancelAnimationFrame
    | undefined;
  let previousActEnvironment: boolean | undefined;

  beforeEach(async () => {
    dispatchCalls.length = 0;
    setViewModeCalls.length = 0;
    mockState = {
      settings: {
        sidebarWidth: 300,
      },
      space: {
        viewMode: "categories",
      },
    };
    mockPathname = "/chat";
    mockIsMobile = false;

    dom = new JSDOM(
      "<!doctype html><html><body><div id='root'></div></body></html>",
      {
        url: "http://localhost/chat",
      },
    );

    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousNavigator = globalThis.navigator;
    previousHTMLElement = globalThis.HTMLElement;
    previousRequestAnimationFrame = globalThis.requestAnimationFrame;
    previousCancelAnimationFrame = globalThis.cancelAnimationFrame;
    previousActEnvironment = (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT;

    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
      HTMLElement: dom.window.HTMLElement,
    });
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    Object.defineProperty(dom.window, "innerWidth", {
      configurable: true,
      value: 1200,
    });

    const immediateRaf = (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    };
    Object.assign(globalThis, {
      requestAnimationFrame: immediateRaf,
      cancelAnimationFrame: () => undefined,
    });
    Object.assign(dom.window, {
      requestAnimationFrame: immediateRaf,
      cancelAnimationFrame: () => undefined,
    });

    Object.defineProperty(
      dom.window.HTMLElement.prototype,
      "setPointerCapture",
      {
        configurable: true,
        value: () => undefined,
      },
    );

    MainLayout = await loadMainLayout();
    container = dom.window.document.getElementById("root") as HTMLDivElement;
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    mock.restore();
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      navigator: previousNavigator,
      HTMLElement: previousHTMLElement,
      requestAnimationFrame: previousRequestAnimationFrame,
      cancelAnimationFrame: previousCancelAnimationFrame,
    });
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  it("persists the left sidebar width after pointer drag", async () => {
    await act(async () => {
      root.render(<MainLayout />);
    });

    const handle = container.querySelector(".MainLayout__resizeHandle");
    expect(handle).toBeTruthy();

    act(() => {
      dispatchPointerEvent(handle as Element, "pointerdown", {
        clientX: 300,
        clientY: 20,
      });
      dispatchPointerEvent(window, "pointermove", {
        clientX: 340,
        clientY: 20,
      });
      dispatchPointerEvent(window, "pointerup", { clientX: 340, clientY: 20 });
    });

    expect(dispatchCalls).toContainEqual({
      type: "settings/setSidebarWidth",
      payload: 340,
    });
  });

  it("updates the right sidebar width after pointer drag", async () => {
    await act(async () => {
      root.render(<MainLayout />);
    });

    const rightSidebar = container.querySelector(
      ".MainLayout__rightSidebar",
    ) as HTMLElement | null;
    const handle = container.querySelector(".MainLayout__rightResizeHandle");

    expect(rightSidebar).toBeTruthy();
    expect(handle).toBeTruthy();
    expect(rightSidebar?.style.width).toBe("360px");

    act(() => {
      dispatchPointerEvent(handle as Element, "pointerdown", {
        clientX: 840,
        clientY: 20,
      });
      dispatchPointerEvent(window, "pointermove", {
        clientX: 850,
        clientY: 20,
      });
      dispatchPointerEvent(window, "pointerup", { clientX: 850, clientY: 20 });
    });

    expect(
      (container.querySelector(".MainLayout__rightSidebar") as HTMLElement)
        .style.width,
    ).toBe("350px");
  });

  it("renders the life sidebar shell on life routes", async () => {
    mockPathname = "/life/usage";

    await act(async () => {
      root.render(<MainLayout />);
    });

    expect(container.querySelector("#life-sidebar")).toBeTruthy();
    expect(container.querySelector("#sidebar-user-section")).toBeTruthy();
  });

  it("auto-closes the sidebar when the viewport narrows and restores it when it widens", async () => {
    await act(async () => {
      root.render(<MainLayout />);
    });

    // Desktop → mobile: sidebar auto-closes.
    mockIsMobile = true;
    await act(async () => {
      root.render(<MainLayout />);
    });
    expect(dispatchCalls).toContainEqual({
      type: "settings/setSidebarWidth",
      payload: 0,
    });

    // Mobile → desktop: the auto-closed sidebar comes back at its last width.
    mockState.settings.sidebarWidth = 0;
    dispatchCalls.length = 0;
    mockIsMobile = false;
    await act(async () => {
      root.render(<MainLayout />);
    });
    expect(dispatchCalls).toContainEqual({
      type: "settings/setSidebarWidth",
      payload: 300,
    });
  });

  it("forces categories view on nested space content routes", async () => {
    mockPathname =
      "/space/01KKY77TT0DA9NY7TNW3R7255N/dialog-0e95801d90-01KN6V7RS7WFJ6XX0EMJ2P5T38";
    mockState.space.viewMode = "all";

    await act(async () => {
      root.render(<MainLayout />);
    });

    expect(setViewModeCalls).toContain("categories");
  });
});
