// "render/web/ui/TabsNav";
import "./TabsNav.css";
import "../ui.css";
import React, { useCallback, useLayoutEffect, useRef, useState } from "react";

export interface Tab {
  id: number | string;
  label: React.ReactNode; // ⭐ 支持任意 JSX：图标 + 文本 等
  disabled?: boolean;
}

interface TabsNavProps {
  tabs: Tab[];
  activeTab: number | string;
  onChange: (tabId: number | string) => void;
  className?: string;
  id?: string;
  panelId?: string;
}

const TabsNav: React.FC<TabsNavProps> = ({
  tabs,
  activeTab,
  onChange,
  className = "",
  id,
  panelId,
}) => {
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const tabButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const rawIndex = tabs.findIndex((tab) => tab.id === activeTab);
  const activeIndex = rawIndex < 0 ? 0 : rawIndex;

  const [slider, setSlider] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  const focusTabAt = useCallback(
    (index: number) => {
      const enabledTabs = tabs
        .map((tab, tabIndex) => ({ tab, tabIndex }))
        .filter(({ tab }) => !tab.disabled);
      if (enabledTabs.length === 0) return;

      const currentEnabledIndex = enabledTabs.findIndex(({ tabIndex }) => tabIndex === index);
      const nextEnabled =
        currentEnabledIndex >= 0
          ? enabledTabs[currentEnabledIndex]
          : enabledTabs[0];
      const target = tabButtonRefs.current[nextEnabled.tabIndex];
      target?.focus();
    },
    [tabs],
  );

  const activateRelativeTab = useCallback(
    (direction: 1 | -1) => {
      const enabledTabs = tabs
        .map((tab, tabIndex) => ({ tab, tabIndex }))
        .filter(({ tab }) => !tab.disabled);
      if (enabledTabs.length === 0) return;

      const currentEnabledIndex = Math.max(
        0,
        enabledTabs.findIndex(({ tab }) => tab.id === activeTab),
      );
      const nextIndex =
        (currentEnabledIndex + direction + enabledTabs.length) % enabledTabs.length;
      const nextTab = enabledTabs[nextIndex];
      onChange(nextTab.tab.id);
      focusTabAt(nextTab.tabIndex);
    },
    [activeTab, focusTabAt, onChange, tabs],
  );

  // 根据当前激活的 tab 动态计算滑块的位置与宽度
  useLayoutEffect(() => {
    const tabsEl = tabsRef.current;
    if (!tabsEl) return;

    const activeEl = tabsEl.querySelector<HTMLButtonElement>(
      'button[data-active="true"]'
    );
    if (!activeEl) return;

    const left = activeEl.offsetLeft;
    const width = activeEl.offsetWidth;

    setSlider({ left, width });

    // 自动滚动：让当前 tab 尽量出现在中间
    const navEl = navRef.current;
    if (navEl) {
      const navWidth = navEl.clientWidth;
      const targetScrollLeft = left - navWidth / 2 + width / 2;
      navEl.scrollTo({
        left: targetScrollLeft,
        behavior: "smooth",
      });
    }
  }, [activeTab, tabs.length, activeIndex]);

  const handleTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          activateRelativeTab(1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          activateRelativeTab(-1);
          break;
        case "Home":
          event.preventDefault();
          focusTabAt(0);
          break;
        case "End":
          event.preventDefault();
          focusTabAt(tabs.length - 1);
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          if (!tabs[index]?.disabled) {
            onChange(tabs[index].id);
          }
          break;
        default:
          break;
      }
    },
    [activateRelativeTab, focusTabAt, onChange, tabs],
  );

  // 把 slider 的 left / width 用 CSS 变量传给样式层
  const tabsStyle = {
    "--sliderLeft": `${slider.left}px`,
    "--sliderWidth": `${slider.width}px`,
  } as React.CSSProperties;

  return (
    <nav
      ref={navRef as React.RefObject<HTMLElement>}
      id={id}
      className={`tabs-nav ${className}`}
      role="tablist"
      aria-orientation="horizontal"
    >
      <div className="tabs" style={tabsStyle} ref={tabsRef}>
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const tabControlId =
            panelId != null ? `${panelId}-tab-${String(tab.id)}` : undefined;

          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabButtonRefs.current[index] = node;
              }}
              id={tabControlId}
              role="tab"
              type="button"
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onChange(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              data-active={isActive}
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              className="tab-item"
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default TabsNav;