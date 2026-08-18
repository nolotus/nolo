import {
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import {
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  addRow,
  createTable,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  buildScopedPagePath
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/table/useCreateTable.ts
var import_react = __toESM(require_react(), 1);
var useCreateTable = (options) => {
  const { onSuccess } = options || {};
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const userId = useUserId();
  const [isCreating, setIsCreating] = (0, import_react.useState)(false);
  const createNewTable = (0, import_react.useCallback)(async ({ spaceId, categoryId } = {}) => {
    if (!userId) {
      toast.error(t("space:userNotFound", "\u672A\u627E\u5230\u7528\u6237\u4FE1\u606F\uFF0C\u65E0\u6CD5\u521B\u5EFA\u8868\u683C"));
      return;
    }
    setIsCreating(true);
    try {
      const dbKey = await dispatch(
        createTable({
          spaceId,
          categoryId,
          title: t("space:newTable", "\u65B0\u5EFA\u8868\u683C"),
          withDefaultRows: false
        })
      ).unwrap();
      const parts = dbKey.split("-");
      const tableId = parts.slice(2).join("-");
      await dispatch(
        addRow({
          tenantId: userId,
          tableId,
          values: { title: "\u793A\u4F8B\u6570\u636E", note: "\u8FD9\u662F\u81EA\u52A8\u751F\u6210\u7684\u8BB0\u5F55" }
        })
      ).unwrap();
      onSuccess?.();
      const tablePath = `${buildScopedPagePath(dbKey, spaceId)}?edit=true`;
      navigate(tablePath);
    } catch (error) {
      console.error("Failed to create table:", error);
      toast.error(t("space:createFailed", "\u521B\u5EFA\u8868\u683C\u5931\u8D25"));
    } finally {
      setIsCreating(false);
    }
  }, [dispatch, navigate, userId, t, onSuccess]);
  return {
    createNewTable,
    isCreating
  };
};

export {
  useCreateTable
};
