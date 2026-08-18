import {
  BaseModal
} from "/public/assets/chunks/chunk-XTMQULJ5.js";
import {
  LuX
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

// packages/render/web/ui/modal/Dialog.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var Dialog = ({
  isOpen,
  onClose,
  title,
  children,
  className = "",
  size = "medium",
  width,
  noPadding = false,
  bodyClassName = "",
  icon,
  status = "neutral",
  actions,
  showClose,
  onEnterPress,
  isActionDisabled = false,
  ...ariaProps
}) => {
  const titleId = (0, import_react.useId)();
  const actionsRef = (0, import_react.useRef)(null);
  const dialogRef = (0, import_react.useRef)(null);
  const statusClass = status === "neutral" ? "" : `status-${status}`;
  const resolvedShowClose = showClose ?? !actions;
  const widthStyle = width !== void 0 ? { width: typeof width === "number" ? `${width}px` : width } : void 0;
  (0, import_react.useEffect)(() => {
    if (!isOpen || !actions) return;
    const timer = setTimeout(() => {
      const dialogEl = dialogRef.current;
      if (!dialogEl) return;
      if (dialogEl.contains(document.activeElement)) return;
      const buttons = actionsRef.current?.querySelectorAll(
        "button:not([disabled])"
      );
      const last = buttons?.[buttons.length - 1];
      if (last instanceof HTMLElement) last.focus();
      else dialogEl.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen, actions]);
  const handleKeyDown = (0, import_react.useCallback)(
    (event) => {
      if (isActionDisabled || !onEnterPress) return;
      if (event.key !== "Enter") return;
      const target = event.target;
      if (target?.matches('textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      onEnterPress();
    },
    [onEnterPress, isActionDisabled]
  );
  const dialogWidthStyle = {
    ...widthStyle ?? {},
    // Reset UA dialog chrome so layout stays CSS-driven.
    margin: 0,
    padding: 0
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    BaseModal,
    {
      isOpen,
      onClose,
      className: `c-dialogRoot ${className}`,
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "dialog",
        {
          open: true,
          ref: dialogRef,
          tabIndex: -1,
          className: `c-dialog size-${size} ${statusClass}`.trim(),
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": title ? titleId : void 0,
          style: dialogWidthStyle,
          onKeyDown: onEnterPress ? handleKeyDown : void 0,
          ...ariaProps,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "c-dialog__header", children: [
              title && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { id: titleId, className: "c-dialog__title", children: [
                icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "c-dialog__titleIcon", "aria-hidden": "true", children: icon }),
                title
              ] }),
              resolvedShowClose && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  className: "c-dialog__close",
                  onClick: onClose,
                  type: "button",
                  "aria-label": "Close dialog",
                  children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuX, { size: 20, "aria-hidden": "true" })
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `c-dialog__body ${noPadding ? "no-padding" : ""} ${bodyClassName}`, children }),
            actions && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: actionsRef, className: "c-dialog__footer", children: actions })
          ]
        }
      )
    }
  );
};

export {
  Dialog
};
