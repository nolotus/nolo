import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import {
  setSettings,
  selectThemeMode,
} from "app/settings/settingSlice";
import { SYSTEM_DARK_MEDIA_QUERY } from "./themeModeBootstrap";

/**
 * 跟随系统亮/暗模式。
 * - 仅在 themeFollowsSystem=true 时生效
 * - 用 ref 读取当前 isDark，避免 isDark 变化触发 effect 重跑形成循环
 */
export const useSystemTheme = (): void => {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector(selectThemeMode);

  useEffect(() => {
    if (themeMode !== "system") return;

    const mediaQuery = window.matchMedia(SYSTEM_DARK_MEDIA_QUERY);

    // 初始同步
    dispatch(setSettings({ isDark: mediaQuery.matches }));

    const handleChange = (e: MediaQueryListEvent) => {
      dispatch(setSettings({ isDark: e.matches }));
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeMode, dispatch]);
};
