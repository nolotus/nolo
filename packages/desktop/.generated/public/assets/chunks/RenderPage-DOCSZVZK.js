import {
  ReadOnlyMarkdownContent_default
} from "/public/assets/chunks/chunk-5DFY76KP.js";
import "/public/assets/chunks/chunk-A2AE4ZIY.js";
import {
  ContentIconPicker
} from "/public/assets/chunks/chunk-ZNBXGDWB.js";
import {
  ContentIcon
} from "/public/assets/chunks/chunk-X2QKE5FM.js";
import "/public/assets/chunks/chunk-XXYYZRCQ.js";
import "/public/assets/chunks/chunk-IOQKDOEC.js";
import "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import {
  markdownToSlate
} from "/public/assets/chunks/chunk-AWGGOX2H.js";
import {
  createEmptyParagraph,
  splitSlateTitleAndBody
} from "/public/assets/chunks/chunk-ZV2RZQG3.js";
import "/public/assets/chunks/chunk-GIMH23VB.js";
import {
  slateToRenderMarkdown
} from "/public/assets/chunks/chunk-PTH5G2FS.js";
import {
  getDocHasPendingChanges,
  getDocState,
  initDocState,
  resetDocState,
  resetJustSavedStatus,
  saveDocState,
  updateIconDoc,
  updateSlateDoc,
  updateTitleDoc,
  useDocState
} from "/public/assets/chunks/chunk-VPSYWRNH.js";
import {
  PageLoading_default
} from "/public/assets/chunks/chunk-YCIZFIEN.js";
import "/public/assets/chunks/chunk-2IJLPAOU.js";
import {
  useCouldEdit
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  useSearchParams
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectEditorWordCountEnabled,
  selectTheme,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuCircleAlert,
  LuCircleCheck,
  LuFileText,
  LuPencil
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/page/RenderPage.tsx
var import_react2 = __toESM(require_react(), 1);

// packages/render/page/SaveStatusIndicator.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var SaveStatusIndicator = import_react.default.memo(
  ({ status, hasPendingChanges }) => {
    const theme = useAppSelector(selectTheme);
    const effectiveStatus = status || (hasPendingChanges ? "pending" : null);
    if (!effectiveStatus) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-save-status-indicator", children: [
      effectiveStatus === "saving" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-status-content", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "page-status-spinner" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u6B63\u5728\u4FDD\u5B58..." })
      ] }),
      effectiveStatus === "saved" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-status-content", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCircleCheck, { size: 14, color: theme.success, "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u5DF2\u4FDD\u5B58" })
      ] }),
      effectiveStatus === "pending" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-status-content page-status-pending", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "page-status-pending-dot" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u6709\u672A\u4FDD\u5B58\u7684\u66F4\u6539" })
      ] }),
      effectiveStatus === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-status-content page-status-error", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCircleAlert, { size: 14, color: theme.error, "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u4FDD\u5B58\u5931\u8D25" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { jsx: true, children: `
          .page-save-status-indicator {
            position: fixed;
            bottom: 16px;
            right: 16px;
            padding: 8px 12px;
            background-color: ${theme.backgroundSecondary};
            border-radius: var(--radius-md);
            font-size: var(--fontSize-sm);
            box-shadow: 0 2px 8px ${theme.shadowLight};
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }
          .page-status-content {
            display: flex;
            align-items: center;
            gap: 6px;
            color: ${theme.textSecondary};
          }
          .page-status-content.page-status-pending {
            color: ${theme.warning || "#faad14"};
          }
          .page-status-content.page-status-error {
            color: ${theme.error};
          }
          .page-status-spinner {
            width: 14px;
            height: 14px;
            border: 2px solid transparent;
            border-top-color: ${theme.primary};
            border-radius: 50%;
            animation: statusSpinnerRotate 0.8s linear infinite;
          }
          .page-status-pending-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: ${theme.warning || "#faad14"};
            animation: statusPendingPulse 2s infinite;
          }
          @keyframes statusSpinnerRotate {
            to {
              transform: rotate(360deg);
            }
          }
          @keyframes statusPendingPulse {
            0% {
              transform: scale(0.95);
              opacity: 0.7;
            }
            50% {
              transform: scale(1.05);
              opacity: 1;
            }
            100% {
              transform: scale(0.95);
              opacity: 0.7;
            }
          }
        ` })
    ] });
  }
);
var SaveStatusIndicator_default = SaveStatusIndicator;

// packages/render/page/RenderPage.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var Editor = (0, import_react2.lazy)(() => import("/public/assets/chunks/Editor-D6LWDHBK.js"));
var STATUS_RESET_DELAY_MS = 2e3;
var AUTOSAVE_DELAY_MS = 2e3;
var formatPageMetaTime = (iso) => {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return null;
  try {
    return new Intl.DateTimeFormat(void 0, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(ts));
  } catch {
    return null;
  }
};
function useAutoSave(onSave, readOnly) {
  (0, import_react2.useEffect)(() => {
    if (readOnly) return;
    const handleKeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave("keydown-ctrl-s");
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        onSave("visibilitychange-hidden");
      }
    };
    const handleBeforeUnload = () => {
      onSave("beforeunload");
    };
    window.addEventListener("keydown", handleKeydown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [onSave, readOnly]);
}
function useDocData(pageKey, editMode) {
  const dispatch = useAppDispatch();
  useDocState();
  const doc = getDocState();
  const isLoading = doc.isLoading;
  const isInitialized = doc.isInitialized;
  const isReadOnly = doc.isReadOnly;
  (0, import_react2.useEffect)(() => {
    if (!pageKey) return;
    void initDocState(
      { pageKey, isReadOnly: !editMode },
      { dispatch, getState: () => ({ doc: getDocState() }) }
    );
    const handleUserDataUpdated = (e) => {
      if (getDocHasPendingChanges()) return;
      const detail = e?.detail;
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
  (0, import_react2.useEffect)(() => {
    return () => {
      resetDocState();
    };
  }, [dispatch]);
  (0, import_react2.useEffect)(() => {
    const err = doc?.error;
    if (err) {
      toast.error(`\u52A0\u8F7D\u6587\u6863\u5931\u8D25: ${err}`);
    }
  }, [doc]);
  return { isLoading, isInitialized, doc, isReadOnly };
}
function useInitialValue(doc, ready) {
  return (0, import_react2.useMemo)(() => {
    if (!ready) {
      return [createEmptyParagraph()];
    }
    if (Array.isArray(doc?.slateData) && doc.slateData.length) {
      return splitSlateTitleAndBody(doc.slateData, doc?.title).body;
    }
    if (doc?.content) {
      try {
        const value = markdownToSlate(doc.content);
        if (value && value.length) {
          return splitSlateTitleAndBody(value, doc?.title).body;
        }
      } catch {
        return [
          {
            type: "paragraph",
            children: [{ text: "\u539F\u59CB\u5185\u5BB9\u8F6C\u6362\u5931\u8D25\uFF0C\u8BF7\u76F4\u63A5\u7F16\u8F91\u6B64\u9875\u9762\u3002" }]
          }
        ];
      }
    }
    return [createEmptyParagraph()];
  }, [doc, ready]);
}
function PageSaveStatus() {
  useDocState();
  const s = getDocState();
  const isSaving = s.isSaving;
  const hasPending = getDocHasPendingChanges();
  const saveError = s.saveError;
  const justSaved = s.justSaved;
  (0, import_react2.useEffect)(() => {
    if (!justSaved) return;
    const t = setTimeout(
      () => resetJustSavedStatus(),
      STATUS_RESET_DELAY_MS
    );
    return () => clearTimeout(t);
  }, [justSaved]);
  (0, import_react2.useEffect)(() => {
    if (saveError && saveError !== "\u5185\u5BB9\u65E0\u53D8\u5316") {
      toast.error("\u5185\u5BB9\u4FDD\u5B58\u5931\u8D25", { icon: "\u26A0\uFE0F" });
    }
  }, [saveError]);
  const status = isSaving ? "saving" : saveError && hasPending ? "error" : justSaved ? "saved" : null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SaveStatusIndicator_default, { status, hasPendingChanges: hasPending });
}
var RenderPage = ({ pageKey }) => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const dispatch = useAppDispatch();
  const [isComposing, setIsComposing] = (0, import_react2.useState)(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = (0, import_react2.useState)(false);
  const editorRegionRef = (0, import_react2.useRef)(null);
  const titleInputRef = (0, import_react2.useRef)(null);
  const canEdit = useCouldEdit(pageKey);
  const editParam = params.get("edit");
  const effectiveEditMode = editParam !== null ? editParam === "true" : canEdit;
  const wordCountEnabled = useAppSelector(selectEditorWordCountEnabled);
  const [wordCount, setWordCount] = (0, import_react2.useState)(0);
  const { isLoading, isInitialized, doc, isReadOnly } = useDocData(
    pageKey,
    effectiveEditMode
  );
  const slateData = doc.slateData;
  const lastSavedAtKey = doc.externalUpdateSeq;
  const title = doc.title || "";
  const icon = doc.icon;
  const createdAt = doc.createdAt;
  const lastSavedAt = doc.lastSavedAt;
  const hasPendingChanges = getDocHasPendingChanges();
  const metaTimeLabel = (0, import_react2.useMemo)(
    () => formatPageMetaTime(createdAt) || formatPageMetaTime(lastSavedAt),
    [createdAt, lastSavedAt]
  );
  const initialValue = useInitialValue(doc, isInitialized);
  const initialTitle = (0, import_react2.useMemo)(
    () => splitSlateTitleAndBody(doc?.slateData, doc?.title).title,
    [doc?.slateData, doc?.title]
  );
  const readOnlyMarkdown = (0, import_react2.useMemo)(() => {
    if (Array.isArray(initialValue) && initialValue.length > 0) {
      const nextMarkdown = slateToRenderMarkdown(initialValue).trim();
      if (nextMarkdown) return nextMarkdown;
    }
    return asOptionalTrimmedString(doc?.content) ?? null;
  }, [doc?.content, initialValue]);
  (0, import_react2.useEffect)(() => {
    if (!isInitialized || isReadOnly) return;
    if (title != null) return;
    if (initialTitle) {
      updateTitleDoc(initialTitle);
    }
  }, [initialTitle, isInitialized, isReadOnly]);
  const resolvedTitle = title ?? initialTitle ?? "";
  const shouldFocusEditor = !isReadOnly;
  const saveNow = (0, import_react2.useCallback)((triggerSource = "manual") => {
    if (isComposing) return;
    void saveDocState(
      { pageKey, triggerSource },
      { dispatch, getState: () => ({ doc: getDocState() }) }
    );
  }, [dispatch, isComposing, pageKey]);
  const saveNowRef = (0, import_react2.useRef)(saveNow);
  (0, import_react2.useEffect)(() => {
    saveNowRef.current = saveNow;
  }, [saveNow]);
  (0, import_react2.useEffect)(() => {
    if (isReadOnly) return;
    return () => {
      saveNowRef.current("unmount");
    };
  }, [isReadOnly]);
  useAutoSave(saveNow, isReadOnly);
  (0, import_react2.useEffect)(() => {
    if (isReadOnly) return;
    if (isComposing) return;
    if (!hasPendingChanges) return;
    const timer = window.setTimeout(() => {
      saveNow("autosave-debounced");
    }, AUTOSAVE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isReadOnly, isComposing, hasPendingChanges, saveNow, slateData]);
  const handleEditorChange = (0, import_react2.useCallback)(
    (value) => {
      updateSlateDoc(value);
    },
    []
  );
  const handleEditorBlur = (0, import_react2.useCallback)(() => {
    if (!isReadOnly) {
      saveNow("editor-blur");
    }
  }, [isReadOnly, saveNow]);
  const handleIconSelect = (0, import_react2.useCallback)((nextIcon) => {
    updateIconDoc(nextIcon);
    setIsIconPickerOpen(false);
    window.setTimeout(() => saveNow("icon-select"), 0);
  }, [saveNow]);
  const focusEditorBody = (0, import_react2.useCallback)(() => {
    const editorElement = editorRegionRef.current?.querySelector(
      '[data-slate-editor="true"]'
    );
    if (!editorElement) return false;
    editorElement.focus({ preventScroll: true });
    return true;
  }, []);
  (0, import_react2.useEffect)(() => {
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
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(PageLoading_default, { message: "\u6B63\u5728\u6253\u5F00\uFF0C\u4E3A\u4F60\u51C6\u5907\u5185\u5BB9\u2026" });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    import_react2.Suspense,
    {
      fallback: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(PageLoading_default, { message: "\u6B63\u5728\u4E3A\u4F60\u51C6\u5907\u7F16\u8F91\u4F53\u9A8C\u2026" }),
      children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "RenderPage-container", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "RenderPage-editor-wrapper", ref: editorRegionRef, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "RenderPage-title-shell", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "RenderPage-icon-anchor", children: isReadOnly ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ContentIcon, { icon, fallback: LuFileText, size: 38 }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "button",
              {
                type: "button",
                className: "content-icon-button content-icon-button--editable RenderPage-iconButton",
                onClick: () => setIsIconPickerOpen((open) => !open),
                title: t("contentIcon.change", "\u66F4\u6362\u56FE\u6807"),
                "aria-label": t("contentIcon.change", "\u66F4\u6362\u56FE\u6807"),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ContentIcon, { icon, fallback: LuFileText, size: 34 }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "content-icon-button__badge", "aria-hidden": true, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuPencil, { size: 11 }) })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              ContentIconPicker,
              {
                open: isIconPickerOpen,
                onClose: () => setIsIconPickerOpen(false),
                onSelect: handleIconSelect
              }
            )
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "RenderPage-title-stack", children: [
            isReadOnly ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h1", { className: `RenderPage-title${!resolvedTitle.trim() ? " is-placeholder" : ""}`, children: resolvedTitle.trim() || "\u672A\u547D\u540D\u9875\u9762" }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "input",
              {
                ref: titleInputRef,
                className: "RenderPage-titleInput",
                value: resolvedTitle,
                placeholder: "\u672A\u547D\u540D\u9875\u9762",
                onChange: (event) => updateTitleDoc(event.target.value),
                onBlur: () => {
                  saveNow();
                },
                onKeyDown: (event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    focusEditorBody();
                  }
                }
              }
            ),
            metaTimeLabel || wordCountEnabled && wordCount > 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("time", { className: "RenderPage-title-meta", dateTime: createdAt || lastSavedAt || void 0, children: [metaTimeLabel, wordCountEnabled && wordCount > 0 ? `${wordCount} \u5B57` : ""].filter(Boolean).join(" \xB7 ") }) : null
          ] })
        ] }),
        isReadOnly && readOnlyMarkdown ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          ReadOnlyMarkdownContent_default,
          {
            markdown: readOnlyMarkdown,
            fallback: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              Editor,
              {
                initialValue,
                readOnly: true,
                onWordCountChange: setWordCount
              }
            )
          }
        ) : !isReadOnly ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          Editor,
          {
            initialValue,
            onChange: handleEditorChange,
            onBlur: handleEditorBlur,
            readOnly: false,
            autoFocus: shouldFocusEditor,
            onCompositionChange: setIsComposing,
            onWordCountChange: setWordCount
          }
        ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          Editor,
          {
            initialValue,
            readOnly: true,
            onWordCountChange: setWordCount
          }
        ),
        !isReadOnly && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(PageSaveStatus, {})
      ] }, `${pageKey}:${lastSavedAtKey}`) })
    }
  );
};
var RenderPage_default = import_react2.default.memo(RenderPage);
export {
  RenderPage_default as default
};
