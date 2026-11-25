import { useCallback } from "react";
import { flushSync } from "react-dom";
import { useStoreDeviceAppearance } from "../storeDeviceAppearance";
import {
  resolveThemeModeIsDark,
  SYSTEM_DARK_MEDIA_QUERY,
  type ThemeMode,
} from "../themeModeBootstrap";

/**
 * Monotonic id of the theme transition that owns `data-theme-vt`. The flag
 * lives on `document`, so every hook instance and every overlapping transition
 * shares it; only the newest owner may clear it. Without this, an aborted
 * earlier transition would delete the flag of the one that replaced it.
 */
let themeTransitionOwner = 0;

/**
 * Web-only theme mode read + switch.
 *
 * Lives outside `app/theme` because it depends on `react-dom` and on browser
 * APIs (`document.startViewTransition`, `document.documentElement`, `window`).
 * Metro does not tree-shake, so anything reachable from the shared
 * `app/theme` entry would drag `react-dom` into the React Native bundle.
 *
 * Switching runs a View Transition and theme-ui.css cross-fades the two
 * snapshots. Two details matter:
 * - `data-theme-vt` scopes those CSS rules to this transition, so every other
 *   View Transition (routes, dialogs, tabs) keeps the browser default instead
 *   of inheriting the theme cross-fade.
 * - Reduced motion is not mapped to an instant swap. `motion.md` asks for
 *   "fewer and gentler, not none: keep opacity and colour changes", so the
 *   cross-fade still runs and CSS only shortens it.
 *
 * Used by DarkModeSwitch and the guest-home topbar toggle.
 */
export const useThemeModeControl = () => {
  const { controller, snapshot } = useStoreDeviceAppearance();
  const { themeMode, isDark } = snapshot;

  const applyThemeMode = useCallback(
    (mode: ThemeMode) => {
      if (mode === themeMode) return;
      const systemPrefersDark =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia(SYSTEM_DARK_MEDIA_QUERY).matches;
      const nextIsDark = resolveThemeModeIsDark(mode, systemPrefersDark);

      if (
        nextIsDark === isDark ||
        typeof document === "undefined" ||
        !document.startViewTransition
      ) {
        controller.updateAndPersist({ themeMode: mode });
        return;
      }

      const root = document.documentElement;
      const owner = ++themeTransitionOwner;
      root.dataset.themeVt = "1";
      const releaseFlag = () => {
        // A newer transition took the flag over; leave it to that one.
        if (themeTransitionOwner === owner) delete root.dataset.themeVt;
      };
      // One click must persist once. A shape that runs the update callback and
      // then throws must not be retried by the catch below, and a callback
      // that throws must not be replayed as if starting failed.
      let applied = false;
      const applyOnce = () => {
        if (applied) return;
        applied = true;
        controller.updateAndPersist({ themeMode: mode });
      };

      try {
        const transition = document.startViewTransition(() => {
          flushSync(applyOnce);
        });
        const settled = transition?.finished;
        if (settled && typeof settled.then === "function") {
          // Settles after the update callback and the animation, including
          // skipped and aborted transitions.
          void settled.then(releaseFlag, releaseFlag);
        } else {
          // Shapes that expose no completion signal must not keep the flag
          // scoped to unrelated transitions.
          releaseFlag();
        }
      } catch {
        // Release the flag either way; apply the mode only if nothing ran yet.
        releaseFlag();
        applyOnce();
      }
    },
    [controller, themeMode, isDark]
  );

  return { themeMode, isDark, applyThemeMode };
};
