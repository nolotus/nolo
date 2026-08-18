import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import {
  addPendingFile,
  applyClearDialogStateRuntime,
  enqueueUserInput,
  dequeueUserInput,
  clearDialogConfigError,
  getActiveDialogKey,
  getDialogConfigError,
  getPendingFiles,
  getPendingUserInputQueue,
  getSnapshot,
  resetDialogRuntimeStoreForTests,
  selectConfigError,
  selectCurrentDialogKey,
  setActiveDialogKey,
  setDialogConfigError,
  setLoopStopReason,
  getLoopStopReason,
} from "./dialogRuntimeStore";

describe("dialogRuntimeStore", () => {
  beforeEach(() => {
    resetDialogRuntimeStoreForTests();
  });
  afterEach(() => {
    resetDialogRuntimeStoreForTests();
  });

  it("keeps FIFO queue per dialog key", () => {
    enqueueUserInput({ text: "a", dialogKey: "d1" });
    enqueueUserInput({ text: "b", dialogKey: "d1" });
    dequeueUserInput({ dialogKey: "d1" });
    expect(getPendingUserInputQueue("d1")).toEqual(["b"]);
  });

  it("routes dialog-type pending files to active dialog", () => {
    setActiveDialogKey("dialog-current");
    addPendingFile({
      id: "ref-1",
      name: "Other",
      type: "dialog",
      dialogKey: "dialog-other",
    });
    expect(getPendingFiles("dialog-current")).toHaveLength(1);
    expect(getPendingFiles("dialog-other")).toHaveLength(0);
  });

  it("bumps snapshot when loop stop reason changes", () => {
    const before = getSnapshot();
    setLoopStopReason({ reason: "pending", dialogKey: "d1" });
    expect(getSnapshot()).not.toBe(before);
    expect(getLoopStopReason("d1")).toBe("pending");
  });

  it("setActiveDialogKey clears a previously stored configError", () => {
    setDialogConfigError("boom");
    expect(getDialogConfigError()).toBe("boom");
    setActiveDialogKey("dialog-next");
    expect(getActiveDialogKey()).toBe("dialog-next");
    expect(getDialogConfigError()).toBeNull();
  });

  it("setDialogConfigError / clearDialogConfigError update the snapshot", () => {
    const before = getSnapshot();
    setDialogConfigError("load failed");
    expect(getSnapshot()).not.toBe(before);
    expect(getDialogConfigError()).toBe("load failed");
    clearDialogConfigError();
    expect(getDialogConfigError()).toBeNull();
  });

  it("applyClearDialogStateRuntime resets both active key and configError", () => {
    setActiveDialogKey("dialog-active");
    setDialogConfigError("still failing");
    applyClearDialogStateRuntime();
    expect(getActiveDialogKey()).toBeNull();
    expect(getDialogConfigError()).toBeNull();
  });

  it("selectCurrentDialogKey / selectConfigError read the module store", () => {
    expect(selectCurrentDialogKey({})).toBeNull();
    expect(selectConfigError({})).toBeNull();
    setActiveDialogKey("dialog-x");
    setDialogConfigError("err");
    expect(selectCurrentDialogKey({})).toBe("dialog-x");
    expect(selectConfigError({})).toBe("err");
  });
});
