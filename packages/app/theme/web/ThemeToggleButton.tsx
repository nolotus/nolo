import { useTranslation } from "react-i18next";
import { LuMoon, LuSun } from "react-icons/lu";
import { useThemeModeControl } from "app/theme";

/**
 * One-tap day/night toggle for chrome without a settings menu (guest topbar).
 * Default stays "follow system"; a tap pins the opposite of what is showing.
 */
const ThemeToggleButton = ({ className = "" }: { className?: string }) => {
  const { t } = useTranslation();
  const { isDark, applyThemeMode } = useThemeModeControl();
  const label = isDark
    ? t("topbar.switchToLight", "切换到浅色模式")
    : t("topbar.switchToDark", "切换到夜间模式");

  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      title={label}
      onClick={(e) => applyThemeMode(isDark ? "light" : "dark", e.currentTarget)}
    >
      {isDark ? <LuSun size={17} aria-hidden="true" /> : <LuMoon size={17} aria-hidden="true" />}
    </button>
  );
};

export default ThemeToggleButton;
