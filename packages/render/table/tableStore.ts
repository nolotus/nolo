// packages/render/table/tableStore.ts
// Table Domain Store — peeled out of Redux.
// Mirrors packages/render/page/docStore.ts + packages/app/notifications/notificationStore.ts:
//   - listeners Set + monotonic version counter
//   - useSyncExternalStore for React subscribers
//   - pure module state for sync reads (getTableState / getTableSnapshot)
//   - pure domain commands for mutations without Redux slice dependency

import { useSyncExternalStore } from "react";
import { formatISO } from "date-fns";
import { ulid } from "ulid";
import { getRuntimeServerContext } from "database/runtimeServerContext";
import {
  write,
  readAndWait,
  patch,
  upsertSSREntity,
} from "database/dbSlice";
import { metaKey, rowKey } from "database/keys";
import { DataType } from "create/types";
import {
  resolveReplicationServers,
  scheduleWriteReplication,
} from "database/actions/replication";
import { fetchAndCacheTableRows } from "./fetchAndCacheTableRows";
import {
  addColumnOptionInMeta,
  addColumnToMeta,
  deleteColumnFromMeta,
  renameColumnInMeta,
  renameColumnLabelInMeta,
  reorderColumnInMeta,
  updateColumnWidthInMeta,
} from "./tableColumnCore";
import type { CreateTableArgs } from "./createTableAction";
import { createTableAction } from "./createTableAction";
import { deleteTableAction, type DeleteTableArgs } from "./deleteTableAction";
import type { TableMeta } from "./types";
import type { ContentIcon } from "render/contentIcon/types";

async function safeDispatch(dispatch: any, action: any): Promise<any> {
  if (!dispatch) return undefined;
  const res = await dispatch(action);
  if (res && typeof res.unwrap === "function") {
    return await res.unwrap();
  }
  return res?.payload ?? res;
}

/* --------------------------------------------------------------------------
 * State 接口
 * ------------------------------------------------------------------------*/

export interface TableFocusContext {
  rowDbKey: string;
  columnName: string;
  rowIndex: number | null;
  colIndex: number | null;
  rowTitle: string | null;
  cellPreview: string | null;
  isEditing: boolean;
}

export interface TableState {
  currentTable: TableMeta | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  rows: any[];
  focusContext: TableFocusContext | null;
}

const createInitialState = (): TableState => ({
  currentTable: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  rows: [],
  focusContext: null,
});

/* --------------------------------------------------------------------------
 * Store Core (Module Singleton + Listeners + useSyncExternalStore)
 * ------------------------------------------------------------------------*/

const listeners = new Set<() => void>();
let version = 0;
let state: TableState = createInitialState();

const notify = (): void => {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // subscriber error must not break mutator
    }
  }
};

const bump = (): void => {
  version += 1;
  notify();
};

export const setState = (
  updater: TableState | ((prev: TableState) => TableState)
): void => {
  state =
    typeof updater === "function"
      ? (updater as (prev: TableState) => TableState)(state)
      : updater;
  bump();
};

export function subscribeTable(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTableSnapshot(): number {
  return version;
}

export function getTableState(): TableState {
  return state;
}

export function getTableField<T>(selector: (s: TableState) => T): T {
  return selector(state);
}

export function resetTableStoreForTests(): void {
  state = createInitialState();
  bump();
}

/* --------------------------------------------------------------------------
 * React Hooks (useSyncExternalStore)
 * ------------------------------------------------------------------------*/

export function useTableState(): TableState {
  useSyncExternalStore(subscribeTable, getTableSnapshot, getTableSnapshot);
  return getTableState();
}

export function useTableField<T>(selector: (s: TableState) => T): T {
  useSyncExternalStore(subscribeTable, getTableSnapshot, getTableSnapshot);
  return selector(state);
}

export function useCurrentTable(): TableMeta | null {
  return useTableField((s) => s.currentTable);
}

export function useTableRows(): any[] {
  return useTableField((s) => s.rows);
}

export function useTableFocusContext(): TableFocusContext | null {
  return useTableField((s) => s.focusContext);
}

export function useTableIsLoading(): boolean {
  return useTableField((s) => s.isLoading);
}

export function useTableError(): string | null {
  return useTableField((s) => s.error);
}

/* --------------------------------------------------------------------------
 * Command Wrapper (兼容 thunk 调用与直接调用)
 * ------------------------------------------------------------------------*/

export function createTableCommand<Args, Result>(
  name: string,
  fn: (args: Args, context: any) => Promise<Result>
) {
  const command = (args: Args) => {
    return async (dispatch: any, getState: any, extra: any) => {
      try {
        const payload = await fn(args, { dispatch, getState, extra });
        return {
          type: `${name}/fulfilled`,
          payload,
          meta: { arg: args },
          unwrap: async () => payload,
        };
      } catch (err: any) {
        const message = err?.message || String(err);
        return {
          type: `${name}/rejected`,
          payload: message,
          error: { message },
          unwrap: async () => {
            throw err instanceof Error ? err : new Error(message);
          },
        };
      }
    };
  };

  command.fulfilled = {
    type: `${name}/fulfilled`,
    match: (action: any): action is { type: string; payload: Result } =>
      action?.type === `${name}/fulfilled`,
  };

  command.rejected = {
    type: `${name}/rejected`,
    match: (
      action: any
    ): action is { type: string; payload: string; error: { message: string } } =>
      action?.type === `${name}/rejected`,
  };

  command.pending = {
    type: `${name}/pending`,
    match: (action: any) => action?.type === `${name}/pending`,
  };

  command.run = (args: Args, context: any = {}) => fn(args, context);

  return command;
}

/* --------------------------------------------------------------------------
 * Sync Reducers
 * ------------------------------------------------------------------------*/

export const setTableFocusContext = (
  focusContext: TableFocusContext | null
): void => {
  setState((s) => ({ ...s, focusContext }));
};

export const resetTable = (): void => {
  setState(() => createInitialState());
};

/* --------------------------------------------------------------------------
 * Domain Commands (Table Mutations)
 * ------------------------------------------------------------------------*/

export interface InitTableArgs {
  tenantId: string;
  tableId: string;
}

export const initTable = createTableCommand(
  "table/initTable",
  async (args: InitTableArgs, { dispatch }: any = {}) => {
    const { tenantId, tableId } = args;
    const dbKey = metaKey(tenantId, tableId);

    setState((s) => ({
      ...s,
      isLoading: true,
      error: null,
      isInitialized: false,
      currentTable: null,
      rows: [],
    }));

    try {
      if (!dispatch) {
        throw new Error("dispatch is required to initialize table");
      }
      const readAction = await dispatch(readAndWait(dbKey));
      const isMatch = typeof readAndWait?.fulfilled?.match === "function" && readAndWait.fulfilled.match(readAction);
      const meta = ((isMatch && readAction.payload) ? readAction.payload : (readAction?.payload || readAction)) as TableMeta;

      if (meta && typeof meta === "object" && ("columns" in meta || "displayName" in meta || "tableId" in meta)) {
        setState((s) => ({
          ...s,
          isLoading: false,
          isInitialized: true,
          currentTable: meta,
          error: null,
        }));
        return meta;
      }

      const msg =
        (readAction.payload as any)?.message || `无法加载表 ${tableId}`;
      setState((s) => ({
        ...s,
        isLoading: false,
        isInitialized: true,
        currentTable: null,
        error: msg,
        rows: [],
      }));
      throw new Error(msg);
    } catch (e: any) {
      const msg = e?.message || `初始化表 ${tableId} 时出错`;
      setState((s) => ({
        ...s,
        isLoading: false,
        isInitialized: true,
        currentTable: null,
        error: msg,
        rows: [],
      }));
      throw e;
    }
  }
);

export interface LoadTableRowsArgs {
  tenantId: string;
  tableId: string;
}

export const loadTableRows = createTableCommand(
  "table/loadTableRows",
  async (args: LoadTableRowsArgs, { getState, extra }: any = {}) => {
    const { tenantId, tableId } = args;
    const db = extra?.db;

    setState((s) => ({ ...s, error: null }));

    try {
      const stateObj = getState ? getState() : {};
      const { currentToken: token, remoteServers } =
        getRuntimeServerContext(stateObj);
      const rows = await fetchAndCacheTableRows({
        db,
        tenantId,
        tableId,
        token,
        remoteServers,
      });

      setState((s) => ({ ...s, rows }));
      return rows;
    } catch (e: any) {
      const msg = e?.message || "加载表行失败";
      setState((s) => ({ ...s, error: msg, rows: [] }));
      throw e;
    }
  }
);

export interface AddRowArgs {
  tenantId: string;
  tableId: string;
  values: Record<string, any>;
}

export const addRow = createTableCommand(
  "table/addRow",
  async (args: AddRowArgs, { dispatch }: any = {}) => {
    const { tenantId, tableId, values } = args;

    setState((s) => ({ ...s, error: null }));

    try {
      const { dbKey, rowId } = rowKey.create(tenantId, tableId);
      const nowIso = formatISO(new Date());

      const row = {
        dbKey,
        tenantId,
        tableId,
        rowId,
        createdAt: nowIso,
        updatedAt: nowIso,
        type: DataType.TABLE_ROW as const,
        ...values,
      };

      if (dispatch) {
        await safeDispatch(
          dispatch,
          write({
            data: row,
            customKey: dbKey,
          })
        );
      }

      setState((s) => {
        const meta = s.currentTable;
        if (
          meta &&
          row?.tenantId === meta.tenantId &&
          row?.tableId === meta.tableId
        ) {
          return { ...s, rows: [...s.rows, row] };
        }
        return s;
      });

      return row;
    } catch (e: any) {
      const msg = e?.message || "新增表行失败";
      setState((s) => ({ ...s, error: msg }));
      throw e;
    }
  }
);

export const deleteRow = createTableCommand(
  "table/deleteRow",
  async (dbKey: string, { dispatch, getState, extra }: any = {}) => {
    setState((s) => ({ ...s, error: null }));

    try {
      const row = state.rows.find((item: any) => item?.dbKey === dbKey);

      if (!row) {
        throw new Error(`当前表中找不到要删除的行：${dbKey}`);
      }

      const nowIso = formatISO(new Date());
      const tombstoneRow = {
        ...row,
        deletedAt: nowIso,
        updatedAt: nowIso,
        type: DataType.TABLE_ROW as const,
      };

      if (extra?.db && typeof extra.db.put === "function") {
        await extra.db.put(dbKey, tombstoneRow);
      }
      if (dispatch) {
        dispatch(upsertSSREntity(tombstoneRow));
      }

      const stateObj = getState ? getState() : {};
      const { currentServer, syncServers } = getRuntimeServerContext(stateObj);
      const servers = resolveReplicationServers(currentServer, syncServers);
      scheduleWriteReplication(
        servers,
        {
          data: tombstoneRow,
          customKey: dbKey,
        },
        stateObj
      );

      setState((s) => ({
        ...s,
        rows: s.rows.filter((r: any) => r.dbKey !== dbKey),
      }));

      return dbKey;
    } catch (e: any) {
      const msg = e?.message || "删除表行失败";
      setState((s) => ({ ...s, error: msg }));
      throw e;
    }
  }
);

export const createTable = createTableCommand(
  "table/createTable",
  async (args: CreateTableArgs | undefined, context: any = {}) => {
    return await createTableAction(args, context);
  }
);

export const deleteTable = createTableCommand(
  "table/deleteTable",
  async (args: DeleteTableArgs, context: any = {}) => {
    setState((s) => ({ ...s, error: null }));
    try {
      const deletedKey = await deleteTableAction(args, context);
      setState((s) => {
        if (s.currentTable?.dbKey === deletedKey) {
          return {
            ...s,
            currentTable: null,
            rows: [],
            isInitialized: false,
          };
        }
        return s;
      });
      return deletedKey;
    } catch (e: any) {
      const msg = e?.message || "删除表时发生未知错误";
      setState((s) => ({ ...s, error: msg }));
      throw e;
    }
  }
);

export interface AddColumnArgs {
  tenantId: string;
  tableId: string;
  columnName: string;
}

export const addColumn = createTableCommand(
  "table/addColumn",
  async (args: AddColumnArgs, { dispatch }: any = {}) => {
    const { tenantId, tableId, columnName } = args;
    const meta = state.currentTable;

    if (!meta || meta.tenantId !== tenantId || meta.tableId !== tableId) {
      throw new Error("当前没有加载对应的表定义");
    }

    const result = addColumnToMeta(
      meta,
      { columnName },
      { id: ulid(), nowIso: formatISO(new Date()) }
    );
    if (!result.ok) {
      throw new Error(result.error);
    }

    setState((s) => ({ ...s, error: null }));

    try {
      if (dispatch) {
        await safeDispatch(
          dispatch,
          patch({
            dbKey: meta.dbKey,
            changes: result.value.metaChanges,
          })
        );
      }

      setState((s) => ({
        ...s,
        currentTable: result.value.meta,
        isInitialized: true,
      }));

      return result.value.meta;
    } catch (e: any) {
      const msg = e?.message || "添加字段失败";
      setState((s) => ({ ...s, error: msg }));
      throw e;
    }
  }
);

export interface DeleteColumnArgs {
  tenantId: string;
  tableId: string;
  columnName: string;
}

export const deleteColumn = createTableCommand(
  "table/deleteColumn",
  async (args: DeleteColumnArgs, { dispatch }: any = {}) => {
    const { tenantId, tableId, columnName } = args;
    const meta = state.currentTable;

    if (!meta || meta.tenantId !== tenantId || meta.tableId !== tableId) {
      throw new Error("当前没有加载对应的表定义");
    }

    const result = deleteColumnFromMeta(
      meta,
      state.rows,
      { columnName },
      { nowIso: formatISO(new Date()) }
    );
    if (!result.ok) {
      throw new Error(result.error);
    }
    const { meta: nextMeta, metaChanges, rows: newRows, rowPatches } =
      result.value;

    setState((s) => ({ ...s, error: null }));

    try {
      if (dispatch) {
        await Promise.all(
          rowPatches.map((p) => safeDispatch(dispatch, patch(p)))
        );
        await safeDispatch(
          dispatch,
          patch({ dbKey: meta.dbKey, changes: metaChanges })
        );
      }

      setState((s) => ({
        ...s,
        currentTable: nextMeta,
        rows: newRows,
        isInitialized: true,
      }));

      return { meta: nextMeta, rows: newRows };
    } catch (e: any) {
      const msg = e?.message || "删除字段失败";
      setState((s) => ({ ...s, error: msg }));
      throw e;
    }
  }
);

export interface ReorderColumnArgs {
  tenantId: string;
  tableId: string;
  fromIndex: number;
  toIndex: number;
}

export const reorderColumn = createTableCommand(
  "table/reorderColumn",
  async (args: ReorderColumnArgs, { dispatch }: any = {}) => {
    const { tenantId, tableId, fromIndex, toIndex } = args;
    const meta = state.currentTable;

    if (!meta || meta.tenantId !== tenantId || meta.tableId !== tableId) {
      throw new Error("当前没有加载对应的表定义");
    }

    const result = reorderColumnInMeta(
      meta,
      { fromIndex, toIndex },
      { nowIso: formatISO(new Date()) }
    );
    if (!result.ok) {
      throw new Error(result.error);
    }
    if (result.value.noop) {
      return meta;
    }
    const { meta: nextMeta, metaChanges } = result.value;

    setState((s) => ({ ...s, error: null }));

    try {
      if (dispatch) {
        await safeDispatch(
          dispatch,
          patch({ dbKey: meta.dbKey, changes: metaChanges })
        );
      }

      setState((s) => ({
        ...s,
        currentTable: nextMeta,
        isInitialized: true,
      }));

      return nextMeta;
    } catch (e: any) {
      const msg = e?.message || "调整列顺序失败";
      setState((s) => ({ ...s, error: msg }));
      throw e;
    }
  }
);

export interface RenameColumnArgs {
  tenantId: string;
  tableId: string;
  oldName: string;
  newName: string;
}

export const renameColumn = createTableCommand(
  "table/renameColumn",
  async (args: RenameColumnArgs, { dispatch }: any = {}) => {
    const { tenantId, tableId, oldName, newName } = args;
    const meta = state.currentTable;

    if (!meta || meta.tenantId !== tenantId || meta.tableId !== tableId) {
      throw new Error("当前没有加载对应的表定义");
    }

    const result = renameColumnInMeta(
      meta,
      state.rows,
      { oldName, newName },
      { nowIso: formatISO(new Date()) }
    );
    if (!result.ok) {
      throw new Error(result.error);
    }
    const { meta: nextMeta, metaChanges, rows: newRows, rowPatches } =
      result.value;

    setState((s) => ({ ...s, error: null }));

    try {
      if (dispatch) {
        await Promise.all(
          rowPatches.map((p) => safeDispatch(dispatch, patch(p)))
        );
        await safeDispatch(
          dispatch,
          patch({ dbKey: meta.dbKey, changes: metaChanges })
        );
      }

      setState((s) => ({
        ...s,
        currentTable: nextMeta,
        rows: newRows,
        isInitialized: true,
      }));

      return { meta: nextMeta, rows: newRows };
    } catch (e: any) {
      const msg = e?.message || "重命名字段失败";
      setState((s) => ({ ...s, error: msg }));
      throw e;
    }
  }
);

export interface RenameColumnLabelArgs {
  tenantId: string;
  tableId: string;
  columnId: string;
  newLabel: string;
}

export const renameColumnLabel = createTableCommand(
  "table/renameColumnLabel",
  async (args: RenameColumnLabelArgs, { dispatch }: any = {}) => {
    const { tenantId, tableId, columnId, newLabel } = args;
    const meta = state.currentTable;

    if (!meta || meta.tenantId !== tenantId || meta.tableId !== tableId) {
      throw new Error("当前没有加载对应的表定义");
    }

    const result = renameColumnLabelInMeta(
      meta,
      { columnId, label: newLabel },
      { nowIso: formatISO(new Date()) }
    );
    if (!result.ok) {
      throw new Error(result.error);
    }
    const { meta: nextMeta, metaChanges } = result.value;

    setState((s) => ({ ...s, error: null }));

    try {
      if (dispatch) {
        await safeDispatch(
          dispatch,
          patch({ dbKey: meta.dbKey, changes: metaChanges })
        );
      }

      setState((s) => ({
        ...s,
        currentTable: nextMeta,
        isInitialized: true,
      }));

      return nextMeta;
    } catch (e: any) {
      const msg = e?.message || "重命名字段显示名失败";
      setState((s) => ({ ...s, error: msg }));
      throw e;
    }
  }
);

export interface UpdateColumnWidthArgs {
  tenantId: string;
  tableId: string;
  columnId: string;
  width: number;
}

export const updateColumnWidth = createTableCommand(
  "table/updateColumnWidth",
  async (args: UpdateColumnWidthArgs, { dispatch }: any = {}) => {
    const { tenantId, tableId, columnId, width } = args;
    const meta = state.currentTable;

    if (!meta || meta.tenantId !== tenantId || meta.tableId !== tableId) {
      throw new Error("当前没有加载对应的表定义");
    }

    const result = updateColumnWidthInMeta(
      meta,
      { columnId, width },
      { nowIso: formatISO(new Date()) }
    );
    if (!result.ok) {
      throw new Error(result.error);
    }
    const { meta: nextMeta, metaChanges } = result.value;

    setState((s) => ({ ...s, error: null }));

    try {
      if (dispatch) {
        await safeDispatch(
          dispatch,
          patch({ dbKey: meta.dbKey, changes: metaChanges })
        );
      }

      setState((s) => ({
        ...s,
        currentTable: nextMeta,
        isInitialized: true,
      }));

      return nextMeta;
    } catch (e: any) {
      const msg = e?.message || "更新字段宽度失败";
      setState((s) => ({ ...s, error: msg }));
      throw e;
    }
  }
);

export interface AddColumnOptionArgs {
  tenantId: string;
  tableId: string;
  columnId: string;
  option: string;
}

export const addColumnOption = createTableCommand(
  "table/addColumnOption",
  async (args: AddColumnOptionArgs, { dispatch }: any = {}) => {
    const { tenantId, tableId, columnId, option } = args;
    const meta = state.currentTable;

    if (!meta || meta.tenantId !== tenantId || meta.tableId !== tableId) {
      throw new Error("当前没有加载对应的表定义");
    }

    const result = addColumnOptionInMeta(
      meta,
      { columnId, option },
      { nowIso: formatISO(new Date()) }
    );
    if (!result.ok) {
      throw new Error(result.error);
    }
    if (result.value.noop) {
      return meta;
    }
    const { meta: nextMeta, metaChanges } = result.value;

    setState((s) => ({ ...s, error: null }));

    try {
      if (dispatch) {
        await safeDispatch(
          dispatch,
          patch({ dbKey: meta.dbKey, changes: metaChanges })
        );
      }

      setState((s) => ({
        ...s,
        currentTable: nextMeta,
        isInitialized: true,
      }));

      return nextMeta;
    } catch (e: any) {
      const msg = e?.message || "新增选项失败";
      setState((s) => ({ ...s, error: msg }));
      throw e;
    }
  }
);

export interface RenameTableArgs {
  tenantId: string;
  tableId: string;
  newName: string;
}

export const renameTable = createTableCommand(
  "table/renameTable",
  async (args: RenameTableArgs, { dispatch }: any = {}) => {
    const { tenantId, tableId, newName } = args;
    const trimmedName = newName.trim();

    if (!trimmedName) {
      throw new Error("表名不能为空");
    }

    const meta = state.currentTable;

    if (!meta || meta.tenantId !== tenantId || meta.tableId !== tableId) {
      throw new Error("当前没有加载对应的表定义");
    }

    const nowIso = formatISO(new Date());

    setState((s) => ({ ...s, error: null }));

    try {
      if (dispatch) {
        await safeDispatch(
          dispatch,
          patch({
            dbKey: meta.dbKey,
            changes: {
              displayName: trimmedName,
              updatedAt: nowIso,
            },
          })
        );
      }

      const nextMeta: TableMeta = {
        ...meta,
        displayName: trimmedName,
        updatedAt: nowIso,
      };

      setState((s) => ({
        ...s,
        currentTable: nextMeta,
        isInitialized: true,
      }));

      return nextMeta;
    } catch (e: any) {
      const msg = e?.message || "重命名表失败";
      setState((s) => ({ ...s, error: msg }));
      throw e;
    }
  }
);

export interface UpdateTableIconArgs {
  tenantId: string;
  tableId: string;
  icon: ContentIcon | null;
}

export const updateTableIcon = createTableCommand(
  "table/updateTableIcon",
  async (args: UpdateTableIconArgs, { dispatch }: any = {}) => {
    const { tenantId, tableId, icon } = args;
    const meta = state.currentTable;

    if (!meta || meta.tenantId !== tenantId || meta.tableId !== tableId) {
      throw new Error("当前没有加载对应的表定义");
    }

    const nowIso = formatISO(new Date());

    setState((s) => ({ ...s, error: null }));

    try {
      if (dispatch) {
        await safeDispatch(
          dispatch,
          patch({
            dbKey: meta.dbKey,
            changes: {
              icon: icon ?? null,
              updatedAt: nowIso,
            },
          })
        );
      }

      const nextMeta: TableMeta = {
        ...meta,
        icon: icon ?? null,
        updatedAt: nowIso,
      };

      setState((s) => ({
        ...s,
        currentTable: nextMeta,
      }));

      return nextMeta;
    } catch (e: any) {
      const msg = e?.message || "更新表格图标失败";
      setState((s) => ({ ...s, error: msg }));
      throw e;
    }
  }
);

export interface UpdateCellArgs {
  dbKey: string;
  columnName: string;
  value: any;
}

export const updateCell = createTableCommand(
  "table/updateCell",
  async (args: UpdateCellArgs, { dispatch }: any = {}) => {
    const { dbKey, columnName, value } = args;

    setState((s) => ({ ...s, error: null }));

    try {
      const nowIso = formatISO(new Date());

      if (dispatch) {
        await safeDispatch(
          dispatch,
          patch({
            dbKey,
            changes: {
              [columnName]: value,
              updatedAt: nowIso,
            },
          })
        );
      }

      setState((s) => ({
        ...s,
        rows: s.rows.map((r: any) => {
          if (r.dbKey === dbKey) {
            return {
              ...r,
              [columnName]: value,
              updatedAt: nowIso,
            };
          }
          return r;
        }),
      }));

      return { dbKey, columnName, value, updatedAt: nowIso };
    } catch (e: any) {
      const msg = e?.message || "更新单元格失败";
      setState((s) => ({ ...s, error: msg }));
      throw e;
    }
  }
);

/* --------------------------------------------------------------------------
 * Pure Selectors (Functions)
 * ------------------------------------------------------------------------*/

export const selectCurrentTable = (s: TableState = state): TableMeta | null =>
  s.currentTable;

export const selectTableIsLoading = (s: TableState = state): boolean =>
  s.isLoading;

export const selectTableIsInitialized = (s: TableState = state): boolean =>
  s.isInitialized;

export const selectTableError = (s: TableState = state): string | null =>
  s.error;

export const selectTableColumns = (s: TableState = state): any[] =>
  s.currentTable ? s.currentTable.columns : [];

export const selectTableRows = (s: TableState = state): any[] => s.rows;

export const selectTableFocusContext = (
  s: TableState = state
): TableFocusContext | null => s.focusContext;
