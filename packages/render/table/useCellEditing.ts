// packages/render/table/useCellEditing.ts
// 单元格内联编辑与键盘导航 Hook。

import { useCallback, useState } from "react";
import { updateCell } from "./tableSlice";
import { isImeComposingKeyEvent } from "./keyboardUtils";
import type { TableColumn } from "./types";

export function useCellEditing(
    rows: any[],
    filteredRows: any[],
    columns: TableColumn[],
    dispatch: any
) {
    const [editingCell, setEditingCell] = useState<{
        dbKey: string;
        columnName: string;
    } | null>(null);
    const [editingValue, setEditingValue] = useState<string>("");

    const saveCurrentEdit = useCallback(() => {
        if (!editingCell) return;
        const { dbKey, columnName } = editingCell;
        const row = rows.find((r: any) => r.dbKey === dbKey);
        const oldValue = row ? String(row[columnName] ?? "") : "";

        if (editingValue !== oldValue) {
            void dispatch(updateCell({ dbKey, columnName, value: editingValue }));
        }
    }, [dispatch, editingCell, editingValue, rows]);

    const finishEdit = useCallback(
        (save: boolean) => {
            if (save) {
                saveCurrentEdit();
            }
            setEditingCell(null);
            setEditingValue("");
        },
        [saveCurrentEdit]
    );

    const switchCell = useCallback(
        (direction: "next" | "prev" | "down" | "up") => {
            if (!editingCell || !columns) return;

            const columnsInner = columns;
            const currentRowIndex = filteredRows.findIndex(
                (r: any) => r.dbKey === editingCell.dbKey
            );
            const currentColIndex = columnsInner.findIndex(
                (c) => c.name === editingCell.columnName
            );

            if (currentRowIndex === -1 || currentColIndex === -1) return;

            let nextRowIndex = currentRowIndex;
            let nextColIndex = currentColIndex;

            if (direction === "next") {
                nextColIndex++;
                if (nextColIndex >= columnsInner.length) {
                    nextColIndex = 0;
                    nextRowIndex++;
                }
            } else if (direction === "prev") {
                nextColIndex--;
                if (nextColIndex < 0) {
                    nextColIndex = columnsInner.length - 1;
                    nextRowIndex--;
                }
            } else if (direction === "down") {
                nextRowIndex++;
            } else if (direction === "up") {
                nextRowIndex--;
            }

            // select 列不进 textarea 编辑态：左右导航时跳过该列。
            if (direction === "next" || direction === "prev") {
                const step = direction === "next" ? 1 : -1;
                let guard = 0;
                while (
                    guard < columnsInner.length &&
                    columnsInner[nextColIndex]?.type === "select"
                ) {
                    nextColIndex += step;
                    if (nextColIndex >= columnsInner.length) {
                        nextColIndex = 0;
                        nextRowIndex++;
                    } else if (nextColIndex < 0) {
                        nextColIndex = columnsInner.length - 1;
                        nextRowIndex--;
                    }
                    guard++;
                }
                if (columnsInner[nextColIndex]?.type === "select") {
                    finishEdit(true);
                    return;
                }
            }

            const isRowValid = nextRowIndex >= 0 && nextRowIndex < filteredRows.length;
            const isColValid =
                nextColIndex >= 0 && nextColIndex < columnsInner.length;

            if (isRowValid && isColValid) {
                saveCurrentEdit();

                const nextRow = filteredRows[nextRowIndex];
                const nextCol = columnsInner[nextColIndex];
                const nextValue = String(nextRow[nextCol.name] ?? "");

                setEditingCell({ dbKey: nextRow.dbKey, columnName: nextCol.name });
                setEditingValue(nextValue);
            } else {
                finishEdit(true);
            }
        },
        [editingCell, columns, filteredRows, saveCurrentEdit, finishEdit]
    );

    const handleKeyDown = useCallback(
        (
            e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
        ) => {
            // IME 组合中（如中文输入法选字确认）：Enter/Tab/Escape 都是输入法
            // 操作，不是表格编辑指令。
            if (isImeComposingKeyEvent(e)) {
                return;
            }

            if (e.key === "Tab") {
                e.preventDefault();
                switchCell(e.shiftKey ? "prev" : "next");
                return;
            }

            if (e.key === "Enter") {
                // Shift+Enter：在单元格内换行
                if (e.shiftKey) {
                    return;
                }
                // 普通 Enter：保存并跳到下一行
                e.preventDefault();
                switchCell("down");
                return;
            }

            if (e.key === "Escape") {
                e.preventDefault();
                finishEdit(false);
                return;
            }
        },
        [switchCell, finishEdit]
    );

    const handleStartEdit = useCallback(
        (dbKey: string, columnName: string, value: string) => {
            setEditingCell({ dbKey, columnName });
            setEditingValue(value);
        },
        []
    );

    const handleEditingValueChange = useCallback((value: string) => {
        setEditingValue(value);
    }, []);

    return {
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
    };
}
