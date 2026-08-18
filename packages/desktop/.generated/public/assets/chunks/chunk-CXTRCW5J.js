import {
  $542a13ca2fa5b484$export$5b6b19405a83ff9d
} from "/public/assets/chunks/chunk-DIU2H7DW.js";
import {
  $4fcfe18fac72dabd$export$746d02f47f4d381
} from "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/Popover.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
function PopoverArrow() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)($4fcfe18fac72dabd$export$746d02f47f4d381, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "svg",
    {
      width: 14,
      height: 14,
      viewBox: "0 0 14 14",
      className: "react-aria-Popover__arrow",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M0 0 L7 7 L14 0" })
    }
  ) });
}
function Popover(props) {
  const {
    hideArrow = false,
    offset = 4,
    crossOffset = 0,
    className,
    children,
    ...rest
  } = props;
  const shellClassName = typeof className === "function" ? (renderProps) => `app-popover ${className(renderProps) ?? ""}`.trim() : `app-popover ${className ?? ""}`.trim();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    $542a13ca2fa5b484$export$5b6b19405a83ff9d,
    {
      ...rest,
      className: shellClassName,
      offset,
      crossOffset,
      children: (renderProps) => {
        const body = typeof children === "function" ? children({ ...renderProps, defaultChildren: void 0 }) : children;
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          hideArrow ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverArrow, {}),
          body
        ] });
      }
    }
  );
}

export {
  Popover
};
