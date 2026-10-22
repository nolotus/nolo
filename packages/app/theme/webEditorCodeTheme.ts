import { useAppSelector } from "app/store";
import {
  selectEditorDarkCodeTheme,
  selectEditorLightCodeTheme,
} from "app/settings/settingSlice";
import { useDeviceAppearanceSnapshot } from "./storeDeviceAppearance";

/** Account editor theme choices are independent of device-owned light/dark. */
export const useWebEditorCodeTheme = () => {
  const light = useAppSelector(selectEditorLightCodeTheme);
  const dark = useAppSelector(selectEditorDarkCodeTheme);
  const snapshot = useDeviceAppearanceSnapshot();
  return snapshot.isDark ? dark : light;
};
