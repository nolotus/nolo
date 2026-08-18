import {
  DarkModeSwitch
} from "/public/assets/chunks/chunk-LGIWNRAE.js";
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
import "/public/assets/chunks/chunk-7MYCSSXH.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  FONT_PRESET_VALUES,
  catppuccin,
  changeDensity,
  changeFontPreset,
  changeTheme,
  iris,
  mono,
  rose,
  selectDensity,
  selectFontPreset,
  selectIsDark,
  selectThemeName,
  trail,
  wave
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuAlignJustify,
  LuList
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
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/theme/web/ThemePicker.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var THEMES = { catppuccin, wave, iris, rose, trail, mono };
var THEME_METADATA = {
  catppuccin: { name: "Catppuccin \xD7 GitHub", desc: "Ghostty \u7EC4\u5408\uFF1AGitHub Light \u4EAE\u4E3D\u767D\u5929 + Catppuccin Mocha \u67D4\u548C\u591C\u95F4" },
  wave: { name: "Wave (Kanagawa)", desc: "\u53E4\u5178\u7EB8\u8272\u4E0E\u6C34\u58A8\u84DD\uFF0C\u6E29\u6DA6\u62A4\u773C\u7684\u7B7E\u540D\u8272" },
  iris: { name: "Iris (Linear Purple)", desc: "\u7CBE\u81F4\u7684 Linear \u96C5\u81F4\u7D2B\uFF0C\u73B0\u4EE3\u79D1\u6280\u5DE5\u5177\u611F" },
  rose: { name: "Rose (Ros\xE9 Pine)", desc: "\u5317\u6B27\u6696\u7C89\u8272\u8C03\uFF0C\u6E29\u67D4\u6CBB\u6108\uFF0C\u81EA\u7136\u8D28\u611F" },
  trail: { name: "Trail (\u6237\u5916\u81EA\u7136)", desc: "\u96EA\u5C71\u4E0E\u6D6A\u82B1\u98CE\uFF0C\u5927\u5B57\u5706\u89D2\u4E0E\u6E05\u723D\u7F13\u52A8" },
  mono: { name: "Mono (\u7070\u6A59\u6781\u7B80)", desc: "open-props \u4E2D\u6027\u7070 + \u6696\u6A59\u5F3A\u8C03\uFF0C\u5E72\u51C0\u514B\u5236\u7684\u73B0\u4EE3\u611F" }
};
var ThemePicker = () => {
  const dispatch = useAppDispatch();
  const current = useAppSelector(selectThemeName);
  const isDark = useAppSelector(selectIsDark);
  const mode = isDark ? "dark" : "light";
  const [hoveredKey, setHoveredKey] = import_react.default.useState(null);
  const handleThemeClick = (themeName) => {
    try {
      localStorage.setItem("nolo-theme-name-explicit", "1");
    } catch {
    }
    dispatch(changeTheme(themeName));
  };
  const activeKey = THEMES[current] ? current : "wave";
  const displayKey = hoveredKey || activeKey;
  const metadata = THEME_METADATA[displayKey];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "theme-picker-container", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        className: "theme-grid",
        role: "radiogroup",
        "aria-label": "\u4E3B\u9898",
        children: Object.entries(THEMES).map(([key, p]) => {
          const themeKey = key;
          const name = THEME_METADATA[themeKey]?.name ?? key;
          const isActive = current === key;
          return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "div",
            {
              className: "theme-item",
              "data-active": isActive,
              role: "radio",
              "aria-checked": isActive,
              "aria-label": name,
              tabIndex: 0,
              style: {
                "--theme-color": p[mode].primary,
                "--theme-gradient": p[mode].primaryGradient || p[mode].primary
              },
              onClick: () => handleThemeClick(themeKey),
              onKeyDown: (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                handleThemeClick(themeKey);
              },
              onMouseEnter: () => setHoveredKey(themeKey),
              onMouseLeave: () => setHoveredKey(null),
              title: name,
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "theme-dot", "aria-hidden": "true" })
            },
            key
          );
        })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "theme-info", "aria-live": "polite", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "theme-info-name", children: metadata.name }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "theme-info-desc", children: metadata.desc })
    ] })
  ] });
};

// packages/app/theme/web/DensitySwitch.tsx
var import_react2 = __toESM(require_react());
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var DensitySwitch = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const active = useAppSelector(selectDensity);
  const containerRef = (0, import_react2.useRef)(null);
  const [slider, setSlider] = (0, import_react2.useState)({ left: 0, width: 0 });
  (0, import_react2.useLayoutEffect)(() => {
    const activeEl = containerRef.current?.querySelector(`[data-active="true"]`);
    if (activeEl) {
      setSlider({ left: activeEl.offsetLeft, width: activeEl.offsetWidth });
    }
  }, [active]);
  const options = [
    { v: "compact", i: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuAlignJustify, { size: 16, "aria-hidden": "true" }), l: t("settings.density.compact", "\u7D27\u51D1") },
    { v: "spacious", i: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuList, { size: 16, "aria-hidden": "true" }), l: t("settings.density.spacious", "\u5BBD\u677E") }
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "mode-tabs-container", ref: containerRef, style: { "--s-left": `${slider.left}px`, "--s-width": `${slider.width}px` }, children: options.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "button",
    {
      type: "button",
      className: "mode-tab-item",
      "data-active": active === opt.v,
      onClick: () => dispatch(changeDensity(opt.v)),
      "aria-label": opt.l,
      children: [
        opt.i,
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: opt.l })
      ]
    },
    opt.v
  )) });
};

// packages/app/theme/web/FontPresetPicker.tsx
var import_jsx_runtime3 = __toESM(require_jsx_runtime());
var FONT_PRESET_OPTIONS = FONT_PRESET_VALUES.map((value) => ({
  value,
  labelKey: `settings.font.${value}`
}));
var FontPresetPicker = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const current = useAppSelector(selectFontPreset);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    Select,
    {
      style: { width: "220px" },
      selectedKey: current,
      onSelectionChange: (key) => {
        if (key == null) return;
        dispatch(changeFontPreset(String(key)));
      },
      "aria-label": t("settings.appearance.font.title", "\u5B57\u4F53"),
      children: FONT_PRESET_OPTIONS.map((option) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        SelectItem,
        {
          id: option.value,
          textValue: t(option.labelKey),
          children: t(option.labelKey)
        },
        option.value
      ))
    }
  );
};

// packages/app/settings/web/Appearance.tsx
var import_jsx_runtime4 = __toESM(require_jsx_runtime());
var SettingSection = ({ title, description, children }) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("section", { className: "setting-section", children: [
  /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "section-header", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h2", { className: "section-title", children: title }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "section-description", children: description })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "section-content", children })
] });
var Appearance = () => {
  const { t } = useTranslation();
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_jsx_runtime4.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "appearance-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h1", { className: "page-title", children: t("settings.appearance.title") }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      SettingSection,
      {
        title: t("settings.appearance.theme.title"),
        description: t("settings.appearance.theme.description"),
        children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ThemePicker, {})
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      SettingSection,
      {
        title: t("settings.appearance.mode.title"),
        description: t("settings.appearance.mode.description"),
        children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DarkModeSwitch, {})
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      SettingSection,
      {
        title: t("settings.appearance.density.title", "\u5E03\u5C40\u5BC6\u5EA6"),
        description: t("settings.appearance.density.description", "\u7D27\u51D1\u6A21\u5F0F\u8BA9\u4FA7\u8FB9\u680F\u66F4\u5C0F\uFF0C\u5BBD\u677E\u6A21\u5F0F\u66F4\u6613\u70B9\u51FB"),
        children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DensitySwitch, {})
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      SettingSection,
      {
        title: t("settings.appearance.font.title", "\u5B57\u4F53"),
        description: t(
          "settings.appearance.font.description",
          "\u9009\u62E9\u4F60\u559C\u6B22\u7684\u754C\u9762\u5B57\u4F53\u3002\u6BD4\u5982\u4F60\u559C\u6B22\u5B8B\u4F53\u65F6\uFF0C\u53EF\u4EE5\u5728\u8FD9\u91CC\u5207\u6362\u3002"
        ),
        children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(FontPresetPicker, {})
      }
    )
  ] }) });
};
var Appearance_default = Appearance;
export {
  Appearance_default as default
};
