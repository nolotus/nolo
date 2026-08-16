// 文件: render/table/cellPreview.ts
//
// 单元格内容预览的共享截断逻辑（grid 行内预览与看板卡片预览共用）：
// compactWhitespace 压缩空白后按 maxLength 截断并追加省略号。

import { compactWhitespace } from "core/compactWhitespace";

export const MAX_CELL_PREVIEW_LENGTH = 180;

export const createCellPreview = (
  value: string,
  maxLength: number = MAX_CELL_PREVIEW_LENGTH
): string => {
  const normalized = compactWhitespace(value);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}…`;
};
