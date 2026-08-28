// packages/render/table/useKanbanBoard.ts
// 看板视图计算与拖拽 Hook。

import { useCallback, useMemo, useState } from "react";
import { updateCell } from "./tableSlice";
import {
    EMPTY_TABLE_COLUMNS,
    GRID_DISPLAY_MODE,
    normalizeKanbanStatusValue,
    type TableDisplayMode,
} from "./tableView";
import type { TableColumn } from "./types";

export type TableViewChoice = "grid" | "kanban";

export interface UseKanbanBoardOptions {
    tableDisplayMode: TableDisplayMode;
    statusFilterColumn: TableColumn | null;
    statusFilterOptions: string[];
    columns: TableColumn[];
    selectedViewChoice: TableViewChoice | "";
    filteredRows: any[];
    rows: any[];
    draggingRowKey: string | null;
    setDraggingRowKey: React.Dispatch<React.SetStateAction<string | null>>;
    dropTarget: { rowDbKey: string; position: "before" | "after" } | null;
    setDropTarget: React.Dispatch<React.SetStateAction<{ rowDbKey: string; position: "before" | "after" } | null>>;
    handleRowDrop: (draggingRowKey: string, targetRowDbKey: string, position: "before" | "after") => void;
    dispatch: any;
}

export function useKanbanBoard({
    tableDisplayMode,
    statusFilterColumn,
    statusFilterOptions,
    columns,
    selectedViewChoice,
    filteredRows,
    rows,
    draggingRowKey,
    setDraggingRowKey,
    dropTarget,
    setDropTarget,
    handleRowDrop,
    dispatch,
}: UseKanbanBoardOptions) {
    const [kanbanDropTargetGroup, setKanbanDropTargetGroup] = useState<string | null>(null);

    const kanbanDisplayMode = useMemo<TableDisplayMode>(() => {
        if (tableDisplayMode.type === "kanban") return tableDisplayMode;
        if (!statusFilterColumn) return GRID_DISPLAY_MODE;
        return {
            type: "kanban",
            viewName: "看板",
            groupColumnName: statusFilterColumn.name,
            visibleColumnNames: columns.map((column: any) => column.name),
            preferredGroupValues: statusFilterOptions,
        };
    }, [columns, statusFilterColumn, statusFilterOptions, tableDisplayMode]);

    const canUseKanbanView = kanbanDisplayMode.type === "kanban";

    const activeViewChoice: TableViewChoice =
        selectedViewChoice === "grid"
            ? "grid"
            : selectedViewChoice === "kanban" && canUseKanbanView
                ? "kanban"
                : tableDisplayMode.type === "kanban" && canUseKanbanView
                    ? "kanban"
                    : "grid";

    const activeDisplayMode = useMemo<TableDisplayMode>(
        () =>
            activeViewChoice === "kanban" && kanbanDisplayMode.type === "kanban"
                ? kanbanDisplayMode
                : GRID_DISPLAY_MODE,
        [activeViewChoice, kanbanDisplayMode]
    );

    const kanbanDetailColumns = useMemo(() => {
        if (activeDisplayMode.type !== "kanban") return EMPTY_TABLE_COLUMNS;
        const groupColumnName = activeDisplayMode.groupColumnName;
        return columns.filter(
            (column: any) =>
                column.name !== groupColumnName &&
                !column.isPrimary &&
                activeDisplayMode.visibleColumnNames.includes(column.name)
        );
    }, [activeDisplayMode, columns]);

    const kanbanGroups = useMemo(() => {
        if (activeDisplayMode.type !== "kanban") return [];

        const groupMap = new Map<string, any[]>();
        filteredRows.forEach((row: any) => {
            const rawValue = String(row[activeDisplayMode.groupColumnName] ?? "");
            const normalizedValue = normalizeKanbanStatusValue(rawValue);
            const list = groupMap.get(normalizedValue) ?? [];
            list.push(row);
            groupMap.set(normalizedValue, list);
        });

        const definedOptions = activeDisplayMode.preferredGroupValues.filter(
            (value) => value.trim().length > 0
        );

        const result = definedOptions.map((option) => ({
            groupValue: option,
            rows: groupMap.get(option) ?? [],
        }));

        if (groupMap.has("未分类")) {
            result.push({
                groupValue: "未分类",
                rows: groupMap.get("未分类") ?? [],
            });
        }

        return result;
    }, [activeDisplayMode, filteredRows]);

    const handleKanbanCardDragStart = useCallback(
        (dbKey: string, e: React.DragEvent<HTMLElement>) => {
            setDraggingRowKey(dbKey);
            try {
                e.dataTransfer.setData("text/plain", dbKey);
                e.dataTransfer.setData("application/x-nolo-card", dbKey);
            } catch {}
            e.dataTransfer.effectAllowed = "move";
        },
        [setDraggingRowKey]
    );

    const handleKanbanCardDragEnd = useCallback(() => {
        setDraggingRowKey(null);
        setDropTarget(null);
        setKanbanDropTargetGroup(null);
    }, [setDraggingRowKey, setDropTarget]);

    const handleKanbanColumnDragOver = useCallback(
        (groupValue: string, e: React.DragEvent<HTMLElement>) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setKanbanDropTargetGroup(groupValue);
        },
        []
    );

    const handleKanbanColumnDragLeave = useCallback(
        (groupValue: string, e: React.DragEvent<HTMLElement>) => {
            const currentTarget = e.currentTarget;
            const relatedTarget = e.relatedTarget as Node | null;
            if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) {
                return;
            }
            setKanbanDropTargetGroup((prev) => (prev === groupValue ? null : prev));
        },
        []
    );

    const handleKanbanColumnDrop = useCallback(
        (targetGroupValue: string, e: React.DragEvent<HTMLElement>) => {
            e.preventDefault();
            e.stopPropagation();
            setKanbanDropTargetGroup(null);

            const draggedDbKey = draggingRowKey || e.dataTransfer.getData("text/plain");

            if (!draggedDbKey || activeDisplayMode.type !== "kanban") {
                setDraggingRowKey(null);
                setDropTarget(null);
                return;
            }

            const groupColumnName = activeDisplayMode.groupColumnName;
            const row = rows.find((r: any) => r.dbKey === draggedDbKey);
            if (row) {
                const targetValue = targetGroupValue === "未分类" ? "" : targetGroupValue;
                const currentValue = String(row[groupColumnName] ?? "");
                if (currentValue !== targetValue) {
                    void dispatch(updateCell({ dbKey: draggedDbKey, columnName: groupColumnName, value: targetValue }));
                }
            }

            setDraggingRowKey(null);
            setDropTarget(null);
        },
        [activeDisplayMode, dispatch, draggingRowKey, rows, setDraggingRowKey, setDropTarget]
    );

    const handleKanbanCardDragOver = useCallback(
        (dbKey: string, e: React.DragEvent<HTMLElement>) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";

            if (draggingRowKey === dbKey) {
                return;
            }

            const rect = e.currentTarget.getBoundingClientRect();
            const position: "before" | "after" =
                e.clientY < rect.top + rect.height / 2 ? "before" : "after";

            setDropTarget((prev) => {
                if (prev && prev.rowDbKey === dbKey && prev.position === position) {
                    return prev;
                }
                return { rowDbKey: dbKey, position };
            });
        },
        [draggingRowKey, setDropTarget]
    );

    const handleKanbanCardDragLeave = useCallback(
        (dbKey: string, e: React.DragEvent<HTMLElement>) => {
            const currentTarget = e.currentTarget;
            const relatedTarget = e.relatedTarget as Node | null;
            if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) {
                return;
            }
            setDropTarget((prev) => (prev?.rowDbKey === dbKey ? null : prev));
        },
        [setDropTarget]
    );

    const handleKanbanCardDrop = useCallback(
        (targetRowDbKey: string, targetGroupValue: string, e: React.DragEvent<HTMLElement>) => {
            e.preventDefault();
            e.stopPropagation();

            const position: "before" | "after" =
                dropTarget && dropTarget.rowDbKey === targetRowDbKey
                    ? dropTarget.position
                    : "after";

            const draggedDbKey = draggingRowKey || e.dataTransfer.getData("text/plain");

            if (!draggedDbKey) {
                setDraggingRowKey(null);
                setDropTarget(null);
                setKanbanDropTargetGroup(null);
                return;
            }

            if (activeDisplayMode.type === "kanban") {
                const groupColumnName = activeDisplayMode.groupColumnName;
                const row = rows.find((r: any) => r.dbKey === draggedDbKey);
                if (row) {
                    const targetValue = targetGroupValue === "未分类" ? "" : targetGroupValue;
                    const currentValue = String(row[groupColumnName] ?? "");
                    if (currentValue !== targetValue) {
                        void dispatch(updateCell({ dbKey: draggedDbKey, columnName: groupColumnName, value: targetValue }));
                    }
                }
            }

            handleRowDrop(draggedDbKey, targetRowDbKey, position);
            setDraggingRowKey(null);
            setDropTarget(null);
            setKanbanDropTargetGroup(null);
        },
        [activeDisplayMode, dispatch, draggingRowKey, dropTarget, handleRowDrop, rows, setDraggingRowKey, setDropTarget]
    );

    return {
        kanbanDisplayMode,
        canUseKanbanView,
        activeViewChoice,
        activeDisplayMode,
        kanbanDetailColumns,
        kanbanGroups,
        kanbanDropTargetGroup,
        setKanbanDropTargetGroup,
        handleKanbanCardDragStart,
        handleKanbanCardDragEnd,
        handleKanbanColumnDragOver,
        handleKanbanColumnDragLeave,
        handleKanbanColumnDrop,
        handleKanbanCardDragOver,
        handleKanbanCardDragLeave,
        handleKanbanCardDrop,
    };
}
