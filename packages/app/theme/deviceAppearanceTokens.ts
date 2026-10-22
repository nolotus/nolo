import type { DeviceAppearanceSnapshot } from "./deviceAppearanceOwner";
import { buildThemeTokens } from "app/settings/themeSelectors";

/**
 * Theme tokens driven by device-owned appearance and independently supplied
 * layout dimensions. No Redux selector or mutable global dependency.
 */
export const buildDeviceAppearanceTokens = (
  appearance: DeviceAppearanceSnapshot,
  layout: Readonly<{ sidebarWidth: number; headerHeight: number }>,
) => buildThemeTokens(
  appearance.themeName,
  appearance.isDark,
  layout.sidebarWidth,
  layout.headerHeight,
  appearance.density,
  appearance.fontPreset,
);
