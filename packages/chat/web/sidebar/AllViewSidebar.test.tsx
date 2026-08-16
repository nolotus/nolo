import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import type { MyContentListItem } from "app/utils/myContentItems";
import { DataType } from "create/types";

const navigateCalls: string[] = [];
const sidebarItemPropsCalls: Array<Record<string, unknown>> = [];
const batchBarPropsCalls: Array<Record<string, unknown>> = [];
const dispatchedActions: unknown[] = [];
const translationMock = {
  t: (key: string, fallback?: string) => fallback ?? key,
};
const favoriteStorePath = new URL(
  "../../../app/favorite/favoriteStore.ts",
  import.meta.url
).pathname;
let moduleVersion = 0;
let AllViewSidebar: React.ComponentType;

const recentItems: MyContentListItem[] = Array.from({ length: 10 }, (_, index) => ({
  source: "user-data",
  title: `Recent ${index + 1}`,
  type: index % 2 === 0 ? "page" : "dialog",
  contentKey: `recent-${index + 1}`,
  pinned: false,
  createdAt: 0,
  updatedAt: 20 - index,
  spaceId: `space-${index + 1}`,
  spaceName: "Planning",
}));

const tableRecentItem: MyContentListItem = {
  source: "user-data",
  title: "Evaluation Table",
  type: "table",
  contentKey: "meta-user-1-table",
  pinned: false,
  createdAt: 0,
  updatedAt: 41,
  spaceId: "space-table",
  spaceName: "Tables",
};

const agentRecentItem: MyContentListItem = {
  source: "user-data",
  title: "Research AI",
  type: "agent",
  contentKey: "agent-user-1-agent",
  pinned: false,
  createdAt: 0,
  updatedAt: 40,
  spaceId: "space-agent",
  spaceName: "Agents",
};

const appRecentItem: MyContentListItem = {
  source: "owned-app",
  title: "Recent App",
  type: "app",
  contentKey: "app-user-1-recent",
  pinned: false,
  createdAt: 0,
  updatedAt: 39,
  spaceId: "space-app",
  spaceName: "Apps",
  app: {
    appKey: "app-user-1-recent",
    appId: "recent",
    name: "Recent App",
  },
} as any;

const dialogImageAttachmentItem: MyContentListItem = {
  source: "user-data",
  title: "photo sent in dialog.png",
  type: "file",
  fileCategory: "image",
  mimeType: "image/png",
  contentKey: "file-user-1-dialog-image",
  pinned: false,
  createdAt: 0,
  updatedAt: 30,
  spaceId: null,
  spaceName: "我的内容",
};

const spaceImageItem: MyContentListItem = {
  source: "user-data",
  title: "saved space image.png",
  type: "file",
  fileCategory: "image",
  mimeType: "image/png",
  contentKey: "file-user-1-space-image",
  pinned: false,
  createdAt: 0,
  updatedAt: 29,
  spaceId: "space-image",
  spaceName: "Images",
};

// Pinned recent item — rendered through SidebarPinnedBlock above the scrolling
// recent list. Used to prove batch selection mode reaches pinned rows too.
const pinnedRecentItem: MyContentListItem = {
  source: "user-data",
  title: "Pinned Recent Doc",
  type: "page",
  contentKey: "pinned-recent-1",
  pinned: true,
  createdAt: 0,
  updatedAt: 50,
  spaceId: "space-pinned",
  spaceName: "Pinned",
};

const favoriteRecords = {
  "agent-1": {
    title: "Favorite Agent",
    type: "agent",
    spaceId: "space-fav",
  },
  "dialog-fav-1": {
    title: "Favorite Dialog",
    type: "dialog",
    spaceId: "space-fav",
  },
  "file-fav-dialog-image": {
    title: "Favorite dialog image attachment",
    type: "file",
    fileCategory: "image",
    spaceId: null,
  },
};

const mockState = {
  auth: {
    isLoggedIn: true,
    currentToken: "token-1",
    currentUser: { userId: "user-1" },
  },
  settings: {
    currentServer: "http://localhost",
  },
  favorite: {
    agentIds: ["agent-1"],
    contentIds: ["dialog-fav-1", "file-fav-dialog-image"],
    initialized: true,
    favoritedAtById: {
      "agent-1": 20,
      "dialog-fav-1": 10,
      "file-fav-dialog-image": 5,
    },
  },
  db: {
    entities: {
      "agent-1": { dbKey: "agent-1", title: "Favorite Agent", type: "agent", spaceId: "space-fav" },
      "dialog-fav-1": { dbKey: "dialog-fav-1", title: "Favorite Dialog", type: "dialog", spaceId: "space-fav" },
      "file-fav-dialog-image": { dbKey: "file-fav-dialog-image", title: "Favorite dialog image attachment", type: "file", fileCategory: "image", spaceId: null },
    },
    ids: ["agent-1", "dialog-fav-1", "file-fav-dialog-image"],
  },
  // SidebarPinnedBlock reads selectCurrentSpaceId (space.viewMode/currentSpaceId);
  // All View runs in viewMode "all", so currentSpaceId resolves to null.
  space: {
    viewMode: "all",
    currentSpaceId: null,
    currentSpace: null,
    memberSpaces: null,
    loading: false,
    initialized: false,
    collapsedCategories: {},
    dialogStatuses: {},
    dialogEventTimestamps: {},
    dialogTitles: {},
    unreadDialogIds: {},
  },
};

const loadAllViewSidebar = async () => {
  mock.restore();
  const actualReactI18Next = await import("react-i18next");
  const actualReactRouterDom = await import("app/routing");
  const actualShareHelpers = await import("share/helpers");
  const actualShareTypes = await import("share/types");
  const actualDbSlice = await import("database/dbSlice");
  const actualFavoriteSlice = await import(
    `${favoriteStorePath}?actual=${moduleVersion}`
  );

  mock.module("react-i18next", () => ({
    ...actualReactI18Next,
    useTranslation: () => translationMock,
  }));

  mock.module("app/routing", () => ({
    ...actualReactRouterDom,
    useNavigate: () => (path: string) => {
      navigateCalls.push(path);
    },
    useLocation: () => ({
      pathname: "/life",
      search: "",
    }),
    useParams: () => ({}),
    Link: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => <a {...props}>{children}</a>,
    NavLink: ({
      children,
      to,
      className,
      end,
      ...props
    }: {
      children?: React.ReactNode;
      to?: string;
      className?:
        | string
        | ((args: { isActive: boolean }) => string | undefined);
      end?: boolean;
      [key: string]: unknown;
    }) => {
      // Tests run with pathname "/life", so /favorites and /explore are not
      // active. The className function must still be resolved — otherwise
      // React would render the function onto the DOM as `[object Function]`.
      const isActive = false;
      const resolved =
        typeof className === "function" ? className({ isActive }) : className;
      return (
        <a
          href={typeof to === "string" ? to : "#"}
          className={resolved}
          onClick={(e) => {
            e.preventDefault();
            if (typeof to === "string") navigateCalls.push(to);
          }}
          {...props}
        >
          {children}
        </a>
      );
    },
  }));

  mock.module("app/hooks/useMyContentItems", () => ({
    useMyContentItems: () => ({
      items: [
        dialogImageAttachmentItem,
        tableRecentItem,
        agentRecentItem,
        appRecentItem,
        spaceImageItem,
        pinnedRecentItem,
        ...recentItems,
      ],
      loading: false,
    }),
  }));

  mock.module("app/hooks", () => ({
    useFetchData: (contentKey: string) => ({
      data: favoriteRecords[contentKey as keyof typeof favoriteRecords],
      isLoading: false,
    }),
  }));

  mock.module("database/dbSlice", () => ({
    ...actualDbSlice,
    readAndWait: (contentKey: string) => contentKey,
    write: (payload: unknown) => payload,
    read: (payload: unknown) => payload,
    remove: (payload: unknown) => payload,
    patch: (payload: unknown) => payload,
    upsert: (payload: unknown) => payload,
  }));

  // useUserId (from identity) calls useSelector directly from react-redux,
  // which needs a <Provider> wrapper. AllViewSidebar and SidebarPinnedBlock
  // both use it. Mock the module to return a static userId instead.
  mock.module("identity", () => ({
    useUserId: () => "user-1",
    useIsLoggedIn: () => true,
    useToken: () => "token-1",
  }));
  mock.module("app/favorite/favoriteStore", () => actualFavoriteSlice);
  mock.module("app/store", () => ({
    useAppDispatch: () => (action: unknown) => {
      dispatchedActions.push(action);
      // AllViewSidebar uses thunk actions whose payloads are objects — return a
      // thenable that resolves so `await dispatch(...)` never rejects.
      return { unwrap: async () => undefined };
    },
    useAppSelector: (selector: (state: typeof mockState) => unknown) =>
      selector(mockState),
  }));

  mock.module("app/utils/toast", () => ({
    toast: {
      success: () => undefined,
      error: () => undefined,
    },
  }));

  mock.module("render/web/ui/modal/ConfirmModal", () => ({
    ConfirmModal: () => null,
  }));

  mock.module("app/pages/MyContentCollectionBatchBar", () => ({
    MyContentCollectionBatchBar: (props: Record<string, unknown>) => {
      batchBarPropsCalls.push(props);
      const labels = props.labels as Record<string, string>;
      const isSelectionMode = Boolean(props.isSelectionMode);
      const allSelected = Boolean(props.allSelected);
      return (
        <div
          data-testid="batch-bar"
          data-batch-target={
            (props.itemNoun as string | undefined) ?? ""
          }
          data-selection-mode={isSelectionMode ? "true" : "false"}
          data-selected-count={String(props.selectedCount)}
          data-total-count={String(props.totalCount)}
          data-all-selected={allSelected ? "true" : "false"}
        >
          {isSelectionMode ? (
            <>
              <button
                type="button"
                onClick={() =>
                  (
                    props.onToggleSelectAll as () => void | undefined
                  )?.()
                }
              >
                {allSelected ? labels.deselectAll : labels.selectAll}
              </button>
              <button
                type="button"
                onClick={() =>
                  (props.onRequestDelete as () => void | undefined)?.()
                }
              >
                {labels.deleteSelected}
              </button>
              <button
                type="button"
                onClick={() =>
                  (props.onExitSelection as () => void | undefined)?.()
                }
              >
                {labels.cancel}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() =>
                (props.onEnterSelection as () => void | undefined)?.()
              }
            >
              {labels.batchManage}
            </button>
          )}
        </div>
      );
    },
  }));


  mock.module("app/hooks/deleteDbKey", () => ({
    deleteDbKey: (input: unknown) => ({
      type: "deleteDbKey/test",
      payload: input,
    }),
    getDeleteErrorMessage: (
      _err: unknown,
      fallback = "Delete failed"
    ) => fallback,
  }));

  const renderMockRow = ({
    contentKey,
    title,
    ...props
  }: {
    contentKey: string;
    title: string;
    [key: string]: unknown;
  }) => {
    sidebarItemPropsCalls.push({ contentKey, title, ...props });
    return <div data-testid={contentKey}>{title}</div>;
  };

  // Recent + search rows render through SidebarItemRow after the virtualization
  // migration; mock it with the same testid/props contract.
  mock.module("create/space/SidebarItemRow", () => ({
    default: renderMockRow,
  }));

  // RAC Virtualizer/ListBox renders nothing under jsdom's zero-height layout;
  // mock the wrapper to render every row synchronously so testid queries work.
  mock.module(
    new URL("./SidebarVirtualizedList.tsx", import.meta.url).pathname,
    () => ({
      SidebarVirtualizedList: ({
        items,
        children,
      }: {
        items: Array<{ contentKey: string }>;
        children: (item: { contentKey: string }) => React.ReactNode;
      }) => <>{items.map((item) => children(item))}</>,
    })
  );

  mock.module("share/helpers", () => ({
    ...actualShareHelpers,
    formatShareTime: () => "just now",
  }));

  mock.module("share/types", () => ({
    ...actualShareTypes,
    getShareTypeLabel: () => "Share",
  }));

  const module = await import(`./AllViewSidebar.tsx?test=${moduleVersion++}`);
  mock.restore();
  return module.default;
};

describe("AllViewSidebar", () => {
  let dom: JSDOM;
  let root: Root;
  let container: HTMLDivElement;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;
  let previousNavigator: typeof globalThis.navigator | undefined;
  let previousFetch: typeof globalThis.fetch | undefined;
  let previousActEnvironment: boolean | undefined;

  const flush = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  beforeEach(async () => {
    navigateCalls.length = 0;
    sidebarItemPropsCalls.length = 0;
    batchBarPropsCalls.length = 0;
    dispatchedActions.length = 0;
    AllViewSidebar = await loadAllViewSidebar();
    // Reset favorite module store state between tests so seeded data from one
    // test doesn't leak into the next.
    const { seedFavoriteStoreForTests } = await import(
      new URL("../../../app/favorite/favoriteStore.ts", import.meta.url).pathname
    );
    seedFavoriteStoreForTests({});
    dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
      url: "http://localhost",
    });
    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousNavigator = globalThis.navigator;
    previousFetch = globalThis.fetch;
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

    Object.defineProperty(dom.window.HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value(options: ScrollToOptions) {
        this.scrollTop = options.top ?? 0;
      },
    });

    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("cursor=cursor-1")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                token: "share-2",
                type: DataType.DIALOG,
                title: "Share Two",
                createdAt: 2,
                authorId: "user-1",
                authorName: "Nolo",
              },
            ],
          }),
          { status: 200 }
        );
      }

      return new Response(
        JSON.stringify({
          data: [
            {
              token: "share-1",
              type: DataType.DIALOG,
              title: "Share One",
              createdAt: 1,
              authorId: "user-1",
              authorName: "Nolo",
            },
          ],
          nextCursor: "cursor-1",
        }),
        { status: 200 }
      );
    }) as unknown as typeof globalThis.fetch;
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    container = document.getElementById("root") as HTMLDivElement;
    root = createRoot(container);
  });

  afterEach(async () => {
    act(() => {
      root?.unmount();
    });
    await flush();
    dom?.window.close();

    if (previousFetch === undefined) {
      delete (globalThis as any).fetch;
    } else {
      globalThis.fetch = previousFetch;
    }

    if (previousWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      globalThis.window = previousWindow;
    }

    if (previousDocument === undefined) {
      delete (globalThis as any).document;
    } else {
      globalThis.document = previousDocument;
    }

    if (previousNavigator === undefined) {
      delete (globalThis as any).navigator;
    } else {
      globalThis.navigator = previousNavigator;
    }

    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  it("renders flat recent section without accordion collapse", async () => {
    act(() => {
      root.render(<AllViewSidebar />);
    });
    await flush();
    await flush();
    await flush();

    // No accordion header/panel markup remains.
    expect(container.querySelector(".AllViewSidebar__accordion-header")).toBeNull();
    expect(container.querySelector(".AllViewSidebar__accordion-panel")).toBeNull();

    // Only one scroll area (no double scrollbar)
    expect(container.querySelectorAll(".AllViewSidebar__scroll-area").length).toBe(1);

    // The type filter bar and favorites nav now live in the parent ChatSidebar,
    // not inside AllViewSidebar (it receives the active filter via prop).
    expect(container.querySelector(".AllViewSidebar__recent-bar")).toBeNull();
    expect(container.querySelector(".AllViewSidebar__nav-row")).toBeNull();

    // Recent content is always rendered (no data-open toggle).
    const recentContent = container.querySelector(".AllViewSidebar__recent-content");
    expect(recentContent).toBeTruthy();

    // Default: Recent list is visible. The exact rendered count is dynamic, so this fixture
    // only asserts that all mocked recent rows are visible when the fixture item
    // count fits under the initial display budget.
    for (const item of recentItems) {
      expect(container.textContent).toContain(item.title);
    }
    expect(container.textContent).not.toContain("Favorite Agent");
    expect(container.textContent).not.toContain("Share One");

    // All View navigation must stay unscoped: recent rows (SidebarItemRow) navigate unscoped
    // through onAction and carry no route override. No row may be scoped (non-null).
    expect(
      sidebarItemPropsCalls.every(
        (props) =>
          props.routeSpaceIdOverride === null ||
          props.routeSpaceIdOverride === undefined
      )
    ).toBe(true);

    expect(container.textContent).toContain("Recent 1");
    expect(container.textContent).not.toContain("Favorite Agent");
  });

  it("does not show numeric badges on collapsed section headers", async () => {
    act(() => {
      root.render(<AllViewSidebar />);
    });
    await flush();
    await flush();
    await flush();

    expect(container.querySelector(".AllViewSidebar__badge")).toBeNull();
  });

  it("hides unscoped dialog image attachments from All View recent items", async () => {
    act(() => {
      root.render(<AllViewSidebar />);
    });
    await flush();
    await flush();
    await flush();

    expect(container.textContent).not.toContain(dialogImageAttachmentItem.title);
    expect(container.textContent).toContain(spaceImageItem.title);
    expect(
      sidebarItemPropsCalls.some(
        (props) => props.contentKey === dialogImageAttachmentItem.contentKey
      )
    ).toBe(false);
    expect(
      sidebarItemPropsCalls.some((props) => props.contentKey === spaceImageItem.contentKey)
    ).toBe(true);
  });

  it("filters recent items by the typeFilter prop", async () => {
    act(() => {
      root.render(<AllViewSidebar typeFilter="all" />);
    });
    await flush();
    await flush();
    await flush();

    expect(container.textContent).toContain("Recent 1");
    expect(container.textContent).toContain("Evaluation Table");
    expect(container.textContent).toContain("Research AI");
    expect(container.textContent).toContain("Recent App");
    expect(container.textContent).toContain(spaceImageItem.title);

    act(() => {
      root.render(<AllViewSidebar typeFilter="dialog" />);
    });
    await flush();

    expect(container.querySelector('[data-testid="recent-2"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="recent-1"]')).toBeNull();
    expect(container.textContent).not.toContain("Evaluation Table");
    expect(container.textContent).not.toContain("Research AI");
    expect(container.textContent).not.toContain("Recent App");
    expect(container.textContent).not.toContain(spaceImageItem.title);

    act(() => {
      root.render(<AllViewSidebar typeFilter="page" />);
    });
    await flush();

    expect(container.querySelector('[data-testid="recent-1"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="recent-2"]')).toBeNull();
    expect(container.textContent).not.toContain("Evaluation Table");
    expect(container.textContent).not.toContain("Research AI");
    expect(container.textContent).not.toContain("Recent App");
    expect(container.textContent).not.toContain(spaceImageItem.title);

    act(() => {
      root.render(<AllViewSidebar typeFilter="table" />);
    });
    await flush();

    expect(container.textContent).toContain("Evaluation Table");
    expect(container.querySelector('[data-testid="recent-2"]')).toBeNull();
    expect(container.textContent).not.toContain("Research AI");

    act(() => {
      root.render(<AllViewSidebar typeFilter="agent" />);
    });
    await flush();

    expect(container.textContent).toContain("Research AI");
    expect(container.textContent).not.toContain("Evaluation Table");
    expect(container.textContent).not.toContain("Recent App");
    expect(container.textContent).not.toContain(spaceImageItem.title);

    act(() => {
      root.render(<AllViewSidebar typeFilter="app" />);
    });
    await flush();

    expect(container.textContent).toContain("Recent App");
    expect(container.textContent).not.toContain("Research AI");
    expect(container.textContent).not.toContain(spaceImageItem.title);

    act(() => {
      root.render(<AllViewSidebar typeFilter="attachment" />);
    });
    await flush();

    expect(container.textContent).toContain(spaceImageItem.title);
    expect(container.textContent).toContain(dialogImageAttachmentItem.title);
    expect(container.textContent).not.toContain("Research AI");
  });

  it("falls back to all recent items when the stored recent type is invalid", async () => {
    window.localStorage.setItem("allview-recent-type-filter", "unknown");

    act(() => {
      root.render(<AllViewSidebar />);
    });
    await flush();
    await flush();
    await flush();

    // No prop → falls back to the stored preference; "unknown" resolves to "all".
    expect(container.textContent).toContain("Recent 1");
    expect(container.textContent).toContain("Evaluation Table");
    expect(container.textContent).toContain("Research AI");
    expect(container.textContent).toContain("Recent App");
    expect(container.textContent).toContain(spaceImageItem.title);
  });

  it("migrates the old image recent filter preference to attachments", async () => {
    window.localStorage.setItem("allview-recent-type-filter", "image");

    act(() => {
      root.render(<AllViewSidebar />);
    });
    await flush();
    await flush();
    await flush();

    // No prop → falls back to the stored preference; legacy "image" migrates to "attachment".
    expect(container.textContent).toContain(spaceImageItem.title);
    expect(container.textContent).not.toContain("Research AI");
    expect(container.textContent).not.toContain("Recent App");
  });
  it("does not render batch manage or jump controls on the type filter bar", async () => {
    act(() => {
      root.render(<AllViewSidebar />);
    });
    await flush();
    await flush();
    await flush();

    expect(
      container.querySelector('.AllViewSidebar__batch-toggle[data-batch-manage="recent"]')
    ).toBeNull();
    expect(
      container.querySelectorAll(".AllViewSidebar__batch-bar-wrapper").length
    ).toBe(0);
    expect(
      container.querySelector(".AllViewSidebar__recent-bar .AllViewSidebar__more-icon")
    ).toBeNull();
    expect(
      sidebarItemPropsCalls.some((props) => props.isSelectionMode === true)
    ).toBe(false);
  });

});
