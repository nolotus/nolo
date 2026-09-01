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
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

// Value-copy snapshots — Bun mock.restore() does not clear mock.module,
// 粘性 mock 会污染同进程后续 suite 文件（create/space 的 runtime 测试等）。
const realSpaceThunks = { ...(await import("create/space/spaceThunks")) };
const realMemberThunks = {
  ...(await import("create/space/member/memberThunks")),
};
const realSpaceCurrentStore = {
  ...(await import("create/space/spaceCurrentStore")),
};
const realSpaceCurrentSelectors = {
  ...(await import("create/space/spaceCurrentSelectors")),
};
const realSpaceMembershipStore = {
  ...(await import("create/space/spaceMembershipStore")),
};

afterAll(() => {
  mock.module("create/space/spaceThunks", () => realSpaceThunks);
  mock.module("create/space/member/memberThunks", () => realMemberThunks);
  mock.module("create/space/spaceCurrentStore", () => realSpaceCurrentStore);
  mock.module(
    "create/space/spaceCurrentSelectors",
    () => realSpaceCurrentSelectors,
  );
  mock.module(
    "create/space/spaceMembershipStore",
    () => realSpaceMembershipStore,
  );
});

type MembershipStatus = "idle" | "loading" | "fresh" | "offline";

type MockState = {
  space: {
    memberSpaces: Array<{
      spaceId: string;
      spaceName?: string;
      dbKey?: string;
    }>;
    currentSpace: { id: string; name?: string } | null;
    loading: boolean;
    membershipStatus: MembershipStatus;
    viewMode: "all" | "categories";
  };
};

let moduleVersion = 0;
let TopbarSpaceSwitcher: React.ComponentType;
let mockState: MockState;
const setViewModeCalls: string[] = [];
const dispatchCalls: unknown[] = [];
const navigateCalls: string[] = [];

const loadTopbarSpaceSwitcher = async () => {
  const actualReactRouterDom = await import("app/routing");
  const actualReactI18Next = await import("react-i18next");
  const actualStore = await import("app/store");

  mock.module("app/store", () => ({
    ...actualStore,
    useAppDispatch: () => (action: unknown) => {
      dispatchCalls.push(action);
      return action;
    },
    useAppSelector: (selector: (state: MockState) => unknown) =>
      selector(mockState),
  }));

  mock.module("react-i18next", () => ({
    ...actualReactI18Next,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  }));

  mock.module("app/routing", () => ({
    ...actualReactRouterDom,
    useNavigate: () => (path: string) => {
      navigateCalls.push(path);
    },
    NavLink: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => <a {...props}>{children}</a>,
  }));

  mock.module("app/hooks/useClickOutside", () => ({
    useClickOutside: () => undefined,
  }));

  mock.module("create/space/spaceThunks", () => ({
    changeSpace: (spaceId: string) => ({
      type: "space/changeSpace",
      payload: spaceId,
    }),
  }));

  mock.module("create/space/member/memberThunks", () => ({
    fetchUserSpaceMemberships: (userId: string) => ({
      type: "space/fetchUserSpaceMemberships",
      payload: userId,
    }),
  }));

  // setViewMode is a module-store mutator now (called directly, not dispatched).
  mock.module("create/space/spaceCurrentStore", () => ({
    setViewMode: (viewMode: "all" | "categories") => {
      setViewModeCalls.push(viewMode);
    },
    useViewMode: () => mockState.space.viewMode,
  }));

  mock.module("create/space/spaceCurrentSelectors", () => ({
    useCurrentSpaceFromEntity: () => mockState.space.currentSpace,
  }));

  mock.module("create/space/spaceMembershipStore", () => ({
    useAllMemberSpaces: () => mockState.space.memberSpaces,
    useSpaceLoading: () => mockState.space.loading,
    useMemberSpacesLoaded: () => mockState.space.memberSpaces !== null,
    useMembershipStatus: () => mockState.space.membershipStatus ?? "idle",
  }));

  const module = await import(
    `./TopbarSpaceSwitcher.tsx?test=${moduleVersion++}`
  );
  mock.restore();
  return module.default;
};

describe("TopbarSpaceSwitcher", () => {
  let dom: JSDOM;
  let root: Root;
  let container: HTMLDivElement;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;
  let previousNavigator: typeof globalThis.navigator | undefined;
  let previousActEnvironment: boolean | undefined;

  beforeEach(async () => {
    dispatchCalls.length = 0;
    navigateCalls.length = 0;
    mockState = {
      space: {
        memberSpaces: [{ spaceId: "space-1", spaceName: "Planning" }],
        currentSpace: null,
        loading: false,
        membershipStatus: "idle",
        viewMode: "categories",
      },
    };

    TopbarSpaceSwitcher = await loadTopbarSpaceSwitcher();

    dom = new JSDOM(
      "<!doctype html><html><body><div id='root'></div></body></html>",
      {
        url: "http://localhost/space/space-1",
      },
    );

    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousNavigator = globalThis.navigator;
    previousActEnvironment = (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT;

    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
    });

    // JSDOM omits CSS.escape; react-aria ListBox selection utils need it.
    const cssEscape =
      typeof (globalThis as { CSS?: { escape?: (value: string) => string } })
        .CSS?.escape === "function"
        ? (globalThis as { CSS: { escape: (value: string) => string } }).CSS
            .escape
        : (value: string) =>
            String(value).replace(
              /[^a-zA-Z0-9_-]/g,
              (ch) => `\\${ch.codePointAt(0)!.toString(16)} `,
            );
    const cssGlobal = { escape: cssEscape };
    Object.defineProperty(dom.window, "CSS", {
      configurable: true,
      writable: true,
      value: cssGlobal,
    });
    Object.defineProperty(globalThis, "CSS", {
      configurable: true,
      writable: true,
      value: cssGlobal,
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
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  it("defaults to 全部 when categories view has not resolved current space yet", async () => {
    await act(async () => {
      root.render(<TopbarSpaceSwitcher />);
    });

    // Never show empty "选择空间" / select_space — fall back to all.
    expect(container.textContent).toContain("all");
    expect(container.textContent).not.toContain("select_space");
  });

  it("renders the dropdown panel into document.body when clicking the chevron", async () => {
    await act(async () => {
      root.render(<TopbarSpaceSwitcher />);
    });

    const chevronButton = container.querySelector(
      ".TpSw__chevronBtn",
    ) as HTMLButtonElement | null;
    expect(chevronButton).toBeTruthy();

    await act(async () => {
      chevronButton?.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true }),
      );
    });

    const panel = dom.window.document.body.querySelector(".TpSw__panel");
    expect(panel).toBeTruthy();
    expect(panel?.textContent).toContain("switch_space");
    expect(panel?.textContent).toContain("Planning");
    const createBtn = panel?.querySelector(
      ".TpSw__createBtn",
    ) as HTMLButtonElement | null;
    expect(createBtn).toBeTruthy();
    expect(createBtn?.textContent).toContain("create_new_space");
    // Footer is a sibling after the scrollable list (not nested inside it).
    const list = panel?.querySelector(".TpSw__list");
    const footer = panel?.querySelector(".TpSw__footer");
    expect(list).toBeTruthy();
    expect(footer).toBeTruthy();
    expect(list?.contains(footer as Node)).toBe(false);
    expect(footer?.parentElement).toBe(panel);
    expect(list?.parentElement).toBe(panel);
    // RAC ListBox owns the listbox role; panel shell does not.
    expect(panel?.getAttribute("role")).not.toBe("listbox");
    expect(list?.getAttribute("role")).toBe("listbox");
    expect(list?.querySelector('[role="option"]')).toBeTruthy();
  });

  it("shows loading instead of no-spaces while memberships are still resolving", async () => {
    mockState.space.memberSpaces = [];
    mockState.space.loading = true;

    await act(async () => {
      root.render(<TopbarSpaceSwitcher />);
    });

    const chevronButton = container.querySelector(
      ".TpSw__chevronBtn",
    ) as HTMLButtonElement | null;

    await act(async () => {
      chevronButton?.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true }),
      );
    });

    const panel = dom.window.document.body.querySelector(".TpSw__panel");
    expect(panel?.textContent).toContain("loading");
    expect(panel?.textContent).not.toContain("no_spaces");
  });

  it("shows the offline local-cache marker only when membership is offline", async () => {
    mockState.space.membershipStatus = "offline";

    await act(async () => {
      root.render(<TopbarSpaceSwitcher />);
    });

    const chevronButton = container.querySelector(
      ".TpSw__chevronBtn",
    ) as HTMLButtonElement | null;

    await act(async () => {
      chevronButton?.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true }),
      );
    });

    const panel = dom.window.document.body.querySelector(".TpSw__panel");
    expect(panel?.querySelector(".TpSw__offlineBadge")).toBeTruthy();
    expect(panel?.textContent).toContain("offline_local_cache");
  });

  it("does not show the offline marker when membership is fresh", async () => {
    mockState.space.membershipStatus = "fresh";

    await act(async () => {
      root.render(<TopbarSpaceSwitcher />);
    });

    const chevronButton = container.querySelector(
      ".TpSw__chevronBtn",
    ) as HTMLButtonElement | null;

    await act(async () => {
      chevronButton?.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true }),
      );
    });

    const panel = dom.window.document.body.querySelector(".TpSw__panel");
    expect(panel?.querySelector(".TpSw__offlineBadge")).toBeNull();
    expect(panel?.textContent).not.toContain("offline_local_cache");
  });

  it("does not show the offline marker when membership is idle", async () => {
    mockState.space.membershipStatus = "idle";

    await act(async () => {
      root.render(<TopbarSpaceSwitcher />);
    });

    const chevronButton = container.querySelector(
      ".TpSw__chevronBtn",
    ) as HTMLButtonElement | null;

    await act(async () => {
      chevronButton?.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true }),
      );
    });

    const panel = dom.window.document.body.querySelector(".TpSw__panel");
    expect(panel?.querySelector(".TpSw__offlineBadge")).toBeNull();
    expect(panel?.textContent).not.toContain("offline_local_cache");
  });

  it("sizes the sidebar dropdown panel to the sidebar switcher trigger", async () => {
    const originalGetBoundingClientRect =
      dom.window.HTMLElement.prototype.getBoundingClientRect;
    dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
      const element = this as HTMLElement;
      if (element.classList.contains("TpSw")) {
        return {
          x: 18,
          y: 12,
          left: 18,
          top: 12,
          right: 314,
          bottom: 52,
          width: 296,
          height: 40,
          toJSON: () => ({}),
        };
      }
      if (element.classList.contains("TpSw__chevronBtn")) {
        return {
          x: 284,
          y: 18,
          left: 284,
          top: 18,
          right: 306,
          bottom: 40,
          width: 22,
          height: 22,
          toJSON: () => ({}),
        };
      }
      return originalGetBoundingClientRect.call(this);
    };

    try {
      await act(async () => {
        root.render(<TopbarSpaceSwitcher placement="sidebar" />);
      });

      const chevronButton = container.querySelector(
        ".TpSw__chevronBtn",
      ) as HTMLButtonElement | null;

      await act(async () => {
        chevronButton?.dispatchEvent(
          new dom.window.MouseEvent("click", { bubbles: true }),
        );
      });

      const panel = dom.window.document.body.querySelector(
        ".TpSw__panel",
      ) as HTMLElement | null;
      expect(panel).toBeTruthy();
      expect(panel?.style.left).toBe("18px");
      expect(panel?.style.width).toBe("296px");
    } finally {
      dom.window.HTMLElement.prototype.getBoundingClientRect =
        originalGetBoundingClientRect;
    }
  });
});
