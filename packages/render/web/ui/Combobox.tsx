// render/web/ui/Combobox.tsx
import React, {
  useState,
  useRef,
  useEffect,
  useId,
  useMemo,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import { LuChevronDown, LuCheck, LuX, LuSearch } from "react-icons/lu";
import { zIndex } from "../../styles/zIndex";

/**
 * 样式：只负责 Combobox 自身外观（token / 状态对齐）
 */
const COMBOBOX_STYLES = `
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

  /* --- Size（对齐 control / fontSize tokens） --- */
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

  /* focus（键盘）与 open 共用主题 primary / focus ring，去掉硬编码蓝 */
  .cbx-combobox__trigger:focus-visible,
  .cbx-combobox__trigger[data-open] {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--focus, var(--primaryGhost, color-mix(in srgb, var(--primary) 18%, transparent)));
    z-index: 2;
  }

  /* error 优先于 open/focus 的色相，环仍可区分 */
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

  /* ★ Panel 使用绝对定位，贴着触发器下方 */
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

  /* highlight 仅铺底；selected 保留 primary 色相，二者可叠加 */
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

/**
 * Props
 */
interface ComboboxProps<T = any> {
  items: T[];
  onChange?: (selectedItem: T | null) => void;
  placeholder?: string;
  labelField?: keyof T | string;
  valueField?: keyof T | string;
  disabled?: boolean;
  selectedItem?: T | null;
  renderOptionContent?: (
    item: T,
    isHighlighted: boolean,
    isSelected: boolean
  ) => React.ReactNode;
  error?: boolean;
  helperText?: string;
  label?: string;
  icon?: React.ReactNode;
  searchable?: boolean;
  clearable?: boolean;
  loading?: boolean;
  size?: "small" | "medium" | "large";
  variant?: "default" | "filled" | "ghost";
  ref?: React.Ref<HTMLButtonElement>;
}

/**
 * 合并多个 ref
 */
function mergeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): (instance: T | null) => void {
  return (instance) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(instance);
      } else {
        (ref as React.MutableRefObject<T | null>).current = instance;
      }
    });
  };
}

function Combobox<T = any>(props: ComboboxProps<T>) {
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
    ref,
  } = props;

  const { t } = useTranslation();
  const triggerId = useId();

  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [searchTerm, setSearchTerm] = useState("");

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<(HTMLElement | null)[]>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  /**
   * 这些 helper 用 useCallback 包一层，保证依赖稳定，
   * 避免 effect 因函数引用变化而反复触发导致滚动卡住
   */
  const getItemLabel = useCallback(
    (item: T | null | undefined): string =>
      item ? String((item as any)?.[labelField as any] ?? "") : "",
    [labelField]
  );

  const getItemValue = useCallback(
    (item: T | null | undefined): unknown =>
      item ? (item as any)?.[valueField as any] : undefined,
    [valueField]
  );

  const isSameItem = useCallback(
    (a: T | null | undefined, b: T | null | undefined) => {
      const va = getItemValue(a);
      const vb = getItemValue(b);
      return va !== undefined && vb !== undefined ? va === vb : a === b;
    },
    [getItemValue]
  );

  const filteredItems = useMemo(() => {
    if (!searchable || !searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((it) => getItemLabel(it).toLowerCase().includes(term));
  }, [items, searchTerm, searchable, getItemLabel]);

  /**
   * 点击外部关闭
   */
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
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

  /**
   * 关闭时清空搜索
   */
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setHighlightedIndex(-1);
    }
  }, [open]);

  /**
   * 打开 / 过滤条件变化时，自动高亮：已选中项 或 第一项，
   * 并把它滚动到列表中间，方便用户看到当前选中项。
   * 这里只在「打开 & 列表内容变化」时执行一次，不影响用户手动滚动。
   */
  useEffect(() => {
    if (!open) return;

    let index = -1;

    if (!searchTerm && selectedItem) {
      index = filteredItems.findIndex((it) => isSameItem(it, selectedItem));
    }

    if (index < 0 && filteredItems.length > 0) {
      index = 0;
    }

    setHighlightedIndex(index);

    // 下一帧再滚动，确保 DOM 已更新
    const frameId = window.requestAnimationFrame(() => {
      if (!open) return;

      if (index >= 0 && listRef.current[index]) {
        listRef.current[index]?.scrollIntoView({
          block: "center",
          inline: "nearest",
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

  /**
   * 高亮项变化时，保证它在可视区域内（键盘上下移动时有用）。
   * 用 block: "nearest"，不会强制居中，避免打断用户滚动。
   */
  useEffect(() => {
    if (!open) return;
    if (highlightedIndex < 0) return;

    const node = listRef.current[highlightedIndex];
    if (!node) return;

    node.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [open, highlightedIndex]);

  const displayLabel = selectedItem ? getItemLabel(selectedItem) : "";

  const composedRef = mergeRefs<HTMLButtonElement>(triggerRef, ref);

  const handleTriggerClick = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
  };

  const moveHighlight = (direction: "up" | "down") => {
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

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
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

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  return (
    <>
      <style>{COMBOBOX_STYLES}</style>

      <div className="cbx-combobox" ref={rootRef}>
        {label && (
          <label htmlFor={triggerId} className="cbx-combobox__label">
            {label}
          </label>
        )}

        {/* 触发按钮 */}
        <button
          id={triggerId}
          ref={composedRef}
          type="button"
          className="cbx-combobox__trigger"
          disabled={disabled}
          data-open={open ? "" : undefined}
          data-size={size}
          data-variant={variant}
          aria-expanded={open}
          aria-invalid={error}
          onClick={handleTriggerClick}
          onKeyDown={handleTriggerKeyDown}
        >
          {icon && (
            <span className="cbx-combobox__icon-prefix" aria-hidden="true">
              {icon}
            </span>
          )}

          <span
            className="cbx-combobox__text"
            data-placeholder={!selectedItem ? "" : undefined}
          >
            {displayLabel ||
              placeholder ||
              t("dropdown.placeholder", "Select...")}
          </span>

          <div className="cbx-combobox__ctrl">
            {/* span + role=button，避免 button 嵌套 button */}
            {clearable && selectedItem && !disabled && !loading && (
              <span
                role="button"
                tabIndex={0}
                className="cbx-combobox__clear"
                aria-label={t("dropdown.clear", "Clear selection")}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange?.(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange?.(null);
                  }
                }}
              >
                <LuX size={14} aria-hidden="true" />
              </span>
            )}

            <LuChevronDown
              className="cbx-combobox__chevron"
              size={size === "small" ? 14 : 16}
              aria-hidden="true"
            />
          </div>
        </button>

        {helperText && (
          <div
            className="cbx-combobox__helper"
            data-error={error ? "" : undefined}
          >
            {helperText}
          </div>
        )}

        {/* 浮层（不使用 Floating UI，简单绝对定位在容器内） */}
        {open && (
          <div
            className="cbx-combobox__panel"
            onKeyDown={(e) => {
              // 兜底：panel 获得焦点时也能用 Enter 选择
              if (e.key === "Enter") {
                e.preventDefault();
                selectHighlighted();
              }
            }}
          >
            {searchable && (
              <div className="cbx-combobox__search-wrap">
                <LuSearch className="cbx-combobox__search-icon" size={16} aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  className="cbx-combobox__search"
                  placeholder={t("dropdown.search", "Search...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
            )}

            <div role="listbox" className="cbx-combobox__list">
              {loading ? (
                <div
                  className="cbx-combobox__status cbx-combobox__status--loading"
                  role="status"
                  aria-live="polite"
                >
                  {t("dropdown.loading", "Loading...")}
                </div>
              ) : filteredItems.length === 0 ? (
                <div
                  className="cbx-combobox__status cbx-combobox__status--empty"
                  role="status"
                >
                  {t("dropdown.noResults", "No results found")}
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const isSelected = isSameItem(selectedItem, item);
                  const isHighlighted = highlightedIndex === index;
                  const itemValue = getItemValue(item);
                  const itemKey =
                    itemValue !== undefined && itemValue !== null
                      ? String(itemValue)
                      : `opt-${index}-${getItemLabel(item).slice(0, 24)}`;

                  return (
                    <div
                      key={itemKey}
                      ref={(node) => {
                        listRef.current[index] = node;
                      }}
                      role="option"
                      // Options are keyboard-activated via combobox/listbox
                      // arrows (not Tab); -1 keeps them programmatically focusable.
                      tabIndex={-1}
                      aria-selected={isSelected}
                      className="cbx-combobox__item"
                      data-selected={isSelected ? "" : undefined}
                      data-highlighted={isHighlighted ? "" : undefined}
                      onClick={() => {
                        onChange?.(item);
                        setOpen(false);
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      {renderOptionContent ? (
                        renderOptionContent(item, isHighlighted, isSelected)
                      ) : (
                        <>
                          <span>{getItemLabel(item)}</span>
                          {isSelected && (
                            <LuCheck
                              size={16}
                              className="cbx-combobox__item-check"
                              aria-hidden="true"
                            />
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

Combobox.displayName = "Combobox";

export default Combobox;