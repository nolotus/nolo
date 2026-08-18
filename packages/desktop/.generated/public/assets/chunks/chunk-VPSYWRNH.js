import {
  formatISO,
  patch,
  readAndWait,
  updateContentTitle
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/page/docStore.ts
var import_react = __toESM(require_react(), 1);
var createInitialState = () => ({
  content: null,
  slateData: null,
  title: null,
  dbSpaceId: null,
  tags: null,
  icon: null,
  isReadOnly: true,
  isLoading: false,
  isInitialized: false,
  error: null,
  pageKey: null,
  isSaving: false,
  saveError: null,
  lastSavedAt: null,
  createdAt: null,
  lastSavedSlateData: null,
  lastSavedTitle: null,
  lastSavedIcon: null,
  justSaved: false,
  tools: null,
  meta: null,
  id: null,
  type: null,
  creator: null,
  focusContext: null,
  externalUpdateSeq: 0
});
var listeners = /* @__PURE__ */ new Set();
var version = 0;
var state = createInitialState();
var notify = () => {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
    }
  }
};
var bump = () => {
  version += 1;
  notify();
};
var setState = (updater) => {
  state = typeof updater === "function" ? updater(state) : updater;
  bump();
};
var deepEqualEditorContent = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  const isArrayA = Array.isArray(a);
  const isArrayB = Array.isArray(b);
  if (isArrayA || isArrayB) {
    if (!isArrayA || !isArrayB || a.length !== b.length) return false;
    return a.every(
      (item, index) => deepEqualEditorContent(item, b[index])
    );
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(
    (key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqualEditorContent(a[key], b[key])
  );
};
var hasSlateContentChanged = (newContent, oldContent) => {
  if (newContent === oldContent) return false;
  if (!newContent || !oldContent) return true;
  if (newContent.length !== oldContent.length) return true;
  return !deepEqualEditorContent(newContent, oldContent);
};
function getDocState() {
  return state;
}
function getDocField(selector) {
  return selector(state);
}
function getDocPageKey() {
  return state.pageKey;
}
function getDocIsInitialized() {
  return state.isInitialized;
}
function getDocIsReadOnly() {
  return state.isReadOnly;
}
function getDocHasPendingChanges() {
  if (!state.isInitialized || state.isReadOnly) return false;
  return hasSlateContentChanged(state.slateData, state.lastSavedSlateData) || (state.title || "") !== (state.lastSavedTitle || "") || JSON.stringify(state.icon ?? null) !== JSON.stringify(state.lastSavedIcon ?? null);
}
function updateSlateDoc(value) {
  if (!state.isInitialized || state.isReadOnly) return;
  if (state.slateData === value) return;
  setState((prev) => ({ ...prev, slateData: value, justSaved: false }));
}
function updateTitleDoc(title) {
  if (!state.isInitialized || state.isReadOnly) return;
  setState((prev) => ({ ...prev, title, justSaved: false }));
}
function updateIconDoc(icon) {
  if (!state.isInitialized || state.isReadOnly) return;
  setState((prev) => ({ ...prev, icon, justSaved: false }));
}
function resetJustSavedStatus() {
  if (state.justSaved === false) return;
  setState((prev) => ({ ...prev, justSaved: false }));
}
function setDocFocusContext(focusContext) {
  setState((prev) => ({ ...prev, focusContext }));
}
function toggleReadOnlyDoc() {
  setState((prev) => ({ ...prev, isReadOnly: !prev.isReadOnly }));
}
function setReadOnlyDoc(isReadOnly) {
  setState((prev) => ({ ...prev, isReadOnly }));
}
function updateDocTags(tags) {
  if (!state.isInitialized) return;
  setState((prev) => ({ ...prev, tags }));
}
function resetDocState() {
  setState(createInitialState());
}
function previewDocState(payload) {
  const next = createInitialState();
  next.isInitialized = true;
  next.isLoading = false;
  next.isReadOnly = true;
  next.slateData = payload.slateData;
  next.title = payload.title;
  next.lastSavedTitle = payload.title;
  next.pageKey = payload.dbKey;
  next.id = payload.id;
  next.type = payload.type || "page" /* DOC */;
  next.lastSavedSlateData = payload.slateData;
  next.tags = payload.tags || null;
  next.icon = payload.icon || null;
  next.lastSavedIcon = payload.icon || null;
  next.dbSpaceId = payload.spaceId;
  next.content = payload.content || null;
  next.meta = payload.meta || null;
  setState(next);
}
function applyExternalDocUpdate(payload) {
  if (!state.isInitialized) return;
  const { slateData, content, title, tools, meta, savedAt } = payload;
  setState((prev) => {
    const next = {
      ...prev,
      slateData,
      lastSavedSlateData: slateData,
      lastSavedAt: savedAt ?? (/* @__PURE__ */ new Date()).toISOString(),
      justSaved: true,
      saveError: null,
      externalUpdateSeq: prev.externalUpdateSeq + 1
    };
    if (content !== void 0) next.content = content;
    if (title != null) {
      next.title = title;
      next.lastSavedTitle = title;
    }
    if (tools !== void 0) next.tools = tools;
    if (meta !== void 0) next.meta = meta;
    return next;
  });
}
async function initDocState(args, { dispatch }) {
  const { pageKey, isReadOnly } = args;
  setState((prev) => ({
    ...createInitialState(),
    isLoading: true,
    pageKey,
    isReadOnly
  }));
  try {
    const readAction = await dispatch(readAndWait(pageKey));
    if (readAndWait.fulfilled.match(readAction) && readAction.payload) {
      const data = readAction.payload;
      if (data.type !== "page" /* DOC */) {
        const msg = `\u52A0\u8F7D\u7684\u5185\u5BB9 ${pageKey} \u4E0D\u662F\u6587\u6863\u7C7B\u578B (${data.type})`;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isInitialized: true,
          error: msg
        }));
        return;
      }
      const payload = data;
      const lastSavedAt = payload.updatedAt || payload.updated_at || null;
      const createdAt = typeof payload.created === "string" && payload.created || typeof payload.createdAt === "string" && payload.createdAt || lastSavedAt;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isInitialized: true,
        error: null,
        externalUpdateSeq: prev.externalUpdateSeq + 1,
        content: payload.content || null,
        slateData: payload.slateData || null,
        lastSavedSlateData: payload.slateData || null,
        title: payload.title || null,
        lastSavedTitle: payload.title || null,
        dbSpaceId: payload.spaceId || null,
        tags: payload.tags || null,
        icon: payload.icon || null,
        lastSavedIcon: payload.icon || null,
        isReadOnly: payload.isReadOnly,
        pageKey: payload.dbKey,
        id: payload.id,
        type: payload.type,
        lastSavedAt,
        createdAt,
        tools: payload.tools || null,
        meta: payload.meta || null
      }));
    } else {
      const msg = readAction.payload?.message || `\u65E0\u6CD5\u52A0\u8F7D\u6587\u6863 ${pageKey}`;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isInitialized: true,
        error: msg
      }));
    }
  } catch (e) {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      isInitialized: true,
      error: e?.message || `\u521D\u59CB\u5316\u6587\u6863 ${pageKey} \u65F6\u51FA\u9519`
    }));
  }
}
async function saveDocState(arg, { dispatch, getState }) {
  const requestedPageKey = arg.pageKey;
  const current = state;
  const { pageKey, slateData, dbSpaceId, meta, icon } = current;
  const triggerSource = arg.triggerSource ?? "unknown";
  const hasPending = getDocHasPendingChanges();
  if (typeof console !== "undefined") {
    console.info("[saveDocState] triggered", {
      triggerSource,
      pageKey,
      hasPendingChanges: hasPending,
      lastSavedAt: current.lastSavedAt,
      externalUpdateSeq: current.externalUpdateSeq
      // 若 hasPending=false，说明 slateData===lastSavedSlateData，
      // 此刻 save 仍被无条件触发 → 会用旧内容覆盖数据库（若数据库已有更新）
    });
  }
  if (!pageKey || pageKey !== requestedPageKey) {
    return;
  }
  if (!slateData) {
    return;
  }
  if (!hasPending) {
    if (typeof console !== "undefined") {
      console.info("[saveDocState] skipped \u2014 no pending changes (protects external writes)", {
        triggerSource,
        pageKey,
        externalUpdateSeq: current.externalUpdateSeq
      });
    }
    return;
  }
  setState((prev) => ({
    ...prev,
    isSaving: true,
    saveError: null,
    justSaved: false
  }));
  try {
    const [
      { extractTitleFromSlate, extractMentionsFromSlate },
      { slateToRenderMarkdown },
      { buildSkillSummaryMarker }
    ] = await Promise.all([
      import("/public/assets/chunks/slateUtils-2IH3MOGG.js"),
      import("/public/assets/chunks/slateToRenderMarkdown-ZWIU3JMZ.js"),
      import("/public/assets/chunks/skillSummaryMarker-DXQ52O6C.js")
    ]);
    const title = asOptionalTrimmedString(current.title) || extractTitleFromSlate(slateData) || "\u672A\u547D\u540D\u9875\u9762";
    const tools = extractMentionsFromSlate(slateData);
    const skillSummary = buildSkillSummaryMarker(meta);
    const content = slateToRenderMarkdown(slateData);
    const now = /* @__PURE__ */ new Date();
    const updatedAt = formatISO(now);
    await dispatch(
      patch({
        dbKey: pageKey,
        changes: {
          updatedAt,
          slateData,
          title,
          tools,
          content,
          icon: icon ?? null,
          ...meta ? { meta } : {}
        }
      })
    ).unwrap();
    if (dbSpaceId) {
      try {
        await dispatch(
          updateContentTitle({
            spaceId: dbSpaceId,
            contentKey: pageKey,
            title,
            skillSummary
          })
        ).unwrap();
      } catch (spaceSyncError) {
        console.warn(
          `[saveDoc] \u7A7A\u95F4\u6807\u9898\u540C\u6B65\u5931\u8D25\uFF08\u9875\u9762\u5DF2\u4FDD\u5B58\uFF09: ${toErrorMessage(spaceSyncError)}`
        );
      }
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("nolo-user-data-updated"));
    }
    setState((prev) => ({
      ...prev,
      isSaving: false,
      lastSavedAt: updatedAt,
      title,
      content,
      lastSavedSlateData: slateData,
      lastSavedTitle: title,
      lastSavedIcon: prev.icon,
      justSaved: true
    }));
  } catch (e) {
    setState((prev) => ({
      ...prev,
      isSaving: false,
      saveError: e?.message || "\u4FDD\u5B58\u5931\u8D25",
      justSaved: false
    }));
  }
}
async function createDocState(args, thunkApi) {
  const { createPageAction } = await import("/public/assets/chunks/createPageAction-TL6K2DEO.js");
  return createPageAction(args, thunkApi);
}
function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function getSnapshot() {
  return version;
}
function useDocState() {
  (0, import_react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  return getDocState();
}
function useDocField(selector) {
  (0, import_react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  return selector(state);
}
function resetDocStoreForTests() {
  state = createInitialState();
  bump();
}

export {
  getDocState,
  getDocField,
  getDocPageKey,
  getDocIsInitialized,
  getDocIsReadOnly,
  getDocHasPendingChanges,
  updateSlateDoc,
  updateTitleDoc,
  updateIconDoc,
  resetJustSavedStatus,
  setDocFocusContext,
  toggleReadOnlyDoc,
  setReadOnlyDoc,
  updateDocTags,
  resetDocState,
  previewDocState,
  applyExternalDocUpdate,
  initDocState,
  saveDocState,
  createDocState,
  subscribe,
  getSnapshot,
  useDocState,
  useDocField,
  resetDocStoreForTests
};
