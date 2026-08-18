import {
  Select,
  SelectItem
} from "/public/assets/chunks/chunk-5LT6KM4O.js";
import "/public/assets/chunks/chunk-AL5TXIK3.js";
import "/public/assets/chunks/chunk-CXTRCW5J.js";
import "/public/assets/chunks/chunk-DIU2H7DW.js";
import "/public/assets/chunks/chunk-ZTDLGZ3X.js";
import "/public/assets/chunks/chunk-VELLRNIX.js";
import "/public/assets/chunks/chunk-I2UX5KHN.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectEditorConfig,
  setEditorAutoSaveInterval,
  setEditorDarkCodeTheme,
  setEditorFontSize,
  setEditorLightCodeTheme,
  toggleEditorAutoSave,
  toggleEditorShortcut,
  toggleEditorWordCount
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuClock,
  LuCode,
  LuHash,
  LuHeading,
  LuList,
  LuListOrdered,
  LuQuote,
  LuSettings,
  LuSquareCheck
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/settings/web/EditorConfig.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var SettingSection = ({ title, description, children }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "setting-section", children: [
  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "section-header", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "section-title", children: title }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "section-description", children: description })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "section-content", children })
] });
var ShortcutToggle = ({ icon, label, enabled, onToggle }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "shortcut-item", children: [
  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "shortcut-label", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "shortcut-icon", children: icon }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": enabled,
      "aria-label": label,
      onClick: onToggle,
      className: `toggle-switch ${enabled ? "enabled" : ""}`,
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "toggle-knob" })
    }
  )
] });
var EditorConfig = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    // defaultMode 已删除
    lightCodeTheme,
    darkCodeTheme,
    codeTheme,
    // 保留：当前实际生效的主题（展示用）
    wordCountEnabled,
    shortcuts,
    fontSize,
    autoSave,
    autoSaveInterval
  } = useAppSelector(selectEditorConfig);
  const shortcutItems = [
    {
      key: "heading",
      label: t("editor.shortcuts.heading", "\u6807\u9898"),
      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuHeading, { size: 16, "aria-hidden": "true" })
    },
    {
      key: "ulist",
      label: t("editor.shortcuts.ulist", "\u65E0\u5E8F\u5217\u8868"),
      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuList, { size: 16, "aria-hidden": "true" })
    },
    {
      key: "olist",
      label: t("editor.shortcuts.olist", "\u6709\u5E8F\u5217\u8868"),
      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuListOrdered, { size: 16, "aria-hidden": "true" })
    },
    {
      key: "tasklist",
      label: t("editor.shortcuts.tasklist", "\u4EFB\u52A1\u5217\u8868"),
      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuSquareCheck, { size: 16, "aria-hidden": "true" })
    },
    {
      key: "quote",
      label: t("editor.shortcuts.quote", "\u5F15\u7528"),
      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuQuote, { size: 16, "aria-hidden": "true" })
    },
    {
      key: "code",
      label: t("editor.shortcuts.code", "\u4EE3\u7801\u5757"),
      icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuCode, { size: 16, "aria-hidden": "true" })
    }
  ];
  const codeThemes = [
    { value: "default", label: t("editor.codeTheme.options.default", "Prism Default\uFF08\u6D45\u8272\uFF09") },
    { value: "okaidia", label: t("editor.codeTheme.options.okaidia", "Okaidia\uFF08\u6DF1\u8272 / Monokai\uFF09") },
    { value: "github-light", label: t("editor.codeTheme.options.githubLight", "GitHub Light") },
    { value: "github-dark", label: t("editor.codeTheme.options.githubDark", "GitHub Dark") }
  ];
  const fontSizes = [12, 13, 14, 15, 16, 17, 18];
  const autoSaveIntervals = [10, 30, 60, 120, 300];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "editor-config-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "page-title", children: t("editor.title", "\u7F16\u8F91\u5668\u8BBE\u7F6E") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      SettingSection,
      {
        title: t("editor.codeTheme.title", "\u4EE3\u7801\u5757\u4E3B\u9898"),
        description: t(
          "editor.codeTheme.description",
          "\u4E3A\u7F16\u8F91\u5668\u4E2D\u7684\u4EE3\u7801\u5757\u5206\u522B\u914D\u7F6E\u6D45\u8272\u6A21\u5F0F\u548C\u6DF1\u8272\u6A21\u5F0F\u4E0B\u4F7F\u7528\u7684\u8BED\u6CD5\u9AD8\u4EAE\u4E3B\u9898\u3002"
        ),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "setting-group", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "setting-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "setting-label", children: t("editor.codeTheme.light", "\u6D45\u8272\u6A21\u5F0F\u4EE3\u7801\u4E3B\u9898") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Select,
              {
                selectedKey: lightCodeTheme,
                onSelectionChange: (key) => dispatch(setEditorLightCodeTheme(String(key ?? ""))),
                children: codeThemes.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: opt.value, textValue: opt.label, children: opt.label }, opt.value))
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "setting-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "setting-label", children: t("editor.codeTheme.dark", "\u6DF1\u8272\u6A21\u5F0F\u4EE3\u7801\u4E3B\u9898") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Select,
              {
                selectedKey: darkCodeTheme,
                onSelectionChange: (key) => dispatch(setEditorDarkCodeTheme(String(key ?? ""))),
                children: codeThemes.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: opt.value, textValue: opt.label, children: opt.label }, opt.value))
              }
            )
          ] })
        ] })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      SettingSection,
      {
        title: t("editor.preferences.title", "\u7F16\u8F91\u5668\u504F\u597D"),
        description: t(
          "editor.preferences.description",
          "\u914D\u7F6E\u7F16\u8F91\u5668\u7684\u5916\u89C2\u548C\u884C\u4E3A\u8BBE\u7F6E\u3002"
        ),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "setting-group", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "setting-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "setting-label", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuSettings, { size: 16, "aria-hidden": "true" }),
              t("editor.fontSize", "\u5B57\u4F53\u5927\u5C0F")
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Select,
              {
                style: { width: "100px" },
                selectedKey: fontSize,
                onSelectionChange: (key) => dispatch(setEditorFontSize(Number(key))),
                children: fontSizes.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: s, textValue: `${s}px`, children: `${s}px` }, s))
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            ShortcutToggle,
            {
              icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuClock, { size: 16, "aria-hidden": "true" }),
              label: t("editor.autoSave", "\u81EA\u52A8\u4FDD\u5B58"),
              enabled: autoSave,
              onToggle: () => dispatch(toggleEditorAutoSave())
            }
          ),
          autoSave && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "setting-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "setting-label", children: t("editor.autoSaveInterval", "\u81EA\u52A8\u4FDD\u5B58\u95F4\u9694") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              Select,
              {
                style: { width: "120px" },
                selectedKey: autoSaveInterval,
                onSelectionChange: (key) => dispatch(setEditorAutoSaveInterval(Number(key))),
                children: autoSaveIntervals.map((i) => {
                  const label = i < 60 ? t("editor.autoSaveIntervalSeconds", "{{count}}\u79D2", { count: i }) : t("editor.autoSaveIntervalMinutes", "{{count}}\u5206\u949F", { count: i / 60 });
                  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, { id: i, textValue: label, children: label }, i);
                })
              }
            )
          ] })
        ] })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      SettingSection,
      {
        title: t("editor.wordCount.title", "\u5B57\u6570\u7EDF\u8BA1"),
        description: t(
          "editor.wordCount.description",
          "\u5728\u7F16\u8F91\u5668\u5E95\u90E8\u663E\u793A\u5B9E\u65F6\u5B57\u6570\u3001\u5B57\u7B26\u6570\u548C\u9605\u8BFB\u65F6\u95F4\u7EDF\u8BA1\u3002"
        ),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          ShortcutToggle,
          {
            icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuHash, { size: 16, "aria-hidden": "true" }),
            label: t("editor.wordCount.enable", "\u663E\u793A\u5B57\u6570\u7EDF\u8BA1"),
            enabled: wordCountEnabled,
            onToggle: () => dispatch(toggleEditorWordCount())
          }
        )
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      SettingSection,
      {
        title: t("editor.shortcuts.title", "\u6587\u672C\u5FEB\u6377\u65B9\u5F0F"),
        description: t(
          "editor.shortcuts.description",
          "\u5728\u8F93\u5165\u65F6\u81EA\u52A8\u5C06\u7279\u5B9A\u7B26\u53F7\u8F6C\u6362\u4E3A\u683C\u5F0F\u5316\u6587\u672C\uFF0C\u4F8B\u5982\u8F93\u5165 '-' \u4F1A\u521B\u5EFA\u4E00\u4E2A\u5217\u8868\u9879\u3002"
        ),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "shortcut-list", children: shortcutItems.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          ShortcutToggle,
          {
            icon: item.icon,
            label: item.label,
            enabled: shortcuts[item.key] ?? false,
            onToggle: () => dispatch(toggleEditorShortcut(item.key))
          },
          item.key
        )) })
      }
    )
  ] }) });
};
var EditorConfig_default = EditorConfig;
export {
  EditorConfig_default as default
};
