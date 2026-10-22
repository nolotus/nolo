import { useMemo } from "react";
import { useAppSelector } from "app/store";
import { selectHeaderHeight, selectSidebarWidth } from "app/settings/settingSlice";
import { useDeviceAppearanceSnapshot } from "./storeDeviceAppearance";
import { buildDeviceAppearanceTokens } from "./deviceAppearanceTokens";

/**
 * B1 cutover hook: theme is fully device-owned; only layout dimensions
 * remain on their existing Redux path until the sidebar/layout phase.
 */
export const useDeviceThemeTokens = () => {
  const snapshot = useDeviceAppearanceSnapshot();
  const sidebarWidth = useAppSelector(selectSidebarWidth);
  const headerHeight = useAppSelector(selectHeaderHeight);
  return useMemo(
    () => buildDeviceAppearanceTokens(snapshot, { sidebarWidth, headerHeight }),
    [snapshot, sidebarWidth, headerHeight],
  );
};
