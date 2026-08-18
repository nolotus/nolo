import {
  LuFileSpreadsheet,
  LuFileText,
  LuMessageSquare
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

// packages/chat/messages/web/FileItem.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var FILE_TYPE_CONFIG = {
  excel: { icon: LuFileSpreadsheet, color: "#1D6F42", ext: "Excel" },
  docx: { icon: LuFileText, color: "#2B579A", ext: "Word" },
  pdf: { icon: LuFileText, color: "#DC3545", ext: "PDF" },
  txt: { icon: LuFileText, color: "#6c757d", ext: "\u6587\u672C" },
  page: { icon: LuFileText, color: "#FF9500", ext: "Page" },
  dialog: { icon: LuMessageSquare, color: "#7C3AED", ext: "Chat" },
  table: { icon: LuFileSpreadsheet, color: "#1D6F42", ext: "Table" },
  ocr_text: { icon: LuFileText, color: "#00BFFF", ext: "OCR" }
};
var FileItem = (0, import_react.memo)(
  ({
    file,
    variant = "message",
    onPreview,
    isProcessing = false,
    error,
    isMobile = false
  }) => {
    const config = FILE_TYPE_CONFIG[file?.type];
    if (!config) return null;
    const IconComponent = config.icon;
    const isAttachment = variant === "attachment";
    const disabled = isProcessing || !!error;
    const truncate = (name, max = 12) => {
      if (!isAttachment || !name) return name || "\u672A\u77E5\u6587\u4EF6";
      if (name.length <= max) return name;
      const dot = name.lastIndexOf(".");
      const ext = dot > -1 ? name.slice(dot + 1) : "";
      const base = dot > -1 ? name.slice(0, dot) : name;
      const keep = Math.max(1, max - ext.length - 4);
      return `${base.slice(0, keep)}...${ext}`;
    };
    const formatSize = (bytes) => {
      if (!bytes) return "";
      if (bytes < 1024) return `${bytes}B`;
      if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
      return `${(bytes / 1048576).toFixed(1)}MB`;
    };
    const displayName = truncate(file?.name);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        className: [
          "file-item",
          variant,
          isMobile ? "mobile" : "",
          isProcessing ? "processing" : "",
          error ? "error" : ""
        ].join(" "),
        style: {
          "--file-color": config.color,
          cursor: !disabled && onPreview ? "pointer" : "default"
        },
        role: "button",
        tabIndex: disabled ? -1 : 0,
        "aria-busy": isProcessing || void 0,
        "aria-disabled": disabled || void 0,
        title: error || void 0,
        onClick: () => !disabled && onPreview?.(file),
        onKeyDown: (e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            onPreview?.(file);
          }
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "file-icon-wrapper", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            IconComponent,
            {
              size: isAttachment ? 14 : 16,
              className: "file-icon"
            }
          ) }),
          isAttachment ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "file-info", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "file-name", children: displayName }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "file-meta", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "file-ext", children: config.ext }),
              file?.size ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "file-size", children: formatSize(file.size) }) : null
            ] })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "file-name", children: file?.name || "\u672A\u77E5\u6587\u4EF6" }),
          isAttachment && isProcessing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "processing-indicator", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "spinner" }) }),
          isAttachment && error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "error-indicator", children: "\u26A0\uFE0F" })
        ]
      }
    ) });
  }
);

export {
  FileItem
};
