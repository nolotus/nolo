import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { useDragResize } from "./useDragResize";

const dispatchPointerEvent = (
  target: EventTarget,
  type: string,
  init: MouseEventInit = {}
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

describe("useDragResize", () => {
  let dom: JSDOM;
  let root: Root;
  let container: HTMLDivElement;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;
  let previousNavigator: typeof globalThis.navigator | undefined;
  let previousHTMLElement: typeof globalThis.HTMLElement | undefined;
  let previousActEnvironment: boolean | undefined;

  beforeEach(() => {
    dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
      url: "http://localhost/",
    });

    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousNavigator = globalThis.navigator;
    previousHTMLElement = globalThis.HTMLElement;
    previousActEnvironment = (globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    }).IS_REACT_ACT_ENVIRONMENT;

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

    Object.defineProperty(dom.window.HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: () => undefined,
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
      navigator: previousNavigator,
      HTMLElement: previousHTMLElement,
    });
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  it("handles pointer drag and restores previous body styles", async () => {
    const starts: number[] = [];
    const moves: Array<[number, number]> = [];
    const stops: number[] = [];

    const Harness = () => {
      const { handlePointerDown } = useDragResize({
        cursor: "col-resize",
        onStart: () => {
          starts.push(1);
        },
        onMove: (x, y) => {
          moves.push([x, y]);
        },
        onStop: () => {
          stops.push(1);
        },
      });

      return <div id="handle" onPointerDown={handlePointerDown} />;
    };

    await act(async () => {
      root.render(<Harness />);
    });

    document.body.style.userSelect = "text";
    document.body.style.cursor = "grab";
    const handle = document.getElementById("handle") as HTMLDivElement;

    act(() => {
      dispatchPointerEvent(handle, "pointerdown", { clientX: 20, clientY: 10 });
    });
    expect(starts).toHaveLength(1);
    expect(document.body.style.userSelect).toBe("none");
    expect(document.body.style.cursor).toBe("col-resize");

    act(() => {
      dispatchPointerEvent(window, "pointermove", { clientX: 80, clientY: 30 });
    });
    expect(moves).toEqual([[80, 30]]);

    act(() => {
      dispatchPointerEvent(window, "pointerup", { clientX: 80, clientY: 30 });
    });
    expect(stops).toHaveLength(1);
    expect(document.body.style.userSelect).toBe("text");
    expect(document.body.style.cursor).toBe("grab");
  });

  it("restores body styles when unmounted mid-drag", async () => {
    const stops: number[] = [];

    const Harness = () => {
      const { handlePointerDown } = useDragResize({
        cursor: "col-resize",
        onMove: () => undefined,
        onStop: () => {
          stops.push(1);
        },
      });

      return <div id="handle" onPointerDown={handlePointerDown} />;
    };

    await act(async () => {
      root.render(<Harness />);
    });

    document.body.style.userSelect = "text";
    document.body.style.cursor = "grab";
    const handle = document.getElementById("handle") as HTMLDivElement;

    act(() => {
      dispatchPointerEvent(handle, "pointerdown", { clientX: 10, clientY: 5 });
    });
    expect(document.body.style.userSelect).toBe("none");
    expect(document.body.style.cursor).toBe("col-resize");

    act(() => {
      root.unmount();
    });

    expect(document.body.style.userSelect).toBe("text");
    expect(document.body.style.cursor).toBe("grab");
    expect(stops).toHaveLength(1);
  });
});
