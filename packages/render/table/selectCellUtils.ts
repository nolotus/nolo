// 文件: render/table/selectCellUtils.ts
//
// select 列单元格的纯函数工具：
// - resolveSelectOptions：下拉选项 = column.options 保序 ∪ 行值去重
//   （tableView.getColumnFilterOptions 的同款逻辑，筛选与单元格编辑共用）；
// - selectBadgeColorIndex：按值字符串 hash 确定性映射到 badge 色板索引，
//   同一值恒同色。

import type { TableColumn } from "./types";

/** badge 色板大小，与 table.css 的 .table-page__select-badge--N 数量一致。 */
export const SELECT_BADGE_PALETTE_SIZE = 8;

export const resolveSelectOptions = (
  column: Pick<TableColumn, "name" | "options"> | null,
  rows: Record<string, unknown>[]
): string[] => {
  if (!column) return [];

  const values = new Set<string>();
  const orderedValues: string[] = [];
  const rowOnlyValues = new Set<string>();

  if (Array.isArray(column.options)) {
    column.options.forEach((option) => {
      const value = String(option ?? "").trim();
      if (value && !values.has(value)) {
        values.add(value);
        orderedValues.push(value);
      }
    });
  }

  rows.forEach((row) => {
    const value = String(row[column.name] ?? "").trim();
    if (value && !values.has(value)) {
      values.add(value);
      rowOnlyValues.add(value);
    }
  });

  return [
    ...orderedValues,
    ...Array.from(rowOnlyValues).sort((a, b) => a.localeCompare(b, "zh-Hans-CN")),
  ];
};

/** FNV-1a 32bit hash → 色板索引：纯函数、无随机源，同一值恒同结果。 */
export const selectBadgeColorIndex = (value: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % SELECT_BADGE_PALETTE_SIZE;
};
