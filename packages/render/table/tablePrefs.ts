// 文件: render/table/tablePrefs.ts
//
// 表格视图的客户端偏好（排序规则 + 手动行序）。
//
// 设计目标：
// - 不修改数据库 schema，不写远端；用户级偏好只存 localStorage。
// - 对老的 meta / 旧版本用户不产生迁移负担：localStorage 不可用时回退到空配置。
// - sort 规则按 columnId 引用，与 columns 数组解耦：列被删除时 sort 规则被自然忽略。
// - 手动行序是一个 rowDbKey 数组；行被删除时缺失的 key 被忽略，新行追加到末尾。

import type { SortDirection } from "./types";

export interface TableSortRule {
  columnId: string;
  direction: SortDirection;
}

export interface TablePrefs {
  sort: TableSortRule | null;
  manualOrder: string[] | null;
}

const STORAGE_KEY_PREFIX = "nolo.table.prefs.v1.";

const isSortDirection = (value: unknown): value is SortDirection =>
  value === "asc" || value === "desc";

const sanitizeSort = (raw: unknown): TableSortRule | null => {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.columnId !== "string" || obj.columnId.length === 0) return null;
  if (!isSortDirection(obj.direction)) return null;
  return { columnId: obj.columnId, direction: obj.direction };
};

const sanitizeOrder = (raw: unknown): string[] | null => {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string" || entry.length === 0) continue;
    if (seen.has(entry)) continue;
    seen.add(entry);
    result.push(entry);
  }
  return result;
};

export const readTablePrefs = (tableKey?: string | null): TablePrefs => {
  if (typeof window === "undefined" || !tableKey) {
    return { sort: null, manualOrder: null };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + tableKey);
    if (!raw) return { sort: null, manualOrder: null };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { sort: null, manualOrder: null };
    }
    const obj = parsed as Record<string, unknown>;
    return {
      sort: sanitizeSort(obj.sort),
      manualOrder: sanitizeOrder(obj.manualOrder),
    };
  } catch {
    return { sort: null, manualOrder: null };
  }
};

export const writeTablePrefs = (tableKey: string | undefined, prefs: TablePrefs): void => {
  if (typeof window === "undefined" || !tableKey) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY_PREFIX + tableKey,
      JSON.stringify(prefs)
    );
  } catch {
    // localStorage 不可用（隐私模式、配额满）时静默忽略，不影响渲染。
  }
};

/**
 * 行的「最近活动时间」：updatedAt 优先，缺失时回退 createdAt（与
 * fetchAndCacheTableRows 的合并冲突裁决口径一致），解析失败按 0。
 */
export const rowActivityTimestamp = (row: Record<string, any>): number => {
  const parsed =
    asFiniteTimestamp(row?.updatedAt) ?? asFiniteTimestamp(row?.createdAt);
  return parsed ?? 0;
};

const asFiniteTimestamp = (raw: unknown): number | null => {
  if (typeof raw !== "string" || raw.length === 0) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * 无列排序规则、无手动行序时的确定性默认排序：最近活动的行置顶。
 * - 主键：rowActivityTimestamp 降序（刚添加/刚改状态的行浮上来）；
 * - 平局：dbKey 降序（ULID 时间有序，key 更大 = 创建更晚 = 排更前），
 *   保证不同设备、不同本地缓存状态下看到同一顺序。
 */
export const applyDefaultRecentSort = <T extends Record<string, any>>(
  rows: T[],
  getKey: (row: T) => string
): T[] =>
  [...rows].sort((a, b) => {
    const diff = rowActivityTimestamp(b) - rowActivityTimestamp(a);
    if (diff !== 0) return diff;
    return getKey(b).localeCompare(getKey(a));
  });

/**
 * 把 manualOrder 应用到 rows 列表：
 * - 在 manualOrder 里的 row 按 manualOrder 顺序排前；
 * - 没在 manualOrder 里的 row 保持原相对顺序，追加到末尾；
 * - 列表里存在但 manualOrder 没有的 row 也追加到末尾。
 */
export const applyManualOrder = <T extends Record<string, any>>(
  rows: T[],
  manualOrder: string[] | null,
  getKey: (row: T) => string
): T[] => {
  if (!manualOrder || manualOrder.length === 0) return rows;

  const rowByKey = new Map<string, T>();
  for (const row of rows) {
    rowByKey.set(getKey(row), row);
  }

  const ordered: T[] = [];
  const seen = new Set<string>();
  for (const key of manualOrder) {
    const row = rowByKey.get(key);
    if (!row) continue;
    ordered.push(row);
    seen.add(key);
  }
  for (const row of rows) {
    const key = getKey(row);
    if (seen.has(key)) continue;
    ordered.push(row);
  }
  return ordered;
};
