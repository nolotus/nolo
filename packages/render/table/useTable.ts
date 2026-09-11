// packages/render/table/useTable.ts

import { useEffect, useMemo } from "react";
import { useAppDispatch } from "app/store";
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
    const dispatch = useAppDispatch();
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
