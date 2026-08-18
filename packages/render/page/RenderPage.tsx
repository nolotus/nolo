//render/page/RenderPage
import "../page.css";
import React, {
  useEffect,
  useMemo,
  useCallback,
  Suspense,
  lazy,
  useState,
  useRef,
} from "react";
import { useSearchParams } from "app/routing";
import { useAppDispatch, useAppSelector } from "app/store";
import { useTranslation } from "react-i18next";
import { toast } from "app/utils/toast"
import { useCouldEdit } from "identity";
import { asOptionalTrimmedString } from "core/optionalString";

import {
  EditorContent,
  createEmptyParagraph,
  splitSlateTitleAndBody,
} from "create/editor/utils/slateUtils";
import { markdownToSlate } from "create/editor/transforms/markdownToSlate";
import { slateToRenderMarkdown } from "create/editor/transforms/slateToRenderMarkdown";
import SaveStatusIndicator, { SaveStatus } from "./SaveStatusIndicator";
import PageLoading from "render/web/ui/PageLoading";
import ReadOnlyMarkdownContent from "render/web/ui/ReadOnlyMarkdownContent";
import ContentIcon from "render/contentIcon/ContentIcon";
import ContentIconPicker from "render/contentIcon/ContentIconPicker";
import type { ContentIcon as ContentIconValue } from "render/contentIcon/types";
import { LuFileText, LuPencil } from "react-icons/lu";

import { selectEditorWordCountEnabled } from "app/settings/settingSlice";
import {
  initDocState,
  saveDocState,
  resetDocState,
  updateSlateDoc,
  updateTitleDoc,
  updateIconDoc,
  resetJustSavedStatus,
  applyExternalDocUpdate,
  getDocState,
  getDocPageKey,
  getDocHasPendingChanges,
  useDocState,
  type DocState,
} from "./docStore";

// 懒加载编辑器
const Editor = lazy(() => import("create/editor/Editor"));

const STATUS_RESET_DELAY_MS = 2000;
const AUTOSAVE_DELAY_MS = 2000;

const formatPageMetaTime = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return null;
  }
};

function useAutoSave(onSave: (triggerSource?: string) => void, readOnly: boolean) {
  useEffect(() => {
    if (readOnly) return;

    const handleKeydown = (e: any) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave("keydown-ctrl-s");
      }
    };

    const handleVisibilityChange = () => {
      if ((document as any).visibilityState === "hidden") {
        onSave("visibilitychange-hidden");
      }
    };

    const handleBeforeUnload = () => {
      onSave("beforeunload");
    };

    (window as any).addEventListener("keydown", handleKeydown);
    (document as any).addEventListener("visibilitychange", handleVisibilityChange);
    (window as any).addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      (window as any).removeEventListener("keydown", handleKeydown);
      (document as any).removeEventListener("visibilitychange", handleVisibilityChange);
      (window as any).removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [onSave, readOnly]);
}

function useDocData(pageKey: string, editMode: boolean) {
  const dispatch = useAppDispatch();
  // Subscribe to the doc store so we re-render on doc state changes.
  useDocState();
  const doc = getDocState();
  const isLoading = doc.isLoading;
  const isInitialized = doc.isInitialized;
  const isReadOnly = doc.isReadOnly;

  // 初始化文档及监听外部更新
  useEffect(() => {
    if (!pageKey) return;
    void initDocState(
      { pageKey, isReadOnly: !editMode },
      { dispatch, getState: () => ({ doc: getDocState() }) }
    );

    const handleUserDataUpdated = (e: Event) => {
      // 若处于打字/未保存状态，保留用户当前输入不强行覆盖；无改动时自动刷新最新数据
      if (getDocHasPendingChanges()) return;
      const detail = (e as CustomEvent)?.detail;
      const targetDbKey = typeof detail === "string" ? detail : detail?.dbKey;
      if (!targetDbKey || targetDbKey === pageKey) {
        void initDocState(
          { pageKey, isReadOnly: !editMode },
          { dispatch, getState: () => ({ doc: getDocState() }) }
        );
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("nolo-user-data-updated", handleUserDataUpdated);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("nolo-user-data-updated", handleUserDataUpdated);
      }
    };
  }, [dispatch, pageKey, editMode]);

  // 离开时重置
  useEffect(() => {
    return () => {
      resetDocState();
    };
  }, [dispatch]);

  // 统一错误提示
  useEffect(() => {
    const err = (doc as any)?.error;
    if (err) {
      toast.error(`加载文档失败: ${err}`);
    }
  }, [doc]);

  return { isLoading, isInitialized, doc, isReadOnly };
}

function useInitialValue(doc: any, ready: boolean): EditorContent {
  return useMemo(() => {
    if (!ready) {
      return [createEmptyParagraph()];
    }

    if (Array.isArray(doc?.slateData) && doc.slateData.length) {
      return splitSlateTitleAndBody(doc.slateData, doc?.title).body;
    }

    // 否则尝试从 markdown content 转换
    if (doc?.content) {
      try {
        const value = markdownToSlate(doc.content);
        if (value && value.length) {
          return splitSlateTitleAndBody(value as EditorContent, doc?.title).body;
        }
      } catch {
        return [
          {
            type: "paragraph",
            children: [{ text: "原始内容转换失败，请直接编辑此页面。" }],
          },
        ];
      }
    }

    // 新页面默认内容
    return [createEmptyParagraph()];
  }, [doc, ready]);
}

/**
 * 底部保存状态条
 */
function PageSaveStatus() {
  // Subscribe to doc store for save-status fields.
  useDocState();
  const s = getDocState();
  const isSaving = s.isSaving;
  const hasPending = getDocHasPendingChanges();
  const saveError = s.saveError;
  const justSaved = s.justSaved;

  // “已保存” 状态短暂展示后自动复位
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(
      () => resetJustSavedStatus(),
      STATUS_RESET_DELAY_MS
    );
    return () => clearTimeout(t);
  }, [justSaved]);

  // 保存失败统一提示
  useEffect(() => {
    if (saveError && saveError !== "内容无变化") {
      toast.error("内容保存失败", { icon: "⚠️" });
    }
  }, [saveError]);

  const status: SaveStatus = isSaving
    ? "saving"
    : saveError && hasPending
      ? "error"
      : justSaved
        ? "saved"
        : null;

  return <SaveStatusIndicator status={status} hasPendingChanges={hasPending} />;
}

/**
 * 文档渲染与编辑主组件
 */
const RenderPage: React.FC<{ pageKey: string }> = ({ pageKey }) => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const dispatch = useAppDispatch();
  const [isComposing, setIsComposing] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const editorRegionRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const canEdit = useCouldEdit(pageKey);
  const editParam = params.get("edit");
  // 如果有编辑权限，默认进入编辑模式；如果 URL 显式指定了 ?edit= 则以 URL 为准
  const effectiveEditMode = editParam !== null ? editParam === "true" : canEdit;

  const wordCountEnabled = useAppSelector(selectEditorWordCountEnabled);
  const [wordCount, setWordCount] = useState<number>(0);

  const { isLoading, isInitialized, doc, isReadOnly } = useDocData(
    pageKey,
    effectiveEditMode
  );

  const slateData = doc.slateData;
  // ★ 光标 bug 修复：编辑器重挂载 key 用 externalUpdateSeq，不再用 lastSavedAt。
  // 用户自动保存不递增 externalUpdateSeq，所以保存不再重挂载编辑器、光标不跳。
  const lastSavedAtKey = doc.externalUpdateSeq;
  const title = doc.title || "";
  const icon = doc.icon;
  const createdAt = doc.createdAt;
  const lastSavedAt = doc.lastSavedAt;
  const hasPendingChanges = getDocHasPendingChanges();
  const metaTimeLabel = useMemo(
    () => formatPageMetaTime(createdAt) || formatPageMetaTime(lastSavedAt),
    [createdAt, lastSavedAt]
  );
  const initialValue = useInitialValue(doc, isInitialized);
  const initialTitle = useMemo(
    () => splitSlateTitleAndBody(doc?.slateData, doc?.title).title,
    [doc?.slateData, doc?.title]
  );
  const readOnlyMarkdown = useMemo(() => {
    if (Array.isArray(initialValue) && initialValue.length > 0) {
      const nextMarkdown = slateToRenderMarkdown(initialValue).trim();
      if (nextMarkdown) return nextMarkdown;
    }

    return asOptionalTrimmedString(doc?.content) ?? null;
  }, [doc?.content, initialValue]);

  useEffect(() => {
    if (!isInitialized || isReadOnly) return;
    // Only auto-initialize doc title if no explicit title state exists (title is null/undefined).
    // Do not override user-controlled title edits (including empty string "").
    if (title != null) return;
    if (initialTitle) {
      updateTitleDoc(initialTitle);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit title: see comment above
  }, [initialTitle, isInitialized, isReadOnly]);

  const resolvedTitle = title ?? initialTitle ?? "";
  // Prefer the document body for typing (especially new-page create flow).
  // Title stays clickable; Enter in the title still jumps into the body.
  const shouldFocusEditor = !isReadOnly;

  const saveNow = useCallback((triggerSource: string = "manual") => {
    if (isComposing) return;
    void saveDocState(
      { pageKey, triggerSource } as any,
      { dispatch, getState: () => ({ doc: getDocState() }) },
    );
  }, [dispatch, isComposing, pageKey]);

  // 保持对最新 saveNow 的引用，用于组件卸载时兜底保存
  const saveNowRef = useRef(saveNow);
  useEffect(() => {
    saveNowRef.current = saveNow;
  }, [saveNow]);

  // SPA 内导航不触发 beforeunload，在组件卸载时兜底保存
  useEffect(() => {
    if (isReadOnly) return;
    return () => {
      saveNowRef.current("unmount");
    };
  }, [isReadOnly]);

  // 自动保存
  useAutoSave(saveNow, isReadOnly);

  useEffect(() => {
    if (isReadOnly) return;
    if (isComposing) return;
    if (!hasPendingChanges) return;

    const timer = (window as any).setTimeout(() => {
      saveNow("autosave-debounced");
    }, AUTOSAVE_DELAY_MS);

    return () => {
      (window as any).clearTimeout(timer);
    };
  }, [isReadOnly, isComposing, hasPendingChanges, saveNow, slateData]);

  const handleEditorChange = useCallback(
    (value: any) => {
      updateSlateDoc(value as EditorContent);
    },
    []
  );

  const handleEditorBlur = useCallback(() => {
    if (!isReadOnly) {
      saveNow("editor-blur");
    }
  }, [isReadOnly, saveNow]);

  const handleIconSelect = useCallback((nextIcon: ContentIconValue | null) => {
    updateIconDoc(nextIcon);
    setIsIconPickerOpen(false);
    window.setTimeout(() => saveNow("icon-select"), 0);
  }, [saveNow]);

  const focusEditorBody = useCallback(() => {
    const editorElement = editorRegionRef.current?.querySelector(
      '[data-slate-editor="true"]'
    ) as HTMLElement | null;
    if (!editorElement) return false;
    editorElement.focus({ preventScroll: true });
    return true;
  }, []);

  // After the page is ready, put the caret in the body editor (not the title).
  // New pages navigate with ?edit=true; title autofocus was stealing focus.
  useEffect(() => {
    if (!shouldFocusEditor || isLoading || !isInitialized) return;

    let cancelled = false;
    let attempts = 0;
    let rafId = 0;

    const tryFocus = () => {
      if (cancelled) return;
      if (focusEditorBody()) return;
      if (attempts++ < 12) {
        rafId = window.requestAnimationFrame(tryFocus);
      }
    };

    rafId = window.requestAnimationFrame(tryFocus);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [shouldFocusEditor, pageKey, isLoading, isInitialized, focusEditorBody]);

  const isPageLoading = isLoading || !isInitialized;

  if (isPageLoading) {
    return <PageLoading message="正在打开，为你准备内容…" />;
  }

  return (
    <Suspense
      fallback={<PageLoading message="正在为你准备编辑体验…" />}
    >
      <div className="RenderPage-container">
        <div className="RenderPage-editor-wrapper" key={`${pageKey}:${lastSavedAtKey}`} ref={editorRegionRef}>
          <div className="RenderPage-title-shell">
            <div className="RenderPage-icon-anchor">
              {isReadOnly ? (
                <ContentIcon icon={icon} fallback={LuFileText} size={38} />
              ) : (
                <>
                  <button
                    type="button"
                    className="content-icon-button content-icon-button--editable RenderPage-iconButton"
                    onClick={() => setIsIconPickerOpen((open) => !open)}
                    title={t("contentIcon.change", "更换图标")}
                    aria-label={t("contentIcon.change", "更换图标")}
                  >
                    <ContentIcon icon={icon} fallback={LuFileText} size={34} />
                    <span className="content-icon-button__badge" aria-hidden>
                      <LuPencil size={11} />
                    </span>
                  </button>
                  <ContentIconPicker
                    open={isIconPickerOpen}
                    onClose={() => setIsIconPickerOpen(false)}
                    onSelect={handleIconSelect}
                  />
                </>
              )}
            </div>
            <div className="RenderPage-title-stack">
              {isReadOnly ? (
                <h1 className={`RenderPage-title${!resolvedTitle.trim() ? " is-placeholder" : ""}`}>
                  {resolvedTitle.trim() || "未命名页面"}
                </h1>
              ) : (
                <input
                  ref={titleInputRef}
                  className="RenderPage-titleInput"
                  value={resolvedTitle}
                  placeholder="未命名页面"
                  onChange={(event) => updateTitleDoc(event.target.value)}
                  onBlur={() => {
                    saveNow();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      focusEditorBody();
                    }
                  }}
                />
              )}
              {metaTimeLabel || (wordCountEnabled && wordCount > 0) ? (
                <time className="RenderPage-title-meta" dateTime={createdAt || lastSavedAt || undefined}>
                  {[metaTimeLabel, wordCountEnabled && wordCount > 0 ? `${wordCount} 字` : ""]
                    .filter(Boolean)
                    .join(" · ")}
                </time>
              ) : null}
            </div>
          </div>
          {isReadOnly && readOnlyMarkdown ? (
            <ReadOnlyMarkdownContent
              markdown={readOnlyMarkdown}
              fallback={
                <Editor
                  initialValue={initialValue}
                  readOnly
                  onWordCountChange={setWordCount}
                />
              }
            />
          ) : !isReadOnly ? (
            <Editor
              initialValue={initialValue}
              onChange={handleEditorChange}
              onBlur={handleEditorBlur}
              readOnly={false}
              autoFocus={shouldFocusEditor}
              onCompositionChange={setIsComposing}
              onWordCountChange={setWordCount}
            />
          ) : (
            <Editor
              initialValue={initialValue}
              readOnly
              onWordCountChange={setWordCount}
            />
          )}
          {!isReadOnly && <PageSaveStatus />}
        </div>
        
      </div>
    </Suspense>
  );
};

export default React.memo(RenderPage);
