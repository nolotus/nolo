import type { DesktopWindowFrame } from "./desktopWindowState";

type WindowSize = { width: number; height: number };
type Cancel = () => void;

type CefWindow = {
  webview: { on: (event: "dom-ready", callback: () => void) => void };
  on: (event: "close", callback: () => void) => void;
  getSize: () => WindowSize;
  isMaximized: () => boolean;
  setSize: (width: number, height: number) => void;
};

const sameSize = (a: WindowSize, b: WindowSize) => a.width === b.width && a.height === b.height;

export function syncInitialCefLayout(
  window: CefWindow,
  subscribeResize: (callback: () => void) => Cancel,
  schedule: (callback: () => void, delayMs: number) => Cancel = (callback, delayMs) => {
    const timer = setTimeout(callback, delayMs);
    return () => clearTimeout(timer);
  },
) {
  let started = false;
  let closed = false;
  let stopWaiting: Cancel | undefined;
  let pulse: { original: WindowSize; temporary: WindowSize } | undefined;
  window.on("close", () => {
    closed = true;
    stopWaiting?.();
  });
  window.webview.on("dom-ready", () => {
    if (started || closed) return;
    started = true;
    // Linux/CEF can start with an oversized native child despite a correct DOM
    // viewport. A real resize after initial allocation refreshes the child.
    schedule(() => {
      if (closed || window.isMaximized()) return;
      const { width, height } = window.getSize();
      if (width <= 2 || height <= 0) return;
      const original = { width, height };
      const temporary = { width: width - 2, height };
      pulse = { original, temporary };
      // Subscribe before issuing the request so an immediate acknowledgement
      // is not missed. An unchanged size is not an acknowledgement.
      const unsubscribe = subscribeResize(() => {
        if (window.isMaximized()) {
          stopWaiting?.();
          return;
        }
        const current = window.getSize();
        if (sameSize(current, temporary)) {
          stopWaiting?.();
          window.setSize(width, height);
        } else if (!sameSize(current, original)) {
          pulse = undefined;
          stopWaiting?.();
        }
      });
      const cancelTimeout = schedule(() => stopWaiting?.(), 1000);
      stopWaiting = () => {
        stopWaiting = undefined;
        unsubscribe();
        cancelTimeout();
      };
      window.setSize(temporary.width, height);
    }, 400);
  });

  // Keep the pulse dimensions after close, timeout and the restore request:
  // the WM may still be applying a resize when the shutdown handlers save.
  return (frame: DesktopWindowFrame): DesktopWindowFrame =>
    pulse && sameSize(frame, pulse.temporary) ? { ...frame, width: pulse.original.width } : frame;
}
