// SidebarVirtualizedList.tsx
// Generic Virtualizer + ListBox wrapper for sidebar item lists.
// T must have contentKey (used as ListBoxItem id) and title (used as textValue).
//
// Height contract: the ListBox is the *only* scroller. Parent flex chain must
// give this list a bounded clientHeight (flex:1 + min-height:0 + overflow:hidden
// ancestors). If the scroller expands to full content height, Virtualizer mounts
// every row and the optimization is lost.

import React from "react";
import * as stylex from "@stylexjs/stylex";
import { sidebarStyles } from "../sidebarStyles";
import { withLiteralClass } from "../withLiteralClass";
import "../chatStylexEscapeHatch.css";
import {
  ListBox,
  ListBoxItem,
  type Selection,
} from "react-aria-components";
import {
  Virtualizer,
  ListLayout,
} from "react-aria-components/Virtualizer";

/**
 * Fixed row pitch used by All View recent + category lists (px).
 * 32px 行高 + 4px 间隔 —— 与收藏/置顶块的 gap 和 nav-row 的 margin 同一个节奏，
 * 列表滚过分组边界时行距不会跳。
 */
export const SIDEBAR_VIRTUAL_ROW_SIZE = 36;

/**
 * Estimate how many row DOM nodes RAC Virtualizer would keep mounted for a
 * fixed-size list. RAC OverscanManager grows the visible rect by ~1/3 of the
 * viewport height (directionally when scrolling); at rest mid-list this is a
 * good upper bound for mounted rows.
 */
export function estimateVirtualizedMountedRows(
  dataLength: number,
  viewportHeightPx: number,
  rowSize: number = SIDEBAR_VIRTUAL_ROW_SIZE
): number {
  if (dataLength <= 0 || viewportHeightPx <= 0 || rowSize <= 0) return 0;
  const overscanHeight = viewportHeightPx / 3;
  const mounted = Math.ceil((viewportHeightPx + overscanHeight) / rowSize);
  return Math.min(dataLength, mounted);
}

export interface SidebarItemShape {
  contentKey: string;
  title: string;
}

interface SidebarVirtualizedListProps<T extends SidebarItemShape> {
  /** Flat list of items to render */
  items: T[];
  /** Render function for each item. RAC ListBox only passes the item (not index). */
  children: (item: T) => React.ReactNode;
  /** Callback when an item is activated (click / Enter / Space). */
  onAction?: (key: React.Key) => void;
  /**
   * Height of the scrollable ListBox. Defaults to `"100%"` so a flex parent
   * with a bounded height can fill the remaining sidebar space. Prefer leaving
   * this at 100% and fixing the CSS height chain rather than hard-coding px.
   */
  height?: number | string;
  /** Row height in px for ListLayout. Default 37. */
  rowSize?: number;
  /**
   * External values the render function depends on (e.g. the active route key).
   * RAC caches collection items and only rebuilds them when `items` or these
   * dependencies change, so anything the row reads from a closure — like
   * `isActive` — must be listed here or rows go stale on navigation.
   */
  dependencies?: ReadonlyArray<unknown>;
  /**
   * RAC selection mode. When set, click-to-toggle is enabled and `onSelectionChange`
   * fires with the new selection. Pass `"multiple"` to allow multi-select.
   */
  selectionMode?: "none" | "single" | "multiple";
  /** Currently selected keys. `"all"` selects every loaded item. */
  selectedKeys?: "all" | Iterable<React.Key>;
  /** Fires when the user toggles selection. */
  onSelectionChange?: (keys: Selection) => void;
  /** RAC selection behavior. Defaults to "toggle". */
  selectionBehavior?: "toggle" | "replace";
  /**
   * 激活项在 items 中的下标,变化时滚动使其居中;<0 或 undefined 不滚动。
   */
  scrollToIndex?: number;
  /**
   * 键盘上下文菜单入口(Shift+F10 / ContextMenu 键):焦点在 ListBoxItem 上时,
   * 浏览器会派发原生 contextmenu,target 正是该 ListBoxItem。此回调在该场景下
   * 触发,anchor 即 ListBoxItem 自身。鼠标右键已由 SidebarItemRow 的
   * handleRowContextMenu 处理并 stopPropagation,不会走到这里。
   */
  onItemContextMenu?: (item: T, anchor: HTMLElement) => void;
  /**
   * F2 重命名入口:焦点在 ListBoxItem 上时按 F2 触发。走同一条 editSignal 通路,
   * 不在行内新建 state。keydown 挂在 ListBoxItem 上而非行根 div —— 方向键导航时
   * DOM 焦点在 ListBoxItem,事件只向上冒泡,挂在行上就是死代码。
   */
  onItemRename?: (item: T) => void;
}

export function SidebarVirtualizedList<T extends SidebarItemShape>({
  items,
  children,
  onAction,
  height = "100%",
  rowSize = SIDEBAR_VIRTUAL_ROW_SIZE,
  dependencies,
  selectionMode,
  selectedKeys,
  onSelectionChange,
  selectionBehavior = "toggle",
  scrollToIndex,
  onItemContextMenu,
  onItemRename,
}: SidebarVirtualizedListProps<T>) {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const lastScrolledIndexRef = React.useRef(-1);
  React.useEffect(() => {
    if (scrollToIndex === undefined || scrollToIndex < 0) return;
    if (lastScrolledIndexRef.current === scrollToIndex) return;
    const el = listRef.current;
    // 布局未就绪(clientHeight 为 0)时不滚动也不记录,等 items/尺寸就绪后重试,
    // 否则会以错误的居中偏移永久锁定(lastScrolledIndexRef 去重)。
    if (!el || el.clientHeight === 0) return;
    lastScrolledIndexRef.current = scrollToIndex;
    el.scrollTop = Math.max(0, scrollToIndex * rowSize + rowSize / 2 - el.clientHeight / 2);
  }, [scrollToIndex, rowSize, items.length]);
  return (
    <Virtualizer
      layout={ListLayout}
      layoutOptions={{ rowSize, gap: 0, padding: 0 }}
    >
      <ListBox
        ref={listRef}
        aria-label="Sidebar items"
        data-hook="chat-esc-sidebar-scroller"
        items={items}
        dependencies={dependencies}
        onAction={onAction}
        selectionMode={selectionMode}
        selectionBehavior={selectionBehavior}
        selectedKeys={selectedKeys as any}
        onSelectionChange={onSelectionChange}
        {...withLiteralClass("SidebarVirtualizedList__scroller", sidebarStyles.scroller)}
        style={{ height }}
      >
        {(item: T) => (
          <ListBoxItem
            id={item.contentKey}
            textValue={item.title}
            style={{ height: rowSize, minHeight: 0, boxSizing: "border-box" }}
            onContextMenu={(event) => {
              // 只处理事件本身就发生在 ListBoxItem 上的情况 —— 即键盘 Shift+F10 /
              // ContextMenu 键(焦点在 ListBoxItem)。从行内冒泡上来的鼠标右键已经被
              // SidebarItemRow 的 handleRowContextMenu 处理并 stopPropagation 了;
              // 而 SidebarItemRow 在重命名态会早退且不 stopPropagation,那种情况
              // 必须让原生文本菜单弹出,绝不能在这里劫持。
              if (event.target !== event.currentTarget) return;
              event.preventDefault();
              onItemContextMenu?.(item, event.currentTarget as HTMLElement);
            }}
            onKeyDown={(event) => {
              // F2 走同一条 editSignal 通路。其他按键原样放过 —— ListBox 的方向键
              // 导航和 Enter 激活必须照常工作,不得 preventDefault/stopPropagation。
              if (event.key !== "F2") return;
              event.preventDefault();
              event.stopPropagation();
              onItemRename?.(item);
            }}
          >
            {children(item)}
          </ListBoxItem>
        )}
      </ListBox>
    </Virtualizer>
  );
}
