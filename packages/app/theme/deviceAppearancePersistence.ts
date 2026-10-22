import { resolveDeviceAppearancePreload } from "./themeModeBootstrap";
import type { DeviceAppearanceChanges, DeviceAppearanceSnapshot } from "./deviceAppearanceOwner";
import { FONT_PRESET_STORAGE_KEY } from "./fontPreference";

/** Platform-independent synchronous adapter: native hosts supply their own storage. */
export interface DeviceAppearanceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const readDeviceAppearance = (
  storage: Pick<DeviceAppearanceStorage, "getItem"> | null,
  systemPrefersDark: boolean,
): DeviceAppearanceSnapshot =>
  resolveDeviceAppearancePreload({ storage, systemPrefersDark });

const KEYS = {
  themeName: "nolo-theme-name",
  themeMode: "nolo-theme-mode",
  density: "nolo-density",
  fontPreset: FONT_PRESET_STORAGE_KEY,
} as const;

/** Persist only explicitly changed fields. Never persist derived isDark. */
export const persistDeviceAppearanceChanges = (
  storage: Pick<DeviceAppearanceStorage, "setItem"> | null,
  changes: DeviceAppearanceChanges,
): void => {
  if (!storage) return;
  for (const key of Object.keys(KEYS) as Array<keyof typeof KEYS>) {
    const value = changes[key];
    if (value === undefined) continue;
    try {
      storage.setItem(KEYS[key], String(value));
    } catch {
      // Blocked storage must not undo an already-published local preference.
    }
  }
};
