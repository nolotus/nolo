import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/create/space/components/EmptyState.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var EmptyState = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  secondaryAction,
  size = "medium"
}) => {
  const showActions = Boolean(actionText && onAction || secondaryAction);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `space-empty-state space-empty-state--${size}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "space-empty-state__icon", "aria-hidden": "true", children: icon }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "space-empty-state__title", children: title }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "space-empty-state__description", children: description }),
    showActions && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-empty-state__actions", children: [
      actionText && onAction && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "space-empty-state__action space-empty-state__action--primary",
          onClick: onAction,
          children: actionText
        }
      ),
      secondaryAction && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "space-empty-state__action space-empty-state__action--secondary",
          onClick: secondaryAction.onClick,
          children: secondaryAction.text
        }
      )
    ] })
  ] });
};
var EmptyState_default = EmptyState;

export {
  EmptyState_default
};
