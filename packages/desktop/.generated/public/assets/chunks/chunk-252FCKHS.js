import {
  Link
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/Button.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var Button = ({
  variant = "primary",
  size = "medium",
  icon,
  loading,
  disabled,
  block,
  type = "button",
  className = "",
  children,
  onClick,
  as: Component = "button",
  to,
  // 从 rest 中提取 title 和 aria-label 以便处理逻辑
  title,
  "aria-label": ariaLabel,
  ...rest
}) => {
  const isDisabled = disabled || loading;
  const isLink = Component === Link;
  const isNativeButton = Component === "button";
  const hasText = children !== void 0 && children !== null && children !== false;
  const shouldRenderText = hasText && !loading;
  const finalAriaLabel = ariaLabel || title;
  const handleClick = (e) => {
    if (isDisabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };
  const classes = [
    "btn",
    `btn-${variant}`,
    `btn-${size}`,
    block && "btn-block",
    loading && "btn-loading",
    isDisabled && "btn-disabled",
    className
  ].filter(Boolean).join(" ");
  const commonProps = {
    className: classes,
    onClick: handleClick,
    // 显式设置 aria-label 和 title
    "aria-label": finalAriaLabel,
    title,
    ...isNativeButton ? { disabled: isDisabled, type } : {},
    ...isLink ? {
      to: to || "#",
      style: {
        textDecoration: "none",
        ...rest.style
      }
    } : {},
    ...rest
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: import_react.default.createElement(
    Component,
    commonProps,
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: `btn-content${loading ? " btn-content--loading" : ""}`, children: [
      loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "btn-spinner-wrap", "aria-hidden": "true" }) : icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "btn-leading", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "btn-icon", children: icon }) }),
      shouldRenderText && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "btn-text", children })
    ] })
  ) });
};
Button.displayName = "Button";
var Button_default = Button;

export {
  Button_default
};
