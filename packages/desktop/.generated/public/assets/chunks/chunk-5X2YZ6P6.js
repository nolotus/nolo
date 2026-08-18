import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/form/FormTitle.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var FormTitle = ({
  children,
  fontSize,
  marginBottom
}) => {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "h2",
    {
      className: "form-title",
      style: fontSize || marginBottom ? {
        ...fontSize ? { fontSize } : {},
        ...marginBottom ? { marginBottom } : {}
      } : void 0,
      children
    }
  );
};
var FormTitle_default = FormTitle;

export {
  FormTitle_default
};
