import React, { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "app/store";
import { changeDensity, selectDensity } from "app/settings/settingSlice";
import { LuAlignJustify, LuList } from "react-icons/lu";

export const DensitySwitch: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const active = useAppSelector(selectDensity);
  const containerRef = useRef<HTMLDivElement>(null);
  const [slider, setSlider] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const activeEl = containerRef.current?.querySelector<HTMLElement>(`[data-active="true"]`);
    if (activeEl) {
      setSlider({ left: activeEl.offsetLeft, width: activeEl.offsetWidth });
    }
  }, [active]);

  const options = [
    { v: "compact", i: <LuAlignJustify size={16} aria-hidden="true" />, l: t("settings.density.compact", "紧凑") },
    { v: "spacious", i: <LuList size={16} aria-hidden="true" />, l: t("settings.density.spacious", "宽松") },
  ];

  return (
    <div className="mode-tabs-container" ref={containerRef} style={{ "--s-left": `${slider.left}px`, "--s-width": `${slider.width}px` } as any}>
      {options.map((opt) => (
        <button
          type="button"
          key={opt.v}
          className="mode-tab-item"
          data-active={active === opt.v}
          onClick={() => dispatch(changeDensity(opt.v as "compact" | "spacious"))}
          aria-label={opt.l}
        >
          {opt.i}
          <span>{opt.l}</span>
        </button>
      ))}
    </div>
  );
};
