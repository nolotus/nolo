// Headless render test for AllModelsSelector — proves the platform-API model
// dropdown actually surfaces the new grok-4.5 model under provider "xai".

import {
  describe,
  expect,
  test,
  beforeEach,
  afterEach,
  mock,
} from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import AllModelsSelector from "./AllModelsSelector";
import { ALL_MODELS } from "./models";
import type { ModelWithProvider } from "./models";

type ModuleVersion = { v: number };

const versionRef: ModuleVersion = { v: 0 };

const loadSelector = async (): Promise<{
  Selector: typeof AllModelsSelector;
}> => {
  const actualReactI18Next = await import("react-i18next");
  mock.module("react-i18next", () => ({
    ...actualReactI18Next,
    useTranslation: () => ({
      t: (_key: string, fallback?: string) => fallback ?? _key,
    }),
  }));
  const mod = (await import(
    `./AllModelsSelector.tsx?test=${versionRef.v++}`
  )) as { default: typeof AllModelsSelector };
  return { Selector: mod.default };
};

interface WindowWithRaf {
  requestAnimationFrame: (cb: (t: number) => void) => number;
  cancelAnimationFrame: (handle: number) => void;
}

const installDomPolyfills = (dom: JSDOM): void => {
  const win = dom.window as unknown as WindowWithRaf;
  // jsdom does not implement requestAnimationFrame. We polyfill with a
  // no-op scheduled on a timer. Handle numbering is not unique across
  // frames, so cancelAnimationFrame cannot cancel a specific frame —
  // this matches the test's needs (the Combobox scroll effect fires
  // once on open) but would be insufficient for tests that cancel
  // pending frames.
  win.requestAnimationFrame = (cb: (t: number) => void) => {
    setTimeout(() => cb(Date.now()), 0);
    return 0;
  };
  win.cancelAnimationFrame = () => {
    /* no-op — see requestAnimationFrame above */
  };
  // jsdom Element prototype does not implement scrollIntoView. Type as
  // a generic object so we can polyfill without fighting the strict
  // HTMLElement signature.
  const proto = dom.window.HTMLElement.prototype as unknown as {
    scrollIntoView?: (arg?: boolean | ScrollIntoViewOptions) => void;
  };
  if (typeof proto.scrollIntoView !== "function") {
    proto.scrollIntoView = () => {
      /* no-op */
    };
  }
};

describe("AllModelsSelector headless", () => {
  let dom: JSDOM;
  let root: Root | null;
  let container: HTMLDivElement;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;

  beforeEach(() => {
    dom = new JSDOM(
      "<!doctype html><html><body><div id='root'></div></body></html>",
      { url: "http://localhost" }
    );
    installDomPolyfills(dom);
    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    globalThis.window = dom.window as unknown as typeof globalThis.window;
    globalThis.document = dom.window.document;
    container = dom.window.document.getElementById("root") as HTMLDivElement;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    if (previousWindow === undefined) {
      delete (globalThis as { window?: typeof globalThis.window }).window;
    } else {
      globalThis.window = previousWindow;
    }
    if (previousDocument === undefined) {
      delete (globalThis as { document?: typeof globalThis.document }).document;
    } else {
      globalThis.document = previousDocument;
    }
  });

  test("ALL_MODELS exposes grok-4.6 under provider=nolo only (data source contract)", () => {
    // 目录已收敛为 nolo 平台托管单一来源：openai/google/xai 直连聚合已从
    // ALL_MODELS 移除，Grok 4.6 只以 provider=nolo 出现一次。
    expect(ALL_MODELS.some((m) => m.provider === "xai")).toBe(false);
    const noloGrok46 = ALL_MODELS.filter(
      (m) => m.provider === "nolo" && m.name === "grok-4.6"
    );
    expect(noloGrok46).toHaveLength(1);
    const model = noloGrok46[0];
    if (!model) throw new Error("unreachable: filter returned 0 entries");
    expect(model.displayName).toBe("Grok 4.6");
    expect(model.hasVision).toBe(true);
    expect(model.contextWindow).toBe(500_000);
  });

  test("renders Grok 4.6 as a selectable option in the open dropdown", async () => {
    const { Selector } = await loadSelector();
    const onChange = (_item: ModelWithProvider | null) => {
      /* no-op */
    };
    await act(async () => {
      root = createRoot(container);
      root.render(React.createElement(Selector, { value: null, onChange }));
    });

    const trigger = container.querySelector(
      "button[aria-haspopup], button"
    ) as HTMLButtonElement | null;
    if (!trigger) {
      throw new Error("combobox trigger button not found in DOM");
    }
    await act(async () => {
      trigger.click();
    });

    // Combobox renders the open dropdown with role="listbox" and each
    // option as role="option". Asserting a role=option node contains
    // "Grok 4.5" — not just any string match against the full tree —
    // proves the user can actually pick the new model from the
    // platform-API selector. querySelectorAll + filter is needed
    // because options are alphabetised and "Grok" is not the first.
    const options = Array.from(
      container.querySelectorAll('[role="option"]')
    ) as HTMLElement[];
    const grokOption = options.find((node) =>
      (node.textContent ?? "").includes("Grok 4.6")
    );
    expect(grokOption).toBeDefined();
  });

  test("dedupes same-name models: Claude Sonnet 5 appears exactly once", async () => {
    // 前置：目录收敛后 anthropic/claude-sonnet-5 只由平台托管 nolo 注册一条，
    // 去重逻辑本身仍需保证选择器里同名模型不重复出现。
    expect(
      ALL_MODELS.filter((m) => m.name === "anthropic/claude-sonnet-5").length
    ).toBeGreaterThanOrEqual(1);

    const { Selector } = await loadSelector();
    const onChange = (_item: ModelWithProvider | null) => {
      /* no-op */
    };
    await act(async () => {
      root = createRoot(container);
      root.render(React.createElement(Selector, { value: null, onChange }));
    });

    const trigger = container.querySelector(
      "button[aria-haspopup], button"
    ) as HTMLButtonElement | null;
    if (!trigger) {
      throw new Error("combobox trigger button not found in DOM");
    }
    await act(async () => {
      trigger.click();
    });

    const options = Array.from(
      container.querySelectorAll('[role="option"]')
    ) as HTMLElement[];
    const claudeSonnet5Options = options.filter((node) =>
      (node.textContent ?? "").includes("Claude Sonnet 5")
    );
    // 去重后选择器里同名模型只保留一条（平台托管 nolo 优先）
    expect(claudeSonnet5Options).toHaveLength(1);
  });
});
