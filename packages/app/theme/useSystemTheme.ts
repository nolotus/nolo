import { useEffect } from "react";
import { useStoreDeviceAppearance } from "./storeDeviceAppearance";
import { SYSTEM_DARK_MEDIA_QUERY } from "./themeModeBootstrap";

/** OS mode changes update only the derived darkness of this runtime's Owner. */
export const useSystemTheme = (): void => {
  const { controller, snapshot } = useStoreDeviceAppearance();
  const themeMode = snapshot.themeMode;
  useEffect(() => {
    if (themeMode !== "system" || typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia(SYSTEM_DARK_MEDIA_QUERY);
    controller.updateSystemPrefersDark(mediaQuery.matches);
    const handleChange = (event: MediaQueryListEvent) => controller.updateSystemPrefersDark(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeMode, controller]);
};
