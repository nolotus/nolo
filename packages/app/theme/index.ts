import { useDeviceThemeTokens } from "./useDeviceThemeTokens";
import { useDeviceAppearanceSnapshot } from "./storeDeviceAppearance";

export const useTheme = () => {
  const theme = useDeviceThemeTokens();
  return theme;
};

/** Resolved light/dark for components that only need to branch on it. */
export const useIsDark = (): boolean => useDeviceAppearanceSnapshot().isDark;
