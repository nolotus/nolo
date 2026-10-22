import { useCallback } from "react";
import { flushSync } from "react-dom";
import { useStoreDeviceAppearance } from "../storeDeviceAppearance";
import {
  resolveThemeModeIsDark,
  SYSTEM_DARK_MEDIA_QUERY,
  type ThemeMode,
} from "../themeModeBootstrap";

/**
 * Web-only theme mode read + switch.
 *
 * Lives outside `app/theme` because it depends on `react-dom` and on browser
 * APIs (`document.startViewTransition`, `document.documentElement`, `window`).
 * Metro does not tree-shake, so anything reachable from the shared
 * `app/theme` entry would drag `react-dom` into the React Native bundle.
 *
 * Switching plays the circular View Transition reveal (theme-ui.css, clip-path
 * from the clicked element) when the light/dark result actually changes and
 * motion is allowed. Used by DarkModeSwitch and the guest-home topbar toggle.
 */
export const useThemeModeControl = () => {
  const { controller, snapshot } = useStoreDeviceAppearance();
  const { themeMode, isDark } = snapshot;

  const applyThemeMode = useCallback(
    /** origin: the clicked element, so the reveal grows from it. */
    (mode: ThemeMode, origin?: Element | null) => {
      if (mode === themeMode) return;
      const systemPrefersDark =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia(SYSTEM_DARK_MEDIA_QUERY).matches;
      const nextIsDark = resolveThemeModeIsDark(mode, systemPrefersDark);
      const motionAllowed =
        typeof window === "undefined" ||
        (typeof window.matchMedia !== "function" ||
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches);

      if (
        !motionAllowed ||
        nextIsDark === isDark ||
        typeof document === "undefined" ||
        !document.startViewTransition
      ) {
        controller.updateAndPersist({ themeMode: mode });
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
          controller.updateAndPersist({ themeMode: mode });
        });
      });
    },
    [controller, themeMode, isDark]
  );

  return { themeMode, isDark, applyThemeMode };
};
