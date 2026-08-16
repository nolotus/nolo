// 文件: render/page/docStore.test.ts
// Tests for the standalone doc store (peeled out of Redux).
// Key invariant under test: saveDocState must NOT bump externalUpdateSeq
// (the editor remount key) — that was the root cause of the caret-jump bug
// where every autosave remounted the Slate editor. Only applyExternalDocUpdate
// (AI / external writes) may bump it.

import { describe, expect, test } from "bun:test";

import { DataType } from "create/types";
import { readAndWait } from "database/dbSlice";
import {
  applyExternalDocUpdate,
  getDocState,
  getDocHasPendingChanges,
  initDocState,
  resetDocStoreForTests,
  saveDocState,
  updateSlateDoc,
  updateTitleDoc,
  previewDocState,
  resetDocState,
  setDocFocusContext,
  toggleReadOnlyDoc,
} from "./docStore";

const paragraph = (text: string) => ({
  type: "paragraph",
  children: [{ text }],
});

function seedInitializedWritable() {
  resetDocStoreForTests();
  // previewDocState gives us an initialized, readonly doc; flip writable.
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
  // previewDocState sets readonly true; toggle once to make it writable.
  toggleReadOnlyDoc();
}

describe("docStore initial state", () => {
  test("starts uninitialized and readonly with seq 0", () => {
    resetDocStoreForTests();
    const s = getDocState();
    expect(s.isInitialized).toBe(false);
    expect(s.isReadOnly).toBe(true);
    expect(s.externalUpdateSeq).toBe(0);
    expect(s.lastSavedAt).toBeNull();
  });
});

describe("applyExternalDocUpdate", () => {
  test("替换 slateData 并同步 lastSaved 标记与 lastSavedAt，且递增 externalUpdateSeq", () => {
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
    const before = getDocState();
    expect(before.externalUpdateSeq).toBe(0);

    applyExternalDocUpdate({
      slateData: [paragraph("new")],
      content: "# new",
      title: "新标题",
      savedAt: "2026-07-21T12:00:00.000Z",
    });

    const after = getDocState();
    expect(after.slateData).toEqual([paragraph("new")]);
    expect(after.lastSavedSlateData).toEqual([paragraph("new")]);
    expect(after.title).toBe("新标题");
    expect(after.lastSavedTitle).toBe("新标题");
    expect(after.lastSavedAt).toBe("2026-07-21T12:00:00.000Z");
    expect(after.justSaved).toBe(true);
    // 关键：externalUpdateSeq 递增（驱动编辑器重挂载）
    expect(after.externalUpdateSeq).toBe(before.externalUpdateSeq + 1);
  });

  test("未初始化的文档不应用外部更新", () => {
    resetDocStoreForTests();
    applyExternalDocUpdate({ slateData: [paragraph("new")] });
    const s = getDocState();
    expect(s.slateData).toBeNull();
    expect(s.lastSavedAt).toBeNull();
    expect(s.externalUpdateSeq).toBe(0);
  });
});

describe("saveDocState — caret bug fix (cursor-jump regression)", () => {
  test("保存成功后更新 lastSavedAt 但 NOT 递增 externalUpdateSeq", async () => {
    seedInitializedWritable();
    // 改内容产生 pending changes
    updateSlateDoc([paragraph("edited")]);

    const patchCalls: any[] = [];
    const fakeDispatch = (action: any) => {
      patchCalls.push(action);
      // 模拟 redux thunk: dispatch(thunkAction) 返回的 promise 上挂 .unwrap()
      const p: any = Promise.resolve();
      p.unwrap = () => Promise.resolve();
      return p;
    };
    const fakeGetState = () => ({ doc: getDocState() });

    const seqBefore = getDocState().externalUpdateSeq;
    const lastSavedBefore = getDocState().lastSavedAt;

    await saveDocState(
      { pageKey: "page-1" },
      { dispatch: fakeDispatch, getState: fakeGetState } as any,
    );

    const after = getDocState();
    expect(after.isSaving).toBe(false);
    expect(after.justSaved).toBe(true);
    expect(after.lastSavedSlateData).toEqual([paragraph("edited")]);
    expect(after.lastSavedTitle).toBe("原标题");
    // lastSavedAt 被更新为新的 ISO 时间（不再是旧的）
    expect(after.lastSavedAt).not.toBe(lastSavedBefore);
    expect(after.lastSavedAt).toBeTruthy();
    // ★ 关键回归断言：用户保存不递增 externalUpdateSeq，编辑器不重挂载
    expect(after.externalUpdateSeq).toBe(seqBefore);
  });

  test("pageKey 不匹配时不保存", async () => {
    seedInitializedWritable();
    updateSlateDoc([paragraph("edited")]);
    const before = getDocState();
    let called = false;
    const fakeDispatch = () => {
      called = true;
      const p: any = Promise.resolve();
      p.unwrap = () => Promise.resolve();
      return p;
    };
    await saveDocState(
      { pageKey: "other-page" },
      {
        dispatch: fakeDispatch,
        getState: () => ({ doc: getDocState() }),
      } as any,
    );
    expect(called).toBe(false);
    const after = getDocState();
    // 未触发 pending 的 isSaving 翻转
    expect(after.isSaving).toBe(before.isSaving);
  });

  // ── 回归测试：无改动时不写数据库，避免旧编辑器状态覆盖 AI/外部写入 ──
  // 场景：用户左边开着文档编辑器（持有旧 slateData），右边对话用 updateDoc
  // 写了新内容到数据库。此时 visibilitychange/beforeunload/组件卸载
  // 无条件触发 saveNow()。修复前：旧 slateData 被 PATCH 回数据库，覆盖新内容。
  // 修复后：hasPendingChanges=false 时 saveDocState 直接 return，不写数据库。
  test("无 pending changes 时跳过写入（防止覆盖外部更新）", async () => {
    seedInitializedWritable();
    // 不改动内容，slateData === lastSavedSlateData → hasPendingChanges=false
    let patchCalled = false;
    const fakeDispatch = () => {
      patchCalled = true;
      const p: any = Promise.resolve();
      p.unwrap = () => Promise.resolve();
      return p;
    };
    await saveDocState(
      { pageKey: "page-1", triggerSource: "beforeunload" } as any,
      {
        dispatch: fakeDispatch,
        getState: () => ({ doc: getDocState() }),
      } as any,
    );
    // 关键：没有改动，不应对数据库发起 PATCH
    expect(patchCalled).toBe(false);
    // 状态保持不变
    const after = getDocState();
    expect(after.isSaving).toBe(false);
    expect(after.justSaved).toBe(false);
  });
});

describe("sync mutators", () => {
  test("updateSlateDoc 在未初始化时是 no-op", () => {
    resetDocStoreForTests();
    updateSlateDoc([paragraph("x")]);
    expect(getDocState().slateData).toBeNull();
  });

  test("updateSlateDoc 在只读时是 no-op", () => {
    resetDocStoreForTests();
    previewDocState({
      dbKey: "p",
      id: "i",
      type: "doc",
      title: "t",
      slateData: [paragraph("old")],
      content: "old",
    });
    // readonly by default via previewDocState
    updateSlateDoc([paragraph("x")]);
    expect(getDocState().slateData).toEqual([paragraph("old")]);
  });

  test("updateSlateDoc 相同引用时跳过", () => {
    seedInitializedWritable();
    const same = getDocState().slateData;
    updateSlateDoc(same as any);
    // justSaved stays false (no change → no bump)
    expect(getDocState().justSaved).toBe(false);
  });

  test("updateTitleDoc 置 justSaved=false", () => {
    seedInitializedWritable();
    updateTitleDoc("新标题");
    expect(getDocState().title).toBe("新标题");
    expect(getDocState().justSaved).toBe(false);
  });

  test("setDocFocusContext 写入 focusContext", () => {
    resetDocStoreForTests();
    const fc = {
      isFocused: true,
      isCollapsed: true,
      anchorPath: [0],
      anchorOffset: 0,
      focusPath: [0],
      focusOffset: 0,
      selectedText: null,
      blockType: "paragraph",
    };
    setDocFocusContext(fc);
    expect(getDocState().focusContext).toEqual(fc);
  });

  test("toggleReadOnlyDoc 翻转 isReadOnly", () => {
    resetDocStoreForTests();
    expect(getDocState().isReadOnly).toBe(true);
    toggleReadOnlyDoc();
    expect(getDocState().isReadOnly).toBe(false);
    toggleReadOnlyDoc();
    expect(getDocState().isReadOnly).toBe(true);
  });

  test("resetDocState 回到初态", () => {
    seedInitializedWritable();
    resetDocState();
    expect(getDocState().isInitialized).toBe(false);
    expect(getDocState().slateData).toBeNull();
  });
});

describe("getDocHasPendingChanges", () => {
  test("未初始化时返回 false", () => {
    resetDocStoreForTests();
    expect(getDocHasPendingChanges()).toBe(false);
  });

  test("只读时返回 false", () => {
    resetDocStoreForTests();
    previewDocState({
      dbKey: "p",
      id: "i",
      type: "doc",
      title: "t",
      slateData: [paragraph("a")],
      content: "a",
    });
    expect(getDocHasPendingChanges()).toBe(false);
  });

  test("初始化可写且 slate 改动后返回 true", () => {
    seedInitializedWritable();
    expect(getDocHasPendingChanges()).toBe(false);
    updateSlateDoc([paragraph("changed")]);
    expect(getDocHasPendingChanges()).toBe(true);
  });

  test("仅标题改动也算 pending", () => {
    seedInitializedWritable();
    updateTitleDoc("改名了");
    expect(getDocHasPendingChanges()).toBe(true);
  });

  test("initDocState 装载/刷新数据时自增 externalUpdateSeq 以重挂载编辑器", async () => {
    resetDocStoreForTests();
    const mockPageData = {
      type: DataType.DOC,
      dbKey: "page-1",
      id: "id-1",
      title: "文档标题",
      slateData: [paragraph("hello")],
      content: "hello",
    };
    const actionResult = readAndWait.fulfilled(mockPageData as any, "", "page-1");
    const fakeDispatch = () => Promise.resolve(actionResult);

    const seqBefore = getDocState().externalUpdateSeq;
    await initDocState(
      { pageKey: "page-1", isReadOnly: false },
      { dispatch: fakeDispatch, getState: () => ({ doc: getDocState() }) }
    );
    const seqAfter = getDocState().externalUpdateSeq;
    expect(seqAfter).toBe(seqBefore + 1);
  });
});