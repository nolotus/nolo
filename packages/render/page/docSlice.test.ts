// 文件: render/page/docSlice.test.ts
// Originally tested the Redux docSlice reducer. After peeling the doc state
// out of Redux into the standalone docStore (render/page/docStore.ts), the
// reducer is gone. These tests now cover the equivalent docStore mutators so
// the applyExternalDocUpdate contract stays guarded at this path.
//
// Full docStore coverage lives in docStore.test.ts; this file keeps a focused
// regression on the external-update path that AI updateDocTool relies on.

import { describe, expect, test } from "bun:test";

import {
  applyExternalDocUpdate,
  getDocState,
  previewDocState,
  resetDocStoreForTests,
} from "./docStore";

const paragraph = (text: string) => ({
  type: "paragraph",
  children: [{ text }],
});

function createInitializedState() {
  resetDocStoreForTests();
  previewDocState({
    dbKey: "page-1",
    id: "id-1",
    type: "doc",
    title: "原标题",
    slateData: [paragraph("old")],
    tags: null,
    icon: null,
    spaceId: null,
    content: "old",
    meta: null,
  });
  return getDocState();
}

describe("applyExternalDocUpdate", () => {
  test("替换 slateData 并同步 lastSaved 标记与 lastSavedAt", () => {
    createInitializedState();
    const next = applyExternalDocUpdate({
      slateData: [paragraph("new")],
      content: "# new",
      title: "新标题",
      savedAt: "2026-07-21T12:00:00.000Z",
    });
    void next;
    const s = getDocState();
    expect(s.slateData).toEqual([paragraph("new")]);
    expect(s.lastSavedSlateData).toEqual([paragraph("new")]);
    expect(s.title).toBe("新标题");
    expect(s.lastSavedTitle).toBe("新标题");
    expect(s.lastSavedAt).toBe("2026-07-21T12:00:00.000Z");
    expect(s.justSaved).toBe(true);
    // externalUpdateSeq drives the editor remount key now.
    expect(s.externalUpdateSeq).toBe(1);
  });

  test("未初始化的文档不应用外部更新", () => {
    resetDocStoreForTests();
    applyExternalDocUpdate({ slateData: [paragraph("new")] });
    const s = getDocState();
    expect(s.slateData).toBeNull();
    expect(s.lastSavedAt).toBeNull();
  });
});