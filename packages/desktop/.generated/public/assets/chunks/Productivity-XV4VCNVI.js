import {
  Kbd_default,
  formatShortcut
} from "/public/assets/chunks/chunk-YGZ3UNXV.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectDeleteShortcut,
  setSettings,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuRotateCcw,
  LuTrash2
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

// packages/app/settings/web/Productivity.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var SettingSection = ({ title, description, children }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "setting-section", children: [
  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "section-header", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "section-title", children: title }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "section-description", children: description })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "section-content", children })
] });
var Productivity = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isMac = typeof window !== "undefined" && /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);
  const deleteShortcut = useAppSelector(selectDeleteShortcut);
  const [isRecording, setIsRecording] = (0, import_react.useState)(false);
  const [tempKeys, setTempKeys] = (0, import_react.useState)([]);
  (0, import_react.useEffect)(() => {
    if (!isRecording) return;
    const handleKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const key = e.key;
      if (key === "Escape") {
        setIsRecording(false);
        return;
      }
      const isModifier = ["control", "shift", "alt", "meta"].includes(key.toLowerCase());
      if (isModifier) {
        const pressed = [];
        if (e.ctrlKey) pressed.push("Ctrl");
        if (e.altKey) pressed.push(isMac ? "Option" : "Alt");
        if (e.shiftKey) pressed.push("Shift");
        if (e.metaKey) pressed.push(isMac ? "\u2318" : "Win");
        setTempKeys(pressed);
        return;
      }
      const parts = [];
      if (e.ctrlKey) parts.push("ctrl");
      if (e.altKey) parts.push("alt");
      if (e.shiftKey) parts.push("shift");
      if (e.metaKey) parts.push("meta");
      parts.push(key.toLowerCase());
      const newShortcut = parts.join("+");
      void dispatch(setSettings({ deleteShortcut: newShortcut }));
      setIsRecording(false);
      toast.success(t("settings.productivity.shortcuts.updated", "\u5FEB\u6377\u952E\u5DF2\u66F4\u65B0"));
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isRecording, isMac, dispatch, t]);
  const displayValue = (0, import_react.useMemo)(() => {
    if (isRecording) {
      return tempKeys.length > 0 ? tempKeys.join(" + ") + " + ..." : t("settings.productivity.shortcuts.pressKeys", "\u6309\u4E0B\u5FEB\u6377\u952E...");
    }
    if (!deleteShortcut) {
      return t("settings.productivity.shortcuts.none", "\u5DF2\u7981\u7528");
    }
    return formatShortcut(deleteShortcut, isMac).replace(/\u2318/g, "Cmd").replace(/\u232B/g, "Del");
  }, [isRecording, tempKeys, deleteShortcut, isMac, t]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "productivity-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "page-title", children: t("settings.productivity.title", "\u6548\u7387\u8BBE\u7F6E") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      SettingSection,
      {
        title: t("settings.productivity.shortcuts.title", "\u952E\u76D8\u5FEB\u6377\u952E"),
        description: t(
          "settings.productivity.shortcuts.description",
          "\u67E5\u770B\u5E76\u7BA1\u7406\u5E38\u7528\u64CD\u4F5C\u7684\u5FEB\u6377\u952E\u914D\u7F6E\uFF0C\u8BA9\u4F60\u7684\u5DE5\u4F5C\u6D41\u66F4\u52A0\u987A\u7545\u3002"
        ),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", { className: "shortcut-list", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: "shortcut-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "shortcut-action", children: t("toggleSidebar", "\u5207\u6362\u4FA7\u8FB9\u680F") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kbd_default, { shortcut: "mod+b" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: "shortcut-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "shortcut-action", children: t("settings.productivity.shortcuts.sendMessage", "\u53D1\u9001\u6D88\u606F") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kbd_default, { shortcut: "mod+enter" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: "shortcut-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "shortcut-action", children: t("settings.productivity.shortcuts.newChat", "\u65B0\u5EFA\u5BF9\u8BDD") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kbd_default, { shortcut: "mod+n" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: "shortcut-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "shortcut-action", children: t("settings.productivity.shortcuts.deleteDialog", "\u5220\u9664\u5F53\u524D\u4F1A\u8BDD") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "shortcut-edit-container", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  className: `shortcut-kbd-btn ${isRecording ? "is-recording" : ""}`,
                  onClick: () => {
                    setIsRecording(true);
                    setTempKeys([]);
                  },
                  title: t("settings.productivity.shortcuts.clickToRecord", "\u70B9\u51FB\u4FEE\u6539\u5FEB\u6377\u952E"),
                  children: displayValue
                }
              ),
              deleteShortcut && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  className: "shortcut-reset-btn",
                  onClick: async () => {
                    try {
                      await dispatch(setSettings({ deleteShortcut: "" })).unwrap();
                      toast.success(t("settings.productivity.shortcuts.cleared", "\u5FEB\u6377\u952E\u5DF2\u7981\u7528"));
                    } catch (err) {
                      toast.error(t("settings.productivity.shortcuts.clearError", "\u7981\u7528\u5931\u8D25"));
                    }
                  },
                  title: t("settings.productivity.shortcuts.clear", "\u7981\u7528\u5FEB\u6377\u952E"),
                  "aria-label": t("settings.productivity.shortcuts.clear", "\u7981\u7528\u5FEB\u6377\u952E"),
                  children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuTrash2, { size: 14, "aria-hidden": "true" })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  className: "shortcut-reset-btn",
                  onClick: async () => {
                    const defaultShortcut = isMac ? "meta+backspace" : "ctrl+backspace";
                    try {
                      await dispatch(setSettings({ deleteShortcut: defaultShortcut })).unwrap();
                      toast.success(t("settings.productivity.shortcuts.resetSuccess", "\u5FEB\u6377\u952E\u5DF2\u91CD\u7F6E"));
                    } catch (err) {
                      toast.error(t("settings.productivity.shortcuts.resetError", "\u91CD\u7F6E\u5931\u8D25"));
                    }
                  },
                  title: t("settings.productivity.shortcuts.reset", "\u91CD\u7F6E\u4E3A\u9ED8\u8BA4"),
                  "aria-label": t("settings.productivity.shortcuts.reset", "\u91CD\u7F6E\u4E3A\u9ED8\u8BA4"),
                  children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuRotateCcw, { size: 14, "aria-hidden": "true" })
                }
              )
            ] })
          ] })
        ] })
      }
    )
  ] }) });
};
var Productivity_default = Productivity;
export {
  Productivity_default as default
};
