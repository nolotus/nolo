import {
  Menu,
  MenuItem,
  MenuTrigger
} from "/public/assets/chunks/chunk-PE7D2KFT.js";
import {
  $7705c033048f6da7$export$353f5b6fc5456de1
} from "/public/assets/chunks/chunk-DIU2H7DW.js";
import {
  LuLanguages
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/LanguageSwitcher.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var languages = [
  { code: "en" /* EN */, name: "English" },
  { code: "zh-CN" /* ZH_CN */, name: "\u7B80\u4F53\u4E2D\u6587" },
  { code: "zh-Hant" /* ZH_HANT */, name: "\u7E41\u9AD4\u4E2D\u6587" },
  { code: "ja" /* JA */, name: "\u65E5\u672C\u8A9E" }
];
var LanguageSwitcher = (0, import_react.memo)(({ iconOnly = false }) => {
  const { i18n } = useTranslation();
  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "lang-switcher", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(MenuTrigger, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      $7705c033048f6da7$export$353f5b6fc5456de1,
      {
        className: `lang-button${iconOnly ? " lang-button--icon-only" : ""}`,
        "aria-label": "\u5207\u6362\u8BED\u8A00",
        ...iconOnly ? { title: "\u8BED\u8A00" } : {},
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuLanguages, { size: 16, className: "lang-icon", "aria-hidden": "true" }),
          !iconOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "lang-current", children: currentLanguage.name })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      Menu,
      {
        selectionMode: "single",
        selectedKeys: [currentLanguage.code],
        onAction: (key) => {
          void i18n.changeLanguage(String(key));
        },
        children: languages.map((lang) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuItem, { id: lang.code, textValue: lang.name, children: lang.name }, lang.code))
      }
    )
  ] }) });
});
var LanguageSwitcher_default = LanguageSwitcher;

export {
  LanguageSwitcher_default
};
