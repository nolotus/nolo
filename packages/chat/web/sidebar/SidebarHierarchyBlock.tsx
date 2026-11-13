// ── Agent 优先侧栏的单一展示块（React） ────────────────────────────────────
// 数据整形全部在 sidebarHierarchyRows.ts（纯函数，可单测）；本文件只负责把
// 扁平行列交给既有的 SidebarVirtualizedList（虚拟化保持）+ SidebarItemRow。

import React from "react";
import SidebarItemRow from "create/space/SidebarItemRow";
import { SidebarVirtualizedList } from "./SidebarVirtualizedList";
import type { HierarchyRow } from "./sidebarHierarchyRows";

export type SidebarHierarchyBlockProps = {
  rows: readonly HierarchyRow[];
  expandedKeys: ReadonlySet<string>;
  activeMenuKey: string | null;
  onToggleMenu: (key: string | null) => void;
  onMenuAnchorChange?: (contentKey: string, el: HTMLElement | null) => void;
  onAction: (key: React.Key) => void;
  onToggleExpand: (contentKey: string) => void;
  isRowActive: (row: HierarchyRow) => boolean;
  currentPath: string;
  currentUserId?: string | null;
  activePageKey?: string;
};

type VirtualItem = { contentKey: string; title: string; __row: HierarchyRow };

const noopMenuAnchorChange = () => {};

/**
 * 单一展示块：一个 SidebarVirtualizedList，行序 = agent → 主对话 → 子对话。
 * 没有分组标题伪条目：RAC ListBox 会把每个 item 包成可聚焦 ListBoxItem
 * （SidebarVirtualizedList.tsx:158-180），把标题塞进去就会变成可点击的假条目。
 * 日期分组由调用方用 buildHierarchyRows(...).groups 在列表之外呈现。
 */
export const SidebarHierarchyBlock: React.FC<SidebarHierarchyBlockProps> = ({
  rows,
  expandedKeys,
  activeMenuKey,
  onToggleMenu,
  onMenuAnchorChange,
  onAction,
  onToggleExpand,
  isRowActive,
  currentPath,
  currentUserId,
  activePageKey,
}) => {
  const items = React.useMemo<VirtualItem[]>(
    () =>
      rows.map((row) => ({
        contentKey: row.item.contentKey,
        title: row.item.title,
        __row: row,
      })),
    [rows],
  );

  return (
    <SidebarVirtualizedList
      items={items}
      onAction={onAction}
      dependencies={[
        activeMenuKey,
        currentPath,
        activePageKey,
        currentUserId,
        expandedKeys,
      ]}
    >
      {(virtualItem) => {
        const row = (virtualItem as VirtualItem).__row;
        const item = row.item;
        return (
          <SidebarItemRow
            key={item.contentKey}
            contentKey={item.contentKey}
            type={item.type as any}
            title={item.title}
            spaceIdOverride={item.spaceId}
            sourceServerOrigin={item.serverOrigin}
            summaryStatus={"status" in item ? item.status : undefined}
            summaryUnreadAt={"unreadAt" in item ? item.unreadAt : undefined}
            disableDrag
            isActive={isRowActive(row)}
            isMenuOpen={activeMenuKey === item.contentKey}
            onToggleMenu={onToggleMenu}
            onMenuAnchorChange={onMenuAnchorChange ?? noopMenuAnchorChange}
            childCount={row.loadedChildCount}
            isChildCollapsed={!expandedKeys.has(item.contentKey)}
            onToggleChildCollapse={
              row.kind === "agent" || row.loadedChildCount > 0
                ? () => onToggleExpand(item.contentKey)
                : undefined
            }
            isChildRow={row.isChildRow}
          />
        );
      }}
    </SidebarVirtualizedList>
  );
};

export default SidebarHierarchyBlock;
