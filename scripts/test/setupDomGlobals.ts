const installDomElementFallback = () => {
  const globalWithDom = globalThis as typeof globalThis & {
    Node?: typeof Node;
    Element?: typeof Element;
    HTMLElement?: typeof HTMLElement;
  };

  // Floating-ui isNode/isElement/isHTMLElement helpers check
  // `value instanceof Node || value instanceof getWindow(value).Node`. The
  // first `instanceof` throws a ReferenceError if `Node` is not defined on
  // globalThis (JSDOM keeps it on `window`, not global). Install a stub so the
  // first check returns false and the per-window check handles cross-realm.
  if (typeof globalWithDom.Node === "undefined") {
    class TestNodeFallback {}
    globalWithDom.Node = TestNodeFallback as unknown as typeof Node;
  }

  if (typeof globalWithDom.Element === "undefined") {
    class TestElementFallback {}
    (
      TestElementFallback as unknown as { prototype: { matches?: () => boolean } }
    ).prototype.matches = () => false;
    globalWithDom.Element = TestElementFallback as unknown as typeof Element;
  }

  if (typeof globalWithDom.HTMLElement === "undefined") {
    globalWithDom.HTMLElement = globalWithDom.Element as unknown as typeof HTMLElement;
  }
};

installDomElementFallback();

const browserGlobals = [
  "HTMLTextAreaElement",
  "HTMLInputElement",
  "HTMLSelectElement",
  "HTMLButtonElement",
  "HTMLAnchorElement",
  "HTMLImageElement",
  "HTMLDivElement",
  "HTMLSpanElement",
  "HTMLParagraphElement",
  "HTMLHeadingElement",
  "HTMLFormElement",
  "HTMLTableElement",
  "HTMLTableRowElement",
  "HTMLTableCellElement",
  "HTMLUListElement",
  "HTMLOListElement",
  "HTMLLIElement",
  "HTMLOptionElement",
  "HTMLCanvasElement",
  "HTMLFrameElement",
  "HTMLIFrameElement",
  "HTMLVideoElement",
  "HTMLAudioElement",
  "HTMLTemplateElement",
  "SVGElement",
  "CustomEvent",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "FocusEvent",
  "PointerEvent",
  "DragEvent",
  "TouchEvent",
  "AnimationEvent",
  "TransitionEvent",
  "ResizeObserver",
  "IntersectionObserver",
  "MutationObserver",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "getComputedStyle",
  "matchMedia",
];

const dummyClasses: Record<string, any> = {};
const overrides: Record<string, any> = {};

for (const key of browserGlobals) {
  if (typeof (globalThis as any)[key] === "undefined") {
    Object.defineProperty(globalThis, key, {
      get() {
        if (overrides[key] !== undefined) {
          return overrides[key];
        }
        if (typeof window !== "undefined" && typeof (window as any)[key] !== "undefined") {
          return (window as any)[key];
        }
        if (!dummyClasses[key]) {
          if (key === "ResizeObserver" || key === "IntersectionObserver") {
            dummyClasses[key] = class {
              observe() {}
              unobserve() {}
              disconnect() {}
            };
          } else if (key === "MutationObserver") {
            dummyClasses[key] = class {
              observe() {}
              disconnect() {}
            };
          } else {
            dummyClasses[key] = class {};
          }
        }
        return dummyClasses[key];
      },
      set(value) {
        overrides[key] = value;
      },
      configurable: true,
    });
  }
}

export {};