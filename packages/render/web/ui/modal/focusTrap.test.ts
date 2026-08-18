import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import {
  getFocusableElements,
  handleTabKey,
  isTopModalLayer,
  popModalLayer,
  pushModalLayer,
  resetModalLayerStack,
  restoreFocus,
  focusInitial,
  FOCUSABLE_SELECTOR,
} from "./focusTrap";

describe("focusTrap layer stack", () => {
  afterEach(() => {
    resetModalLayerStack();
  });

  it("tracks topmost modal layer", () => {
    const a = pushModalLayer();
    const b = pushModalLayer();
    expect(isTopModalLayer(a)).toBe(false);
    expect(isTopModalLayer(b)).toBe(true);
    popModalLayer(b);
    expect(isTopModalLayer(a)).toBe(true);
    popModalLayer(a);
    expect(isTopModalLayer(a)).toBe(false);
  });

  it("pop of non-top layer does not promote wrong id", () => {
    const a = pushModalLayer();
    const b = pushModalLayer();
    popModalLayer(a);
    expect(isTopModalLayer(b)).toBe(true);
    expect(isTopModalLayer(a)).toBe(false);
  });
});

describe("focusTrap DOM helpers", () => {
  let dom: JSDOM;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;
  let previousHTMLElement: typeof globalThis.HTMLElement | undefined;

  beforeEach(() => {
    dom = new JSDOM(
      `<!doctype html><html><body>
        <button id="outside">outside</button>
        <div id="container" tabindex="-1">
          <button id="first">first</button>
          <button id="mid" disabled>mid</button>
          <input id="field" />
          <button id="last">last</button>
          <button id="hidden" hidden>hidden</button>
          <a id="nolink">no href</a>
          <a id="link" href="#x">link</a>
        </div>
      </body></html>`,
      { url: "http://localhost/" }
    );
    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousHTMLElement = globalThis.HTMLElement;
    // @ts-expect-error test env
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    globalThis.HTMLElement = dom.window.HTMLElement;
  });

  afterEach(() => {
    // @ts-expect-error restore
    globalThis.window = previousWindow;
    globalThis.document = previousDocument!;
    globalThis.HTMLElement = previousHTMLElement!;
    resetModalLayerStack();
  });

  it("exports the shared focusable selector contract", () => {
    expect(FOCUSABLE_SELECTOR).toContain("a[href]");
    expect(FOCUSABLE_SELECTOR).toContain("button:not([disabled])");
    expect(FOCUSABLE_SELECTOR).toContain("textarea");
    expect(FOCUSABLE_SELECTOR).toContain("[tabindex]:not([tabindex='-1'])");
  });

  it("lists tabbable elements and skips disabled/hidden/no-href", () => {
    const container = document.getElementById("container")!;
    const ids = getFocusableElements(container).map((el) => el.id);
    expect(ids).toEqual(["first", "field", "last", "link"]);
  });

  it("cycles Tab from last to first and Shift+Tab from first to last", () => {
    const container = document.getElementById("container") as HTMLElement;
    const focusable = getFocusableElements(container);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    expect(first.id).toBe("first");
    expect(last.id).toBe("link");

    last.focus();
    let prevented = false;
    handleTabKey(
      {
        key: "Tab",
        shiftKey: false,
        preventDefault: () => {
          prevented = true;
        },
      },
      container
    );
    expect(prevented).toBe(true);
    expect(document.activeElement).toBe(first);

    prevented = false;
    first.focus();
    handleTabKey(
      {
        key: "Tab",
        shiftKey: true,
        preventDefault: () => {
          prevented = true;
        },
      },
      container
    );
    expect(prevented).toBe(true);
    expect(document.activeElement).toBe(last);
  });

  it("does not preventDefault for Tab in the middle of the list", () => {
    const container = document.getElementById("container") as HTMLElement;
    // "last" button is between first and link in tab order — not an edge.
    const mid = document.getElementById("last") as HTMLButtonElement;
    mid.focus();
    expect(document.activeElement).toBe(mid);

    let prevented = false;
    const handled = handleTabKey(
      {
        key: "Tab",
        shiftKey: false,
        preventDefault: () => {
          prevented = true;
        },
      },
      container
    );
    expect(handled).toBe(false);
    expect(prevented).toBe(false);
  });

  it("restores focus only when the node is still in the document", () => {
    const outside = document.getElementById("outside") as HTMLButtonElement;
    const field = document.getElementById("field") as HTMLInputElement;
    field.focus();
    expect(document.activeElement).toBe(field);

    restoreFocus(outside);
    expect(document.activeElement).toBe(outside);

    outside.remove();
    field.focus();
    restoreFocus(outside);
    expect(document.activeElement).toBe(field);
  });

  it("focusInitial prefers first tabbable and skips when already inside", () => {
    const container = document.getElementById("container") as HTMLElement;
    const first = document.getElementById("first") as HTMLButtonElement;
    const last = document.getElementById("last") as HTMLButtonElement;

    document.getElementById("outside")!.focus();
    focusInitial(container);
    expect(document.activeElement).toBe(first);

    last.focus();
    focusInitial(container);
    expect(document.activeElement).toBe(last);
  });
});
