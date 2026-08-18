import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/settings/web/chat-config/SettingSection.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var SettingSection = ({
  title,
  description,
  children
}) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "ChatConfigSettingSection", children: [
  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ChatConfigSettingSection__header", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "ChatConfigSettingSection__title", children: title }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ChatConfigSettingSection__description", children: description })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ChatConfigSettingSection__content", children })
] }) });
var SettingSection_default = SettingSection;

export {
  SettingSection_default
};
