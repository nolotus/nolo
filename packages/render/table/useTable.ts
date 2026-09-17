// packages/render/table/useTable.ts

import { useEffect, useMemo } from "react";
import { useAppDispatch } from "app/store";
import type { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import type { AppExtra, RootState } from "app/store";
import {
    initTable,
    loadTableRows,
    useTableField,
} from "./tableStore";
import { SEPARATOR } from "database/keys";
import { useToken, useUserId } from "identity";

export interface UseTableOptions {
    enabled?: boolean;
}

export const useTable = (tableKey: string | undefined, options: UseTableOptions = {}) => {
    const { enabled = true } = options;
    // 表格域只允许 dispatch 真命令/真 thunk：把暴露给调用方的 dispatch 收窄成严格
    // ThunkDispatch —— 形如 `dispatch(某模块 store setter(...))`（返回 void）的误用
    // 会直接编译失败。这是 2026-09-17 事故（dispatch(undefined) → Redux #7，页面被
    // 错误边界兜底）的类型层防线，见 docs/incidents/2026-09-17-table-page-focus-
    // context-dispatch-crash.md。
    const dispatch: ThunkDispatch<RootState, AppExtra, UnknownAction> =
        useAppDispatch() as ThunkDispatch<RootState, AppExtra, UnknownAction>;
    const currentToken = useToken();
    const currentUserId = useUserId();

    // 1. Parse Key
    const { tenantId, tableId, valid } = useMemo(() => {
        if (!tableKey) return { tenantId: "", tableId: "", valid: false };
        const parts = tableKey.split(SEPARATOR);
        // meta-{tenantId}-{tableId}
        if (parts[0] !== "meta" || parts.length < 3) {
            return { tenantId: "", tableId: "", valid: false };
        }
        const tableId = parts.slice(2).join(SEPARATOR);
        const tenantId = parts[1];

        return { tenantId, tableId, valid: true };
    }, [tableKey]);

    // 2. Load Data
    useEffect(() => {
        if (enabled && valid && tenantId && tableId) {
            void dispatch(initTable({ tenantId, tableId }));
            void dispatch(loadTableRows({ tenantId, tableId }));
        }
    }, [dispatch, enabled, valid, tenantId, tableId, currentToken, currentUserId]);

    // 3. Domain Store Reads (peeled out of Redux)
    const tableMeta = useTableField((s) => s.currentTable);
    const isLoading = useTableField((s) => s.isLoading);
    const error = useTableField((s) => s.error);
    const rows = useTableField((s) => s.rows);

    return {
        tenantId,
        tableId,
        valid,
        tableMeta,
        isLoading,
        error,
        rows,
        dispatch,
    };
};
