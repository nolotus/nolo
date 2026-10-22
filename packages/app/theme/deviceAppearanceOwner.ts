import {
  resolveThemeModeIsDark,
  type ThemeDensity,
  type ThemeMode,
} from "./themeModeBootstrap";
import type { FontPreset } from "./fontPreference";
import type { THEME_COLORS } from "./theme.config";

/**
 * Runtime-scoped appearance state. Each Web root or native host creates its own
 * instance. No localStorage/window access, cross-request singleton, or Redux mirror.
 */
export type DeviceAppearanceSnapshot = Readonly<{
  themeName: keyof typeof THEME_COLORS;
  themeMode: ThemeMode;
  isDark: boolean;
  density: ThemeDensity;
  fontPreset: FontPreset;
}>;

export type DeviceAppearanceChanges = Partial<Omit<DeviceAppearanceSnapshot, "isDark">>;

export const createDeviceAppearanceOwner = (
  initial: DeviceAppearanceSnapshot,
  initialSystemPrefersDark: boolean,
) => {
  let systemPrefersDark = initialSystemPrefersDark;
  let snapshot: DeviceAppearanceSnapshot = Object.freeze({
    ...initial,
    isDark: resolveThemeModeIsDark(initial.themeMode, systemPrefersDark),
  });
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  };
  const emit = () => { for (const listener of listeners) listener(); };
  const commit = (next: DeviceAppearanceSnapshot) => {
    if (
      next.themeName === snapshot.themeName &&
      next.themeMode === snapshot.themeMode &&
      next.isDark === snapshot.isDark &&
      next.density === snapshot.density &&
      next.fontPreset === snapshot.fontPreset
    ) return;
    snapshot = Object.freeze(next);
    emit();
  };
  return {
    getSnapshot: () => snapshot,
    subscribe,
    update: (changes: DeviceAppearanceChanges) => {
      commit({
        ...snapshot,
        ...changes,
        isDark: resolveThemeModeIsDark(changes.themeMode ?? snapshot.themeMode, systemPrefersDark),
      });
    },
    updateSystemPrefersDark: (next: boolean) => {
      if (next === systemPrefersDark) return;
      systemPrefersDark = next;
      commit({ ...snapshot, isDark: resolveThemeModeIsDark(snapshot.themeMode, systemPrefersDark) });
    },
  };
};
