import {
  Dialog
} from "/public/assets/chunks/chunk-7HTHEFUV.js";
import {
  markdownToSlate
} from "/public/assets/chunks/chunk-AWGGOX2H.js";
import {
  getDocState,
  initDocState,
  resetDocState,
  useDocState
} from "/public/assets/chunks/chunk-VPSYWRNH.js";
import {
  StreamingIndicator_default
} from "/public/assets/chunks/chunk-2IJLPAOU.js";
import {
  useAppDispatch
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  LuFileText
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/modal/DocxPreviewDialog.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var Editor = import_react.default.lazy(() => import("/public/assets/chunks/Editor-D6LWDHBK.js"));
var DocxPreviewDialog = ({
  isOpen,
  onClose,
  pageKey,
  fileName
}) => {
  const { t } = useTranslation("chat");
  const dispatch = useAppDispatch();
  const doc = useDocState();
  const isLoading = doc.isLoading;
  const isInitialized = doc.isInitialized;
  (0, import_react.useEffect)(() => {
    if (isOpen && pageKey) {
      void initDocState(
        { pageKey, isReadOnly: true },
        { dispatch, getState: () => ({ doc: getDocState() }) }
      );
    }
    return () => {
      if (isOpen) {
        resetDocState();
      }
    };
  }, [dispatch, isOpen, pageKey]);
  const initialValue = (0, import_react.useMemo)(() => {
    if (!isInitialized || !doc) {
      return [{ type: "paragraph", children: [{ text: "" }] }];
    }
    const slate = doc.slateData;
    if (Array.isArray(slate) && slate.length > 0) return slate;
    if (doc.content) {
      try {
        return markdownToSlate(doc.content);
      } catch {
        return [{ type: "paragraph", children: [{ text: "Parse Error" }] }];
      }
    }
    return [{ type: "paragraph", children: [{ text: "Loading..." }] }];
  }, [doc, isInitialized]);
  const renderTitle = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dialog-title-wrapper", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuFileText, { size: 16, className: "title-icon", "aria-hidden": "true" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "title-text", title: fileName, children: fileName })
  ] });
  const renderLoadingState = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "loading-state", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StreamingIndicator_default, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "loading-text", children: t("loadingContent") })
  ] });
  const renderDocumentContent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "editor-paper", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StreamingIndicator_default, {}), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    Editor,
    {
      initialValue,
      readOnly: true
    }
  ) }) });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    Dialog,
    {
      isOpen,
      onClose,
      title: renderTitle(),
      size: "xlarge",
      className: "docx-preview-modal",
      "aria-label": `Preview of ${fileName}`,
      children: isOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "preview-body-content", children: isLoading || !isInitialized ? renderLoadingState() : renderDocumentContent() })
    }
  ) });
};
var DocxPreviewDialog_default = DocxPreviewDialog;

export {
  DocxPreviewDialog_default
};
