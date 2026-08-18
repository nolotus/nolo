import {
  $43a3b93638fe5db9$export$b04be29aa201d4f5,
  $b8dcdc58eeae0d40$export$2c73285ae9390cec,
  $bd263d78e9bf3c56$export$f5c9f3c2c4054eec,
  $efe09c6d1c304b50$export$5f1af8db9871e1d6
} from "/public/assets/chunks/chunk-DIU2H7DW.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/form/TextArea.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var TextArea = ({
  icon,
  error,
  helperText,
  label,
  variant = "default",
  autoResize = false,
  className = "",
  style,
  rows = 4,
  ref,
  ...props
}) => {
  const [internalRef, setInternalRef] = (0, import_react.useState)(
    null
  );
  const textareaRef = (0, import_react.useCallback)(
    (node) => {
      setInternalRef(node);
      if (typeof ref === "function") {
        ref(node);
      } else if (ref && "current" in ref) {
        ref.current = node;
      }
    },
    [ref]
  );
  (0, import_react.useEffect)(() => {
    if (autoResize && internalRef) {
      const adjustHeight = () => {
        internalRef.style.height = "auto";
        internalRef.style.height = `${internalRef.scrollHeight}px`;
      };
      adjustHeight();
      internalRef.addEventListener("input", adjustHeight);
      return () => internalRef.removeEventListener("input", adjustHeight);
    }
  }, [autoResize, internalRef, props.value]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    $b8dcdc58eeae0d40$export$2c73285ae9390cec,
    {
      isInvalid: error,
      isDisabled: props.disabled,
      className: `react-aria-TextField ${className}`,
      style,
      children: [
        label && /* @__PURE__ */ (0, import_jsx_runtime.jsx)($43a3b93638fe5db9$export$b04be29aa201d4f5, { className: `react-aria-Label ${error ? "is-invalid" : ""}`, children: label }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `textarea-wrapper ${icon ? "has-icon" : ""}`, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            $bd263d78e9bf3c56$export$f5c9f3c2c4054eec,
            {
              ref: textareaRef,
              rows,
              className: `react-aria-TextArea variant-${variant} ${autoResize ? "auto-resize" : ""} ${error ? "is-invalid" : ""} ${icon ? "has-icon" : ""}`,
              ...props
            }
          ),
          icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `input-icon ${error ? "error" : ""}`, children: icon })
        ] }),
        helperText && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          $efe09c6d1c304b50$export$5f1af8db9871e1d6,
          {
            slot: error ? "errorMessage" : "description",
            className: `input-helper ${error ? "is-invalid" : ""}`,
            children: helperText
          }
        )
      ]
    }
  );
};
TextArea.displayName = "TextArea";

export {
  TextArea
};
