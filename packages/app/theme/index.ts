import { useCallback } from "react";
import { flushSync } from "react-dom";
import { useAppDispatch, useAppSelector } from "app/store";
import {
  selectIsDark,
  selectTheme,
  selectThemeMode,
  setThemeMode,
} from "app/settings/settingSlice";
import {
  resolveThemeModeIsDark,
  SYSTEM_DARK_MEDIA_QUERY,
  type ThemeMode,
} from "./themeModeBootstrap";

export const useTheme = () => {
  const theme = useAppSelector(selectTheme);
  return theme;
};

/** Resolved light/dark for components that only need to branch on it. */
export const useIsDark = (): boolean => useAppSelector(selectIsDark);

/**
 * Theme mode read + switch. Switching plays the circular View Transition
 * reveal (theme-ui.css, clip-path from the clicked element) when the
 * light/dark result actually changes and motion is allowed. Used by DarkModeSwitch and the guest-home topbar toggle.
 */
export const useThemeModeControl = () => {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector(selectThemeMode);
  const isDark = useAppSelector(selectIsDark);

  const applyThemeMode = useCallback(
    /** origin: the clicked element, so the reveal grows from it. */
    (mode: ThemeMode, origin?: Element | null) => {
      if (mode === themeMode) return;
      const systemPrefersDark =
        typeof window !== "undefined" &&
        window.matchMedia(SYSTEM_DARK_MEDIA_QUERY).matches;
      const nextIsDark = resolveThemeModeIsDark(mode, systemPrefersDark);
      const motionAllowed =
        typeof window === "undefined" ||
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (
        !motionAllowed ||
        nextIsDark === isDark ||
        typeof document === "undefined" ||
        !document.startViewTransition
      ) {
        dispatch(setThemeMode(mode));
        return;
      }
      const root = document.documentElement;
      const rect = origin?.getBoundingClientRect();
      if (rect) {
        root.style.setProperty("--theme-vt-x", `${rect.left + rect.width / 2}px`);
        root.style.setProperty("--theme-vt-y", `${rect.top + rect.height / 2}px`);
      } else {
        root.style.removeProperty("--theme-vt-x");
        root.style.removeProperty("--theme-vt-y");
      }
      document.startViewTransition(() => {
        flushSync(() => {
          dispatch(setThemeMode(mode));
        });
      });
    },
    [dispatch, themeMode, isDark]
  );

  return { themeMode, isDark, applyThemeMode };
};
