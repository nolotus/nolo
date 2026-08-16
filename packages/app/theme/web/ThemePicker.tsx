// 文件路径：render/web/ui/settings/ThemePicker.tsx
import "../theme-ui.css";
import React from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import { changeTheme, selectThemeName, selectIsDark } from "app/settings/settingSlice";
import { wave, iris, catppuccin, rose, trail, mono } from "app/theme/colors";

// 6 个核心主题，每个覆盖一个画像，无冗余
const THEMES = { catppuccin, wave, iris, rose, trail, mono } as const;

const THEME_METADATA: Record<keyof typeof THEMES, { name: string; desc: string }> = {
  catppuccin: { name: "Catppuccin × GitHub", desc: "Ghostty 组合：GitHub Light 亮丽白天 + Catppuccin Mocha 柔和夜间" },
  wave: { name: "Wave (Kanagawa)", desc: "古典纸色与水墨蓝，温润护眼的签名色" },
  iris: { name: "Iris (Linear Purple)", desc: "精致的 Linear 雅致紫，现代科技工具感" },
  rose: { name: "Rose (Rosé Pine)", desc: "北欧暖粉色调，温柔治愈，自然质感" },
  trail: { name: "Trail (户外自然)", desc: "雪山与浪花风，大字圆角与清爽缓动" },
  mono: { name: "Mono (灰橙极简)", desc: "open-props 中性灰 + 暖橙强调，干净克制的现代感" },
};

export const ThemePicker: React.FC = () => {
  const dispatch = useAppDispatch();
  const current = useAppSelector(selectThemeName) as keyof typeof THEMES;
  const isDark = useAppSelector(selectIsDark);
  const mode = isDark ? "dark" : "light";

  const [hoveredKey, setHoveredKey] = React.useState<keyof typeof THEMES | null>(null);

  const handleThemeClick = (themeName: keyof typeof THEMES) => {
    try {
      localStorage.setItem("nolo-theme-name-explicit", "1");
    } catch {
      // ignore localStorage write failures
    }
    dispatch(changeTheme(themeName as any));
  };

  const activeKey = (THEMES[current] ? current : "wave") as keyof typeof THEMES;
  const displayKey = hoveredKey || activeKey;
  const metadata = THEME_METADATA[displayKey];

  return (
    <div className="theme-picker-container">
      <div
        className="theme-grid"
        role="radiogroup"
        aria-label="主题"
      >
        {Object.entries(THEMES).map(([key, p]) => {
          const themeKey = key as keyof typeof THEMES;
          const name = THEME_METADATA[themeKey]?.name ?? key;
          const isActive = current === key;
          return (
            <div
              key={key}
              className="theme-item"
              data-active={isActive}
              role="radio"
              aria-checked={isActive}
              aria-label={name}
              tabIndex={0}
              style={{ 
                "--theme-color": p[mode].primary,
                "--theme-gradient": p[mode].primaryGradient || p[mode].primary
              } as any}
              onClick={() => handleThemeClick(themeKey)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                handleThemeClick(themeKey);
              }}
              onMouseEnter={() => setHoveredKey(themeKey)}
              onMouseLeave={() => setHoveredKey(null)}
              title={name}
            >
              <div className="theme-dot" aria-hidden="true" />
            </div>
          );
        })}
      </div>
      <div className="theme-info" aria-live="polite">
        <div className="theme-info-name">{metadata.name}</div>
        <div className="theme-info-desc">{metadata.desc}</div>
      </div>
    </div>
  );
};

