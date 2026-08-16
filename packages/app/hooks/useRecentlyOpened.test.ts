import { afterEach, describe, expect, it } from "bun:test";

const HOOKS_PATH = new URL("./useRecentlyOpened.ts", import.meta.url).href;

const originalLocalStorage = globalThis.localStorage;
const originalWindow = globalThis.window;

function makeStorage(initialItems: unknown[] = []) {
  const store = new Map<string, string>();
  if (initialItems.length > 0) {
    store.set("nolo-recently-opened-v1", JSON.stringify(initialItems));
  }
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  } as Storage;
}

function makeWindow() {
  return {
    dispatchEvent() {
      return true;
    },
    addEventListener() {},
    removeEventListener() {},
  } as unknown as Window;
}

afterEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: originalLocalStorage,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: originalWindow,
    configurable: true,
    writable: true,
  });
});

describe("useRecentlyOpened helpers", () => {
  it("updates an existing recent item's title without changing its order", async () => {
    Object.defineProperty(globalThis, "localStorage", {
      value: makeStorage([
        { key: "dialog-1", type: "dialog", title: "Old A", accessedAt: 10 },
        { key: "dialog-2", type: "dialog", title: "Old B", accessedAt: 5 },
      ]),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: makeWindow(),
      configurable: true,
      writable: true,
    });

    const { updateRecentVisitTitle } = await import(`${HOOKS_PATH}?test=1`);
    updateRecentVisitTitle("dialog-2", "New B");

    const raw = localStorage.getItem("nolo-recently-opened-v1");
    expect(raw).not.toBeNull();
    const items = JSON.parse(raw!);
    expect(items).toEqual([
      { key: "dialog-1", type: "dialog", title: "Old A", accessedAt: 10 },
      { key: "dialog-2", type: "dialog", title: "New B", accessedAt: 5 },
    ]);
  });
});
