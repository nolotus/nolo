import {
  PageLoading_default
} from "/public/assets/chunks/chunk-YCIZFIEN.js";
import {
  useAppDispatch
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  isAudioMimeType,
  isImageResourceLike,
  isPdfMimeType,
  isVideoMimeType,
  read,
  readFileContent
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  LuDownload,
  LuFile,
  LuInfo
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/page/FilePage.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var FilePage = ({ pageKey }) => {
  const dispatch = useAppDispatch();
  const [fileMetadata, setFileMetadata] = (0, import_react.useState)(null);
  const [loadingMeta, setLoadingMeta] = (0, import_react.useState)(true);
  const [metaError, setMetaError] = (0, import_react.useState)(null);
  const page = fileMetadata || {};
  const pageId = page.id;
  const isInitialized = !!fileMetadata;
  const isLoading = loadingMeta;
  const [fileUrl, setFileUrl] = (0, import_react.useState)(null);
  const [contentLoading, setContentLoading] = (0, import_react.useState)(false);
  const [contentError, setContentError] = (0, import_react.useState)(null);
  const isImage = isImageResourceLike({
    kind: page.type,
    mimeType: page.mimeType,
    fileCategory: page.fileCategory,
    fileName: page.originalName || page.title
  });
  const isPdf = isPdfMimeType(page.mimeType);
  const isVideo = isVideoMimeType(page.mimeType);
  const isAudio = isAudioMimeType(page.mimeType);
  (0, import_react.useEffect)(() => {
    if (!pageKey) return;
    setFileMetadata(null);
    setMetaError(null);
    setFileUrl(null);
    setContentLoading(false);
    setContentError(null);
    let isMounted = true;
    const fetchMeta = async () => {
      try {
        setLoadingMeta(true);
        const data = await dispatch(read({ dbKey: pageKey })).unwrap();
        if (!isMounted) return;
        if (data) {
          setFileMetadata(data);
        } else {
          setMetaError("\u672A\u627E\u5230\u6587\u4EF6\u6570\u636E");
        }
      } catch (e) {
        if (isMounted) {
          setMetaError(e.message || "\u52A0\u8F7D\u5931\u8D25");
        }
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    };
    fetchMeta();
    return () => {
      isMounted = false;
    };
  }, [dispatch, pageKey]);
  (0, import_react.useEffect)(() => {
    if (!isInitialized || !pageKey || !pageId) return;
    if (fileMetadata && fileMetadata.dbKey !== pageKey) return;
    let isMounted = true;
    let objectUrl = null;
    const fetchFile = async () => {
      try {
        setContentLoading(true);
        const result = await dispatch(
          readFileContent({ fileId: pageKey })
        ).unwrap();
        if (!isMounted) return;
        objectUrl = URL.createObjectURL(result.blob);
        setFileUrl(objectUrl);
        setContentError(null);
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load file content:", err);
        setContentError(err.message || "\u5185\u5BB9\u52A0\u8F7D\u5931\u8D25");
      } finally {
        if (isMounted) {
          setContentLoading(false);
        }
      }
    };
    fetchFile();
    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [dispatch, isInitialized, pageId, pageKey, fileMetadata]);
  if (metaError) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "FilePage", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "FilePage__content", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "FilePage__error", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuInfo, { size: 48, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: metaError })
    ] }) }) });
  }
  if (isLoading || !isInitialized) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageLoading_default, { message: "\u6B63\u5728\u8F7D\u5165\u8D44\u6E90\u5143\u6570\u636E..." });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "FilePage", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "FilePage__content", children: [
    contentLoading && !fileUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      PageLoading_default,
      {
        message: `\u6B63\u5728\u8BFB\u53D6${isImage ? "\u56FE\u7247" : isPdf ? "PDF" : isVideo ? "\u89C6\u9891" : isAudio ? "\u97F3\u9891" : "\u6587\u4EF6"}\u5185\u5BB9...`
      }
    ) : contentError ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "FilePage__error", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuInfo, { size: 48, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: contentError })
    ] }) : isImage && fileUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "FilePage__image-preview", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", { src: fileUrl, alt: page.title || "image" }) }) : isPdf && fileUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "FilePage__document-preview", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "iframe",
      {
        src: fileUrl,
        title: page.title || "pdf",
        className: "FilePage__document-frame"
      }
    ) }) : isVideo && fileUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "FilePage__media-preview", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "video",
      {
        src: fileUrl,
        controls: true,
        className: "FilePage__media-player",
        preload: "metadata"
      }
    ) }) : isAudio && fileUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "FilePage__audio-preview", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "FilePage__audio-card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "FilePage__title", children: page.title || "\u97F3\u9891\u8D44\u6E90" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "audio",
        {
          src: fileUrl,
          controls: true,
          className: "FilePage__audio-player",
          preload: "metadata"
        }
      )
    ] }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "FilePage__hero", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "FilePage__icon-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuFile, { size: 64, className: "FilePage__large-icon", "aria-hidden": "true" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "FilePage__title", children: page.title || "\u6587\u4EF6\u8D44\u6E90" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "FilePage__subtitle", children: "\u8BE5\u7C7B\u578B\u6682\u4E0D\u652F\u6301\u76F4\u63A5\u9884\u89C8\uFF0C\u8BF7\u901A\u8FC7\u53F3\u4E0A\u89D2\u6309\u94AE\u67E5\u770B\u8BE6\u60C5\u3002" })
    ] }),
    fileUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "a",
      {
        href: fileUrl,
        download: page.title || "download",
        className: "FilePage__download-fab",
        "aria-label": "\u4E0B\u8F7D\u6E90\u6587\u4EF6",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuDownload, { size: 16, "aria-hidden": "true" })
      }
    )
  ] }) });
};
var FilePage_default = FilePage;

export {
  FilePage_default
};
