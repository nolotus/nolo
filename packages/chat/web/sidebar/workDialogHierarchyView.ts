// ── Work 侧栏「Dialog」入口的层级 + 日期分组视图（纯函数，无 React）─────────
// 职责：把「已排序的扁平对话行」整形成「日期分组 → 顶层行 →（展开时）子行」。
//
// 复用依据（不重写关系模型）：
// - 父子判定直接调用 `sidebarDialogHierarchy.buildDialogHierarchy`：它已经负责
//   同 owner / 同 origin / 同 space 域校验、自引用剔除、沿父链 cycle 检测，
//   以及「父未载入 → 子留在顶层（可访问 fallback）」。
// - 日期分组复用 `resolveRecencyGroupId`（本地日历日，不按 24h 窗口）。
//
// 关键约束：
// 1. 子对话不在顶层重复出现（由 buildDialogHierarchy 的 isChild 保证）。
// 2. 父对话未载入时，子对话保留在顶层作为可访问 fallback
//    （buildDialogHierarchy 不把它标成 child，这里也不会把它藏起来）。
// 3. 日期 header 只出现在顶层行分组处：子行跟随父行，不再另起 header；
//    分组时间取「父的最近活动」。

import type { MyContentListItem } from "app/utils/myContentItems";
import {
  buildDialogHierarchy,
  resolveRecencyGroupId,
  type RecencyGroupId,
} from "./sidebarDialogHierarchy";

/** 与 WorkDialogGroupsPreview 现有扁平行同构。 */
export type WorkDialogFlatRow = {
  key: string;
  /** 该行最近活动时间（含对话事件时间），用于排序与日期分组。 */
  updatedAt: number;
  item: MyContentListItem;
  shared: boolean;
};

/** 展平后的展示行：顶层行 depth=0，展开出来的子行 depth≥1。 */
export type WorkDialogTreeRow = {
  row: WorkDialogFlatRow;
  /** 已载入的直接子对话数（下界，不是总数）。 */
  loadedChildCount: number;
  /** 该行是否挂在父对话下。 */
  isChild: boolean;
  /** 缩进层级：顶层=0，子=1，更深不再增加。 */
  depth: number;
};

export type WorkDialogSection = {
  /** Unique identity for adjacent date sections, even when pinned ordering repeats a date. */
  key: string;
  groupId: RecencyGroupId;
  rows: WorkDialogTreeRow[];
};

export type WorkDialogHierarchyView = {
  sections: WorkDialogSection[];
  /** 顶部「正在进行」分组：自身或子树内有运行对话的根行（含其已展开的子行）。 */
  runningRows: WorkDialogTreeRow[];
  /** 父对话未载入、留在顶层的子行数（可访问 fallback）。 */
  detachedChildCount: number;
};

const isDialogItem = (item: MyContentListItem): boolean => item.type === "dialog";

/**
 * 构建层级 + 日期分组视图。
 *
 * @param rows        已按最近活动降序排好的扁平行（顶层与子行混在一起）
 * @param expandedKeys 已展开的父对话 contentKey
 * @param now         日期分组基准时间（便于测试注入）
 */
export const buildWorkDialogHierarchyView = (
  rows: readonly WorkDialogFlatRow[],
  expandedKeys: ReadonlySet<string>,
  now: number = Date.now(),
  runningDialogKeys?: ReadonlySet<string>,
): WorkDialogHierarchyView => {
  const dialogRows = rows.filter((row) => isDialogItem(row.item));
  const hierarchy = buildDialogHierarchy(dialogRows.map((row) => row.item));
  const byKey = new Map(dialogRows.map((row) => [row.key, row]));

  const sections: WorkDialogSection[] = [];
  let current: WorkDialogSection | null = null;
  const sectionOccurrences = new Map<RecencyGroupId, number>();

  // 展平：父行在顶层，展开时把子行按深度接在父后面（子不再另起日期分组）。
  const flatten = (
    row: WorkDialogFlatRow,
    isChild: boolean,
    depth: number,
    target: WorkDialogTreeRow[],
  ): void => {
    const loadedChildren = (hierarchy.childrenOf.get(row.key) ?? [])
      .map((childKey) => byKey.get(childKey))
      .filter((child): child is WorkDialogFlatRow => Boolean(child));
    target.push({ row, loadedChildCount: loadedChildren.length, isChild, depth });
    if (!expandedKeys.has(row.key)) return;
    for (const child of loadedChildren) flatten(child, true, depth + 1, target);
  };

  for (const row of rows) {
    // 挂到父下的子行不进入顶层分组（父展开时在父下面渲染）。
    if (hierarchy.isChild(row.key)) continue;
    const groupId = resolveRecencyGroupId(row.updatedAt, now);
    if (!current || current.groupId !== groupId) {
      const occurrence: number = sectionOccurrences.get(groupId) ?? 0;
      sectionOccurrences.set(groupId, occurrence + 1);
      current = { key: `${groupId}:${occurrence}`, groupId, rows: [] };
      sections.push(current);
    }
    flatten(row, false, 0, current.rows);
  }

  // ── 运行中分组 ────────────────────────────────────────────────────────
  // 「自身或子树里有运行对话」的根行提到顶部「正在进行」组；其余仍按日期分组。
  // 子对话仍挂父下（不顶层重复），运行时只移动根行及其已展开的子树。
  const runningRootKeys = new Set<string>();
  if (runningDialogKeys && runningDialogKeys.size > 0) {
    const subtreeKeys = (rootKey: string): string[] => {
      const collected: string[] = [];
      const stack: string[] = [rootKey];
      const seen = new Set<string>();
      while (stack.length > 0) {
        const current = stack.pop() as string;
        if (seen.has(current)) continue;
        seen.add(current);
        collected.push(current);
        for (const child of hierarchy.childrenOf.get(current) ?? []) stack.push(child);
      }
      return collected;
    };
    for (const section of sections) {
      for (const entry of section.rows) {
        if (entry.depth !== 0) continue;
        if (subtreeKeys(entry.row.key).some((key) => runningDialogKeys.has(key))) {
          runningRootKeys.add(entry.row.key);
        }
      }
    }
  }

  const runningRows: WorkDialogTreeRow[] = [];
  if (runningRootKeys.size > 0) {
    for (const section of sections) {
      const kept: WorkDialogTreeRow[] = [];
      let index = 0;
      while (index < section.rows.length) {
        const entry = section.rows[index];
        if (entry.depth === 0 && runningRootKeys.has(entry.row.key)) {
          runningRows.push(entry);
          index += 1;
          while (index < section.rows.length && section.rows[index].depth > 0) {
            runningRows.push(section.rows[index]);
            index += 1;
          }
          continue;
        }
        kept.push(entry);
        index += 1;
      }
      section.rows = kept;
    }
  }

  return {
    sections,
    runningRows,
    detachedChildCount: hierarchy.detachedByUnloadedParent.size,
  };
};
