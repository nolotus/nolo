// "render/web/ui/TabsNav";
import * as stylex from "@stylexjs/stylex";
import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { prefersReducedMotion, sanitizeViewTransitionKey } from "app/viewTransitions";
import { tabsNavStyles } from "./tabsNav.styles";

export interface Tab {
  id: number | string;
  label: React.ReactNode; // ⭐ 支持任意 JSX：图标 + 文本 等
  disabled?: boolean;
}

export interface TabsNavProps {
  tabs: Tab[];
  activeTab: number | string;
  onChange: (tabId: number | string) => void;
  className?: string;
  id?: string;
  panelId?: string;
  /** Stable id for the active tab, suitable for aria-labelledby on the panel. */
  activeTabId?: string;
}

const TabsNav: React.FC<TabsNavProps> = ({
  tabs,
  activeTab,
  onChange,
  className = "",
  id,
  panelId,
  activeTabId,
}) => {
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const tabButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // 原 .tabs:focus-within::after 的等价实现：nav 内任意元素聚焦即视为 focus-within
  const [hasFocusWithin, setHasFocusWithin] = useState(false);

  const rawIndex = tabs.findIndex((tab) => tab.id === activeTab);
  const activeIndex = rawIndex < 0 ? 0 : rawIndex;

  const instanceId = sanitizeViewTransitionKey(panelId || id || "tabs-nav") || "tabs-nav";
  const panelVtName = `tab-panel-${instanceId}`;

  const [slider, setSlider] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  const handleTabSelect = useCallback(
    (nextTabId: number | string) => {
      if (nextTabId === activeTab) return;

      const prevIndex = tabs.findIndex((tab) => tab.id === activeTab);
      const nextIndex = tabs.findIndex((tab) => tab.id === nextTabId);
      const direction: "forward" | "backward" =
        nextIndex >= prevIndex ? "forward" : "backward";

      const shouldAnimate =
        typeof document !== "undefined" &&
        typeof (document as any).startViewTransition === "function" &&
        !prefersReducedMotion();

      if (!shouldAnimate) {
        onChange(nextTabId);
        return;
      }

      const getPanel = () => {
        if (panelId) {
          return document.getElementById(panelId);
        }
        return navRef.current
          ?.closest("section, main, article, form, [data-tabs-container]")
          ?.querySelector<HTMLElement>('[role="tabpanel"]');
      };

      const oldPanel = getPanel();
      if (oldPanel) {
        oldPanel.style.viewTransitionName = panelVtName;
      }
      document.documentElement.dataset.tabsDirection = direction;

      try {
        const transition = (document as any).startViewTransition(() => {
          flushSync(() => {
            onChange(nextTabId);
          });
          const newPanel = getPanel();
          if (newPanel) {
            newPanel.style.viewTransitionName = panelVtName;
          }
        });

        Promise.resolve(transition?.finished)
          .catch(() => undefined)
          .finally(() => {
            try {
              const currentPanel = getPanel();
              if (currentPanel && currentPanel.style.viewTransitionName === panelVtName) {
                currentPanel.style.viewTransitionName = "";
              }
              delete document.documentElement.dataset.tabsDirection;
            } catch {
              // ignore
            }
          });
      } catch {
        onChange(nextTabId);
        delete document.documentElement.dataset.tabsDirection;
      }
    },
    [activeTab, onChange, panelId, panelVtName, tabs],
  );

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
      handleTabSelect(nextTab.tab.id);
      focusTabAt(nextTab.tabIndex);
    },
    [activeTab, focusTabAt, handleTabSelect, tabs],
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
    if (navEl && typeof navEl.scrollTo === "function") {
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
            handleTabSelect(tabs[index].id);
          }
          break;
        default:
          break;
      }
    },
    [activateRelativeTab, focusTabAt, handleTabSelect, tabs],
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
      className={[stylex.props(tabsNavStyles.nav).className, className]
        .filter(Boolean)
        .join(" ")}
      role="tablist"
      aria-orientation="horizontal"
      onFocus={() => setHasFocusWithin(true)}
      onBlur={() => setHasFocusWithin(false)}
    >
      <style>{`
        ::view-transition-group(${panelVtName}) {
          animation-duration: 0.28s;
          animation-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
        }
        ::view-transition-old(${panelVtName}) {
          animation: 0.2s cubic-bezier(0.33, 1, 0.68, 1) both vt-tab-fade-out,
                     0.28s cubic-bezier(0.32, 0.72, 0, 1) both vt-tab-slide-out;
        }
        ::view-transition-new(${panelVtName}) {
          animation: 0.24s cubic-bezier(0.33, 1, 0.68, 1) both vt-tab-fade-in,
                     0.28s cubic-bezier(0.32, 0.72, 0, 1) both vt-tab-slide-in;
        }
        @media (prefers-reduced-motion: reduce) {
          ::view-transition-group(${panelVtName}),
          ::view-transition-old(${panelVtName}),
          ::view-transition-new(${panelVtName}) {
            animation: none !important;
          }
        }
      `}</style>
      <div
        className={[stylex.props(tabsNavStyles.tabs).className, "tabs"]
          .filter(Boolean)
          .join(" ")}
        style={tabsStyle}
        ref={tabsRef}
      >
        {/* 滑块：原 .tabs::after，真实 DOM；焦点描边等价 focus-within */}
        <span
          aria-hidden="true"
          className={`tabs-slider ${stylex.props(
            tabsNavStyles.slider,
            hasFocusWithin && tabsNavStyles.sliderFocusOutline,
          ).className ?? ""}`}
        />
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const tabControlId =
            activeTabId && isActive
              ? activeTabId
              : panelId != null
                ? `${panelId}-tab-${String(tab.id)}`
                : undefined;
          const tabItemProps = stylex.props(
            tabsNavStyles.tabItem,
            !tab.disabled && tabsNavStyles.tabItemFocusRing,
            !tab.disabled && tabsNavStyles.tabItemHover,
          );

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
              onClick={() => !tab.disabled && handleTabSelect(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              data-active={isActive}
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              {...tabItemProps}
              className={[tabItemProps.className, "tab-item"]
                .filter(Boolean)
                .join(" ")}
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
