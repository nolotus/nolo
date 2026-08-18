import {
  $05a50f7d78b03ad9$export$28c660c63b792dea,
  $05a50f7d78b03ad9$export$8c610744efcf8a1d,
  $4fcfe18fac72dabd$export$746d02f47f4d381
} from "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import {
  $d1116acdf220c2da$export$f9762fab77588ecb
} from "/public/assets/chunks/chunk-I2UX5KHN.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/Tooltip.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var PLACEMENT_MAP = {
  top: "top",
  "top-left": "top left",
  "top-right": "top right",
  bottom: "bottom",
  "bottom-left": "bottom left",
  "bottom-right": "bottom right",
  left: "left",
  right: "right"
};
var TriggerWrapper = import_react.default.forwardRef(function TriggerWrapper2({ children, ...rest }, forwardedRef) {
  const focusableContext = (0, import_react.useContext)($d1116acdf220c2da$export$f9762fab77588ecb);
  const ctxRef = focusableContext?.ref;
  const { ref: _ctxRef, ...triggerEvents } = focusableContext ?? {};
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "span",
    {
      ref: (node) => {
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
        if (ctxRef) ctxRef.current = node;
      },
      ...triggerEvents,
      ...rest,
      children
    }
  );
});
var Tooltip = ({
  content,
  children,
  delay,
  placement = "top",
  disabled = false
}) => {
  if (!content || disabled) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)($05a50f7d78b03ad9$export$8c610744efcf8a1d, { delay, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriggerWrapper, { children }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      $05a50f7d78b03ad9$export$28c660c63b792dea,
      {
        placement: PLACEMENT_MAP[placement],
        offset: 6,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)($4fcfe18fac72dabd$export$746d02f47f4d381, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: 8, height: 8, viewBox: "0 0 8 8", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M0 0 L4 4 L8 0" }) }) }),
          content
        ]
      }
    )
  ] });
};

export {
  Tooltip
};
