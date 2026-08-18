import { afterEach, describe, expect, it } from "bun:test";

import {
  clearAllComposerImageDrafts,
  clearComposerImageDraft,
  getComposerImageDraft,
  resetComposerImageDraftStoreForTests,
  setComposerImageDraft,
} from "./composerImageDraftStore";

describe("composerImageDraftStore", () => {
  afterEach(() => {
    resetComposerImageDraftStoreForTests();
  });

  it("keeps image drafts per dialog key across leave/re-enter", () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    setComposerImageDraft("dialog-a", [
      { id: "img-1", file, previewUrl: "blob:preview-1" },
    ]);
    setComposerImageDraft("dialog-b", []);

    expect(getComposerImageDraft("dialog-a")).toHaveLength(1);
    expect(getComposerImageDraft("dialog-a")[0]?.id).toBe("img-1");
    expect(getComposerImageDraft("dialog-b")).toEqual([]);
  });

  it("clearAll wipes every dialog draft", () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    setComposerImageDraft("dialog-a", [
      { id: "img-1", file, previewUrl: "data:image/png;base64,xx" },
    ]);
    clearAllComposerImageDrafts();
    expect(getComposerImageDraft("dialog-a")).toEqual([]);
  });

  it("clearComposerImageDraft removes one dialog only", () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    setComposerImageDraft("dialog-a", [
      { id: "img-1", file, previewUrl: "data:image/png;base64,xx" },
    ]);
    setComposerImageDraft("dialog-b", [
      { id: "img-2", file, previewUrl: "data:image/png;base64,yy" },
    ]);
    clearComposerImageDraft("dialog-a");
    expect(getComposerImageDraft("dialog-a")).toEqual([]);
    expect(getComposerImageDraft("dialog-b")).toHaveLength(1);
  });
});
