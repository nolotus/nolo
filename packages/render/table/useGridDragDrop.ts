// packages/render/table/useGridDragDrop.ts
// 表格网格行拖拽 Hook。

import { useCallback, useState } from "react";

export function useGridDragDrop(
    handleRowDrop: (draggingRowKey: string, targetRowDbKey: string, position: "before" | "after") => void
) {
    const [draggingRowKey, setDraggingRowKey] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<{
        rowDbKey: string;
        position: "before" | "after";
    } | null>(null);

    const handleRowDragStart = useCallback(
        (dbKey: string, e: React.DragEvent<HTMLTableRowElement>) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", dbKey);
            setDraggingRowKey(dbKey);
            setDropTarget(null);
        },
        []
    );

    const handleRowDragEnd = useCallback(() => {
        setDraggingRowKey(null);
        setDropTarget(null);
    }, []);

    const handleRowDragOver = useCallback(
        (dbKey: string, e: React.DragEvent<HTMLTableRowElement>) => {
            if (!draggingRowKey || draggingRowKey === dbKey) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const position: "before" | "after" =
                e.clientY < rect.top + rect.height / 2 ? "before" : "after";
            setDropTarget((prev) => {
                if (
                    prev &&
                    prev.rowDbKey === dbKey &&
                    prev.position === position
                ) {
                    return prev;
                }
                return { rowDbKey: dbKey, position };
            });
        },
        [draggingRowKey]
    );

    const handleRowDragLeave = useCallback((dbKey: string) => {
        setDropTarget((prev) => (prev?.rowDbKey === dbKey ? null : prev));
    }, []);

    const handleRowDropOnKey = useCallback(
        (dbKey: string) => {
            if (!draggingRowKey) {
                setDropTarget(null);
                return;
            }
            const position: "before" | "after" =
                dropTarget && dropTarget.rowDbKey === dbKey
                    ? dropTarget.position
                    : "after";
            handleRowDrop(draggingRowKey, dbKey, position);
            setDraggingRowKey(null);
            setDropTarget(null);
        },
        [draggingRowKey, dropTarget, handleRowDrop]
    );

    return {
        draggingRowKey,
        setDraggingRowKey,
        dropTarget,
        setDropTarget,
        handleRowDragStart,
        handleRowDragEnd,
        handleRowDragOver,
        handleRowDragLeave,
        handleRowDropOnKey,
    };
}
