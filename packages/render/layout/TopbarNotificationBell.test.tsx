import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { DataType } from "create/types";
import type { AppNotification } from "app/notifications/notificationStore";
import {
  replaceNotifications,
  resetNotificationStoreForTests,
} from "app/notifications/notificationStore";

let moduleVersion = 0;
let TopbarNotificationBell: React.ComponentType;
const navigateCalls: string[] = [];
const dispatchCalls: unknown[] = [];

const makeItem = (
  partial: Pick<AppNotification, "id" | "kind" | "title" | "read"> &
    Partial<Pick<AppNotification, "message" | "href" | "dialogId" | "createdAt">>
): AppNotification => {
  const now = Date.now();
  const createdAt = partial.createdAt ?? now;
  return {
    id: partial.id,
    kind: partial.kind,
    title: partial.title,
    message: partial.message,
    createdAt,
    updatedAt: createdAt,
    read: partial.read,
    href: partial.href,
    dialogId: partial.dialogId,
    record: {
      type: DataType.NOTIFICATION,
      notificationId: partial.id,
      userId: "user-1",
      dbKey: `notification-user-1-${partial.id}`,
      kind: partial.kind,
      createdAt,
      updatedAt: createdAt,
    },
  };
};

const seedDefaultNotifications = () => {
  replaceNotifications([
    makeItem({
      id: "n1",
      kind: "agent_notice",
      title: "System alert",
      message: "Something happened.",
      read: false,
    }),
    makeItem({
      id: "n2",
      kind: "space_member_added",
      title: "New member",
      read: true,
    }),
  ]);
};

const loadTopbarNotificationBell = async () => {
  const actualReactRouterDom = await import("app/routing");
  const actualReactI18Next = await import("react-i18next");
  const actualStore = await import("app/store");

  mock.module("app/store", () => ({
    ...actualStore,
    useAppDispatch: () => (action: unknown) => {
      dispatchCalls.push(action);
      return action;
    },
  }));

  mock.module("react-i18next", () => ({
    ...actualReactI18Next,
    useTranslation: () => ({
      t: (_key: string, fallback?: string) => fallback ?? _key,
    }),
  }));

  mock.module("app/routing", () => ({
    ...actualReactRouterDom,
    useNavigate: () => (path: string) => {
      navigateCalls.push(path);
    },
  }));

  mock.module("app/hooks/useClickOutside", () => ({
    useClickOutside: () => undefined,
  }));

  mock.module("app/hooks/useUserNotifications", () => ({
    useUserNotifications: () => undefined,
  }));

  mock.module("app/notifications/useNotificationActions", () => ({
    useNotificationActions: () => ({
      markAsRead: async (_item: unknown) => undefined,
      markAllAsRead: async () => undefined,
    }),
  }));

  mock.module("create/space/spaceSlice", () => ({
    // markDialogRead 在生产中是 asyncThunk；mock 成返回 fulfilled action 的 thunk，
    // 避免污染后续依赖真实 spaceSlice 的测试（bun mock.module 跨测试持久）。
    markDialogRead: (payload: { dialogId: string }) =>
      (dispatch: (action: unknown) => void) =>
        Promise.resolve(
          dispatch({
            type: "space/markDialogRead/fulfilled",
            payload: { dialogId: payload.dialogId },
          })
        ),
  }));

  const module = await import(`./TopbarNotificationBell.tsx?test=${moduleVersion++}`);
  mock.restore();
  return module.default;
};

describe("TopbarNotificationBell", () => {
  let dom: JSDOM;
  let root: Root;
  let container: HTMLDivElement;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;
  let previousNavigator: typeof globalThis.navigator | undefined;
  let previousActEnvironment: boolean | undefined;

  beforeEach(async () => {
    navigateCalls.length = 0;
    dispatchCalls.length = 0;
    resetNotificationStoreForTests();
    seedDefaultNotifications();

    TopbarNotificationBell = await loadTopbarNotificationBell();

    dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
      url: "http://localhost/chat",
    });

    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousNavigator = globalThis.navigator;
    previousActEnvironment = (globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    }).IS_REACT_ACT_ENVIRONMENT;

    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
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
    resetNotificationStoreForTests();
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

  it("renders the bell button with unread badge", async () => {
    await act(async () => {
      root.render(<TopbarNotificationBell />);
    });

    const button = container.querySelector(".topbar-notification__button") as HTMLButtonElement | null;
    expect(button).toBeTruthy();

    const badge = container.querySelector(".topbar-notification__badge");
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toBe("1");
  });

  it("opens the popover with correct CSS classes when clicked", async () => {
    await act(async () => {
      root.render(<TopbarNotificationBell />);
    });

    const button = container.querySelector(".topbar-notification__button") as HTMLButtonElement | null;
    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    const popup = container.querySelector(".topbar-notification__popup");
    expect(popup).toBeTruthy();
    expect(popup?.classList.contains("topbar-dropdown--open")).toBe(true);
  });

  it("popover root uses the high-specificity selector .TopbarNotification .topbar-notification__popup", async () => {
    await act(async () => {
      root.render(<TopbarNotificationBell />);
    });

    const button = container.querySelector(".topbar-notification__button") as HTMLButtonElement | null;
    await act(async () => {
      button?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    const popup = container.querySelector(".topbar-notification__popup");
    expect(popup).toBeTruthy();

    // Verify the popup lives inside .TopbarNotification so the CSS rule
    // .TopbarNotification .topbar-notification__popup { min-width: 360px; }
    // will actually match and protect against .topbar-dropdown overriding it.
    const topbarNotification = popup?.closest(".TopbarNotification");
    expect(topbarNotification).toBeTruthy();
  });

  it("renders notification items with unread affordance", async () => {
    await act(async () => {
      root.render(<TopbarNotificationBell />);
    });

    const button = container.querySelector(".topbar-notification__button") as HTMLButtonElement | null;
    await act(async () => {
      button?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    const items = container.querySelectorAll(".topbar-notification__item");
    expect(items.length).toBe(2);

    const unreadItem = container.querySelector(".topbar-notification__item.is-unread");
    expect(unreadItem).toBeTruthy();
    expect(unreadItem?.querySelector(".topbar-notification__item-dot")).toBeTruthy();

    const readItem = container.querySelector(".topbar-notification__item:not(.is-unread)");
    expect(readItem).toBeTruthy();
    expect(readItem?.querySelector(".topbar-notification__item-dot")).toBeFalsy();
  });

  it("renders empty state when no notifications", async () => {
    resetNotificationStoreForTests();
    replaceNotifications([]);

    // Re-import to pick up new state via fresh module query param
    TopbarNotificationBell = await loadTopbarNotificationBell();

    await act(async () => {
      root.render(<TopbarNotificationBell />);
    });

    const button = container.querySelector(".topbar-notification__button") as HTMLButtonElement | null;
    await act(async () => {
      button?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    const empty = container.querySelector(".topbar-notification__empty");
    expect(empty).toBeTruthy();
    expect(empty?.textContent).toContain("No notifications yet");
  });

  it("clicking an item navigates and closes the popover", async () => {
    await act(async () => {
      root.render(<TopbarNotificationBell />);
    });

    const button = container.querySelector(".topbar-notification__button") as HTMLButtonElement | null;
    await act(async () => {
      button?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    const firstItem = container.querySelector(".topbar-notification__item") as HTMLButtonElement | null;
    expect(firstItem).toBeTruthy();

    await act(async () => {
      firstItem?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    expect(navigateCalls.length).toBeGreaterThan(0);

    const popupAfter = container.querySelector(".topbar-dropdown--open");
    expect(popupAfter).toBeFalsy();
  });

  it("popover layout structure has header, list body and footer classes", async () => {
    await act(async () => {
      root.render(<TopbarNotificationBell />);
    });

    const button = container.querySelector(".topbar-notification__button") as HTMLButtonElement | null;
    await act(async () => {
      button?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    const popup = container.querySelector(".topbar-notification__popup");
    expect(popup).toBeTruthy();
    expect(popup?.closest(".TopbarNotification")).toBeTruthy();

    // header structure
    const header = container.querySelector(".topbar-notification__header");
    expect(header).toBeTruthy();
    expect(header?.querySelector(".topbar-notification__title")).toBeTruthy();
    expect(header?.querySelector(".topbar-notification__mark-all")).toBeTruthy();

    // list and item body layout
    const list = container.querySelector(".topbar-notification__list");
    expect(list).toBeTruthy();
    const firstItem = list?.querySelector(".topbar-notification__item");
    expect(firstItem).toBeTruthy();
    expect(firstItem?.querySelector(".topbar-notification__item-body")).toBeTruthy();
    expect(firstItem?.querySelector(".topbar-notification__item-title-row")).toBeTruthy();
    expect(firstItem?.querySelector(".topbar-notification__item-message")).toBeTruthy();
  });

  it("CSS allows header wrapping and keeps mark-all clickable on narrow screens", async () => {
    const cssPath = new URL("./layout.css", import.meta.url).pathname;
    const css = await Bun.file(cssPath).text();

    // Header must allow wrapping so narrow screens don't squeeze title/subtitle
    const headerMatch = css.match(/\.topbar-notification__header\s*\{([^}]*)\}/s);
    expect(headerMatch).toBeTruthy();
    const headerRule = headerMatch![1];
    expect(headerRule).toMatch(/flex-wrap:\s*wrap/);
    expect(headerRule).not.toMatch(/flex-wrap:\s*nowrap/);
    expect(headerRule).toMatch(/min-width:\s*0/);

    // Left title area must be allowed to shrink
    const titleAreaMatch = css.match(/\.topbar-notification__header\s*>\s*div:first-child\s*\{([^}]*)\}/s);
    expect(titleAreaMatch).toBeTruthy();
    expect(titleAreaMatch![1]).toMatch(/min-width:\s*0/);

    // Mark-all button must never shrink or wrap its text
    const markAllMatch = css.match(/\.topbar-notification__mark-all\s*\{([^}]*)\}/s);
    expect(markAllMatch).toBeTruthy();
    const markAllRule = markAllMatch![1];
    expect(markAllRule).toMatch(/flex-shrink:\s*0/);
    expect(markAllRule).toMatch(/white-space:\s*nowrap/);

    // Narrow-screen protection: extract all @media blocks by brace counting
    const mediaBlocks: string[] = [];
    const mediaRegex = /@media\s*\([^)]+\)\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = mediaRegex.exec(css)) !== null) {
      let depth = 1;
      let i = m.index + m[0].length;
      while (i < css.length && depth > 0) {
        if (css[i] === "{") depth++;
        else if (css[i] === "}") depth--;
        i++;
      }
      mediaBlocks.push(css.slice(m.index, i));
    }

    const narrowBlock = mediaBlocks.find(
      (block) =>
        block.includes(".topbar-notification__mark-all") &&
        /max-width:\s*\d+px/.test(block),
    );
    expect(narrowBlock).toBeTruthy();

    // Assert the narrow-screen mark-all overrides
    const narrowMarkAllMatch = narrowBlock!.match(
      /\.topbar-notification__mark-all\s*\{([^}]*)\}/s,
    );
    expect(narrowMarkAllMatch).toBeTruthy();
    const narrowMarkAllRule = narrowMarkAllMatch![1];
    expect(narrowMarkAllRule).toMatch(/width:\s*100%/);
    expect(narrowMarkAllRule).toMatch(/justify-content:\s*center/);
    expect(narrowMarkAllRule).toMatch(/margin-left:\s*0/);
  });
});
