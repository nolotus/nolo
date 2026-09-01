// packages/render/table/TablePage.tsx
// 主数据表页面组件：组合 useTable 加载、TanStack v9 表格 wiring 与行模型流水线，
// 并将样式、视图控制、网格和看板等渲染解耦到子组件与子 hook。

import "../table.css";
import React, {
    useEffect,
    useMemo,
    useState,
    useCallback,
    useRef,
} from "react";
import { useDragResize } from "app/hooks/useDragResize";
import {
    addRow,
    addColumn,
    addColumnOption,
    deleteRow,
    updateCell,
    deleteColumn,
    renameColumnLabel,
    renameTable,
    reorderColumn,
    updateColumnWidth,
    setTableFocusContext,
    updateTableIcon,
} from "./tableSlice";
import { useTable } from "./useTable";
import NoMatch from "../NoMatch";

import { applyManualOrder, type TableSortRule } from "./tablePrefs";
import { resolveSelectOptions } from "./selectCellUtils";
import RowContextMenu from "./RowContextMenu";
import SelectCellEditor, {
    type SelectCellEditorAnchor,
} from "./SelectCellEditor";
import { selectCurrentSpaceId } from "create/space/spaceCurrentSelectors";
import { updateContentTitle } from "create/space/content/contentThunks";
import { useAppSelector } from "app/store";
import {
    findColumnByNameOrLabel,
    getColumnFilterOptions,
    getLatestTableActivityBadge,
    resolveTableDisplayMode,
    GRID_DISPLAY_MODE,
} from "./tableView";
import { buildDialogUrl } from "chat/dialog/dialogUrl";
import ContentIconPicker from "render/contentIcon/ContentIconPicker";
import type { ContentIcon as ContentIconValue } from "render/contentIcon/types";
import LongTextDialog, { LongTextCellInfo } from "./LongTextDialog";
import { LuCircleAlert, LuLoaderCircle, LuStar } from "react-icons/lu";
import Button from "render/web/ui/Button";

import { useTable as useTanStackTable } from "@tanstack/react-table";
import type {
    ColumnFiltersState,
    SortingState,
    Updater,
} from "@tanstack/table-core";
import {
    buildColumnFilters,
    buildTableColumnDefs,
    partitionEmptyLast,
    sortRuleToSorting,
    sortingToSortRule,
    tableFeatures,
    type TableRow,
} from "./tableTanstack";

import { useTablePrefs } from "./useTablePrefs";
import { useCellEditing } from "./useCellEditing";
import { useRowInsertion } from "./useRowInsertion";
import { useGridDragDrop } from "./useGridDragDrop";
import { useKanbanBoard, type TableViewChoice } from "./useKanbanBoard";

import { TablePageHeader } from "./TablePageHeader";
import { TableViewControls } from "./TableViewControls";
import { KanbanBoard } from "./KanbanBoard";
import { TableGridSection } from "./TableGridSection";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";

export interface TablePageProps {
    tableKey?: string;
}

const GRID_WINDOWING_ROW_THRESHOLD = 50;

const readTableSearchParam = (key: "status" | "owner"): string => {
    if (typeof window === "undefined") return "";
    const value = new URLSearchParams(window.location.search).get(key);
    return value ? value.trim() : "";
};

const readInitialViewChoice = (): TableViewChoice | "" => {
    if (typeof window === "undefined") return "";
    const value = new URLSearchParams(window.location.search).get("view");
    return value === "grid" || value === "kanban" ? value : "";
};

function TableActivityBadge({
    row,
    spaceId,
}: {
    row: Record<string, unknown>;
    spaceId?: string | null;
}) {
    const activity = useMemo(
        () => getLatestTableActivityBadge(row),
        [row]
    );

    if (!activity || !spaceId) {
        return null;
    }

    return (
        <span
            className="table-page__activity-badge"
            title={activity.title}
            onClick={(e) => {
                e.stopPropagation();
                if (activity.dialogId) {
                    window.location.href = buildDialogUrl(spaceId, activity.dialogId);
                }
            }}
        >
            <LuStar size={12} className="table-page__activity-badge-icon" aria-hidden="true" />
            {activity.label}
        </span>
    );
}

const TablePage: React.FC<TablePageProps> = ({ tableKey }) => {
    // 1. 使用 useTable hook 解析与加载
    const {
        tenantId,
        tableId,
        valid,
        tableMeta,
        isLoading,
        error,
        rows,
        dispatch,
    } = useTable(tableKey);

    const currentSpaceId = useCurrentSpaceId();

    // 4. 本地状态（Hook）
    const [newColumnName, setNewColumnName] = useState("");
    const [isRenamingTable, setIsRenamingTable] = useState(false);
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [tableTitleInput, setTableTitleInput] = useState("");
    const tableTitleInputRef = useRef<HTMLInputElement | null>(null);

    const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
    const [editingColumnText, setEditingColumnText] = useState("");
    const editingColumnInputRef = useRef<HTMLInputElement | null>(null);

    const [selectEditor, setSelectEditor] = useState<{
        dbKey: string;
        columnName: string;
        anchor: SelectCellEditorAnchor;
    } | null>(null);

    const [longTextPayload, setLongTextPayload] = useState<LongTextCellInfo | null>(null);

    const [selectedViewChoice, setSelectedViewChoice] = useState<TableViewChoice | "">(
        () => readInitialViewChoice()
    );

    const [selectedStatusFilter, setSelectedStatusFilter] = useState(() =>
        readTableSearchParam("status")
    );
    const [selectedOwnerFilter, setSelectedOwnerFilter] = useState(() =>
        readTableSearchParam("owner")
    );

    // 列宽相关（Hook）
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const columnWidthsRef = useRef<Record<string, number>>({});
    const resizingRef = useRef<{
        columnId: string;
        startX: number;
        startWidth: number;
    } | null>(null);
    const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);

    const { handlePointerDown: handleResizerPointerDown } = useDragResize({
        onStart: () => {
            if (resizingRef.current) setResizingColumnId(resizingRef.current.columnId);
        },
        onMove: (clientX) => {
            const r = resizingRef.current;
            if (!r) return;
            const delta = clientX - r.startX;
            const baseWidth = r.startWidth ?? 150;
            const nextWidth = Math.max(80, baseWidth + delta);
            setColumnWidths((prev) => {
                if (prev[r.columnId] === nextWidth) return prev;
                return { ...prev, [r.columnId]: nextWidth };
            });
        },
        onStop: () => {
            const r = resizingRef.current;
            resizingRef.current = null;
            setResizingColumnId(null);
            if (!r || !tenantId || !tableId) return;
            const latestWidth = columnWidthsRef.current[r.columnId];
            if (latestWidth !== undefined) {
                void dispatch(
                    updateColumnWidth({
                        tenantId,
                        tableId,
                        columnId: r.columnId,
                        width: latestWidth,
                    })
                );
            }
        },
    });

    const gridScrollRef = useRef<HTMLDivElement | null>(null);

    const {
        manualOrder,
        setManualOrder,
        sortRule,
        setSortRule,
        persistPrefs,
        handleSortClick,
        handleRowDrop,
    } = useTablePrefs(tableKey, rows);

    const columns = useMemo(() => tableMeta?.columns ?? [], [tableMeta]);

    const {
        draggingRowKey,
        setDraggingRowKey,
        dropTarget,
        setDropTarget,
        handleRowDragStart,
        handleRowDragEnd,
        handleRowDragOver,
        handleRowDragLeave,
        handleRowDropOnKey,
    } = useGridDragDrop(handleRowDrop);

    // 6. 派生数据（Hook）
    const primaryColumn = useMemo(
        () => columns.find((c: any) => c.isPrimary) ?? columns[0],
        [columns]
    );

    const tableDisplayMode = useMemo(
        () => (tableMeta ? resolveTableDisplayMode(tableMeta) : GRID_DISPLAY_MODE),
        [tableMeta]
    );

    const statusFilterColumn = useMemo(
        () => findColumnByNameOrLabel(columns, ["status", "状态"]),
        [columns]
    );
    const statusFilterOptions = useMemo(
        () => getColumnFilterOptions(statusFilterColumn, rows),
        [statusFilterColumn, rows]
    );
    const statusSelectOptions = useMemo(
        () =>
            selectedStatusFilter && !statusFilterOptions.includes(selectedStatusFilter)
                ? [selectedStatusFilter, ...statusFilterOptions]
                : statusFilterOptions,
        [statusFilterOptions, selectedStatusFilter]
    );

    const ownerFilterColumn = useMemo(
        () => findColumnByNameOrLabel(columns, ["owner", "负责人"]),
        [columns]
    );
    const ownerFilterOptions = useMemo(
        () => getColumnFilterOptions(ownerFilterColumn, rows),
        [ownerFilterColumn, rows]
    );
    const ownerSelectOptions = useMemo(
        () =>
            selectedOwnerFilter && !ownerFilterOptions.includes(selectedOwnerFilter)
                ? [selectedOwnerFilter, ...ownerFilterOptions]
                : ownerFilterOptions,
        [ownerFilterOptions, selectedOwnerFilter]
    );

    // ── TanStack Table v9 ──────────────────────────────────────────
    const columnDefs = useMemo(() => buildTableColumnDefs(columns), [columns]);

    const sorting = useMemo(() => sortRuleToSorting(sortRule), [sortRule]);
    const columnFilters = useMemo(
        () =>
            buildColumnFilters(
                statusFilterColumn,
                selectedStatusFilter,
                ownerFilterColumn,
                selectedOwnerFilter
            ),
        [ownerFilterColumn, selectedOwnerFilter, selectedStatusFilter, statusFilterColumn]
    );

    const handleSortingChange = useCallback(
        (updater: Updater<SortingState>) => {
            setSortRule((prev) => {
                const base = sortRuleToSorting(prev);
                const next = typeof updater === "function" ? updater(base) : updater;
                const nextRule = sortingToSortRule(next);
                persistPrefs({ sort: nextRule });
                return nextRule;
            });
        },
        [persistPrefs, setSortRule]
    );

    const handleColumnFiltersChange = useCallback(
        (updater: Updater<ColumnFiltersState>) => {
            const base = buildColumnFilters(
                statusFilterColumn,
                selectedStatusFilter,
                ownerFilterColumn,
                selectedOwnerFilter
            );
            const next = typeof updater === "function" ? updater(base) : updater;
            const byId = new Map(
                next.map((filter) => [filter.id, String(filter.value ?? "")])
            );
            setSelectedStatusFilter(byId.get(statusFilterColumn?.id ?? "") ?? "");
            setSelectedOwnerFilter(byId.get(ownerFilterColumn?.id ?? "") ?? "");
        },
        [ownerFilterColumn, selectedOwnerFilter, selectedStatusFilter, statusFilterColumn]
    );

    const table = useTanStackTable({
        features: tableFeatures,
        data: rows as TableRow[],
        columns: columnDefs,
        state: { sorting, columnFilters },
        onSortingChange: handleSortingChange,
        onColumnFiltersChange: handleColumnFiltersChange,
        getRowId: (row) => row.dbKey,
    });

    const filteredRowModel = table.getFilteredRowModel();

    const filteredRows = useMemo(
        () => filteredRowModel.rows.map((row) => row.original),
        [filteredRowModel]
    );

    const {
        editingCell,
        setEditingCell,
        editingValue,
        setEditingValue,
        saveCurrentEdit,
        finishEdit,
        switchCell,
        handleKeyDown,
        handleStartEdit,
        handleEditingValueChange,
    } = useCellEditing(rows, filteredRows, columns, dispatch);

    const {
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
    } = useKanbanBoard({
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
    });

    const sortedAndOrderedRows = useMemo(() => {
        if (activeDisplayMode.type === "kanban") return filteredRows;

        if (sortRule) {
            const sortedModelRows = table.getSortedRowModel().rows.map((r) => r.original);
            return partitionEmptyLast(sortedModelRows, sortRule.columnId);
        }

        return applyManualOrder(filteredRows, manualOrder, (r: any) => r.dbKey);
    }, [activeDisplayMode, filteredRows, manualOrder, sortRule, table]);

    const editingRowIndex = useMemo(() => {
        if (!editingCell) return -1;
        return sortedAndOrderedRows.findIndex((r) => r.dbKey === editingCell.dbKey);
    }, [editingCell, sortedAndOrderedRows]);

    const {
        insertRowAt,
        handleInsertRowBelow,
        handleInsertRowAbove,
        handleAddRowTop,
        handleAddRowBottom,
    } = useRowInsertion({
        tenantId,
        tableId,
        rows,
        sortedAndOrderedRows,
        primaryColumn,
        sortRule,
        manualOrder,
        setManualOrder,
        persistPrefs,
        selectedStatusFilter,
        selectedOwnerFilter,
        setEditingCell,
        setEditingValue,
        dispatch,
    });

    const columnsByName = useMemo(() => {
        const map = new Map<string, any>();
        columns.forEach((column: any) => {
            map.set(column.name, column);
        });
        return map;
    }, [columns]);

    const shouldWindowGridRows =
        activeViewChoice === "grid" &&
        sortedAndOrderedRows.length >= GRID_WINDOWING_ROW_THRESHOLD;

    // 5. 同步副作用（Hook）
    useEffect(() => {
        if (isRenamingTable && tableTitleInputRef.current) {
            tableTitleInputRef.current.focus();
            tableTitleInputRef.current.select();
        }
    }, [isRenamingTable]);

    useEffect(() => {
        if (editingColumnId && editingColumnInputRef.current) {
            editingColumnInputRef.current.focus();
            editingColumnInputRef.current.select();
        }
    }, [editingColumnId]);

    useEffect(() => {
        if (tableMeta && tableMeta.columns) {
            const nextWidths: Record<string, number> = {};
            tableMeta.columns.forEach((col: any) => {
                if (typeof col.width === "number" && col.width > 0) {
                    nextWidths[col.id] = col.width;
                }
            });
            setColumnWidths(nextWidths);
            columnWidthsRef.current = nextWidths;
        }
    }, [tableMeta]);

    useEffect(() => {
        if (!tableMeta || !tenantId || !tableId) return;

        dispatch(
            setTableFocusContext({
                tableKey: `meta-${tenantId}-${tableId}`,
                tableId,
                tenantId,
                displayName: tableMeta.displayName ?? tableMeta.tableId,
                columns: columns.map((col: any) => ({
                    id: col.id,
                    name: col.name,
                    label: col.label,
                    type: col.type,
                })),
                rowCount: rows.length,
                viewChoice: activeViewChoice,
                canUseKanbanView,
            })
        );

        return () => {
            dispatch(setTableFocusContext(null));
        };
    }, [
        dispatch,
        tableMeta,
        tenantId,
        tableId,
        columns,
        rows.length,
        activeViewChoice,
        canUseKanbanView,
    ]);

    useEffect(() => {
        if (!editingCell) {
            dispatch(setTableFocusContext(null));
            return;
        }

        const rowIndex = filteredRows.findIndex((row: any) => row.dbKey === editingCell.dbKey);
        const colIndex = columns.findIndex((col: any) => col.name === editingCell.columnName);
        const row = rowIndex >= 0 ? filteredRows[rowIndex] : null;
        const column = colIndex >= 0 ? columns[colIndex] : null;
        const rowTitle =
            row && primaryColumn && primaryColumn.name in row
                ? String(row[primaryColumn.name] ?? "")
                : rowIndex >= 0
                    ? `行 ${rowIndex + 1}`
                    : null;
        const cellPreview =
            row && column ? String(row[column.name] ?? "").slice(0, 200) : null;

        dispatch(
            setTableFocusContext({
                rowDbKey: editingCell.dbKey,
                columnName: editingCell.columnName,
                rowIndex: rowIndex >= 0 ? rowIndex : null,
                colIndex: colIndex >= 0 ? colIndex : null,
                rowTitle,
                cellPreview,
                isEditing: true,
            })
        );
    }, [columns, dispatch, editingCell, filteredRows, primaryColumn]);

  useEffect(() => {
    if (!tableMeta || !selectedStatusFilter) return;
    if (!statusFilterColumn) {
      setSelectedStatusFilter("");
    }
  }, [selectedStatusFilter, statusFilterColumn, tableMeta]);

  useEffect(() => {
    if (!tableMeta || !selectedOwnerFilter) return;
    if (!ownerFilterColumn) {
      setSelectedOwnerFilter("");
    }
  }, [ownerFilterColumn, selectedOwnerFilter, tableMeta]);

  useEffect(() => {
    if (!tableMeta) return;
    if (selectedViewChoice === "kanban" && !canUseKanbanView) {
      setSelectedViewChoice("grid");
    }
  }, [canUseKanbanView, selectedViewChoice, tableMeta]);

  useEffect(() => {
    if (!tableMeta || typeof window === "undefined") return;
    const url = new URL(window.location.href);

    const setOrDelete = (name: string, value: string) => {
      if (value) {
        url.searchParams.set(name, value);
      } else {
        url.searchParams.delete(name);
      }
    };

    setOrDelete("status", selectedStatusFilter);
    setOrDelete("owner", selectedOwnerFilter);
    setOrDelete("view", activeViewChoice);
    window.history.replaceState(window.history.state, "", url);
  }, [activeViewChoice, selectedOwnerFilter, selectedStatusFilter, tableMeta]);

    // 7. 各种回调（Hook）
    const handleOpenSelectEditor = useCallback(
        (dbKey: string, columnName: string, anchor: SelectCellEditorAnchor) => {
            setSelectEditor({ dbKey, columnName, anchor });
        },
        []
    );
    const handleCloseSelectEditor = useCallback(() => {
        setSelectEditor(null);
    }, []);

    const [rowContextMenu, setRowContextMenu] = useState<{
        dbKey: string;
        x: number;
        y: number;
    } | null>(null);
    const handleRowContextMenu = useCallback(
        (dbKey: string, x: number, y: number) => {
            setRowContextMenu({ dbKey, x, y });
        },
        []
    );
    const closeRowContextMenu = useCallback(() => {
        setRowContextMenu(null);
    }, []);

    const handleAddColumn = useCallback(() => {
        if (!tenantId || !tableId) return;
        const name = newColumnName.trim();
        if (!name) return;

        void dispatch(addColumn({ tenantId, tableId, columnName: name }));
        setNewColumnName("");
    }, [dispatch, tenantId, tableId, newColumnName]);

    const handleDeleteRow = useCallback(
        (dbKey: string) => {
            if (!dbKey) return;
            void dispatch(deleteRow(dbKey));
        },
        [dispatch]
    );

    const handleDeleteColumn = useCallback(
        (columnName: string) => {
            if (!tenantId || !tableId) return;

            if (
                !window.confirm(
                    `确定删除字段 "${columnName}" 吗？该字段在所有行中的数据都会被删除。`
                )
            ) {
                return;
            }

            void dispatch(deleteColumn({ tenantId, tableId, columnName }));
        },
        [dispatch, tenantId, tableId]
    );

    const handleMoveColumn = useCallback(
        (fromIndex: number, toIndex: number) => {
            if (!tenantId || !tableId) return;
            void dispatch(reorderColumn({ tenantId, tableId, fromIndex, toIndex }));
        },
        [dispatch, tenantId, tableId]
    );

    const handleRenameColumnConfirm = useCallback(
        (columnName: string, newLabel: string) => {
            if (!tenantId || !tableId) return;
            void dispatch(
                renameColumnLabel({
                    tenantId,
                    tableId,
                    columnName,
                    label: newLabel,
                })
            );
            setEditingColumnId(null);
        },
        [dispatch, tenantId, tableId]
    );

    const handleUpdateTitle = useCallback(
        (title: string) => {
            if (!tenantId || !tableId) return;
            const finalTitle = title.trim() || tableId;

            void dispatch(
                renameTable({
                    tenantId,
                    tableId,
                    displayName: finalTitle,
                })
            );
            setIsRenamingTable(false);

            if (currentSpaceId) {
                void dispatch(
                    updateContentTitle({
                        spaceId: currentSpaceId,
                        contentKey: `meta-${tenantId}-${tableId}`,
                        title: finalTitle,
                    })
                );
            }
        },
        [dispatch, tenantId, tableId, currentSpaceId]
    );

    const handleUpdateIcon = useCallback(
        (nextIcon: ContentIconValue | null) => {
            if (!tenantId || !tableId) return;
            void dispatch(updateTableIcon({ tenantId, tableId, icon: nextIcon }));
        },
        [dispatch, tableId, tenantId]
    );

    const handleOpenLongText = useCallback((payload: LongTextCellInfo) => {
        setLongTextPayload(payload);
    }, []);

    const selectEditorColumn = selectEditor
        ? (columnsByName.get(selectEditor.columnName) ?? null)
        : null;
    const selectEditorOptions = useMemo(
        () =>
            selectEditorColumn ? resolveSelectOptions(selectEditorColumn, rows) : [],
        [selectEditorColumn, rows]
    );
    const selectEditorRow = selectEditor
        ? rows.find((r: any) => r.dbKey === selectEditor.dbKey)
        : null;
    const selectEditorValue =
        selectEditor && selectEditorRow
            ? String(selectEditorRow[selectEditor.columnName] ?? "")
            : "";

    const gridColSpan = columns.length + 1;

    // 8. 所有 Hook 都声明完之后，才允许 early return
    if (!valid) {
        return <NoMatch message={`无法识别的表 key: ${tableKey}`} />;
    }

    if (isLoading && !tableMeta && !error) {
        return (
            <div className="table-page__center-state" style={{ height: "50vh" }}>
                <LuLoaderCircle className="spin" size={24} color="var(--primary)" aria-hidden="true" />
                <span>正在加载数据表...</span>
            </div>
        );
    }

    if (!tableMeta) {
        return (
            <div className="table-page__center-state table-page__center-state--error" style={{ height: "50vh" }}>
                <LuCircleAlert size={24} color="var(--error)" aria-hidden="true" />
                <span>{error || `表不存在或加载失败: ${tableKey}`}</span>
                <Button variant="secondary" size="small" onClick={() => window.location.reload()}>
                    重试
                </Button>
            </div>
        );
    }

    // 9. 正常渲染
    return (
        <>
            <div className="table-page">
                <TablePageHeader
                    tableMeta={tableMeta}
                    isRenamingTable={isRenamingTable}
                    setIsRenamingTable={setIsRenamingTable}
                    tableTitleInput={tableTitleInput}
                    setTableTitleInput={setTableTitleInput}
                    tableTitleInputRef={tableTitleInputRef}
                    isIconPickerOpen={isIconPickerOpen}
                    setIsIconPickerOpen={setIsIconPickerOpen}
                    newColumnName={newColumnName}
                    setNewColumnName={setNewColumnName}
                    handleAddRowTop={handleAddRowTop}
                    handleAddColumn={handleAddColumn}
                    handleUpdateTitle={handleUpdateTitle}
                    handleUpdateIcon={handleUpdateIcon}
                />

                {error && (
                    <div className="table-page__error">
                        <LuCircleAlert size={16} aria-hidden="true" />
                        {error}
                    </div>
                )}

                <TableViewControls
                    statusFilterColumn={statusFilterColumn}
                    selectedStatusFilter={selectedStatusFilter}
                    setSelectedStatusFilter={setSelectedStatusFilter}
                    statusSelectOptions={statusSelectOptions}
                    ownerFilterColumn={ownerFilterColumn}
                    selectedOwnerFilter={selectedOwnerFilter}
                    setSelectedOwnerFilter={setSelectedOwnerFilter}
                    ownerSelectOptions={ownerSelectOptions}
                    activeViewChoice={activeViewChoice}
                    setSelectedViewChoice={setSelectedViewChoice}
                    canUseKanbanView={canUseKanbanView}
                    filteredCount={filteredRows.length}
                    totalCount={rows.length}
                />

                {activeViewChoice === "grid" ? (
                    <TableGridSection
                        gridScrollRef={gridScrollRef}
                        columns={columns}
                        primaryColumnName={primaryColumn?.name}
                        columnWidths={columnWidths}
                        gridColSpan={gridColSpan}
                        sortRule={sortRule}
                        handleSortClick={handleSortClick}
                        editingColumnId={editingColumnId}
                        setEditingColumnId={setEditingColumnId}
                        editingColumnText={editingColumnText}
                        setEditingColumnText={setEditingColumnText}
                        editingColumnInputRef={editingColumnInputRef}
                        handleRenameColumnConfirm={handleRenameColumnConfirm}
                        handleDeleteColumn={handleDeleteColumn}
                        handleMoveColumn={handleMoveColumn}
                        sortedAndOrderedRows={sortedAndOrderedRows}
                        filteredRows={filteredRows}
                        editingRowIndex={editingRowIndex}
                        editingCell={editingCell}
                        editingValue={editingValue}
                        draggingRowKey={draggingRowKey}
                        dropTarget={dropTarget}
                        currentSpaceId={currentSpaceId}
                        TableActivityBadge={TableActivityBadge}
                        shouldWindowGridRows={shouldWindowGridRows}
                        handleAddRowBottom={handleAddRowBottom}
                        handleStartEdit={handleStartEdit}
                        handleEditingValueChange={handleEditingValueChange}
                        finishEdit={finishEdit}
                        handleKeyDown={handleKeyDown}
                        handleInsertRowBelow={handleInsertRowBelow}
                        handleRowContextMenu={handleRowContextMenu}
                        handleOpenSelectEditor={handleOpenSelectEditor}
                        handleOpenLongText={handleOpenLongText}
                        handleRowDragStart={handleRowDragStart}
                        handleRowDragEnd={handleRowDragEnd}
                        handleRowDragOver={handleRowDragOver}
                        handleRowDragLeave={handleRowDragLeave}
                        handleRowDropOnKey={handleRowDropOnKey}
                        handleResizerPointerDown={handleResizerPointerDown}
                        resizingColumnId={resizingColumnId}
                        resizingRef={resizingRef}
                    />
                ) : (
                    <KanbanBoard
                        tableId={tableMeta?.tableId}
                        kanbanGroups={kanbanGroups}
                        kanbanDetailColumns={kanbanDetailColumns}
                        kanbanDropTargetGroup={kanbanDropTargetGroup}
                        draggingRowKey={draggingRowKey}
                        dropTarget={dropTarget}
                        handleKanbanColumnDragOver={handleKanbanColumnDragOver}
                        handleKanbanColumnDragLeave={handleKanbanColumnDragLeave}
                        handleKanbanColumnDrop={handleKanbanColumnDrop}
                        handleKanbanCardDragStart={handleKanbanCardDragStart}
                        handleKanbanCardDragEnd={handleKanbanCardDragEnd}
                        handleKanbanCardDragOver={handleKanbanCardDragOver}
                        handleKanbanCardDragLeave={handleKanbanCardDragLeave}
                        handleKanbanCardDrop={handleKanbanCardDrop}
                        handleDeleteRow={handleDeleteRow}
                        handleStartEdit={handleStartEdit}
                        handleOpenLongText={handleOpenLongText}
                        currentSpaceId={currentSpaceId}
                        TableActivityBadge={TableActivityBadge}
                        primaryColumn={primaryColumn}
                    />
                )}
            </div>

      {selectEditor && selectEditorColumn && (
        <SelectCellEditor
          anchor={selectEditor.anchor}
          options={selectEditorOptions}
          currentValue={selectEditorValue}
          onClose={handleCloseSelectEditor}
          onSelect={(value) => {
            const { dbKey, columnName } = selectEditor;
            if (value !== selectEditorValue) {
              void dispatch(updateCell({ dbKey, columnName, value }));
            }
            setSelectEditor(null);
          }}
          onCreateOption={(value) => {
            const { dbKey, columnName } = selectEditor;
            // 新选项先回写列 meta（fulfilled 与 no-op 都照常继续），
            // 再复用 onSelect 逻辑把该单元格值设为新选项并关闭弹层。
            if (tenantId && tableId) {
              void dispatch(
                addColumnOption({
                  tenantId,
                  tableId,
                  columnId: selectEditorColumn.id,
                  option: value,
                })
              );
            }
            if (value !== selectEditorValue) {
              void dispatch(updateCell({ dbKey, columnName, value }));
            }
            setSelectEditor(null);
          }}
        />
      )}

            {rowContextMenu && (
                <RowContextMenu
                    x={rowContextMenu.x}
                    y={rowContextMenu.y}
                    onInsertAbove={() => {
                        closeRowContextMenu();
                        handleInsertRowAbove(rowContextMenu.dbKey);
                    }}
                    onInsertBelow={() => {
                        closeRowContextMenu();
                        handleInsertRowBelow(rowContextMenu.dbKey);
                    }}
                    onDelete={() => {
                        closeRowContextMenu();
                        handleDeleteRow(rowContextMenu.dbKey);
                    }}
                    onClose={closeRowContextMenu}
                />
            )}

            <LongTextDialog
                payload={longTextPayload}
                onClose={() => setLongTextPayload(null)}
                onSave={({ dbKey, columnName, value }) => {
                    const row = rows.find((r: any) => r.dbKey === dbKey);
                    const oldValue = row ? String(row[columnName] ?? "") : "";
                    if (value === oldValue) {
                        return;
                    }

                    void dispatch(
                        updateCell({
                            dbKey,
                            columnName,
                            value,
                        })
                    );
                }}
            />
        </>
    );
};

export default TablePage;
