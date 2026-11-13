// ── Agent 优先侧栏的扁平行列（纯函数，无 React） ────────────────────────────
// 职责：把「agent / 主对话 / 子对话」压成一条扁平行列，交给既有的
// SidebarVirtualizedList 渲染（保持虚拟化，不做全量 map）。
//
// 复用依据（现成组件缺口已核实）：
// - 既有侧栏历史实现已用同一套扁平化 + childCount /
//   isChildCollapsed / onToggleChildCollapse / isChildRow props，本模块照搬该契约。
// - SidebarVirtualizedList.tsx:158-180 把每个 item 无条件包进可聚焦的 ListBoxItem
//   （固定行高 + RAC 键盘导航/选择）。因此**分组标题不能放进这个列表**，否则会变成
//   可点击的假条目、破坏 keyboard/active/menu 语义。故日期分组只以 `groups`
//   形式产出，由调用方在列表之外呈现。
//
// 归属：以主对话的 primaryAgentKey 为准；子对话跟父对话，不因执行 agent
// （cybots）重复挂到别的 agent 下。

import type { MyContentListItem } from "app/utils/myContentItems";
import { selectVisibleMainDialogs } from "./runningDialogAggregation";
import {
  buildDialogHierarchy,
  groupByRecency,
  resolveLastActivity,
  sortAgentsForSidebar,
  type HierarchySidebarItem,
  type RecencyGroup,
} from "./sidebarDialogHierarchy";

export type HierarchyRowKind = "agent" | "dialog" | "more";

export type HierarchyRow = {
  item: HierarchySidebarItem;
  kind: HierarchyRowKind;
  /** 已载入的直接子对话数（下界，不是总数）。 */
  loadedChildCount: number;
  isChildRow: boolean;
  /** 该行所属的最近活跃分组（仅 dialog 行有意义）。 */
  groupId: RecencyGroup["id"] | null;
  /** 缩进层级：agent=0，主对话=1，子对话=2（更深不再增加缩进）。 */
  depth: number;
};

/**
 * 虚拟行里的「时间分组标题」。
 * 关键约束：它**没有 contentKey**，因此永远不会被 `buildRoutableContentPath`
 * 拼成一条可打开的路径，也不可能冒充 dialog 触发 onAction。
 * 渲染侧只要用 `isSectionHeader` 分流，就不会把它做成可激活条目。
 */
export type HierarchySectionHeader = {
  kind: "section-header";
  /** 仅用于列表渲染的稳定 id，不是内容 key。 */
  id: string;
  groupId: RecencyGroup["id"];
  /** i18n key（文案真源在 locale，本模块不硬编码）。 */
  labelKey: string;
};

export type HierarchyDisplayRow = HierarchyRow | HierarchySectionHeader;

export const isSectionHeader = (
  row: HierarchyDisplayRow,
): row is HierarchySectionHeader => row.kind === "section-header";

/**
 * 分组标题的 i18n key：`space:time_group_today` 等，由调用方按现有 locale 补齐；
 * 本模块只给出稳定的 key，不新增文案。
 */
export const sectionHeaderLabelKey = (groupId: RecencyGroup["id"]): string =>
  `time_group_${groupId}`;

/**
 * 把时间分组标题插进扁平行列（纯数据，标题行无可激活 key）。
 *
 * 规则：
 * - 只在「顶层 dialog 行」首次出现的位置插入该组标题；子行跟随父行，不再加标题。
 * - 同一个组只插入一次；空组不插入（`groups` 里本就没有空组）。
 * - 已经带 groupId 的行顺序不变，标题只是插入，不重排行。
 */
export const buildHierarchyDisplayRows = (
  rows: readonly HierarchyRow[],
  groups: readonly RecencyGroup[],
): HierarchyDisplayRow[] => {
  const groupOrder = new Map(groups.map((group, index) => [group.id, index]));
  const display: HierarchyDisplayRow[] = [];
  const inserted = new Set<RecencyGroup["id"]>();

  for (const row of rows) {
    const groupId = row.groupId;
    const isTopLevelDialog = row.kind === "dialog" && !row.isChildRow;
    if (groupId && isTopLevelDialog && !inserted.has(groupId)) {
      inserted.add(groupId);
      display.push({
        kind: "section-header",
        id: `section:${groupId}`,
        groupId,
        labelKey: sectionHeaderLabelKey(groupId),
      });
    }
    display.push(row);
  }

  // 组顺序自检：标题按 RECENCY_GROUP_ORDER 出现，不因行顺序跳动。
  const headerOrder = display
    .filter(isSectionHeader)
    .map((header) => groupOrder.get(header.groupId) ?? -1);
  const sorted = [...headerOrder].sort((a, b) => a - b);
  if (headerOrder.join(",") !== sorted.join(",")) {
    // 行数据本身乱序时以行顺序为准（不重排用户可见顺序），仅保持插入唯一性。
    return display;
  }
  return display;
};

/** 该行是否可被激活（打开内容）。标题行恒为 false。 */
export const isActivatableRow = (row: HierarchyDisplayRow): boolean =>
  !isSectionHeader(row) && row.kind !== "more" && Boolean(row.item.contentKey);

export type HierarchyRows = {
  rows: HierarchyRow[];
  groups: RecencyGroup[];
  /** 父对话未载入、留在顶层的子行数（可访问 fallback）。 */
  detachedByUnloadedParent: number;
};

const isAgentItem = (item: HierarchySidebarItem): boolean =>
  item.type === "agent";

const primaryAgentKeyOf = (item: HierarchySidebarItem): string | null => {
  const raw =
    "primaryAgentKey" in item && typeof item.primaryAgentKey === "string"
      ? item.primaryAgentKey.trim()
      : "";
  return raw || null;
};

/**
 * 构建扁平行列。
 *
 * @param items        已载入的侧栏条目（置顶 / 收藏由调用方先剔除）
 * @param expandedKeys 已展开的父行 contentKey
 * @param now          分组基准时间（便于测试注入）
 */
export const buildHierarchyRows = (
  items: readonly MyContentListItem[],
  expandedKeys: ReadonlySet<string>,
  now: number = Date.now(),
  mode: "agent" | "dialog" | "all" = "all",
  runningDialogKeys?: ReadonlySet<string>,
): HierarchyRows => {
  const hierarchyItems = items as readonly HierarchySidebarItem[];
  const agents = mode === "dialog" ? [] : hierarchyItems.filter(isAgentItem);
  const dialogs = hierarchyItems.filter(
    (item) => !isAgentItem(item) && item.type === "dialog",
  );
  const dialogByKey = new Map(dialogs.map((item) => [item.contentKey, item]));

  const hierarchy = buildDialogHierarchy(dialogs);
  // 有主的 dialog：已有 agent 行承载，不再作为顶层 dialog 行重复出现
  // （折叠时也不出现在 dialog 分组里；展开时作为该 agent 的子行）。

  const rows: HierarchyRow[] = [];
  const emitted = new Set<string>();

  const pushDialog = (
    item: HierarchySidebarItem,
    isChildRow: boolean,
    depth: number,
  ): number => {
    if (emitted.has(item.contentKey)) return -1; // 子不顶层重复
    emitted.add(item.contentKey);
    const index = rows.length;
    rows.push({
      item,
      kind: "dialog",
      loadedChildCount: hierarchy.loadedChildCount(item.contentKey),
      isChildRow,
      groupId: null,
      depth: Math.min(depth, 2),
    });
    if (!expandedKeys.has(item.contentKey)) return index;
    for (const childKey of hierarchy.childrenOf.get(item.contentKey) ?? []) {
      const child = dialogByKey.get(childKey);
      if (child) pushDialog(child, true, depth + 1);
    }
    return index;
  };

  // 1. agent 行优先（置顶 → 主对话最近活动 → 自身更新时间）。其主对话作为直接子行。
  const mainDialogsByAgent = new Map<string, HierarchySidebarItem[]>();
  const activityByAgent = new Map<string, number>();
  for (const item of agents) {
    const mainDialogs = dialogs
      .filter((entry) => primaryAgentKeyOf(entry) === item.contentKey &&
        (entry.serverOrigin ?? "").replace(/\/$/, "") === (item.serverOrigin ?? "").replace(/\/$/, ""))
      .filter((entry) => !hierarchy.isChild(entry.contentKey));
    mainDialogsByAgent.set(item.contentKey, mainDialogs);
    activityByAgent.set(
      item.contentKey,
      mainDialogs.reduce((max, entry) => Math.max(max, resolveLastActivity(entry)), 0),
    );
  }
  for (const item of sortAgentsForSidebar(agents, activityByAgent)) {
    if (emitted.has(item.contentKey)) continue;
    emitted.add(item.contentKey);
    const mainDialogs = mainDialogsByAgent.get(item.contentKey) ?? [];
    rows.push({
      item,
      kind: "agent",
      loadedChildCount: mainDialogs.length,
      isChildRow: false,
      groupId: null,
      depth: 0,
    });
    if (mode !== "agent" && !expandedKeys.has(item.contentKey)) continue;
    const orderedMainKeys = groupByRecency(mainDialogs, now).flatMap((group) => group.contentKeys);
    // 运行中的主对话（含其运行子树的 root）优先展示，且不占用普通 3 条名额。
    const collapsed = mode === "agent" && !expandedKeys.has(item.contentKey);
    const selection = selectVisibleMainDialogs(orderedMainKeys, runningDialogKeys ?? new Set<string>(), 3);
    const visibleMainKeys = collapsed ? selection.visibleKeys : orderedMainKeys;
    const hiddenNormalCount = selection.hiddenNormalCount;
    for (const key of visibleMainKeys) {
      const entry = dialogByKey.get(key);
      if (entry) pushDialog(entry, true, 1);
    }
    // 「更多」计数按剩余普通项算（折叠时=普通项-3；展开时沿用总数-3 的既有语义）。
    const moreCount = collapsed ? hiddenNormalCount : Math.max(0, mainDialogs.length - 3);
    if (mode === "agent" && moreCount > 0) rows.push({ item, kind: "more", loadedChildCount: moreCount, isChildRow: true, groupId: null, depth: 1 });
  }

  // 2. 无 agent 的主对话（含父未载入的 fallback 子行）→ dialog 视图，日期分组。
  const remaining = mode === "agent" ? [] : dialogs.filter((entry) => {
    if (emitted.has(entry.contentKey)) return false;
    if (hierarchy.isChild(entry.contentKey)) return false;
    const owner = primaryAgentKeyOf(entry);
    // 主对话归主 agent：只经 agent 行展开到达，不在 dialog 分组里重复出现。
    if (owner && (mainDialogsByAgent.get(owner) ?? []).some((dialog) => dialog.contentKey === entry.contentKey)) return false;
    return true;
  });
  const groups = groupByRecency(remaining, now);
  for (const group of groups) {
    for (const key of group.contentKeys) {
      const entry = dialogByKey.get(key);
      if (!entry) continue;
      const index = pushDialog(entry, false, 0);
      if (index >= 0) rows[index].groupId = group.id;
    }
  }

  // 3. 既非 agent 也非 dialog 的条目（page / table / attachment …）原样保留在末尾，
  //    否则切到 agent 视图会静默吞掉这些类型。
  for (const item of mode === "all" ? hierarchyItems : []) {
    if (emitted.has(item.contentKey)) continue;
    if (item.type === "dialog") continue;
    emitted.add(item.contentKey);
    rows.push({
      item,
      kind: "dialog",
      loadedChildCount: 0,
      isChildRow: false,
      groupId: null,
      depth: 0,
    });
  }

  return { rows, groups, detachedByUnloadedParent: hierarchy.detachedByUnloadedParent.size };
};
