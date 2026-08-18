import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  SYSTEM_DARK_MEDIA_QUERY,
  resolveThemeModeIsDark,
  selectIsDark,
  selectThemeMode,
  setThemeMode
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  LuMonitor,
  LuMoon,
  LuSun
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  require_react_dom
} from "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/theme/web/DarkModeSwitch.tsx
var import_react = __toESM(require_react());
var import_react_dom = __toESM(require_react_dom());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var DarkModeSwitch = ({ compact = false, className }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const active = useAppSelector(selectThemeMode);
  const isDark = useAppSelector(selectIsDark);
  const containerRef = (0, import_react.useRef)(null);
  const [slider, setSlider] = (0, import_react.useState)({ left: 0, width: 0 });
  (0, import_react.useLayoutEffect)(() => {
    const activeEl = containerRef.current?.querySelector(`[data-active="true"]`);
    if (activeEl) {
      setSlider({ left: activeEl.offsetLeft, width: activeEl.offsetWidth });
    }
  }, [active]);
  const handleSelect = (v) => {
    const mode = v;
    if (mode === active) return;
    const systemPrefersDark = typeof window !== "undefined" && window.matchMedia(SYSTEM_DARK_MEDIA_QUERY).matches;
    const nextIsDark = resolveThemeModeIsDark(mode, systemPrefersDark);
    const motionAllowed = typeof window === "undefined" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!motionAllowed || nextIsDark === isDark || typeof document === "undefined" || !document.startViewTransition) {
      dispatch(setThemeMode(mode));
      return;
    }
    document.startViewTransition(() => {
      (0, import_react_dom.flushSync)(() => {
        dispatch(setThemeMode(mode));
      });
    });
  };
  const options = [
    { v: "light", i: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuSun, { size: 16, "aria-hidden": "true" }), l: t("settings.theme.light") },
    { v: "dark", i: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMoon, { size: 16, "aria-hidden": "true" }), l: t("settings.theme.dark") },
    { v: "system", i: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMonitor, { size: 16, "aria-hidden": "true" }), l: t("settings.theme.system") }
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      className: [
        "mode-tabs-container",
        compact ? "mode-tabs-container--compact" : "",
        className
      ].filter(Boolean).join(" "),
      ref: containerRef,
      style: { "--s-left": `${slider.left}px`, "--s-width": `${slider.width}px` },
      children: options.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "mode-tab-item",
          "data-active": active === opt.v,
          onClick: () => handleSelect(opt.v),
          "aria-label": opt.l,
          children: opt.i
        },
        opt.v
      ))
    }
  );
};

export {
  DarkModeSwitch
};
