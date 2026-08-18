import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/StreamingIndicator.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var StreamingIndicator = (0, import_react.memo)(() => {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "streaming-indicator", "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "streaming-indicator__dot" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "streaming-indicator__dot" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "streaming-indicator__dot" })
  ] });
});
var StreamingIndicator_default = StreamingIndicator;

export {
  StreamingIndicator_default
};
