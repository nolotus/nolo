import {
  StreamingIndicator_default
} from "/public/assets/chunks/chunk-2IJLPAOU.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/PageLoading.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var PageLoading = ({
  message,
  fullHeight = true
}) => {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      role: "status",
      "aria-live": "polite",
      className: `page-loading${fullHeight ? " page-loading--full" : ""}`,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "loading-indicator-wrap", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StreamingIndicator_default, {}) }),
        message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "loading-text", children: message })
      ]
    }
  );
};
var PageLoading_default = PageLoading;

export {
  PageLoading_default
};
