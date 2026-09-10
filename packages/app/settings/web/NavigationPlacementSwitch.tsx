import React, { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useNavigationPlacement,
  setNavigationPlacement,
  type NavigationPlacement,
} from "app/layout/navigationPlacementPreference";
import { LuPanelLeft, LuPanelRight } from "react-icons/lu";

export const NavigationPlacementSwitch: React.FC = () => {
  const { t } = useTranslation();
  const placement = useNavigationPlacement();
  const containerRef = useRef<HTMLDivElement>(null);
  const [slider, setSlider] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const activeEl = containerRef.current?.querySelector<HTMLElement>(`[data-active="true"]`);
    if (activeEl) {
      setSlider({ left: activeEl.offsetLeft, width: activeEl.offsetWidth });
    }
  }, [placement]);

  const options: { v: NavigationPlacement; l: string; i: React.ReactNode }[] = [
    {
      v: "start",
      l: t("settings.appearance.navigationPlacement.start", "左侧"),
      i: <LuPanelLeft size={16} aria-hidden="true" />,
    },
    {
      v: "end",
      l: t("settings.appearance.navigationPlacement.end", "右侧"),
      i: <LuPanelRight size={16} aria-hidden="true" />,
    },
  ];

  return (
    <div
      className="mode-tabs-container"
      ref={containerRef}
      style={{ "--s-left": `${slider.left}px`, "--s-width": `${slider.width}px` } as any}
      role="radiogroup"
      aria-label={t("settings.appearance.navigationPlacement.title", "导航位置")}
    >
      {options.map((opt) => (
        <button
          type="button"
          key={opt.v}
          role="radio"
          aria-checked={placement === opt.v}
          className="mode-tab-item"
          data-active={placement === opt.v}
          onClick={() => setNavigationPlacement(opt.v)}
          aria-label={opt.l}
        >
          {opt.i}
          <span>{opt.l}</span>
        </button>
      ))}
    </div>
  );
};
