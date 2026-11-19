// render/web/ui/Combobox.tsx
import * as stylex from "@stylexjs/stylex";
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
import { comboboxStyles } from "./combobox.styles";

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

  const triggerSizeStyle =
    size === "small"
      ? comboboxStyles.triggerSizeSmall
      : size === "large"
        ? comboboxStyles.triggerSizeLarge
        : comboboxStyles.triggerSizeMedium;
  const triggerVariantStyle =
    variant === "ghost"
      ? comboboxStyles.triggerVariantGhost
      : variant === "filled"
        ? comboboxStyles.triggerVariantFilled
        : null;

  return (
    <div {...stylex.props(comboboxStyles.root)} ref={rootRef}>
        {label && (
          <label htmlFor={triggerId} {...stylex.props(comboboxStyles.label)}>
            {label}
          </label>
        )}

        {/* 触发按钮 */}
        <button
          id={triggerId}
          ref={composedRef}
          type="button"
          {...stylex.props(
            comboboxStyles.trigger,
            triggerVariantStyle,
            variant === "ghost" && open && comboboxStyles.triggerVariantGhostOpen,
            triggerSizeStyle,
            open && comboboxStyles.triggerOpen,
            error && comboboxStyles.triggerInvalid,
            error && open && comboboxStyles.triggerInvalidOpen,
            disabled && comboboxStyles.triggerDisabled,
          )}
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
            <span {...stylex.props(comboboxStyles.iconPrefix)} aria-hidden="true">
              {icon}
            </span>
          )}

          <span
            {...stylex.props(
              comboboxStyles.text,
              !selectedItem && comboboxStyles.textPlaceholder,
            )}
            data-placeholder={!selectedItem ? "" : undefined}
          >
            {displayLabel ||
              placeholder ||
              t("dropdown.placeholder", "Select...")}
          </span>

          <div {...stylex.props(comboboxStyles.ctrl)}>
            {/* span + role=button，避免 button 嵌套 button */}
            {clearable && selectedItem && !disabled && !loading && (
              <span
                role="button"
                tabIndex={0}
                {...stylex.props(comboboxStyles.clear)}
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
              {...stylex.props(
                comboboxStyles.chevron,
                open && comboboxStyles.chevronOpen,
              )}
              size={size === "small" ? 14 : 16}
              aria-hidden="true"
            />
          </div>
        </button>

        {helperText && (
          <div
            {...stylex.props(
              comboboxStyles.helper,
              error && comboboxStyles.helperError,
            )}
            data-error={error ? "" : undefined}
          >
            {helperText}
          </div>
        )}

        {/* 浮层（不使用 Floating UI，简单绝对定位在容器内） */}
        {open && (
          <div
            {...stylex.props(comboboxStyles.panel)}
            onKeyDown={(e) => {
              // 兜底：panel 获得焦点时也能用 Enter 选择
              if (e.key === "Enter") {
                e.preventDefault();
                selectHighlighted();
              }
            }}
          >
            {searchable && (
              <div {...stylex.props(comboboxStyles.searchWrap)}>
                <LuSearch
                  {...stylex.props(comboboxStyles.searchIcon)}
                  size={16}
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  {...stylex.props(comboboxStyles.searchInput)}
                  placeholder={t("dropdown.search", "Search...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
            )}

            <div role="listbox" {...stylex.props(comboboxStyles.list)}>
              {loading ? (
                <div
                  {...stylex.props(
                    comboboxStyles.status,
                    comboboxStyles.statusLoading,
                  )}
                  role="status"
                  aria-live="polite"
                >
                  {t("dropdown.loading", "Loading...")}
                </div>
              ) : filteredItems.length === 0 ? (
                <div
                  {...stylex.props(
                    comboboxStyles.status,
                    comboboxStyles.statusEmpty,
                  )}
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
                      {...stylex.props(
                        comboboxStyles.item,
                        isHighlighted && !isSelected && comboboxStyles.itemHighlighted,
                        isSelected && comboboxStyles.itemSelected,
                        isSelected &&
                          isHighlighted &&
                          comboboxStyles.itemSelectedHighlighted,
                      )}
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
                              {...stylex.props(comboboxStyles.itemCheck)}
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
  );
}

Combobox.displayName = "Combobox";

export default Combobox;