import { useDeviceAppearanceSnapshot } from "./storeDeviceAppearance";
import { useDeviceThemeTokens } from "./useDeviceThemeTokens";

/** Web-only Owner-backed theme hooks. RN keeps its existing shared theme hooks
 * until native persistence + consumer cutover has been verified. */
export const useWebTheme = useDeviceThemeTokens;
export const useWebIsDark = (): boolean => useDeviceAppearanceSnapshot().isDark;
