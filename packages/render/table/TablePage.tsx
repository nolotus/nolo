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
    loadTableRows,
} from "./tableStore";
import { useTable } from "./useTable";
import NoMatch from "../NoMatch";
import { logger } from "core/logger";

import {
    applyDefaultRecentSort,
    applyManualOrder,
    type TableSortRule,
} from "./tablePrefs";
import { resolveSelectOptions } from "./selectCellUtils";
import RowContextMenu from "./RowContextMenu";
import SelectCellEditor, {
    type SelectCellEditorAnchor,
} from "./SelectCellEditor";
import { selectCurrentSpaceId } from "create/space/spaceCurrentSelectors";
import { updateContentTitle } from "create/space/content/contentThunks";
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

import { TableViewControls } from "./TableViewControls";
import { KanbanBoard } from "./KanbanBoard";
import { TableGridSection } from "./TableGridSection";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";

export interface TablePageProps {
    tableKey?: string;
}

const GRID_WINDOWING_ROW_THRESHOLD = 50;

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

// TODO(legacy-grid-removal)：缺列只读兜底网格是临时过渡物，P3 数据回填脚本跑完后删除此块。
// 样式未入 table.css 的原因：本块为待删除兜底，样式迁移是白做的工。
//
// 兜底网格不展示的行级系统字段（只影响缺列时的只读展示，不改行数据本身）。
// 权威来源（仓库里没有可 import 的共享常量：server 侧 BASE_ROW_FIELDS 是
// packages/server/handlers/tableToolHandlers.ts:423 的模块私有 Set，render 侧
// packages/render/table/toolValueUtils.ts:357 也只是内联字面量；render 反向 import
// server/handlers 会破坏分层，故在此本地罗列并逐项标注注入点）：
// - dbKey / userId：database/actions/write.ts:104-108（每次写入自动注入）
// - createdAt / updatedAt：database/actions/common.ts:214-219（normalizeTimeFields）
// - authorName / authorAvatar：database/server/routes/write.ts:434-437（服务端回填作者）
// - dbKey / tenantId / tableId / rowId / type / createdAt / updatedAt：render/table/tableStore.ts:453-472（建行）
// - type / userId / ownerId / deletedAt：server/handlers/tableToolHandlers.ts:423-435（BASE_ROW_FIELDS）；
//   deletedAt 另见 tableStore.ts:536-548 的 tombstone 写入
const LEGACY_GRID_HIDDEN_FIELDS = new Set([
    "dbKey",
    "tenantId",
    "tableId",
    "rowId",
    "type",
    "userId",
    "authorName",
    "authorAvatar",
    "ownerId",
    "createdAt",
    "updatedAt",
    "deletedAt",
]);

// 兜底网格最多渲染这么多行：没有列定义的老表可能很大，不能把整表拍进 DOM。
const LEGACY_GRID_MAX_ROWS = 100;

const TablePageContent: React.FC<TablePageProps & { initialSearch: string }> = ({ tableKey, initialSearch }) => {
    // 1. 使用 useTable hook 解析与加载
    const {
        tenantId,
        tableId,
        valid,
        tableMeta: loadedTableMeta,
        isLoading,
        error,
        rows: loadedRows,
        dispatch,
    } = useTable(tableKey);
    // A route change must not expose the previous table while the domain store loads.
    // 身份判据用 dbKey（= 路由传入的 tableKey）：新旧 schema 的 meta 记录都带
    // dbKey，而老 schema 记录没有 tenantId/tableId，严格比对会把这类旧表判成
    // 「表不存在」。dbKey 只与当前 key 相等才算本表，路由切换时旧 meta 依旧被扣住。
    const matchesTable = !!loadedTableMeta && loadedTableMeta.dbKey === tableKey;
    const tableMeta = matchesTable ? loadedTableMeta : null;
    const rows = useMemo(() => matchesTable ? loadedRows.filter((row: any) => row.tenantId === tenantId && row.tableId === tableId) : [],
        [matchesTable, loadedRows, tenantId, tableId]);

    // store 里还留着别的表的 meta（路由切换瞬间）：按 dbKey 去重，只警示一次。
    const warnedMetaDbKeysRef = useRef<Set<string>>(new Set());
    const loadedMetaDbKey = loadedTableMeta?.dbKey;
    useEffect(() => {
        if (!loadedMetaDbKey || loadedMetaDbKey === tableKey) return;
        if (warnedMetaDbKeysRef.current.has(loadedMetaDbKey)) return;
        warnedMetaDbKeysRef.current.add(loadedMetaDbKey);
        logger.warn(
            { loadedTableMetaDbKey: loadedMetaDbKey, expectedTableKey: tableKey },
            "TablePage: loaded table meta belongs to another table, withholding it"
        );
    }, [loadedMetaDbKey, tableKey]);

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
        () => { const view = new URLSearchParams(initialSearch).get("view"); return view === "grid" || view === "kanban" ? view : ""; }
    );

    const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>(() => {
        const raw = new URLSearchParams(initialSearch).get("status");
        return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
    });
    const [selectedOwnerFilters, setSelectedOwnerFilters] = useState<string[]>(() => {
        const raw = new URLSearchParams(initialSearch).get("owner");
        return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
    });

    const selectedStatusFilter = selectedStatusFilters[0] ?? "";
    const selectedOwnerFilter = selectedOwnerFilters[0] ?? "";

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

    // ── 通用多选筛选与看板分组依据 ─────────────────────────────────
    const [selectedGroupColumnName, setSelectedGroupColumnName] = useState<string>("");
    const [customFilters, setCustomFilters] = useState<Record<string, string[]>>({});
    // 看板卡片自定义显示列（null 表示默认全选显示）
    const [visibleCardColumnNames, setVisibleCardColumnNames] = useState<string[] | null>(null);

    // ── TanStack Table v9 ──────────────────────────────────────────
    const columnDefs = useMemo(() => buildTableColumnDefs(columns), [columns]);

    const sorting = useMemo(() => sortRuleToSorting(sortRule), [sortRule]);
    const columnFilters = useMemo(
        () =>
            buildColumnFilters(
                statusFilterColumn,
                selectedStatusFilters,
                ownerFilterColumn,
                selectedOwnerFilters,
                customFilters
            ),
        [customFilters, ownerFilterColumn, selectedOwnerFilters, selectedStatusFilters, statusFilterColumn]
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

    const table = useTanStackTable({
        features: tableFeatures,
        data: rows as TableRow[],
        columns: columnDefs,
        state: { sorting, columnFilters },
        onSortingChange: handleSortingChange,
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
        kanbanGroupCandidates,
        effectiveGroupColumnName,
        allDetailColumns,
        kanbanTitleColumn,
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
        selectedGroupColumnName,
        setSelectedGroupColumnName,
        visibleCardColumnNames: visibleCardColumnNames ?? undefined,
        setVisibleCardColumnNames,
    });

    const effectiveGroupColumn = useMemo(() => {
        // hook 的 activeGroupColumn 已优先采用「有效」选中项，这里直接用它，避免第二份 name→column 解析
        if (!effectiveGroupColumnName) return null;
        return columns.find((c) => c.name === effectiveGroupColumnName) ?? null;
    }, [columns, effectiveGroupColumnName]);

    const effectiveKanbanGroupCandidates = useMemo(() => {
        if (!effectiveGroupColumn) return kanbanGroupCandidates;
        if (kanbanGroupCandidates.some((c) => c.name === effectiveGroupColumn.name)) {
            return kanbanGroupCandidates;
        }
        return [effectiveGroupColumn, ...kanbanGroupCandidates];
    }, [effectiveGroupColumn, kanbanGroupCandidates]);

    const sortedAndOrderedRows = useMemo(() => {
        if (activeDisplayMode.type === "kanban") return filteredRows;

        if (sortRule) {
            const sortedModelRows = table.getSortedRowModel().rows.map((r) => r.original);
            return partitionEmptyLast(sortedModelRows, sortRule.columnId);
        }

        // 无列排序规则时按「最近活动」降序兜底：刚添加/刚改状态的行置顶，
        // 且不再依赖本地缓存的迭代顺序（不同设备顺序一致）。
        return applyManualOrder(
            applyDefaultRecentSort(filteredRows, (r: any) => r.dbKey),
            manualOrder,
            (r: any) => r.dbKey
        );
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
    } = useRowInsertion({
        tenantId,
        tableId,
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

    // 页面级 focusContext 载荷已无消费者（TableFocusContext 只声明单元格字段，
    // buildEditingContext 也仅在 "columnName" in focusContext 时消费）；仅保留卸载清理。
    useEffect(() => {
        return () => {
            setTableFocusContext(null);
        };
    }, []);

    useEffect(() => {
        if (!editingCell) {
            setTableFocusContext(null);
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

        setTableFocusContext({
            rowDbKey: editingCell.dbKey,
            columnName: editingCell.columnName,
            rowIndex: rowIndex >= 0 ? rowIndex : null,
            colIndex: colIndex >= 0 ? colIndex : null,
            rowTitle,
            cellPreview,
            isEditing: true,
        });
    }, [columns, editingCell, filteredRows, primaryColumn]);

  useEffect(() => {
    if (!tableMeta || !selectedStatusFilter) return;
    if (!statusFilterColumn) {
      setSelectedStatusFilters([]);
    }
  }, [selectedStatusFilter, statusFilterColumn, tableMeta]);

  useEffect(() => {
    if (!tableMeta || !selectedOwnerFilter) return;
    if (!ownerFilterColumn) {
      setSelectedOwnerFilters([]);
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

    setOrDelete("status", selectedStatusFilters.join(","));
    setOrDelete("owner", selectedOwnerFilters.join(","));
    setOrDelete("view", activeViewChoice);
    window.history.replaceState(window.history.state, "", url);
  }, [activeViewChoice, selectedOwnerFilters, selectedStatusFilters, tableMeta]);

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
        (columnId: string, newLabel: string) => {
            if (!tenantId || !tableId) return;
            void dispatch(
                renameColumnLabel({
                    tenantId,
                    tableId,
                    columnId,
                    newLabel,
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
                    newName: finalTitle,
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

    // 行加载失败时的重试：优先复用 useTable 暴露的 dispatch + loadTableRows，
    // 保持与初次加载相同的命令路径；仅在缺少 tenant/table 标识时才退回整页刷新。
    const handleRetryLoadRows = useCallback(() => {
        if (tenantId && tableId) {
            void dispatch(loadTableRows({ tenantId, tableId }));
            return;
        }
        if (typeof window !== "undefined") {
            window.location.reload();
        }
    }, [dispatch, tenantId, tableId]);

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

    // 老 schema 的 meta 没有 columns：不假装正常（不给一份"空表"），但也不隐藏行。
    // 只用行数据自身的字段名做兜底表头做只读展示：不推导列类型、不生成列 ID、
    // 不写回 meta，也不改变筛选/看板/列宽逻辑（这些仍依赖真 columns）。
    if (columns.length === 0) {
        const fieldNames: string[] = [];
        for (const row of rows as any[]) {
            for (const field of Object.keys(row)) {
                if (LEGACY_GRID_HIDDEN_FIELDS.has(field)) continue;
                if (!fieldNames.includes(field)) fieldNames.push(field);
            }
        }
        // 表头按全量行推导（列越多越完整），但行本身只渲染前 LEGACY_GRID_MAX_ROWS 行，
        // 避免大表把整表塞进 DOM；不做分页/虚拟化（本块是待删除兜底）。
        const visibleRows = rows.slice(0, LEGACY_GRID_MAX_ROWS);
        const isTruncated = rows.length > visibleRows.length;

        return (
            <div className="table-page">
                <div
                    className="table-page__center-state"
                    data-testid="table-page-columns-repair-pending"
                    style={{ padding: "12px 16px", alignItems: "flex-start", gap: 8 }}
                >
                    <LuCircleAlert size={20} color="var(--warning, #d97706)" aria-hidden="true" />
                    <span>表结构待修复：这张表缺少列定义（columns），当前按行数据字段只读展示。</span>
                    <span>共 {rows.length} 行</span>
                    {isTruncated && (
                        <span data-testid="table-page-legacy-grid-truncated">
                            仅显示前 {visibleRows.length} 行，共 {rows.length} 行
                        </span>
                    )}
                </div>
                <div style={{ overflow: "auto", padding: "0 16px 16px" }}>
                    <table
                        data-testid="table-page-legacy-grid"
                        style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}
                    >
                        <thead>
                            <tr>
                                {fieldNames.map((field) => (
                                    <th
                                        key={field}
                                        style={{
                                            textAlign: "left",
                                            padding: "6px 10px",
                                            whiteSpace: "nowrap",
                                            borderBottom: "1px solid var(--border, #ddd)",
                                        }}
                                    >
                                        {field}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.map((row: any, index: number) => (
                                <tr key={row.dbKey ?? index}>
                                    {fieldNames.map((field) => (
                                        <td
                                            key={field}
                                            style={{
                                                padding: "6px 10px",
                                                borderBottom: "1px solid var(--border, #eee)",
                                            }}
                                        >
                                            {row[field] === null || row[field] === undefined
                                                ? ""
                                                : String(row[field])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // 9. 正常渲染
    return (
        <>
            <div className="table-page">
                {error && (
                    <div
                        className="table-page__center-state table-page__center-state--error table-page__rows-error"
                        data-testid="table-page-rows-error"
                    >
                        <LuCircleAlert size={24} color="var(--error)" aria-hidden="true" />
                        <span>{error}</span>
                        <Button variant="secondary" size="small" onClick={handleRetryLoadRows}>
                            重试
                        </Button>
                    </div>
                )}

                <TableViewControls
                    statusFilterColumn={statusFilterColumn}
                    selectedStatusFilter={selectedStatusFilter}
                    setSelectedStatusFilter={(val) => setSelectedStatusFilters(val ? [val] : [])}
                    selectedStatusFilters={selectedStatusFilters}
                    setSelectedStatusFilters={setSelectedStatusFilters}
                    statusSelectOptions={statusSelectOptions}
                    ownerFilterColumn={ownerFilterColumn}
                    selectedOwnerFilter={selectedOwnerFilter}
                    setSelectedOwnerFilter={(val) => setSelectedOwnerFilters(val ? [val] : [])}
                    selectedOwnerFilters={selectedOwnerFilters}
                    setSelectedOwnerFilters={setSelectedOwnerFilters}
                    ownerSelectOptions={ownerSelectOptions}
                    activeViewChoice={activeViewChoice}
                    setSelectedViewChoice={setSelectedViewChoice}
                    canUseKanbanView={canUseKanbanView}
                    filteredCount={filteredRows.length}
                    totalCount={rows.length}
                    columns={columns}
                    rows={rows}
                    kanbanGroupCandidates={effectiveKanbanGroupCandidates}
                    selectedGroupColumnName={effectiveGroupColumnName}
                    setSelectedGroupColumnName={handleSelectGroupColumn}
                    customFilters={customFilters}
                    setCustomFilters={setCustomFilters}
                    allDetailColumns={allDetailColumns}
                    visibleCardColumnNames={visibleCardColumnNames}
                    setVisibleCardColumnNames={setVisibleCardColumnNames}
                    newColumnName={newColumnName}
                    setNewColumnName={setNewColumnName}
                    onAddColumn={handleAddColumn}
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
                        loadError={error}
                        isLoadingRows={isLoading && rows.length === 0}
                        editingRowIndex={editingRowIndex}
                        editingCell={editingCell}
                        editingValue={editingValue}
                        draggingRowKey={draggingRowKey}
                        dropTarget={dropTarget}
                        currentSpaceId={currentSpaceId}
                        TableActivityBadge={TableActivityBadge}
                        shouldWindowGridRows={shouldWindowGridRows}
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
                        primaryColumn={kanbanTitleColumn}
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

// Keying the complete stateful page resets every local editor/filter/drag state
// before rendering another table, rather than resetting in a post-render effect.
const TablePage: React.FC<TablePageProps> = ({ tableKey }) => {
    const [initialRoute] = useState(() => ({ tableKey, search: typeof window === "undefined" ? "" : window.location.search }));
    return <TablePageContent key={tableKey ?? ""} tableKey={tableKey}
        initialSearch={tableKey === initialRoute.tableKey ? initialRoute.search : ""} />;
};

export default TablePage;
