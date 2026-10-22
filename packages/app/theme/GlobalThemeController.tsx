// app/theme/GlobalThemeController.tsx

import { useEffect, useLayoutEffect, useMemo } from "react";
import { useDeviceThemeTokens } from "./useDeviceThemeTokens";
import {
  isServerAppearanceSnapshot,
  useDeviceAppearanceSnapshot,
} from "./storeDeviceAppearance";
import { isRecord } from "core/isRecord";
import {
  buildRootFontCss,
  clearInlineFontVariables,
} from "./fontPreference";
import { applyAgentThemeToElement } from "./agentTheme.stylex";

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

const generateCssString = (
  theme: Record<string, unknown>,
  rootFontCss: string
): string => {
  const declarations = generateCssVariables(theme).join(" ");
  return `:root { ${declarations}${rootFontCss ? ` ${rootFontCss}` : ""} }`;
};

/**
 * 全局主题控制器。
 * 渲染 <style id="global-theme-variables"> 并由 React 管理更新（主题切换即时生效）。
 * 设备偏好写入只由 Owner Controller 负责，此组件不重复持久化。
 */
const GlobalThemeController = () => {
  const theme = useDeviceThemeTokens();
  const appearanceSnapshot = useDeviceAppearanceSnapshot();
  const isDark = appearanceSnapshot.isDark;
  const density = appearanceSnapshot.density;
  const themeName = appearanceSnapshot.themeName;
  const fontPreset = appearanceSnapshot.fontPreset;

  // Hydration's first pass renders the SSR-stable snapshot, while the server bootstrap
  // has already painted the persisted appearance. Publishing this snapshot's defaults
  // over that paint is exactly the light/dark flash we must not produce, so the layout
  // effect stays silent until the external store synced browser-local preferences.
  const liveSnapshot = !isServerAppearanceSnapshot(appearanceSnapshot);

  const cssString = useMemo(
    () => generateCssString(theme, buildRootFontCss(fontPreset)),
    [theme, fontPreset]
  );

  useIsomorphicLayoutEffect(() => {
    if (!liveSnapshot) return;

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

    // First-paint bootstrap writes font variables inline on <html>; inline style wins
    // over this stylesheet, so drop exactly those keys to let preset switches apply.
    // Other inline styles on documentElement are preserved.
    clearInlineFontVariables(document.documentElement);

    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    document.documentElement.setAttribute("data-density", density);
    applyAgentThemeToElement(document.documentElement, String(themeName), isDark);
  }, [cssString, isDark, density, themeName, liveSnapshot]);

  return null;
};

export default GlobalThemeController;
