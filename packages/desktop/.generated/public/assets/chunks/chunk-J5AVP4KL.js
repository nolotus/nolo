import {
  zIndex
} from "/public/assets/chunks/chunk-XXDSICRI.js";
import {
  LuCheck,
  LuChevronDown,
  LuSearch,
  LuX
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/Combobox.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var COMBOBOX_STYLES = `
  .cbx-combobox {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    width: 100%;
    font-family: inherit;
  }

  .cbx-combobox__label {
    font-size: var(--fontSize-sm, 0.875rem);
    font-weight: 500;
    color: var(--text);
    margin-bottom: var(--space-1, 4px);
  }

  /* --- Trigger Base --- */
  .cbx-combobox__trigger {
    position: relative;
    width: 100%;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--background);
    color: var(--text);
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    outline: none;
    box-shadow: var(--shadow1, 0 1px 2px rgba(0, 0, 0, 0.05));
  }

  /* --- Variant: ghost --- */
  .cbx-combobox__trigger[data-variant="ghost"] {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
  }
  .cbx-combobox__trigger[data-variant="ghost"]:hover:not(:disabled):not([data-open]) {
    background: var(--backgroundHover);
  }

  /* --- Variant: filled --- */
  .cbx-combobox__trigger[data-variant="filled"] {
    background: var(--backgroundSecondary);
    border-color: transparent;
  }

  /* --- Size\uFF08\u5BF9\u9F50 control / fontSize tokens\uFF09 --- */
  .cbx-combobox__trigger[data-size="small"] {
    min-height: var(--control-sm);
    font-size: var(--fontSize-sm);
    /* right padding reserves chevron/clear; left uses space token */
    padding: 0 30px 0 var(--space-2);
  }
  .cbx-combobox__trigger[data-size="medium"] {
    min-height: var(--control-md);
    font-size: var(--fontSize-base);
    padding: 0 36px 0 var(--space-3);
  }
  .cbx-combobox__trigger[data-size="large"] {
    min-height: var(--control-xl);
    font-size: var(--fontSize-lg);
    padding: 0 var(--space-10) 0 var(--space-4);
  }

  .cbx-combobox__trigger:hover:not(:disabled):not([data-variant="ghost"]) {
    border-color: var(--borderHover, var(--textTertiary));
  }

  /* focus\uFF08\u952E\u76D8\uFF09\u4E0E open \u5171\u7528\u4E3B\u9898 primary / focus ring\uFF0C\u53BB\u6389\u786C\u7F16\u7801\u84DD */
  .cbx-combobox__trigger:focus-visible,
  .cbx-combobox__trigger[data-open] {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--focus, var(--primaryGhost, color-mix(in srgb, var(--primary) 18%, transparent)));
    z-index: 2;
  }

  /* error \u4F18\u5148\u4E8E open/focus \u7684\u8272\u76F8\uFF0C\u73AF\u4ECD\u53EF\u533A\u5206 */
  .cbx-combobox__trigger[aria-invalid="true"] {
    border-color: var(--danger, var(--error));
  }
  .cbx-combobox__trigger[aria-invalid="true"]:focus-visible,
  .cbx-combobox__trigger[aria-invalid="true"][data-open] {
    border-color: var(--danger, var(--error));
    box-shadow: 0 0 0 3px var(--danger-alpha-10, color-mix(in srgb, var(--danger, var(--error)) 15%, transparent));
  }

  .cbx-combobox__trigger:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    background: var(--backgroundSecondary);
    border-color: var(--border);
    box-shadow: none;
    color: var(--textTertiary);
  }

  .cbx-combobox__text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
  }
  .cbx-combobox__text[data-placeholder] {
    color: var(--textTertiary);
  }

  .cbx-combobox__icon-prefix {
    margin-right: var(--space-2, 8px);
    color: var(--textSecondary);
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .cbx-combobox__ctrl {
    position: absolute;
    right: var(--space-2, 8px);
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    gap: var(--space-1, 4px);
    color: var(--textTertiary);
  }

  .cbx-combobox__clear {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    border-radius: var(--radius-xs, var(--radius-sm));
    cursor: pointer;
    background: transparent;
    border: none;
    color: inherit;
    outline: none;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .cbx-combobox__clear:hover {
    background: var(--backgroundHover);
    color: var(--text);
  }
  .cbx-combobox__clear:focus-visible {
    background: var(--backgroundHover);
    color: var(--text);
    box-shadow: 0 0 0 2px var(--focus, var(--primaryGhost, color-mix(in srgb, var(--primary) 18%, transparent)));
  }

  .cbx-combobox__chevron {
    display: flex;
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }
  .cbx-combobox__trigger[data-open] .cbx-combobox__chevron {
    transform: rotate(180deg);
  }

  /* \u2605 Panel \u4F7F\u7528\u7EDD\u5BF9\u5B9A\u4F4D\uFF0C\u8D34\u7740\u89E6\u53D1\u5668\u4E0B\u65B9 */
  .cbx-combobox__panel {
    position: absolute;
    top: calc(100% + var(--space-1, 4px));
    left: 0;
    width: 100%;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
    box-shadow: var(--shadowMedium,
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 10px 15px -3px rgba(0, 0, 0, 0.1));
    display: flex;
    flex-direction: column;
    animation: cbx-fade-in 0.1s ease-out;
    z-index: ${zIndex.dropdown};
  }

  @keyframes cbx-fade-in {
    from { opacity: 0; transform: translateY(-4px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .cbx-combobox__search-wrap {
    position: relative;
    border-bottom: 1px solid var(--borderLight);
    padding: var(--space-1, 4px) var(--space-2, 8px);
    flex-shrink: 0;
  }

  .cbx-combobox__search-icon {
    position: absolute;
    left: var(--space-3, 12px);
    top: 50%;
    transform: translateY(-50%);
    color: var(--textTertiary);
    pointer-events: none;
  }

  .cbx-combobox__search {
    width: 100%;
    height: var(--control-md);
    padding: 0 var(--space-2, 8px) 0 28px;
    border: none !important;
    outline: none !important;
    background: transparent;
    color: var(--text);
    font-size: var(--fontSize-base);
  }

  .cbx-combobox__list {
    max-height: 220px;
    overflow-y: auto;
    padding: var(--space-1, 4px);
    scroll-behavior: auto;
  }

  .cbx-combobox__item {
    padding: 6px var(--space-3, 12px) 6px var(--space-2, 8px);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--fontSize-base);
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2, 8px);
    transition: background 0.1s ease;
    user-select: none;
    scroll-margin: 40px;
  }

  /* highlight \u4EC5\u94FA\u5E95\uFF1Bselected \u4FDD\u7559 primary \u8272\u76F8\uFF0C\u4E8C\u8005\u53EF\u53E0\u52A0 */
  .cbx-combobox__item[data-highlighted]:not([data-selected]) {
    background: var(--backgroundHover);
  }

  .cbx-combobox__item[data-selected] {
    background: color-mix(in srgb, var(--primary) 12%, transparent);
    color: var(--primary);
    font-weight: 500;
  }

  .cbx-combobox__item[data-selected][data-highlighted] {
    background: color-mix(in srgb, var(--primary) 18%, transparent);
    color: var(--primary);
  }

  .cbx-combobox__item-check {
    color: var(--primary);
    margin-left: var(--space-2, 8px);
    flex-shrink: 0;
  }

  .cbx-combobox__status {
    padding: var(--space-3, 12px);
    text-align: center;
    font-size: var(--fontSize-base);
  }

  .cbx-combobox__status--loading {
    color: var(--textSecondary);
  }

  .cbx-combobox__status--empty {
    color: var(--textTertiary);
  }

  .cbx-combobox__helper {
    margin-top: var(--space-1, 4px);
    font-size: var(--fontSize-xs);
    color: var(--textSecondary);
  }
  .cbx-combobox__helper[data-error] {
    color: var(--danger, var(--error));
  }

  .cbx-combobox__list::-webkit-scrollbar { width: 5px; }
  .cbx-combobox__list::-webkit-scrollbar-thumb { background: var(--border); border-radius: var(--radius-sm); }
  .cbx-combobox__list::-webkit-scrollbar-thumb:hover { background: var(--textTertiary); }

  @media (prefers-reduced-motion: reduce) {
    .cbx-combobox__trigger,
    .cbx-combobox__clear,
    .cbx-combobox__item,
    .cbx-combobox__chevron {
      transition: none;
    }
    .cbx-combobox__panel {
      animation: none;
    }
  }
`;
function mergeRefs(...refs) {
  return (instance) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(instance);
      } else {
        ref.current = instance;
      }
    });
  };
}
function Combobox(props) {
  const {
    items = [],
    onChange,
    placeholder,
    labelField = "label",
    valueField = "value",
    disabled = false,
    selectedItem,
    renderOptionContent,
    error = false,
    helperText,
    label,
    icon,
    searchable = false,
    clearable = false,
    loading = false,
    size = "medium",
    variant = "default",
    ref
  } = props;
  const { t } = useTranslation();
  const triggerId = (0, import_react.useId)();
  const [open, setOpen] = (0, import_react.useState)(false);
  const [highlightedIndex, setHighlightedIndex] = (0, import_react.useState)(-1);
  const [searchTerm, setSearchTerm] = (0, import_react.useState)("");
  const searchInputRef = (0, import_react.useRef)(null);
  const listRef = (0, import_react.useRef)([]);
  const rootRef = (0, import_react.useRef)(null);
  const triggerRef = (0, import_react.useRef)(null);
  const getItemLabel = (0, import_react.useCallback)(
    (item) => item ? String(item?.[labelField] ?? "") : "",
    [labelField]
  );
  const getItemValue = (0, import_react.useCallback)(
    (item) => item ? item?.[valueField] : void 0,
    [valueField]
  );
  const isSameItem = (0, import_react.useCallback)(
    (a, b) => {
      const va = getItemValue(a);
      const vb = getItemValue(b);
      return va !== void 0 && vb !== void 0 ? va === vb : a === b;
    },
    [getItemValue]
  );
  const filteredItems = (0, import_react.useMemo)(() => {
    if (!searchable || !searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((it) => getItemLabel(it).toLowerCase().includes(term));
  }, [items, searchTerm, searchable, getItemLabel]);
  (0, import_react.useEffect)(() => {
    if (!open) return;
    const handleClickOutside = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);
  (0, import_react.useEffect)(() => {
    if (!open) {
      setSearchTerm("");
      setHighlightedIndex(-1);
    }
  }, [open]);
  (0, import_react.useEffect)(() => {
    if (!open) return;
    let index = -1;
    if (!searchTerm && selectedItem) {
      index = filteredItems.findIndex((it) => isSameItem(it, selectedItem));
    }
    if (index < 0 && filteredItems.length > 0) {
      index = 0;
    }
    setHighlightedIndex(index);
    const frameId = window.requestAnimationFrame(() => {
      if (!open) return;
      if (index >= 0 && listRef.current[index]) {
        listRef.current[index]?.scrollIntoView({
          block: "center",
          inline: "nearest"
        });
      }
      if (searchable) {
        searchInputRef.current?.focus();
      }
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [open, filteredItems, isSameItem, searchTerm, selectedItem, searchable]);
  (0, import_react.useEffect)(() => {
    if (!open) return;
    if (highlightedIndex < 0) return;
    const node = listRef.current[highlightedIndex];
    if (!node) return;
    node.scrollIntoView({
      block: "nearest",
      inline: "nearest"
    });
  }, [open, highlightedIndex]);
  const displayLabel = selectedItem ? getItemLabel(selectedItem) : "";
  const composedRef = mergeRefs(triggerRef, ref);
  const handleTriggerClick = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
  };
  const moveHighlight = (direction) => {
    if (filteredItems.length === 0) {
      setHighlightedIndex(-1);
      return;
    }
    setHighlightedIndex((prev) => {
      if (prev < 0) {
        return direction === "down" ? 0 : filteredItems.length - 1;
      }
      if (direction === "down") {
        return (prev + 1) % filteredItems.length;
      }
      return (prev - 1 + filteredItems.length) % filteredItems.length;
    });
  };
  const selectHighlighted = () => {
    if (highlightedIndex >= 0 && filteredItems[highlightedIndex]) {
      onChange?.(filteredItems[highlightedIndex]);
      setOpen(false);
    }
  };
  const handleTriggerKeyDown = (e) => {
    if (disabled) return;
    const { key } = e;
    if (key === "ArrowDown" || key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        moveHighlight(key === "ArrowDown" ? "down" : "up");
      }
      return;
    }
    if (key === "Enter" || key === " ") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        selectHighlighted();
      }
      return;
    }
    if (key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    }
  };
  const handleSearchKeyDown = (e) => {
    const { key } = e;
    if (key === "ArrowDown" || key === "ArrowUp") {
      e.preventDefault();
      moveHighlight(key === "ArrowDown" ? "down" : "up");
      return;
    }
    if (key === "Enter") {
      e.preventDefault();
      selectHighlighted();
      return;
    }
    if (key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: COMBOBOX_STYLES }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "cbx-combobox", ref: rootRef, children: [
      label && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: triggerId, className: "cbx-combobox__label", children: label }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          id: triggerId,
          ref: composedRef,
          type: "button",
          className: "cbx-combobox__trigger",
          disabled,
          "data-open": open ? "" : void 0,
          "data-size": size,
          "data-variant": variant,
          "aria-expanded": open,
          "aria-invalid": error,
          onClick: handleTriggerClick,
          onKeyDown: handleTriggerKeyDown,
          children: [
            icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "cbx-combobox__icon-prefix", "aria-hidden": "true", children: icon }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "span",
              {
                className: "cbx-combobox__text",
                "data-placeholder": !selectedItem ? "" : void 0,
                children: displayLabel || placeholder || t("dropdown.placeholder", "Select...")
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "cbx-combobox__ctrl", children: [
              clearable && selectedItem && !disabled && !loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "span",
                {
                  role: "button",
                  tabIndex: 0,
                  className: "cbx-combobox__clear",
                  "aria-label": t("dropdown.clear", "Clear selection"),
                  onClick: (e) => {
                    e.stopPropagation();
                    onChange?.(null);
                  },
                  onKeyDown: (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange?.(null);
                    }
                  },
                  children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuX, { size: 14, "aria-hidden": "true" })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                LuChevronDown,
                {
                  className: "cbx-combobox__chevron",
                  size: size === "small" ? 14 : 16,
                  "aria-hidden": "true"
                }
              )
            ] })
          ]
        }
      ),
      helperText && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "div",
        {
          className: "cbx-combobox__helper",
          "data-error": error ? "" : void 0,
          children: helperText
        }
      ),
      open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "div",
        {
          className: "cbx-combobox__panel",
          onKeyDown: (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              selectHighlighted();
            }
          },
          children: [
            searchable && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "cbx-combobox__search-wrap", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuSearch, { className: "cbx-combobox__search-icon", size: 16, "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  ref: searchInputRef,
                  className: "cbx-combobox__search",
                  placeholder: t("dropdown.search", "Search..."),
                  value: searchTerm,
                  onChange: (e) => setSearchTerm(e.target.value),
                  onClick: (e) => e.stopPropagation(),
                  onKeyDown: handleSearchKeyDown
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { role: "listbox", className: "cbx-combobox__list", children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "div",
              {
                className: "cbx-combobox__status cbx-combobox__status--loading",
                role: "status",
                "aria-live": "polite",
                children: t("dropdown.loading", "Loading...")
              }
            ) : filteredItems.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "div",
              {
                className: "cbx-combobox__status cbx-combobox__status--empty",
                role: "status",
                children: t("dropdown.noResults", "No results found")
              }
            ) : filteredItems.map((item, index) => {
              const isSelected = isSameItem(selectedItem, item);
              const isHighlighted = highlightedIndex === index;
              const itemValue = getItemValue(item);
              const itemKey = itemValue !== void 0 && itemValue !== null ? String(itemValue) : `opt-${index}-${getItemLabel(item).slice(0, 24)}`;
              return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "div",
                {
                  ref: (node) => {
                    listRef.current[index] = node;
                  },
                  role: "option",
                  tabIndex: -1,
                  "aria-selected": isSelected,
                  className: "cbx-combobox__item",
                  "data-selected": isSelected ? "" : void 0,
                  "data-highlighted": isHighlighted ? "" : void 0,
                  onClick: () => {
                    onChange?.(item);
                    setOpen(false);
                  },
                  onMouseEnter: () => setHighlightedIndex(index),
                  children: renderOptionContent ? renderOptionContent(item, isHighlighted, isSelected) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: getItemLabel(item) }),
                    isSelected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      LuCheck,
                      {
                        size: 16,
                        className: "cbx-combobox__item-check",
                        "aria-hidden": "true"
                      }
                    )
                  ] })
                },
                itemKey
              );
            }) })
          ]
        }
      )
    ] })
  ] });
}
Combobox.displayName = "Combobox";
var Combobox_default = Combobox;

export {
  Combobox_default
};
