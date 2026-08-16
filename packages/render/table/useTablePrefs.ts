// packages/render/table/useTablePrefs.ts
// 客户端视图偏好：手动行序 + 列排序规则 Hook。

import { useCallback, useEffect, useState } from "react";
import {
    readTablePrefs,
    writeTablePrefs,
    type TableSortRule,
} from "./tablePrefs";

export function useTablePrefs(
    tableKey: string | undefined,
    rows: any[]
) {
    const [manualOrder, setManualOrder] = useState<string[] | null>(
        () => readTablePrefs(tableKey).manualOrder
    );
    const [sortRule, setSortRule] = useState<TableSortRule | null>(
        () => readTablePrefs(tableKey).sort
    );

    // 当 tableKey 变化时重新加载偏好（理论上路由不切就不变，但留个兜底）。
    useEffect(() => {
        const prefs = readTablePrefs(tableKey);
        setManualOrder(prefs.manualOrder);
        setSortRule(prefs.sort);
    }, [tableKey]);

    const persistPrefs = useCallback(
        (next: { sort?: TableSortRule | null; manualOrder?: string[] | null }) => {
            const current = readTablePrefs(tableKey);
            writeTablePrefs(tableKey, {
                sort: next.sort !== undefined ? next.sort : current.sort,
                manualOrder:
                    next.manualOrder !== undefined ? next.manualOrder : current.manualOrder,
            });
        },
        [tableKey]
    );

    const handleSortClick = useCallback(
        (columnId: string) => {
            setSortRule((prev) => {
                if (!prev || prev.columnId !== columnId) {
                    const next: TableSortRule = { columnId, direction: "asc" };
                    persistPrefs({ sort: next });
                    return next;
                }
                if (prev.direction === "asc") {
                    const next: TableSortRule = { columnId, direction: "desc" };
                    persistPrefs({ sort: next });
                    return next;
                }
                persistPrefs({ sort: null });
                return null;
            });
        },
        [persistPrefs]
    );

    // 拖拽行重排：按 dbKey 列表计算新顺序，写回 manualOrder。
    const handleRowDrop = useCallback(
        (draggingRowKey: string, targetRowDbKey: string, position: "before" | "after") => {
            if (!draggingRowKey || draggingRowKey === targetRowDbKey) {
                return;
            }
            setManualOrder((prev) => {
                const base =
                    prev ??
                    rows
                        .filter((row: any) => row?.dbKey)
                        .map((row: any) => row.dbKey as string);
                const filtered = base.filter((key) => key !== draggingRowKey);
                const targetIndex = filtered.indexOf(targetRowDbKey);
                if (targetIndex < 0) {
                    const next = [...filtered, draggingRowKey];
                    persistPrefs({ manualOrder: next });
                    return next;
                }
                const insertIndex = position === "before" ? targetIndex : targetIndex + 1;
                const next = [
                    ...filtered.slice(0, insertIndex),
                    draggingRowKey,
                    ...filtered.slice(insertIndex),
                ];
                persistPrefs({ manualOrder: next });
                return next;
            });
        },
        [persistPrefs, rows]
    );

    return {
        manualOrder,
        setManualOrder,
        sortRule,
        setSortRule,
        persistPrefs,
        handleSortClick,
        handleRowDrop,
    };
}
