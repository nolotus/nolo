import {
  Popover
} from "/public/assets/chunks/chunk-CXTRCW5J.js";
import {
  $49319ee1285aa241$export$27d2ad3c5815583e,
  $49319ee1285aa241$export$2ce376c2cc3355c8,
  $49319ee1285aa241$export$4b1545b4f2016d26,
  $49319ee1285aa241$export$d9b273488cd8ce6f,
  $49319ee1285aa241$export$ecabc99eeffab7ca
} from "/public/assets/chunks/chunk-DIU2H7DW.js";
import {
  LuCheck,
  LuChevronRight,
  LuDot
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

// packages/render/web/ui/Menu.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
function MenuTrigger(props) {
  const [trigger, menu] = import_react.default.Children.toArray(props.children);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)($49319ee1285aa241$export$27d2ad3c5815583e, { ...props, children: [
    trigger,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Popover, { className: "app-menu-popover", hideArrow: true, offset: 4, children: menu })
  ] });
}
function Menu(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)($49319ee1285aa241$export$d9b273488cd8ce6f, { ...props, children: props.children });
}
function MenuItem(props) {
  const { className, ...restProps } = props;
  const computedClassName = (renderProps) => {
    const customClass = typeof className === "function" ? className(renderProps) : className;
    return `react-aria-MenuItem ${customClass ?? ""}`.trim();
  };
  const textValue = props.textValue || (typeof props.children === "string" ? props.children : extractMenuItemText(props.children));
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)($49319ee1285aa241$export$2ce376c2cc3355c8, { ...restProps, className: computedClassName, textValue, children: ({ hasSubmenu, isSelected, selectionMode }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    isSelected && selectionMode === "multiple" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCheck, { size: 16, className: "app-menu-check", "aria-hidden": "true" }) : null,
    isSelected && selectionMode === "single" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuDot, { size: 16, className: "app-menu-dot", "aria-hidden": "true" }) : null,
    typeof props.children === "string" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { slot: "label", children: props.children }) : props.children,
    hasSubmenu ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuChevronRight, { size: 16, className: "app-menu-chevron", "aria-hidden": "true" }) : null
  ] }) });
}
function MenuSection(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)($49319ee1285aa241$export$4b1545b4f2016d26, { ...props });
}
function SubmenuTrigger(props) {
  const [trigger, menu] = import_react.default.Children.toArray(props.children);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)($49319ee1285aa241$export$ecabc99eeffab7ca, { ...props, children: [
    trigger,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      Popover,
      {
        className: "app-menu-popover app-menu-popover--submenu",
        hideArrow: true,
        offset: -2,
        crossOffset: -4,
        children: menu
      }
    )
  ] });
}
function extractMenuItemText(children) {
  if (children == null || typeof children === "boolean") return void 0;
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    const parts = children.map((child) => extractMenuItemText(child)).filter((part) => !!part && part.trim().length > 0);
    return parts.length > 0 ? parts.join(" ") : void 0;
  }
  if (import_react.default.isValidElement(children)) {
    return extractMenuItemText(
      children.props.children
    );
  }
  return void 0;
}

export {
  MenuTrigger,
  Menu,
  MenuItem,
  MenuSection,
  SubmenuTrigger
};
