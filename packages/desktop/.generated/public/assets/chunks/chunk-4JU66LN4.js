import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/InlineEditInput.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var InlineEditInput = (props) => {
  const { inputRef, className, style, type = "text", ...restProps } = props;
  const mergedClassName = ["inline-edit-input", className].filter(Boolean).join(" ");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "input",
    {
      ref: inputRef,
      type,
      className: mergedClassName,
      style,
      ...restProps
    }
  ) });
};
var InlineEditInput_default = InlineEditInput;

export {
  InlineEditInput_default
};
