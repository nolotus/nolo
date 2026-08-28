import "../theme-ui.css";
import React, { useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "app/store";
import {
  setThemeMode,
  selectThemeMode,
  selectIsDark,
} from "app/settings/settingSlice";
import {
  resolveThemeModeIsDark,
  SYSTEM_DARK_MEDIA_QUERY,
} from "app/theme/themeModeBootstrap";
import { LuSun, LuMoon, LuMonitor } from "react-icons/lu";

type DarkModeSwitchProps = {
  compact?: boolean;
  className?: string;
};

export const DarkModeSwitch: React.FC<DarkModeSwitchProps> = ({ compact = false, className }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const active = useAppSelector(selectThemeMode);
  const isDark = useAppSelector(selectIsDark);
  const containerRef = useRef<HTMLDivElement>(null);
  const [slider, setSlider] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const activeEl = containerRef.current?.querySelector<HTMLElement>(`[data-active="true"]`);
    if (activeEl) {
      setSlider({ left: activeEl.offsetLeft, width: activeEl.offsetWidth });
    }
  }, [active]);

  const handleSelect = (v: string) => {
    const mode = v as "system" | "light" | "dark";
    if (mode === active) return;

    const systemPrefersDark =
      typeof window !== "undefined" &&
      window.matchMedia(SYSTEM_DARK_MEDIA_QUERY).matches;
    const nextIsDark = resolveThemeModeIsDark(mode, systemPrefersDark);

    const motionAllowed =
      typeof window === "undefined" ||
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (
      !motionAllowed ||
      nextIsDark === isDark ||
      typeof document === "undefined" ||
      !document.startViewTransition
    ) {
      dispatch(setThemeMode(mode));
      return;
    }

    document.startViewTransition(() => {
      flushSync(() => {
        dispatch(setThemeMode(mode));
      });
    });
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
          onClick={() => handleSelect(opt.v)}
          aria-label={opt.l}
        >
          {opt.i}
        </button>
      ))}
    </div>
  );
};
