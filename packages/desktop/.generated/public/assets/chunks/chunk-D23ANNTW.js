import {
  useToken,
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  SEPARATOR,
  initTable,
  loadTableRows,
  selectCurrentTable,
  selectTableError,
  selectTableIsLoading,
  selectTableRows
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/table/useTable.ts
var import_react = __toESM(require_react(), 1);
var useTable = (tableKey, options = {}) => {
  const { enabled = true } = options;
  const dispatch = useAppDispatch();
  const currentToken = useToken();
  const currentUserId = useUserId();
  const { tenantId, tableId, valid } = (0, import_react.useMemo)(() => {
    if (!tableKey) return { tenantId: "", tableId: "", valid: false };
    const parts = tableKey.split(SEPARATOR);
    if (parts[0] !== "meta" || parts.length < 3) {
      return { tenantId: "", tableId: "", valid: false };
    }
    const tableId2 = parts.slice(2).join(SEPARATOR);
    const tenantId2 = parts[1];
    return { tenantId: tenantId2, tableId: tableId2, valid: true };
  }, [tableKey]);
  (0, import_react.useEffect)(() => {
    if (enabled && valid && tenantId && tableId) {
      void dispatch(initTable({ tenantId, tableId }));
      void dispatch(loadTableRows({ tenantId, tableId }));
    }
  }, [dispatch, enabled, valid, tenantId, tableId, currentToken, currentUserId]);
  const tableMeta = useAppSelector(selectCurrentTable);
  const isLoading = useAppSelector(selectTableIsLoading);
  const error = useAppSelector(selectTableError);
  const rows = useAppSelector(selectTableRows);
  return {
    tenantId,
    tableId,
    valid,
    tableMeta,
    isLoading,
    error,
    rows,
    dispatch
  };
};

export {
  useTable
};
