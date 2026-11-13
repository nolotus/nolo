import { updateContentTitle } from "create/space/content/contentThunks";
import { renameTable } from "./tableStore";
import type { TableMeta } from "./types";

/** Rename the loaded record and its owning space entry, never the browsing space. */
export const renameTableWithSpace = (
  dispatch: (action: any) => any,
  table: Pick<TableMeta, "tenantId" | "tableId" | "spaceId">,
  title: string,
): void => {
  const finalTitle = title.trim() || table.tableId;
  void dispatch(renameTable({ tenantId: table.tenantId, tableId: table.tableId, newName: finalTitle }));
  if (table.spaceId) {
    void dispatch(updateContentTitle({
      spaceId: table.spaceId,
      contentKey: `meta-${table.tenantId}-${table.tableId}`,
      title: finalTitle,
    }));
  }
};
