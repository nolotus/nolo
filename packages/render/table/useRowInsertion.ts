// packages/render/table/useRowInsertion.ts
// 行插入逻辑 Hook（包含无序置顶/追加、有序插入与筛选/排序提示）。

import { useCallback } from "react";
import { toast } from "app/utils/toast";
import { addRow } from "./tableSlice";
import {
    anchorForInsertAbove,
    insertKeyIntoOrder,
    type RowOrderAnchor,
} from "./rowOrderUtils";
import type { TableSortRule } from "./tablePrefs";
import type { TableColumn } from "./types";

export interface UseRowInsertionOptions {
    tenantId?: string;
    tableId?: string;
    sortedAndOrderedRows: any[];
    primaryColumn?: TableColumn;
    sortRule: TableSortRule | null;
    manualOrder: string[] | null;
    setManualOrder: React.Dispatch<React.SetStateAction<string[] | null>>;
    persistPrefs: (next: { sort?: TableSortRule | null; manualOrder?: string[] | null }) => void;
    selectedStatusFilter: string;
    selectedOwnerFilter: string;
    setEditingCell: (cell: { dbKey: string; columnName: string } | null) => void;
    setEditingValue: (val: string) => void;
    dispatch: any;
}

export function useRowInsertion({
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
}: UseRowInsertionOptions) {
    const insertRowAt = useCallback(
        async (anchor: RowOrderAnchor) => {
            if (!tenantId || !tableId) return;
            const action = await dispatch(addRow({ tenantId, tableId, values: {} }));
            if (!addRow.fulfilled.match(action)) {
                toast.error("新增行失败，请稍后重试");
                return;
            }

            const newDbKey = (action.payload as { dbKey?: string } | undefined)
                ?.dbKey;
            if (!newDbKey) {
                toast.error("新增行失败，请稍后重试");
                return;
            }

            if (sortRule) {
                toast("已按当前排序规则放置新行");
            } else if (anchor.type !== "bottom") {
                // 用「当前显示序」物化手动行序（与 rowOrderUtils 的
                // 视觉位置 = 持久位置契约一致）：默认按最近活动排序后，
                // 原始 rows（本地缓存创建序）与屏幕顺序不同，若用 rows
                // 物化，右键插入会让整表跳回旧顺序且新行落错位置。
                const visibleKeys = sortedAndOrderedRows
                    .filter((row: any) => row?.dbKey)
                    .map((row: any) => row.dbKey as string);
                const nextOrder = insertKeyIntoOrder(
                    manualOrder,
                    visibleKeys,
                    newDbKey,
                    anchor
                );
                setManualOrder(nextOrder);
                persistPrefs({ manualOrder: nextOrder });
            }

            if (selectedStatusFilter || selectedOwnerFilter) {
                toast("新行已被当前筛选隐藏，清除筛选后可见");
            }

            if (primaryColumn && primaryColumn.type !== "select") {
                setEditingCell({ dbKey: newDbKey, columnName: primaryColumn.name });
                setEditingValue("");
            }
        },
        [
            dispatch,
            manualOrder,
            persistPrefs,
            primaryColumn,
            sortedAndOrderedRows,
            selectedOwnerFilter,
            selectedStatusFilter,
            setEditingCell,
            setEditingValue,
            setManualOrder,
            sortRule,
            tableId,
            tenantId,
        ]
    );

    const handleInsertRowBelow = useCallback(
        (dbKey: string) => {
            void insertRowAt({ type: "after", key: dbKey });
        },
        [insertRowAt]
    );

    const handleInsertRowAbove = useCallback(
        (dbKey: string) => {
            const visibleKeys = sortedAndOrderedRows
                .filter((row: any) => row?.dbKey)
                .map((row: any) => row.dbKey as string);
            void insertRowAt(anchorForInsertAbove(visibleKeys, dbKey));
        },
        [insertRowAt, sortedAndOrderedRows]
    );

    const handleAddRowTop = useCallback(() => {
        void insertRowAt({ type: "top" });
    }, [insertRowAt]);

    return {
        insertRowAt,
        handleInsertRowBelow,
        handleInsertRowAbove,
        handleAddRowTop,
    };
}
