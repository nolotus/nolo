// packages/render/table/KanbanBoard.tsx
// 看板视图渲染组件。

import React from "react";
import Button from "render/web/ui/Button";
import ReadOnlyMarkdownContent from "render/web/ui/ReadOnlyMarkdownContent";
import { LuGripVertical, LuPlus, LuTrash2 } from "react-icons/lu";
import {
    formatKanbanRelativeAge,
    getKanbanFieldIcon,
    getKanbanStatusHeaderInfo,
} from "./kanbanHelpers";
import { selectBadgeColorIndex } from "./selectCellUtils";
import { shouldRenderKanbanMarkdownTable } from "./tableView";
import type { LongTextCellInfo } from "./LongTextDialog";

export interface KanbanBoardProps {
    tableId?: string;
    kanbanGroups: Array<{ groupValue: string; rows: any[] }>;
    kanbanDetailColumns: any[];
    kanbanDropTargetGroup: string | null;
    draggingRowKey: string | null;
    dropTarget: { rowDbKey: string; position: "before" | "after" } | null;
    handleKanbanColumnDragOver: (groupValue: string, e: React.DragEvent<HTMLElement>) => void;
    handleKanbanColumnDragLeave: (groupValue: string, e: React.DragEvent<HTMLElement>) => void;
    handleKanbanColumnDrop: (groupValue: string, e: React.DragEvent<HTMLElement>) => void;
    handleKanbanCardDragStart: (dbKey: string, e: React.DragEvent<HTMLElement>) => void;
    handleKanbanCardDragEnd: () => void;
    handleKanbanCardDragOver: (dbKey: string, e: React.DragEvent<HTMLElement>) => void;
    handleKanbanCardDragLeave: (dbKey: string, e: React.DragEvent<HTMLElement>) => void;
    handleKanbanCardDrop: (dbKey: string, groupValue: string, e: React.DragEvent<HTMLElement>) => void;
    handleDeleteRow: (dbKey: string) => void;
    handleStartEdit: (dbKey: string, columnName: string, value: string) => void;
    handleOpenLongText: (payload: LongTextCellInfo) => void;
    currentSpaceId: string | null;
    TableActivityBadge: React.ComponentType<{ row: any; spaceId?: string | null }>;
    primaryColumn: any;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
    tableId,
    kanbanGroups,
    kanbanDetailColumns,
    kanbanDropTargetGroup,
    draggingRowKey,
    dropTarget,
    handleKanbanColumnDragOver,
    handleKanbanColumnDragLeave,
    handleKanbanColumnDrop,
    handleKanbanCardDragStart,
    handleKanbanCardDragEnd,
    handleKanbanCardDragOver,
    handleKanbanCardDragLeave,
    handleKanbanCardDrop,
    handleDeleteRow,
    handleStartEdit,
    handleOpenLongText,
    currentSpaceId,
    TableActivityBadge,
    primaryColumn,
}) => {
    return (
        <div className="table-page__kanban-board">
            {kanbanGroups.map((group) => {
                const isGroupDropTarget = kanbanDropTargetGroup === group.groupValue;
                const headerInfo = getKanbanStatusHeaderInfo(group.groupValue);
                return (
                    <div
                        className={
                            "table-page__kanban-column" +
                            (isGroupDropTarget ? " table-page__kanban-column--drop-target" : "")
                        }
                        key={group.groupValue}
                        onDragOver={(e) => handleKanbanColumnDragOver(group.groupValue, e)}
                        onDragLeave={(e) => handleKanbanColumnDragLeave(group.groupValue, e)}
                        onDrop={(e) => handleKanbanColumnDrop(group.groupValue, e)}
                    >
                        <div className="table-page__kanban-column-header">
                            <div className="table-page__kanban-column-title">
                                <span
                                    className="table-page__kanban-status-badge"
                                    style={{
                                        color: headerInfo.color,
                                    }}
                                >
                                    {headerInfo.icon}
                                    <span>{group.groupValue}</span>
                                </span>
                                <span className="table-page__kanban-count-pill">{group.rows.length}</span>
                            </div>
                        </div>

                        <div className="table-page__kanban-cards">
                            {group.rows.map((row: any) => {
                                const isCardDragging = draggingRowKey === row.dbKey;
                                const isDropTarget = dropTarget && dropTarget.rowDbKey === row.dbKey;
                                const dropPos = isDropTarget ? dropTarget.position : null;
                                const titleVal = String(
                                    primaryColumn ? row[primaryColumn.name] ?? "" : row.dbKey
                                );

                                return (
                                    <div
                                        className={
                                            "table-page__kanban-card" +
                                            (isCardDragging ? " table-page__kanban-card--dragging" : "") +
                                            (dropPos === "before" ? " table-page__kanban-card--drop-before" : "") +
                                            (dropPos === "after" ? " table-page__kanban-card--drop-after" : "")
                                        }
                                        key={row.dbKey}
                                        draggable
                                        onDragStart={(e) => handleKanbanCardDragStart(row.dbKey, e)}
                                        onDragEnd={handleKanbanCardDragEnd}
                                        onDragOver={(e) => handleKanbanCardDragOver(row.dbKey, e)}
                                        onDragLeave={(e) => handleKanbanCardDragLeave(row.dbKey, e)}
                                        onDrop={(e) => handleKanbanCardDrop(row.dbKey, group.groupValue, e)}
                                    >
                                        <div className="table-page__kanban-card-top">
                                            <div className="table-page__kanban-card-title-row">
                                                <span className="table-page__kanban-drag-handle">
                                                    <LuGripVertical size={14} aria-hidden="true" />
                                                </span>
                                                <button
                                                    type="button"
                                                    className="table-page__kanban-card-title"
                                                    onClick={() =>
                                                        primaryColumn &&
                                                        handleStartEdit(row.dbKey, primaryColumn.name, titleVal)
                                                    }
                                                >
                                                    {titleVal.trim() || "未命名记录"}
                                                </button>
                                                <Button
                                                    variant="ghost"
                                                    size="small"
                                                    className="table-page__kanban-delete-btn"
                                                    onClick={() => handleDeleteRow(row.dbKey)}
                                                    title="删除卡片"
                                                    aria-label="删除卡片"
                                                >
                                                    <LuTrash2 size={13} aria-hidden="true" />
                                                </Button>
                                            </div>
                                        </div>

                                        {kanbanDetailColumns.length > 0 && (
                                            <div className="table-page__kanban-card-fields">
                                                {kanbanDetailColumns.map((column: any) => {
                                                    const rawVal = row[column.name];
                                                    const valStr =
                                                        rawVal === null || rawVal === undefined
                                                            ? ""
                                                            : String(rawVal);
                                                    if (!valStr.trim()) return null;

                                                    const fieldIcon = getKanbanFieldIcon(column.name || column.label);
                                                    const canRenderMarkdownTable = shouldRenderKanbanMarkdownTable(
                                                        tableId,
                                                        valStr
                                                    );

                                                    return (
                                                        <div className="table-page__kanban-field-item" key={column.id ?? column.name}>
                                                            <span className="table-page__kanban-field-icon" title={column.label || column.name}>
                                                                {fieldIcon}
                                                            </span>
                                                            <div className="table-page__kanban-field-content">
                                                                {column.type === "select" ? (
                                                                    <span
                                                                        className="table-select-badge"
                                                                        data-color-index={selectBadgeColorIndex(valStr)}
                                                                    >
                                                                        {valStr}
                                                                    </span>
                                                                ) : canRenderMarkdownTable ? (
                                                                    <div
                                                                        className="table-page__kanban-markdown"
                                                                        onClick={() =>
                                                                            handleOpenLongText({
                                                                                dbKey: row.dbKey,
                                                                                columnName: column.name,
                                                                                columnLabel: column.label || column.name,
                                                                                value: valStr,
                                                                            })
                                                                        }
                                                                    >
                                                                        <ReadOnlyMarkdownContent markdown={valStr} />
                                                                    </div>
                                                                ) : (
                                                                    <span
                                                                        className="table-page__kanban-field-value"
                                                                        onClick={() =>
                                                                            handleStartEdit(row.dbKey, column.name, valStr)
                                                                        }
                                                                    >
                                                                        {valStr}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <div className="table-page__kanban-card-footer">
                                            <span className="table-page__kanban-age">
                                                {formatKanbanRelativeAge(
                                                    row.updatedAt ?? row.createdAt
                                                )}
                                            </span>
                                            <TableActivityBadge row={row} spaceId={currentSpaceId} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
