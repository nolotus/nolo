import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/TabsNav.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var TabsNav = ({
  tabs,
  activeTab,
  onChange,
  className = "",
  id,
  panelId
}) => {
  const tabsRef = (0, import_react.useRef)(null);
  const navRef = (0, import_react.useRef)(null);
  const tabButtonRefs = (0, import_react.useRef)([]);
  const rawIndex = tabs.findIndex((tab) => tab.id === activeTab);
  const activeIndex = rawIndex < 0 ? 0 : rawIndex;
  const [slider, setSlider] = (0, import_react.useState)({
    left: 0,
    width: 0
  });
  const focusTabAt = (0, import_react.useCallback)(
    (index) => {
      const enabledTabs = tabs.map((tab, tabIndex) => ({ tab, tabIndex })).filter(({ tab }) => !tab.disabled);
      if (enabledTabs.length === 0) return;
      const currentEnabledIndex = enabledTabs.findIndex(({ tabIndex }) => tabIndex === index);
      const nextEnabled = currentEnabledIndex >= 0 ? enabledTabs[currentEnabledIndex] : enabledTabs[0];
      const target = tabButtonRefs.current[nextEnabled.tabIndex];
      target?.focus();
    },
    [tabs]
  );
  const activateRelativeTab = (0, import_react.useCallback)(
    (direction) => {
      const enabledTabs = tabs.map((tab, tabIndex) => ({ tab, tabIndex })).filter(({ tab }) => !tab.disabled);
      if (enabledTabs.length === 0) return;
      const currentEnabledIndex = Math.max(
        0,
        enabledTabs.findIndex(({ tab }) => tab.id === activeTab)
      );
      const nextIndex = (currentEnabledIndex + direction + enabledTabs.length) % enabledTabs.length;
      const nextTab = enabledTabs[nextIndex];
      onChange(nextTab.tab.id);
      focusTabAt(nextTab.tabIndex);
    },
    [activeTab, focusTabAt, onChange, tabs]
  );
  (0, import_react.useLayoutEffect)(() => {
    const tabsEl = tabsRef.current;
    if (!tabsEl) return;
    const activeEl = tabsEl.querySelector(
      'button[data-active="true"]'
    );
    if (!activeEl) return;
    const left = activeEl.offsetLeft;
    const width = activeEl.offsetWidth;
    setSlider({ left, width });
    const navEl = navRef.current;
    if (navEl) {
      const navWidth = navEl.clientWidth;
      const targetScrollLeft = left - navWidth / 2 + width / 2;
      navEl.scrollTo({
        left: targetScrollLeft,
        behavior: "smooth"
      });
    }
  }, [activeTab, tabs.length, activeIndex]);
  const handleTabKeyDown = (0, import_react.useCallback)(
    (event, index) => {
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
    [activateRelativeTab, focusTabAt, onChange, tabs]
  );
  const tabsStyle = {
    "--sliderLeft": `${slider.left}px`,
    "--sliderWidth": `${slider.width}px`
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "nav",
    {
      ref: navRef,
      id,
      className: `tabs-nav ${className}`,
      role: "tablist",
      "aria-orientation": "horizontal",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "tabs", style: tabsStyle, ref: tabsRef, children: tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        const tabControlId = panelId != null ? `${panelId}-tab-${String(tab.id)}` : void 0;
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            ref: (node) => {
              tabButtonRefs.current[index] = node;
            },
            id: tabControlId,
            role: "tab",
            type: "button",
            disabled: tab.disabled,
            onClick: () => !tab.disabled && onChange(tab.id),
            onKeyDown: (event) => handleTabKeyDown(event, index),
            "data-active": isActive,
            "aria-selected": isActive,
            "aria-controls": panelId,
            tabIndex: isActive ? 0 : -1,
            className: "tab-item",
            children: tab.label
          },
          tab.id
        );
      }) })
    }
  );
};
var TabsNav_default = TabsNav;

export {
  TabsNav_default
};
