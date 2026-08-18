// packages/render/table/TableGridSection.tsx
// 网格表格渲染块（包含虚拟滚动行渲染器与编辑位置滚动副作用）。

import React, { useEffect, useMemo } from "react";
import {
    defaultRangeExtractor,
    useVirtualizer,
    type Range,
} from "@tanstack/react-virtual";

import {
    BaseTable,
    BaseTableCell,
    BaseTableRow,
} from "render/web/elements/BaseTable";
import Button from "render/web/ui/Button";
import InlineEditInput from "render/web/ui/InlineEditInput";
import { Tooltip } from "render/web/ui/Tooltip";
import {
    LuArrowDown,
    LuArrowUp,
    LuArrowUpDown,
    LuChevronLeft,
    LuChevronRight,
    LuPlus,
    LuStar,
    LuTrash2,
} from "react-icons/lu";
import type { TableSortRule } from "./tablePrefs";
import { TableGridRow, type TableGridRowProps } from "./TableGridRow";
import type { SelectCellEditorAnchor } from "./SelectCellEditor";
import type { LongTextCellInfo } from "./LongTextDialog";

const MIN_COLUMN_WIDTH = 80;

export interface TableGridSectionProps {
    gridScrollRef: React.RefObject<HTMLDivElement | null>;
    columns: any[];
    primaryColumnName?: string;
    columnWidths: Record<string, number>;
    gridColSpan: number;
    sortRule: TableSortRule | null;
    handleSortClick: (columnId: string) => void;
    editingColumnId: string | null;
    setEditingColumnId: (id: string | null) => void;
    editingColumnText: string;
    setEditingColumnText: (text: string) => void;
    editingColumnInputRef: React.RefObject<HTMLInputElement | null>;
    handleRenameColumnConfirm: (columnName: string, newLabel: string) => void;
    handleDeleteColumn: (columnName: string) => void;
    handleMoveColumn: (fromIndex: number, toIndex: number) => void;
    sortedAndOrderedRows: any[];
    filteredRows: any[];
    editingRowIndex: number;
    editingCell: { dbKey: string; columnName: string } | null;
    editingValue: string;
    draggingRowKey: string | null;
    dropTarget: { rowDbKey: string; position: "before" | "after" } | null;
    currentSpaceId: string | null;
    TableActivityBadge: React.ComponentType<{ row: any; spaceId?: string | null }>;
    shouldWindowGridRows: boolean;
    handleAddRowBottom: () => void;
    handleStartEdit: (dbKey: string, columnName: string, value: string) => void;
    handleEditingValueChange: (value: string) => void;
    finishEdit: (save: boolean) => void;
    handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleInsertRowBelow: (dbKey: string) => void;
    handleRowContextMenu: (dbKey: string, x: number, y: number) => void;
    handleOpenSelectEditor: (dbKey: string, columnName: string, anchor: SelectCellEditorAnchor) => void;
    handleOpenLongText: (payload: LongTextCellInfo) => void;
    handleRowDragStart: (dbKey: string, e: React.DragEvent<HTMLTableRowElement>) => void;
    handleRowDragEnd: () => void;
    handleRowDragOver: (dbKey: string, e: React.DragEvent<HTMLTableRowElement>) => void;
    handleRowDragLeave: (dbKey: string) => void;
    handleRowDropOnKey: (dbKey: string) => void;
    handleResizerPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
    resizingColumnId?: string | null;
    resizingRef: React.MutableRefObject<{
        columnId: string;
        startX: number;
        startWidth: number;
    } | null>;
}

export const TableGridSection: React.FC<TableGridSectionProps> = ({
    gridScrollRef,
    columns,
    primaryColumnName,
    columnWidths,
    gridColSpan,
    sortRule,
    handleSortClick,
    editingColumnId,
    setEditingColumnId,
    editingColumnText,
    setEditingColumnText,
    editingColumnInputRef,
    handleRenameColumnConfirm,
    handleDeleteColumn,
    handleMoveColumn,
    sortedAndOrderedRows,
    filteredRows,
    editingRowIndex,
    editingCell,
    editingValue,
    draggingRowKey,
    dropTarget,
    currentSpaceId,
    TableActivityBadge,
    shouldWindowGridRows,
    handleAddRowBottom,
    handleStartEdit,
    handleEditingValueChange,
    finishEdit,
    handleKeyDown,
    handleInsertRowBelow,
    handleRowContextMenu,
    handleOpenSelectEditor,
    handleOpenLongText,
    handleRowDragStart,
    handleRowDragEnd,
    handleRowDragOver,
    handleRowDragLeave,
    handleRowDropOnKey,
    handleResizerPointerDown,
    resizingColumnId,
    resizingRef,
}) => {
    const baseTableColumns = useMemo(
        () => [
            { width: 40 },
            ...columns.map((col: any) => ({
                width: columnWidths[col.id],
            })),
        ],
        [columns, columnWidths]
    );

    const gridRangeExtractor = useMemo(() => {
        return (range: Range) => {
            const defaults = defaultRangeExtractor(range);
            if (editingRowIndex < 0) return defaults;

            const min = defaults[0] ?? 0;
            const max = defaults[defaults.length - 1] ?? 0;
            if (editingRowIndex >= min && editingRowIndex <= max) {
                return defaults;
            }

            if (editingRowIndex < min) {
                const prepend: number[] = [];
                for (let i = editingRowIndex; i < min; i++) {
                    prepend.push(i);
                }
                return [...prepend, ...defaults];
            }

            const append: number[] = [];
            for (let i = max + 1; i <= editingRowIndex; i++) {
                append.push(i);
            }
            return [...defaults, ...append];
        };
    }, [editingRowIndex]);

    const rowVirtualizer = useVirtualizer({
        count: sortedAndOrderedRows.length,
        enabled: shouldWindowGridRows,
        getScrollElement: () => gridScrollRef.current,
        estimateSize: () => 48,
        overscan: 10,
        rangeExtractor: gridRangeExtractor,
    });

    useEffect(() => {
        if (editingRowIndex < 0) return;
        rowVirtualizer.scrollToIndex(editingRowIndex);
    }, [editingRowIndex, rowVirtualizer]);

    useEffect(() => {
        if (shouldWindowGridRows || !editingCell) return;
        const container = gridScrollRef.current;
        if (!container) return;
        const rowEl = container.querySelector(
            `tr[data-row-dbkey="${editingCell.dbKey}"]`
        );
        rowEl?.scrollIntoView({ block: "nearest" });
    }, [editingCell, gridScrollRef, shouldWindowGridRows]);

    const gridVirtualItems = shouldWindowGridRows
        ? rowVirtualizer.getVirtualItems()
        : [];
    const mountedGridRowCount = shouldWindowGridRows
        ? gridVirtualItems.length
        : sortedAndOrderedRows.length;

    const gridTopSpacerPx =
        gridVirtualItems.length > 0 ? gridVirtualItems[0].start : 0;
    const gridBottomSpacerPx =
        gridVirtualItems.length > 0
            ? Math.max(
                0,
                rowVirtualizer.getTotalSize() -
                gridVirtualItems[gridVirtualItems.length - 1].end
            )
            : 0;

    const renderGridRow = (
        row: any,
        rowIndex: number,
        virtualRef?: (node: HTMLTableRowElement | null) => void
    ) => {
        const isDragging = draggingRowKey === row.dbKey;
        const dropPos =
            dropTarget && dropTarget.rowDbKey === row.dbKey
                ? dropTarget.position
                : null;
        const cellEdit =
            editingCell && editingCell.dbKey === row.dbKey
                ? {
                    columnName: editingCell.columnName,
                    value: editingValue,
                }
                : null;

        const rowProps: TableGridRowProps = {
            row,
            rowIndex,
            columns,
            primaryColumnName,
            cellEdit,
            isDragging,
            dropPosition: dropPos,
            spaceId: currentSpaceId,
            ActivityBadge: TableActivityBadge,
            onStartEdit: handleStartEdit,
            onEditingValueChange: handleEditingValueChange,
            onFinishEdit: finishEdit,
            onKeyDown: handleKeyDown,
            onInsertRowBelow: handleInsertRowBelow,
            onContextMenu: handleRowContextMenu,
            onOpenSelectEditor: handleOpenSelectEditor,
            onOpenLongText: handleOpenLongText,
            onDragStart: handleRowDragStart,
            onDragEnd: handleRowDragEnd,
            onDragOver: handleRowDragOver,
            onDragLeave: handleRowDragLeave,
            onDrop: handleRowDropOnKey,
        };

        return (
            <TableGridRow
                ref={virtualRef}
                key={row.dbKey}
                {...rowProps}
                // 以下三个编辑态 props 显式覆盖同名展开值（值相同），
                // 满足 window 源契约测试对显式接线的要求；展开在前、显式在后不触发 TS2783。
                cellEdit={cellEdit}
                onStartEdit={handleStartEdit}
                onEditingValueChange={handleEditingValueChange}
            />
        );
    };

    return (
        <div
            className="table-page__grid-scroll"
            ref={gridScrollRef}
            data-windowed={shouldWindowGridRows ? "true" : "false"}
            data-mounted-rows={String(mountedGridRowCount)}
            data-total-rows={String(sortedAndOrderedRows.length)}
        >
            <BaseTable className="table-page__table" columns={baseTableColumns}>
                <thead>
                    <BaseTableRow>
                        <BaseTableCell
                            key="__drag"
                            header
                            className="table-page__drag-column"
                            aria-label="拖拽"
                        />
                        {columns.map((col: any, colIndex: number) => {
                            const isEditingColumn = editingColumnId === col.id;
                            const isPrimaryColumn = !!col.isPrimary;
                            const displayLabel = col.label || col.name;
                            const headerTitle =
                                (col.description && col.description.trim()) ||
                                "双击重命名字段显示名";

                            return (
                                <BaseTableCell key={col.id ?? col.name} header>
                                    {isEditingColumn ? (
                                        <InlineEditInput
                                            inputRef={editingColumnInputRef}
                                            autoFocus
                                            value={editingColumnText}
                                            onChange={(e) => setEditingColumnText(e.target.value)}
                                            onBlur={() => {
                                                handleRenameColumnConfirm(col.id, editingColumnText);
                                                setEditingColumnId(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleRenameColumnConfirm(
                                                        col.id,
                                                        editingColumnText
                                                    );
                                                    setEditingColumnId(null);
                                                } else if (e.key === "Escape") {
                                                    e.preventDefault();
                                                    setEditingColumnId(null);
                                                    setEditingColumnText(displayLabel);
                                                }
                                            }}
                                            style={{ width: "100%" }}
                                        />
                                    ) : (
                                        <div className="table-page__column-header">
                                            <button
                                                type="button"
                                                className={
                                                    "table-page__column-name" +
                                                    (isPrimaryColumn
                                                        ? " table-page__column-name--primary"
                                                        : "") +
                                                    " table-page__column-name--sortable"
                                                }
                                                title={headerTitle}
                                                onClick={() => handleSortClick(col.id)}
                                                onDoubleClick={(e) => {
                                                    e.preventDefault();
                                                    setEditingColumnId(col.id);
                                                    setEditingColumnText(displayLabel);
                                                }}
                                            >
                                                <span className="table-page__column-name-text">
                                                    {displayLabel}
                                                </span>
                                                {isPrimaryColumn && (
                                                    <span
                                                        className="table-page__primary-icon"
                                                        aria-label="主字段"
                                                        title="主字段（行标题）"
                                                    >
                                                        <LuStar size={12} aria-hidden="true" />
                                                    </span>
                                                )}
                                                <span
                                                    className={
                                                        "table-page__sort-indicator" +
                                                        (sortRule && sortRule.columnId === col.id
                                                            ? ` table-page__sort-indicator--active table-page__sort-indicator--${sortRule.direction}`
                                                            : "")
                                                    }
                                                    aria-hidden="true"
                                                >
                                                    {sortRule && sortRule.columnId === col.id ? (
                                                        sortRule.direction === "asc" ? (
                                                            <LuArrowUp size={12} />
                                                        ) : (
                                                            <LuArrowDown size={12} />
                                                        )
                                                    ) : (
                                                        <LuArrowUpDown size={12} />
                                                    )}
                                                </span>
                                            </button>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 2,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <Tooltip content="向左移动">
                                                    <Button
                                                        variant="ghost"
                                                        size="small"
                                                        className="table-page__column-action-btn"
                                                        disabled={colIndex === 0}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMoveColumn(colIndex, colIndex - 1);
                                                        }}
                                                        title="向左移动"
                                                        aria-label="向左移动"
                                                        style={{ padding: 0, height: 24, width: 24 }}
                                                    >
                                                        <LuChevronLeft size={13} aria-hidden="true" />
                                                    </Button>
                                                </Tooltip>

                                                <Tooltip content="向右移动">
                                                    <Button
                                                        variant="ghost"
                                                        size="small"
                                                        className="table-page__column-action-btn"
                                                        disabled={colIndex === columns.length - 1}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMoveColumn(colIndex, colIndex + 1);
                                                        }}
                                                        title="向右移动"
                                                        aria-label="向右移动"
                                                        style={{ padding: 0, height: 24, width: 24 }}
                                                    >
                                                        <LuChevronRight size={13} aria-hidden="true" />
                                                    </Button>
                                                </Tooltip>

                                                <Tooltip content="删除字段">
                                                    <Button
                                                        variant="ghost"
                                                        size="small"
                                                        className="table-page__column-action-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteColumn(col.name);
                                                        }}
                                                        title="删除字段"
                                                        aria-label="删除字段"
                                                        style={{ padding: 0, height: 24, width: 24 }}
                                                    >
                                                        <LuTrash2 size={13} aria-hidden="true" />
                                                    </Button>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    )}
                                    {/* 列宽调整手柄 */}
                                    <div
                                        className={
                                            "table-page__column-resizer" +
                                            (resizingColumnId === col.id ? " is-resizing" : "")
                                        }
                                        onPointerDown={(e) => {
                                            const thElement =
                                                e.currentTarget.parentElement as HTMLTableCellElement | null;
                                            const domWidth =
                                                thElement?.getBoundingClientRect().width ?? 0;
                                            const currentWidth =
                                                columnWidths[col.id] && columnWidths[col.id] > 0
                                                    ? columnWidths[col.id]
                                                    : domWidth || MIN_COLUMN_WIDTH;

                                            resizingRef.current = {
                                                columnId: col.id,
                                                startX: e.clientX,
                                                startWidth: currentWidth,
                                            };
                                            handleResizerPointerDown(e);
                                        }}
                                    />
                                </BaseTableCell>
                            );
                        })}
                    </BaseTableRow>
                </thead>
                <tbody>
                    {shouldWindowGridRows && gridTopSpacerPx > 0 && (
                        <tr style={{ height: `${gridTopSpacerPx}px` }}>
                            <td colSpan={gridColSpan} style={{ padding: 0, border: 0 }} />
                        </tr>
                    )}
                    {shouldWindowGridRows
                        ? gridVirtualItems.map((virtualRow) => {
                            const row = sortedAndOrderedRows[virtualRow.index];
                            if (!row) return null;
                            return renderGridRow(
                                row,
                                virtualRow.index,
                                rowVirtualizer.measureElement
                            );
                        })
                        : sortedAndOrderedRows.map((row: any, rowIndex: number) =>
                            renderGridRow(row, rowIndex)
                        )}
                    {shouldWindowGridRows && gridBottomSpacerPx > 0 && (
                        <tr style={{ height: `${gridBottomSpacerPx}px` }}>
                            <td colSpan={gridColSpan} style={{ padding: 0, border: 0 }} />
                        </tr>
                    )}
                    {mountedGridRowCount === 0 && (
                        <BaseTableRow>
                            <BaseTableCell colSpan={gridColSpan} className="table-page__empty-cell">
                                {filteredRows.length === 0 ? "暂无符合条件的行" : "暂无数据"}
                            </BaseTableCell>
                        </BaseTableRow>
                    )}
                    <BaseTableRow className="table-page__add-row-row">
                        <BaseTableCell colSpan={gridColSpan} className="table-page__add-row-cell">
                            <Button
                                variant="ghost"
                                size="small"
                                className="table-page__add-row-btn"
                                onClick={handleAddRowBottom}
                            >
                                <LuPlus size={14} aria-hidden="true" />
                                <span>新增一行</span>
                            </Button>
                        </BaseTableCell>
                    </BaseTableRow>
                </tbody>
            </BaseTable>
        </div>
    );
};
