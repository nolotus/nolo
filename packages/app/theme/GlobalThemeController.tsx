// app/theme/GlobalThemeController.tsx

import { useEffect, useLayoutEffect, useMemo } from "react";
import { useAppSelector } from "app/store";
import {
  selectTheme,
  selectIsDark,
  selectThemeMode,
  selectDensity,
  selectThemeName,
  selectFontPreset,
} from "app/settings/settingSlice";
import { isRecord } from "core/isRecord";
import { FONT_PRESET_STORAGE_KEY } from "./fontPreference";

const STYLE_TAG_ID = "global-theme-variables";
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const generateCssVariables = (
  obj: Record<string, unknown>,
  prefix = ""
): string[] =>
  Object.entries(obj).flatMap(([key, value]) => {
    const name = prefix ? `${prefix}-${key}` : key;
    if (isRecord(value))
      return generateCssVariables(value as Record<string, unknown>, name);
    return value != null ? [`--${name}:${value};`] : [];
  });

const generateCssString = (theme: Record<string, unknown>): string =>
  `:root { ${generateCssVariables(theme).join(" ")} }`;

/**
 * 全局主题控制器。
 * 渲染 <style id="global-theme-variables"> 并由 React 管理更新（主题切换即时生效）。
 * useEffect 同步 localStorage，供 bootstrap 脚本在下次加载时立即注入正确主题（零闪烁）。
 */
const GlobalThemeController = () => {
  const theme = useAppSelector(selectTheme);
  const isDark = useAppSelector(selectIsDark);
  const themeMode = useAppSelector(selectThemeMode);
  const density = useAppSelector(selectDensity);
  const themeName = useAppSelector(selectThemeName);
  const fontPreset = useAppSelector(selectFontPreset);

  const cssString = useMemo(() => generateCssString(theme), [theme]);

  useIsomorphicLayoutEffect(() => {
    const existingTag = document.getElementById(STYLE_TAG_ID);
    const styleTag =
      existingTag instanceof HTMLStyleElement
        ? existingTag
        : document.createElement("style");

    if (styleTag.id !== STYLE_TAG_ID) {
      styleTag.id = STYLE_TAG_ID;
    }
    if (styleTag.parentNode !== document.head) {
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = cssString;

    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    document.documentElement.setAttribute("data-density", density);
    try {
      localStorage.setItem("nolo-theme-mode", themeMode);
      localStorage.setItem("nolo-theme-name", String(themeName));
      localStorage.setItem("nolo-density", density);
      localStorage.setItem(FONT_PRESET_STORAGE_KEY, fontPreset);
    } catch {
      // 无痕模式或 localStorage 不可用时静默忽略
    }
  }, [cssString, isDark, themeMode, density, themeName, fontPreset]);

  return null;
};

export default GlobalThemeController;
