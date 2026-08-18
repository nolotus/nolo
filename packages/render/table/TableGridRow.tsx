// packages/render/table/TableGridRow.tsx
// Memoized grid body row for TablePage — isolates cell edit / drag props so
// sibling rows skip re-render when only one cell is being edited.

import React, { memo, useCallback } from "react";
import { BaseTableCell, BaseTableRow } from "render/web/elements/BaseTable";
import TableCellEdit from "render/web/ui/TableCellEdit";
import { Tooltip } from "render/web/ui/Tooltip";
import { LuGripVertical, LuMaximize2, LuPlus } from "react-icons/lu";
import { createCellPreview, MAX_CELL_PREVIEW_LENGTH } from "./cellPreview";
import type { LongTextCellInfo } from "./LongTextDialog";
import type { SelectCellEditorAnchor } from "./SelectCellEditor";
import { selectBadgeColorIndex } from "./selectCellUtils";
import type { TableColumnType } from "./types";

export type TableGridColumn = {
  id: string;
  name: string;
  label?: string;
  isPrimary?: boolean;
  /** select 列走 badge 展示 + 选项弹层，不进 textarea 编辑态 */
  type?: TableColumnType;
  options?: string[];
};

export type TableGridRowCellEdit = {
  columnName: string;
  value: string;
} | null;

export type TableGridRowProps = {
  row: Record<string, unknown> & { dbKey: string };
  rowIndex: number;
  columns: TableGridColumn[];
  primaryColumnName?: string;
  cellEdit: TableGridRowCellEdit;
  isDragging: boolean;
  dropPosition: "before" | "after" | null;
  spaceId?: string | null;
  ActivityBadge: React.ComponentType<{
    row: Record<string, unknown>;
    spaceId?: string | null;
  }>;
  onStartEdit: (dbKey: string, columnName: string, value: string) => void;
  onEditingValueChange: (value: string) => void;
  onFinishEdit: (save: boolean) => void;
  onKeyDown: (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onInsertRowBelow: (dbKey: string) => void;
  /** 行右键菜单：上报目标行 dbKey 与鼠标坐标，由 TablePage 统一渲染菜单 */
  onContextMenu: (dbKey: string, x: number, y: number) => void;
  onOpenSelectEditor: (
    dbKey: string,
    columnName: string,
    anchor: SelectCellEditorAnchor
  ) => void;
  onOpenLongText: (payload: LongTextCellInfo) => void;
  onDragStart: (dbKey: string, e: React.DragEvent<HTMLTableRowElement>) => void;
  onDragEnd: () => void;
  onDragOver: (dbKey: string, e: React.DragEvent<HTMLTableRowElement>) => void;
  onDragLeave: (dbKey: string) => void;
  onDrop: (dbKey: string) => void;
};

const TableGridRowComponent = React.forwardRef<
  HTMLTableRowElement,
  TableGridRowProps
>(function TableGridRowComponent(
  {
    row,
    rowIndex,
    columns,
    primaryColumnName,
    cellEdit,
    isDragging,
    dropPosition,
    spaceId,
    ActivityBadge,
    onStartEdit,
    onEditingValueChange,
    onFinishEdit,
    onKeyDown,
    onInsertRowBelow,
    onContextMenu,
    onOpenSelectEditor,
    onOpenLongText,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragLeave,
    onDrop,
  }: TableGridRowProps,
  ref
) {
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLTableRowElement>) => {
      onDragStart(row.dbKey, e);
    },
    [onDragStart, row.dbKey]
  );
  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLTableRowElement>) => {
      onDragOver(row.dbKey, e);
    },
    [onDragOver, row.dbKey]
  );
  const handleDragLeave = useCallback(() => {
    onDragLeave(row.dbKey);
  }, [onDragLeave, row.dbKey]);
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLTableRowElement>) => {
      e.preventDefault();
      onDrop(row.dbKey);
    },
    [onDrop, row.dbKey]
  );
  const handleInsertBelow = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onInsertRowBelow(row.dbKey);
    },
    [onInsertRowBelow, row.dbKey]
  );
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu(row.dbKey, e.clientX, e.clientY);
    },
    [onContextMenu, row.dbKey]
  );

  return (
    <BaseTableRow
      ref={ref}
      data-index={rowIndex}
      className={
        "table-page__row" +
        (isDragging ? " table-page__row--dragging" : "") +
        (dropPosition === "before" ? " table-page__row--drop-before" : "") +
        (dropPosition === "after" ? " table-page__row--drop-after" : "")
      }
      data-row-dbkey={row.dbKey}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={handleContextMenu}
    >
      <BaseTableCell
        key="__drag"
        className="table-page__drag-column"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 行操作集中在最左 gutter：行 hover 时「+」（下方插入）显现，
            与 grip 上下叠放；非 hover 只显示 grip（沿用原有透明度逻辑）。 */}
        <div className="table-page__drag-stack">
          <Tooltip content="在下方插入一行" placement="right">
            <button
              type="button"
              className="table-page__gutter-insert-btn"
              aria-label="在下方插入一行"
              onClick={handleInsertBelow}
            >
              <LuPlus size={14} aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip content="拖拽以重排行" placement="right">
            <button
              type="button"
              className="table-page__row-drag-handle"
              aria-label="拖拽以重排行"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <LuGripVertical size={14} aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
      </BaseTableCell>
      {columns.map((col) => {
        const isSelectColumn = col.type === "select";
        // select 列不进 textarea 编辑态，isEditing 对它恒为 false。
        const isEditing = !isSelectColumn && cellEdit?.columnName === col.name;
        const rawValue = row[col.name];
        const cellValue =
          rawValue === null || rawValue === undefined ? "" : String(rawValue);
        const isLongText =
          !isSelectColumn && cellValue.length > MAX_CELL_PREVIEW_LENGTH;
        const previewText = isLongText
          ? createCellPreview(cellValue)
          : cellValue;
        const isPrimary = !!col.isPrimary;
        const cellPadding = isPrimary
          ? "4px 12px"
          : "var(--space-3) var(--space-4)";

        return (
          <BaseTableCell
            key={col.id ?? col.name}
            className={
              isEditing
                ? `table-cell-editing${isPrimary ? " table-cell-editing--primary" : ""}`
                : undefined
            }
            onClick={(e) => {
              if (isEditing) return;
              if (isSelectColumn) {
                // select 列：点击打开选项弹层（fixed 锚定单元格），
                // 不进入 textarea 编辑态。
                const rect = e.currentTarget.getBoundingClientRect();
                onOpenSelectEditor(row.dbKey, col.name, {
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                });
                return;
              }
              onStartEdit(row.dbKey, col.name, cellValue);
            }}
            style={{
              cursor: isSelectColumn ? "pointer" : "text",
              padding: cellPadding,
            }}
            title={isLongText ? cellValue : undefined}
          >
            {isEditing && cellEdit ? (
              <TableCellEdit
                autoFocus
                value={cellEdit.value}
                onChange={(e) => onEditingValueChange(e.target.value)}
                onBlur={() => onFinishEdit(true)}
                onKeyDown={onKeyDown}
                rows={1}
              />
            ) : (
              <div className="table-page__primary-cell-wrapper">
                <div className="table-page__primary-content">
                  {isSelectColumn ? (
                    cellValue === "" ? (
                      <span style={{ color: "var(--textLight)" }}>-</span>
                    ) : (
                      // select 非空值：badge 展示，颜色按值 hash 确定性映射
                      <span
                        className={`table-page__select-badge table-page__select-badge--${selectBadgeColorIndex(cellValue)}`}
                        title={cellValue}
                      >
                        {previewText}
                      </span>
                    )
                  ) : cellValue === "" ? (
                    <span style={{ color: "var(--textLight)" }}>-</span>
                  ) : isLongText ? (
                    <div className="table-page__cell-long-wrapper">
                      <span className="table-page__cell-preview">
                        {previewText}
                      </span>
                      <button
                        type="button"
                        className="table-page__cell-view-btn"
                        title="查看全文"
                        aria-label="查看全文"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rowTitle =
                            primaryColumnName &&
                            primaryColumnName in row &&
                            row[primaryColumnName] !== undefined
                              ? String(row[primaryColumnName] ?? "")
                              : `行 ${rowIndex + 1}`;

                          onOpenLongText({
                            dbKey: row.dbKey,
                            columnName: col.name,
                            columnLabel: col.label || col.name,
                            rowTitle,
                            value: cellValue,
                          });
                        }}
                      >
                        <LuMaximize2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <span className="table-page__cell-preview">
                      {previewText}
                    </span>
                  )}
                  {isPrimary && <ActivityBadge row={row} spaceId={spaceId} />}
                </div>
              </div>
            )}
          </BaseTableCell>
        );
      })}
    </BaseTableRow>
  );
});

function areTableGridRowPropsEqual(
  prev: TableGridRowProps,
  next: TableGridRowProps
): boolean {
  if (prev.row !== next.row) return false;
  if (prev.rowIndex !== next.rowIndex) return false;
  if (prev.columns !== next.columns) return false;
  if (prev.primaryColumnName !== next.primaryColumnName) return false;
  if (prev.isDragging !== next.isDragging) return false;
  if (prev.dropPosition !== next.dropPosition) return false;
  if (prev.spaceId !== next.spaceId) return false;
  if (prev.ActivityBadge !== next.ActivityBadge) return false;

  const prevEdit = prev.cellEdit;
  const nextEdit = next.cellEdit;
  if (prevEdit === null && nextEdit === null) {
    // not editing this row — ignore value/callback identity churn for siblings
  } else if (prevEdit === null || nextEdit === null) {
    return false;
  } else if (
    prevEdit.columnName !== nextEdit.columnName ||
    prevEdit.value !== nextEdit.value
  ) {
    return false;
  }

  // Stable callbacks expected from parent; still compare refs for safety.
  if (prev.onStartEdit !== next.onStartEdit) return false;
  if (prev.onEditingValueChange !== next.onEditingValueChange) return false;
  if (prev.onFinishEdit !== next.onFinishEdit) return false;
  if (prev.onKeyDown !== next.onKeyDown) return false;
  if (prev.onInsertRowBelow !== next.onInsertRowBelow) return false;
  if (prev.onContextMenu !== next.onContextMenu) return false;
  if (prev.onOpenSelectEditor !== next.onOpenSelectEditor) return false;
  if (prev.onOpenLongText !== next.onOpenLongText) return false;
  if (prev.onDragStart !== next.onDragStart) return false;
  if (prev.onDragEnd !== next.onDragEnd) return false;
  if (prev.onDragOver !== next.onDragOver) return false;
  if (prev.onDragLeave !== next.onDragLeave) return false;
  if (prev.onDrop !== next.onDrop) return false;

  return true;
}

export const TableGridRow = memo(
  TableGridRowComponent,
  areTableGridRowPropsEqual
);

export default TableGridRow;
