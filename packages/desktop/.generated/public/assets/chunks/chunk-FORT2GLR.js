import {
  Description
} from "/public/assets/chunks/chunk-AL5TXIK3.js";
import {
  $1f3c3b1a70cec653$export$f551688fc98f2e09,
  $24585aa46d6ffdff$export$208c2e617baf9fc3,
  $24585aa46d6ffdff$export$72111f742dee7cb8
} from "/public/assets/chunks/chunk-DIU2H7DW.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/LoadingSpinner.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
function LoadingSpinner({
  size = 16,
  thickness = 2,
  className = ""
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "span",
    {
      className: `loading-spinner ${className}`.trim(),
      style: {
        width: size,
        height: size,
        borderWidth: thickness
      },
      "aria-hidden": "true"
    }
  ) });
}
var LoadingSpinner_default = LoadingSpinner;

// packages/render/web/ui/Switch.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
function Switch({
  children,
  description,
  errorMessage,
  label,
  helperText,
  loading = false,
  error = false,
  checked,
  defaultChecked,
  onChange,
  disabled,
  isSelected,
  defaultSelected,
  isDisabled,
  isInvalid,
  inputRef,
  ref,
  ...props
}) {
  const content = children ?? label;
  const desc = description ?? helperText;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    $24585aa46d6ffdff$export$208c2e617baf9fc3,
    {
      ...props,
      isSelected: checked ?? isSelected,
      defaultSelected: defaultChecked ?? defaultSelected,
      onChange,
      isDisabled: disabled ?? isDisabled ?? loading,
      isInvalid: error || isInvalid,
      inputRef: inputRef ?? ref,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)($24585aa46d6ffdff$export$72111f742dee7cb8, { "data-loading": loading || void 0, children: () => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "track", children: [
            loading && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "switch-loading", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LoadingSpinner_default, { size: 12 }) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "handle" })
          ] }),
          content
        ] }) }),
        desc && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Description, { children: desc }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)($1f3c3b1a70cec653$export$f551688fc98f2e09, { children: errorMessage })
      ]
    }
  );
}

export {
  Switch
};
