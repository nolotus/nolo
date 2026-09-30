// packages/chat/web/ComposerSuggestionMenu.tsx
// Unified, presentation-only suggestion surface for the Web Composer.
// Owns menu display, pointer interaction, a11y (listbox/option with stable
// ids), active-option scrolling, and density (max-width instead of a fixed
// over-wide menu; description collapses in narrow containers). Provider
// matching, insertion and execution live in Core/provider modules.

import * as stylex from "@stylexjs/stylex";
import { composerSuggestionStyles } from "./ComposerSuggestionMenuStyles";
import "./chatStylexEscapeHatch.css";
import React, { memo, useEffect, useRef } from "react";
import { withLiteralClass } from "./withLiteralClass";
import {
  clampSuggestionHighlightIndex,
  type ComposerSuggestionItem,
} from "./composerSuggestions";

export interface ComposerSuggestionMenuProps {
  visible: boolean;
  items: ComposerSuggestionItem[];
  highlightIndex: number;
  headerText?: string;
  /** Stable listbox id shared with the textarea combobox aria wiring. */
  listboxId: string;
  onSelect: (index: number) => void;
  onHover?: (index: number) => void;
}

/**
 * 只负责展示：统一建议菜单（@ 收藏助手 + / 命令补全）
 * - 不管理任何全局状态，不执行命令、不插入文本
 * - 高亮项由父组件通过 highlightIndex 控制
 */
const ComposerSuggestionMenuComponent: React.FC<ComposerSuggestionMenuProps> = ({
  visible,
  items,
  highlightIndex,
  headerText,
  listboxId,
  onSelect,
  onHover,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const clampedHighlightIndex = clampSuggestionHighlightIndex(
    highlightIndex,
    items.length
  );
  const headerId = `${listboxId}-label`;

  /**
   * 高亮项变更时，将其尽量滚动到菜单可视区域的中间
   * - 只滚动菜单容器本身，不影响页面滚动
   */
  useEffect(() => {
    if (!visible) return;
    if (clampedHighlightIndex < 0) return;

    const container = containerRef.current;
    if (!container) return;

    const activeItem = container.querySelector<HTMLLIElement>(
      ".composer-suggestion__item.is-active"
    );
    if (!activeItem) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();

    const currentScrollTop = container.scrollTop;
    const itemOffsetTop = itemRect.top - containerRect.top + currentScrollTop;
    const itemHeight = activeItem.offsetHeight;

    const targetScrollTop =
      itemOffsetTop - container.clientHeight / 2 + itemHeight / 2;

    const maxScrollTop = container.scrollHeight - container.clientHeight;
    const nextScrollTop = Math.min(Math.max(targetScrollTop, 0), maxScrollTop);

    if (typeof container.scrollTo === "function") {
      container.scrollTo({
        top: nextScrollTop,
        behavior: "auto",
      });
    } else {
      container.scrollTop = nextScrollTop;
    }
  }, [clampedHighlightIndex, visible, items.length]);

  if (!visible || items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      {...withLiteralClass("composer-suggestion", composerSuggestionStyles.menu)}
    >
      {headerText && (
        <div
          id={headerId}
          {...withLiteralClass(
            "composer-suggestion__header",
            composerSuggestionStyles.menuHeader
          )}
        >
          {headerText}
        </div>
      )}

      <ul
        id={listboxId}
        role="listbox"
        aria-labelledby={headerText ? headerId : undefined}
        {...withLiteralClass(
          "composer-suggestion__list",
          composerSuggestionStyles.menuList
        )}
      >
        {items.map((item, index) => {
          const isActive = index === clampedHighlightIndex;

          return (
            <li
              key={item.key}
              id={`${listboxId}-opt-${index}`}
              role="option"
              aria-selected={isActive}
              onMouseDown={(event) => {
                // 阻止 textarea 失焦
                event.preventDefault();
                onSelect(index);
              }}
              onMouseEnter={() => {
                if (onHover) onHover(index);
              }}
              {...withLiteralClass(
                `composer-suggestion__item${isActive ? " is-active" : ""}`,
                composerSuggestionStyles.menuItem,
                isActive && composerSuggestionStyles.menuItemActive
              )}
            >
              <span
                {...withLiteralClass(
                  "composer-suggestion__item-label",
                  composerSuggestionStyles.menuItemLabel
                )}
              >
                {item.label}
              </span>
              {item.description && (
                <span
                  {...withLiteralClass(
                    "composer-suggestion__item-description",
                    composerSuggestionStyles.menuItemDescription
                  )}
                >
                  {item.description}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const ComposerSuggestionMenu = memo(ComposerSuggestionMenuComponent);
export default ComposerSuggestionMenu;
