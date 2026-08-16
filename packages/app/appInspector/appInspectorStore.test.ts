import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  clearSelectedNode,
  getAppKey,
  getInspecting,
  getSelectedNode,
  getSnapshot,
  resetAppInspectorStoreForTests,
  setInspecting,
  setSelectedNode,
  subscribe,
  type AppSelectedNode,
} from "./appInspectorStore";

describe("appInspectorStore", () => {
  afterEach(() => {
    resetAppInspectorStoreForTests();
  });

  it("has expected initial state", () => {
    expect(getInspecting()).toBe(false);
    expect(getSelectedNode()).toBeNull();
    expect(getAppKey()).toBeNull();
  });

  it("updates inspecting state via setInspecting", () => {
    const listener = mock(() => {});
    const unsubscribe = subscribe(listener);
    const v1 = getSnapshot();

    setInspecting(true);

    expect(getInspecting()).toBe(true);
    expect(getSnapshot()).toBeGreaterThan(v1);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it("sets selected node and appKey via setSelectedNode", () => {
    const sampleNode: AppSelectedNode = {
      cssPath: "div#app > button.primary",
      tagName: "button",
      classList: ["primary"],
      textSnippet: "Click Me",
      outerHTMLSnippet: "<button class=\"primary\">Click Me</button>",
      noloLoc: "src/App.tsx:12:5",
    };

    const listener = mock(() => {});
    const unsubscribe = subscribe(listener);

    setSelectedNode({ appKey: "app_123", node: sampleNode });

    expect(getAppKey()).toBe("app_123");
    expect(getSelectedNode()).toEqual(sampleNode);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it("clears selected node and appKey via clearSelectedNode", () => {
    const sampleNode: AppSelectedNode = {
      cssPath: "h1",
      tagName: "h1",
      classList: [],
      textSnippet: "Title",
      outerHTMLSnippet: "<h1>Title</h1>",
    };

    setSelectedNode({ appKey: "app_456", node: sampleNode });
    expect(getSelectedNode()).not.toBeNull();
    expect(getAppKey()).toBe("app_456");

    const listener = mock(() => {});
    const unsubscribe = subscribe(listener);
    const vBefore = getSnapshot();

    clearSelectedNode();

    expect(getSelectedNode()).toBeNull();
    expect(getAppKey()).toBeNull();
    expect(getSnapshot()).toBeGreaterThan(vBefore);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it("unsubscribes correctly", () => {
    const listener = mock(() => {});
    const unsubscribe = subscribe(listener);

    setInspecting(true);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();

    setInspecting(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
