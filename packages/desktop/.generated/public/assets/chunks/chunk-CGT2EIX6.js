import {
  FileItem
} from "/public/assets/chunks/chunk-5UVYUAHU.js";
import {
  DocxPreviewDialog_default
} from "/public/assets/chunks/chunk-2NEHLYGB.js";
import {
  TablePreviewDialog_default
} from "/public/assets/chunks/chunk-2W6XN4XG.js";
import {
  ImagePreviewModal_default
} from "/public/assets/chunks/chunk-ZDGJ4DJD.js";
import {
  useAppDispatch
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  LuTrash2,
  LuX
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  removePendingFile
} from "/public/assets/chunks/chunk-JOOBQBMM.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/chat/web/AttachmentsPreview.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var ATTACHMENTS_PREVIEW_STYLES = `
  .attachments-preview {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
    align-items: flex-start;
    width: 100%;
    box-sizing: border-box;
  }

  .attachment-item {
    position: relative;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    flex-shrink: 0;
    max-width: 120px;
  }

  .attachment-item:hover:not(.processing):not(.error) {
    transform: translateY(-1px);
  }

  .attachment-item.mobile {
    max-width: 110px;
  }

  .image-content {
    width: 44px;
    height: var(--control-lg);
    object-fit: cover;
    border-radius: var(--radius-xs);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    display: block;
  }

  .image-content:hover {
    border-color: var(--primary);
    transform: scale(1.05);
    box-shadow: 0 4px 12px var(--shadowMedium);
  }

  .image-content:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-color: var(--primary);
  }

  .remove-button {
    position: absolute;
    border-radius: 50%;
    background: var(--error);
    color: white;
    border: 1px solid var(--background);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 2;
    box-shadow: 0 2px 4px var(--shadowMedium);
  }

  .remove-button:not(.mobile) {
    top: -6px;
    right: -6px;
    width: 22px;
    height: 22px;
    opacity: 0.85;
  }

  .remove-button.mobile {
    top: -8px;
    right: -8px;
    width: 30px;
    height: 30px;
    opacity: 1;
    box-shadow: 0 2px 8px var(--shadowHeavy);
    border-width: 1.5px;
  }

  .attachment-item:hover .remove-button:not(.mobile):not(:disabled) {
    opacity: 1;
  }

  .remove-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    pointer-events: none;
  }

  .remove-button:hover:not(:disabled) {
    transform: scale(1.1);
    background: #dc2626;
    box-shadow: 0 4px 12px var(--shadowHeavy);
  }

  .remove-button:focus-visible {
    opacity: 1;
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .remove-button:active:not(:disabled) {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    .attachments-preview {
      gap: var(--space-1);
      justify-content: flex-start;
      align-items: flex-start;
      overflow-x: visible;
    }

    .attachment-item {
      min-width: 44px;
    }

    .attachment-item.mobile {
      max-width: 100px;
    }

    .remove-button.mobile {
      width: 28px;
      height: var(--control-sm);
    }
  }

  @media (hover: none) and (pointer: coarse) {
    .remove-button:not(.mobile) {
      opacity: 1;
      top: -8px;
      right: -8px;
      width: 26px;
      height: 26px;
    }

    .attachment-item:hover,
    .image-content:hover {
      transform: none;
    }
  }

  @media (prefers-contrast: high) {
    .image-content {
      border-width: 2px;
    }

    .remove-button {
      border-width: 2px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .attachment-item,
    .image-content,
    .remove-button {
      transition: none;
    }

    .attachment-item:hover,
    .image-content:hover,
    .remove-button:hover {
      transform: none;
    }
  }

  .attachment-item.error {
    opacity: 0.7;
  }

  .attachment-item.error .image-content {
    border-color: var(--error);
  }

  .attachment-item.processing {
    opacity: 0.6;
    pointer-events: none;
  }
`;
var ImageItem = (0, import_react.memo)(
  ({ image, index, isMobile, onPreview, onRemove }) => {
    const handlePreview = (0, import_react.useCallback)(() => {
      onPreview(image.url);
    }, [image.url, onPreview]);
    const handleRemove = (0, import_react.useCallback)(
      (event) => {
        event.stopPropagation();
        onRemove(image.id);
      },
      [image.id, onRemove]
    );
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        className: `attachment-item image-item ${isMobile ? "mobile" : ""}`,
        role: "group",
        "aria-label": `\u56FE\u7247\u9644\u4EF6 ${index + 1}`,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "img",
            {
              src: image.url,
              alt: `\u9884\u89C8\u56FE\u7247 ${index + 1}`,
              className: "image-content",
              onClick: handlePreview,
              onKeyDown: (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handlePreview();
                }
              },
              tabIndex: 0,
              role: "button",
              "aria-label": `\u70B9\u51FB\u67E5\u770B\u5927\u56FE ${index + 1}`
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              onClick: handleRemove,
              className: `remove-button ${isMobile ? "mobile" : ""}`,
              "aria-label": `\u5220\u9664\u56FE\u7247 ${index + 1}`,
              title: `\u5220\u9664\u56FE\u7247 ${index + 1}`,
              children: isMobile ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTrash2, { size: 16, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuX, { size: 14, "aria-hidden": "true" })
            }
          )
        ]
      }
    );
  }
);
ImageItem.displayName = "ImageItem";
var AttachmentsPreview = ({
  imagePreviews,
  pendingFiles,
  onRemoveImage,
  processingFiles = /* @__PURE__ */ new Set(),
  isMobile = false
}) => {
  const dispatch = useAppDispatch();
  const [selectedImage, setSelectedImage] = (0, import_react.useState)(null);
  const [previewFile, setPreviewFile] = (0, import_react.useState)(null);
  const hasAttachments = (0, import_react.useMemo)(
    () => imagePreviews.length > 0 || pendingFiles.length > 0,
    [imagePreviews.length, pendingFiles.length]
  );
  const handleRemoveFile = (0, import_react.useCallback)(
    (id) => {
      dispatch(removePendingFile(id));
    },
    [dispatch]
  );
  const handlePreviewImage = (0, import_react.useCallback)((url) => {
    setSelectedImage(url);
  }, []);
  const handleCloseImagePreview = (0, import_react.useCallback)(() => {
    setSelectedImage(null);
  }, []);
  const handlePreviewFile = (0, import_react.useCallback)((file) => {
    setPreviewFile(file);
  }, []);
  const handleCloseFilePreview = (0, import_react.useCallback)(() => {
    setPreviewFile(null);
  }, []);
  if (!hasAttachments) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { "data-name": "attachments-preview-fixed", precedence: "high", children: ATTACHMENTS_PREVIEW_STYLES }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        className: "attachments-preview",
        role: "group",
        "aria-label": "\u9644\u4EF6\u9884\u89C8",
        "aria-live": "polite",
        children: [
          imagePreviews.map((image, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            ImageItem,
            {
              image,
              index,
              isMobile,
              onPreview: handlePreviewImage,
              onRemove: onRemoveImage
            },
            image.id
          )),
          pendingFiles.map((file) => {
            const isProcessing = processingFiles.has(file.trackingId ?? file.id);
            const handleRemoveClick = (event) => {
              event.stopPropagation();
              handleRemoveFile(file.id);
            };
            const itemClassName = [
              "attachment-item",
              "file-item",
              isMobile ? "mobile" : "",
              isProcessing ? "processing" : "",
              file.error ? "error" : ""
            ].filter(Boolean).join(" ");
            return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "div",
              {
                className: itemClassName,
                role: "group",
                "aria-label": `\u6587\u4EF6\u9644\u4EF6 ${file.name}`,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    FileItem,
                    {
                      file,
                      variant: "attachment",
                      isMobile,
                      isProcessing,
                      error: file.error,
                      onPreview: file.type === "dialog" ? void 0 : () => !isProcessing && !file.error && handlePreviewFile(file)
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "button",
                    {
                      type: "button",
                      onClick: handleRemoveClick,
                      className: `remove-button ${isMobile ? "mobile" : ""}`,
                      disabled: isProcessing,
                      "aria-label": `\u5220\u9664\u6587\u4EF6 ${file.name}`,
                      title: `\u5220\u9664\u6587\u4EF6 ${file.name}`,
                      children: isMobile ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTrash2, { size: 16, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuX, { size: 14, "aria-hidden": "true" })
                    }
                  )
                ]
              },
              file.id
            );
          })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ImagePreviewModal_default,
      {
        imageUrl: selectedImage,
        onClose: handleCloseImagePreview,
        alt: "\u653E\u5927\u9884\u89C8\u56FE\u7247"
      }
    ),
    previewFile && previewFile.type === "table" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      TablePreviewDialog_default,
      {
        isOpen: !!previewFile,
        onClose: handleCloseFilePreview,
        tableKey: previewFile.pageKey || "",
        tableName: previewFile.name || ""
      }
    ) : previewFile && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      DocxPreviewDialog_default,
      {
        isOpen: !!previewFile,
        onClose: handleCloseFilePreview,
        pageKey: previewFile.pageKey || "",
        fileName: previewFile.name || ""
      }
    )
  ] });
};
var AttachmentsPreview_default = (0, import_react.memo)(AttachmentsPreview);

export {
  AttachmentsPreview_default
};
