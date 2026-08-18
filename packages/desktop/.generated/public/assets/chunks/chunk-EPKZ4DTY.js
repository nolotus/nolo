import {
  Dialog
} from "/public/assets/chunks/chunk-7HTHEFUV.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import {
  LuCircleCheck,
  LuCircleX,
  LuInfo,
  LuTriangleAlert
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/modal/ConfirmModal.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var ICON_MAP = {
  error: LuCircleX,
  warning: LuTriangleAlert,
  success: LuCircleCheck,
  info: LuInfo
};
var ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "\u786E\u8BA4",
  cancelText = "\u53D6\u6D88",
  type = "warning",
  loading = false,
  showCancel = true,
  allowCancelWhileLoading = false,
  children
}) => {
  const IconComponent = ICON_MAP[type];
  const actions = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    showCancel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      Button_default,
      {
        onClick: onClose,
        variant: "secondary",
        size: "small",
        className: "ConfirmModal__button ConfirmModal__button--cancel",
        disabled: loading && !allowCancelWhileLoading,
        children: cancelText
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      Button_default,
      {
        onClick: onConfirm,
        variant: type === "error" ? "danger" : "primary",
        size: "small",
        className: "ConfirmModal__button ConfirmModal__button--confirm",
        loading,
        disabled: loading,
        children: confirmText
      }
    )
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    Dialog,
    {
      isOpen,
      onClose,
      title,
      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconComponent, { size: 16 }),
      status: type,
      actions,
      width: 400,
      onEnterPress: onConfirm,
      isActionDisabled: loading,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ConfirmModal-message", children: message }),
        children
      ]
    }
  );
};

export {
  ConfirmModal
};
