import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

let copiedText = "";
const copyToClipboard = mock((text: string, options?: any) => {
  copiedText = text;
  options?.onSuccess?.();
});
const toast = {
  success: mock(() => {}),
  error: mock(() => {}),
};

// Snapshot real modules before mock.module — Bun mock.restore() does not clear
// mock.module overrides, so suite siblings would otherwise inherit identity
// useAppDispatch / incomplete slice exports.
const realStore = await import("app/store");
const realDialogSlice = await import("chat/dialog/dialogSlice");
const realSettingSlice = await import("app/settings/settingSlice");
const realSpaceSlice = await import("create/space/spaceSlice");
const realEnv = await import("app/utils/env");
const realClipboard = await import("app/utils/clipboard");
const realToast = await import("app/utils/toast");
const realI18n = await import("react-i18next");
const realTooltip = await import("render/web/ui/Tooltip");
const realPopover = await import("render/web/ui/Popover");
const realMenu = await import("render/web/ui/Menu");
const realRac = await import("react-aria-components");
const realAppHooks = await import("app/hooks");
const realModelContextWindow = await import("ai/llm/getModelContextWindow");

const restoreLeakedModuleMocks = () => {
  mock.module("app/store", () => realStore);
  mock.module("chat/dialog/dialogSlice", () => realDialogSlice);
  mock.module("app/settings/settingSlice", () => realSettingSlice);
  mock.module("create/space/spaceSlice", () => realSpaceSlice);
  mock.module("app/utils/env", () => realEnv);
  mock.module("app/utils/clipboard", () => realClipboard);
  mock.module("app/utils/toast", () => realToast);
  mock.module("react-i18next", () => realI18n);
  mock.module("render/web/ui/Tooltip", () => realTooltip);
  mock.module("render/web/ui/Popover", () => realPopover);
  mock.module("render/web/ui/Menu", () => realMenu);
  mock.module("react-aria-components", () => realRac);
  mock.module("app/hooks", () => realAppHooks);
  mock.module("ai/llm/getModelContextWindow", () => realModelContextWindow);
};

const loadDialogMenu = async () => {
  mock.module("app/utils/clipboard", () => ({
    __esModule: true,
    default: copyToClipboard,
  }));
  mock.module("app/utils/toast", () => ({
    __esModule: true,
    default: toast,
    toast,
  }));
  mock.module("react-i18next", () => ({
    useTranslation: () => ({
      t: (_key: string, defaultValue?: string) => defaultValue || _key,
    }),
  }));
  mock.module("app/store", () => ({
    ...realStore,
    useAppDispatch: () => (action: unknown) => action,
    useAppSelector: (selector: any) => selector({}),
  }));
  mock.module("chat/dialog/dialogSlice", () => ({
    ...realDialogSlice,
    selectCurrentDialogTokens: () => ({
      inputTokens: 100,
      outputTokens: 50,
      totalCost: 0.005,
    }),
  }));
  mock.module("app/settings/settingSlice", () => ({
    ...realSettingSlice,
    selectCurrentServer: () => "http://localhost:3011",
    selectCopyDiagnosticsEnabled: () => true,
  }));
  mock.module("create/space/spaceSlice", () => ({
    ...realSpaceSlice,
    selectCurrentSpaceId: () => "space-current",
  }));
  mock.module("app/utils/env", () => ({
    ...realEnv,
    getIsDesktopApp: () => true,
  }));
  mock.module("render/web/ui/Tooltip", () => ({
    Tooltip: ({ children }: any) => <div>{children}</div>,
  }));
  // RAC overlays/interactions do not run in jsdom and — worse — leak global
  // state (requestAnimationFrame / transition listeners) into sibling test
  // files that share this process. Replace the RAC-backed Popover/Menu and the
  // MenuTrigger/Button primitives with lightweight equivalents so the menu tree
  // still renders for assertions without exercising react-aria runtime code
  // (same spirit as MessageInputContainer mocking render/web/ui/Popover).
  mock.module("render/web/ui/Popover", () => ({
    Popover: ({ children }: any) => <div>{children}</div>,
  }));
  mock.module("react-aria-components", () => ({
    MenuTrigger: ({ children }: any) => <>{children}</>,
    Button: ({ children, className, ...rest }: any) => (
      <button type="button" className={className} {...rest}>
        {children}
      </button>
    ),
  }));
  mock.module("render/web/ui/Menu", () => {
    const MenuActionContext = React.createContext<((key: string) => void) | null>(
      null,
    );
    return {
      Menu: ({ onAction, children, ...rest }: any) => (
        <MenuActionContext.Provider value={onAction ?? null}>
          <div role="menu" {...rest}>
            {children}
          </div>
        </MenuActionContext.Provider>
      ),
      MenuItem: ({ id, children, className }: any) => (
        <MenuActionContext.Consumer>
          {(onAction) => (
            <div
              role="menuitem"
              className={className}
              onClick={() => onAction?.(id)}
            >
              {children}
            </div>
          )}
        </MenuActionContext.Consumer>
      ),
    };
  });
  mock.module("app/hooks", () => ({
    ...realAppHooks,
    useFetchData: () => ({ data: { model: "gpt-4" } }),
  }));
  mock.module("ai/llm/getModelContextWindow", () => ({
    ...realModelContextWindow,
    getModelContextWindow: () => 8192,
  }));

  const module = await import("./DialogMenu.tsx");
  mock.restore();
  return module.default;
};

describe("DialogMenu diagnostics", () => {
  let dom: JSDOM;
  let root: Root;
  let container: HTMLDivElement;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;
  let previousHTMLElement: typeof globalThis.HTMLElement | undefined;
  let previousRequestAnimationFrame: any;
  let previousCancelAnimationFrame: any;
  let previousGetComputedStyle: any;
  let previousMatchMedia: any;

  beforeEach(() => {
    copiedText = "";
    copyToClipboard.mockClear();
    toast.success.mockClear();
    toast.error.mockClear();

    dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
      url: "http://localhost:5173/dialog/dialog-local?token=secret&panel=chat",
    });
    (dom.window as any).requestAnimationFrame = (callback: FrameRequestCallback) => {
      return dom.window.setTimeout(() => callback(Date.now()), 16);
    };
    (dom.window as any).cancelAnimationFrame = (id: number) => {
      dom.window.clearTimeout(id);
    };
    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousHTMLElement = globalThis.HTMLElement;
    previousRequestAnimationFrame = (globalThis as any).requestAnimationFrame;
    previousCancelAnimationFrame = (globalThis as any).cancelAnimationFrame;
    previousGetComputedStyle = (globalThis as any).getComputedStyle;
    previousMatchMedia = (globalThis as any).matchMedia;

    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      HTMLElement: dom.window.HTMLElement,
      requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
      cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
      getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
      matchMedia: dom.window.matchMedia?.bind(dom.window),
      NodeFilter: dom.window.NodeFilter ?? {
        SHOW_ELEMENT: 1,
        SHOW_ALL: 4294967295,
        FILTER_ACCEPT: 1,
        FILTER_REJECT: 2,
        FILTER_SKIP: 3,
      },
      CSS: dom.window.CSS ?? {
        escape: (value: string) =>
          String(value).replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`),
      },
    });
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
      HTMLElement: previousHTMLElement,
      requestAnimationFrame: previousRequestAnimationFrame,
      cancelAnimationFrame: previousCancelAnimationFrame,
      getComputedStyle: previousGetComputedStyle,
      matchMedia: previousMatchMedia,
    });
  });

  afterAll(() => {
    restoreLeakedModuleMocks();
  });

  it("copies diagnostics from the desktop action menu", async () => {
    const DialogMenu = await loadDialogMenu();
    await act(async () => {
      root.render(
        <DialogMenu
          currentDialog={{
            dbKey: "dialog-local",
            id: "dialog-server",
            title: "private title",
            summary: "private summary",
            taskPrompt: "private prompt",
            spaceId: "space-dialog",
            cybots: ["agent-1"],
            compressionCount: 0,
          }}
          showShareButton
        />,
      );
    });

    const menuButton = container.querySelector(
      ".dialog-menu__title-row button[aria-label='更多']",
    ) as HTMLButtonElement;
    expect(menuButton).toBeTruthy();

    await act(async () => {
      menuButton.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    const copyButton = Array.from(
      dom.window.document.body.querySelectorAll('[role="menuitem"]'),
    ).find((item) => item.textContent?.includes("复制诊断信息")) as HTMLElement;
    expect(copyButton).toBeTruthy();

    await act(async () => {
      copyButton.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });

    expect(copyToClipboard).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
    expect(copiedText).toContain("=== NOLO DIALOG DIAGNOSTICS ===");
    expect(copiedText).toContain('"runtime": "desktop"');
    expect(copiedText).toContain('"dialogKey": "dialog-local"');
    expect(copiedText).toContain('"spaceId": "space-current"');
    expect(copiedText).toContain("token=%5BREDACTED%5D");
    expect(copiedText).not.toContain("secret");
    expect(copiedText).not.toContain("private title");
    expect(copiedText).not.toContain("private summary");
    expect(copiedText).not.toContain("private prompt");
  });
});
