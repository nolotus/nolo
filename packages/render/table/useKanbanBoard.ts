// packages/render/table/useKanbanBoard.ts
// 看板视图计算与拖拽 Hook。

import { useCallback, useMemo, useState } from "react";
import { updateCell } from "./tableStore";
import { normalizeRowValues } from "./toolValueUtils";
import {
    EMPTY_TABLE_COLUMNS,
    GRID_DISPLAY_MODE,
    getKanbanTitleColumn,
    isKanbanSequenceColumn,
    getKanbanGroupColumnCandidates,
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
    selectedGroupColumnName?: string;
    setSelectedGroupColumnName?: (colName: string) => void;
    visibleCardColumnNames?: string[] | null;
    setVisibleCardColumnNames?: (names: string[] | null) => void;
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
    selectedGroupColumnName,
    setSelectedGroupColumnName,
    visibleCardColumnNames,
    setVisibleCardColumnNames,
}: UseKanbanBoardOptions) {
    const [kanbanDropTargetGroup, setKanbanDropTargetGroup] = useState<string | null>(null);

    // 切换分组列时把 visibleCardColumnNames 重置为 null（恢复默认全部展示），避免旧分组列残留隐藏
    const handleSelectGroupColumn = useCallback(
        (colName: string) => {
            setSelectedGroupColumnName?.(colName);
            setVisibleCardColumnNames?.(null);
        },
        [setSelectedGroupColumnName, setVisibleCardColumnNames]
    );

    // 候选分组列（非 primary 字段均可作为看板泳道维度）
    const kanbanGroupCandidates = useMemo(
        () => getKanbanGroupColumnCandidates(columns),
        [columns]
    );

    // 当前生效的分组列
    const activeGroupColumn = useMemo(() => {
        if (selectedGroupColumnName) {
            const found = columns.find((c) => c.name === selectedGroupColumnName);
            if (found) return found;
        }
        if (tableDisplayMode.type === "kanban") {
            const preset = columns.find((c) => c.name === tableDisplayMode.groupColumnName);
            if (preset) return preset;
        }
        if (statusFilterColumn) return statusFilterColumn;
        return kanbanGroupCandidates[0] ?? null;
    }, [columns, kanbanGroupCandidates, selectedGroupColumnName, statusFilterColumn, tableDisplayMode]);

    const kanbanDisplayMode = useMemo<TableDisplayMode>(() => {

        if (!activeGroupColumn) return GRID_DISPLAY_MODE;
        return {
            type: "kanban",
            viewName: tableDisplayMode.type === "kanban" ? tableDisplayMode.viewName : "看板",
            groupColumnName: activeGroupColumn.name,
            visibleColumnNames: columns.map((column: any) => column.name),
            preferredGroupValues: [],
        };
    }, [activeGroupColumn, columns, tableDisplayMode]);

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

    const kanbanTitleColumn = useMemo(() => getKanbanTitleColumn(columns), [columns]);

    // 卡片不展示序号、标题与当前分组泳道列。
    const allDetailColumns = useMemo(() => {
        if (!activeGroupColumn) return EMPTY_TABLE_COLUMNS;
        const groupColName = activeGroupColumn.name;
        return columns.filter(
            (col) => col.name !== groupColName && col.name !== kanbanTitleColumn?.name && !isKanbanSequenceColumn(col)
        );
    }, [activeGroupColumn, columns, kanbanTitleColumn]);

    // 实际渲染在卡片上的列（支持用户通过勾选面板自定义显示/隐藏）
    const kanbanDetailColumns = useMemo(() => {
        if (activeDisplayMode.type !== "kanban") return EMPTY_TABLE_COLUMNS;
        if (Array.isArray(visibleCardColumnNames)) {
            return allDetailColumns.filter((col) => visibleCardColumnNames.includes(col.name));
        }
        return allDetailColumns;
    }, [activeDisplayMode, allDetailColumns, visibleCardColumnNames]);

    // Lanes identify exact typed values, not display labels. Multi-select lanes
    // represent complete selections: moving replaces the selection with an exact
    // copy of the target combination (never a comma-joined, lossy string).
    const lanes = useMemo(() => {
        if (!activeGroupColumn) return [];
        const column = activeGroupColumn;
        const map = new Map<string, { groupValue: string; groupLabel: string; value: any; rows: any[] }>();
        const add = (raw: any, row?: any) => {
            const value = raw == null || raw === "" || (Array.isArray(raw) && raw.length === 0)
                ? (column.type === "multi_select" ? [] : null) : raw;
            const key = JSON.stringify(value);
            if (!map.has(key)) map.set(key, {
                groupValue: key,
                groupLabel: value === null || (Array.isArray(value) && !value.length) ? "（空）"
                    : Array.isArray(value) ? value.join("、") : String(value),
                value, rows: [],
            });
            if (row) map.get(key)!.rows.push(row);
        };
        const options = column === statusFilterColumn && statusFilterOptions.length
            ? statusFilterOptions : column.options ?? [];
        for (const option of options) {
            const raw = column.type === "multi_select" ? [option] : option;
            const result = normalizeRowValues([column], { [column.name]: raw }, { mode: "update" });
            if (!result.errors.length) add(result.sanitizedValues[column.name]);
        }
        if (!column.required) add(null);
        // Include unfiltered values so empty destinations remain available.
        for (const row of rows) add(row[column.name]);
        for (const row of filteredRows) add(row[column.name], row);
        return [...map.values()];
    }, [activeGroupColumn, statusFilterColumn, statusFilterOptions, rows, filteredRows]);

    const kanbanGroups = activeDisplayMode.type === "kanban" ? lanes : [];
    const moveToLane = useCallback((dbKey: string, laneKey: string) => {
        if (!activeGroupColumn || activeDisplayMode.type !== "kanban") return;
        const row = rows.find((r) => r.dbKey === dbKey);
        const lane = lanes.find((entry) => entry.groupValue === laneKey);
        if (!row || !lane || lane.rows.some((r) => r.dbKey === dbKey)) return;
        const column = activeGroupColumn;
        const result = normalizeRowValues([column], { [column.name]: lane.value }, { mode: "update" });
        if (result.errors.length) return;
        // Existing multi-select values may predate normalization. Do not silently
        // trim/drop labels while copying a lane: either copy exactly or refuse.
        if (column.type === "multi_select" && JSON.stringify(result.sanitizedValues[column.name]) !== JSON.stringify(lane.value)) return;
        void dispatch(updateCell({ dbKey, columnName: column.name, value: result.sanitizedValues[column.name] }));
    }, [activeGroupColumn, activeDisplayMode, rows, lanes, dispatch]);

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

            moveToLane(draggedDbKey, targetGroupValue);

            setDraggingRowKey(null);
            setDropTarget(null);
        },
        [activeDisplayMode, moveToLane, draggingRowKey, setDraggingRowKey, setDropTarget]
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

            moveToLane(draggedDbKey, targetGroupValue);

            handleRowDrop(draggedDbKey, targetRowDbKey, position);
            setDraggingRowKey(null);
            setDropTarget(null);
            setKanbanDropTargetGroup(null);
        },
        [moveToLane, draggingRowKey, dropTarget, handleRowDrop, setDraggingRowKey, setDropTarget]
    );

    return {
        kanbanDisplayMode,
        kanbanTitleColumn,
        canUseKanbanView,
        kanbanGroupCandidates,
        activeGroupColumn,
        effectiveGroupColumnName: activeGroupColumn?.name ?? "",
        activeViewChoice,
        activeDisplayMode,
        allDetailColumns,
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
        handleSelectGroupColumn,
        setSelectedGroupColumnName: handleSelectGroupColumn,
    };
}
