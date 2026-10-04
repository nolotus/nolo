import "../theme-ui.css";
import React, { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ThemeMode } from "app/theme/themeModeBootstrap";
import { useThemeModeControl } from "app/theme";
import { LuSun, LuMoon, LuMonitor } from "react-icons/lu";

type DarkModeSwitchProps = {
  compact?: boolean;
  className?: string;
};

export const DarkModeSwitch: React.FC<DarkModeSwitchProps> = ({ compact = false, className }) => {
  const { t } = useTranslation();
  const { themeMode: active, applyThemeMode } = useThemeModeControl();
  const containerRef = useRef<HTMLDivElement>(null);
  const [slider, setSlider] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const activeEl = containerRef.current?.querySelector<HTMLElement>(`[data-active="true"]`);
    if (activeEl) {
      setSlider({ left: activeEl.offsetLeft, width: activeEl.offsetWidth });
    }
  }, [active]);

  const handleSelect = (v: string, origin: Element) => {
    applyThemeMode(v as ThemeMode, origin);
  };

  const options = [
    { v: "light", i: <LuSun size={16} aria-hidden="true" />, l: t("settings.theme.light") },
    { v: "dark", i: <LuMoon size={16} aria-hidden="true" />, l: t("settings.theme.dark") },
    { v: "system", i: <LuMonitor size={16} aria-hidden="true" />, l: t("settings.theme.system") }
  ];

  return (
    <div
      className={[
        "mode-tabs-container",
        compact ? "mode-tabs-container--compact" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      ref={containerRef}
      style={{ "--s-left": `${slider.left}px`, "--s-width": `${slider.width}px` } as any}
    >
      
      {options.map((opt) => (
        <button
          type="button"
          key={opt.v}
          className="mode-tab-item"
          data-active={active === opt.v}
          onClick={(e) => handleSelect(opt.v, e.currentTarget)}
          aria-label={opt.l}
        >
          {opt.i}
        </button>
      ))}
    </div>
  );
};
