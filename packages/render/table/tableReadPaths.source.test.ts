import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const tableSliceSource = readFileSync(
  join(import.meta.dir, "tableSlice.ts"),
  "utf-8"
);
const useTableSource = readFileSync(
  join(import.meta.dir, "useTable.ts"),
  "utf-8"
);

describe("table read path source contract", () => {
  it("reuses fetchAndCacheTableRows for multi-source row loading", () => {
    expect(tableSliceSource).toContain('import { fetchAndCacheTableRows } from "./fetchAndCacheTableRows"');
    expect(tableSliceSource).toContain("return await fetchAndCacheTableRows({");
    expect(tableSliceSource).not.toContain("fetchTableRowsFromServer(server, tenantId, tableId");
  });

  it("derives table read and delete planning from the runtime snapshot", () => {
    expect(tableSliceSource).toContain('import { getRuntimeServerContext } from "database/runtimeServerContext"');
    expect(tableSliceSource).toContain("getRuntimeServerContext(state)");
    expect(tableSliceSource).not.toContain("selectCurrentServer");
    expect(tableSliceSource).not.toContain("selectSyncServers");
  });

  it("reloads table metadata and rows when the active auth token changes", () => {
    expect(useTableSource).toContain('import { useToken, useUserId } from "identity"');
    expect(useTableSource).toContain("const currentToken = useToken();");
    expect(useTableSource).toContain("const currentUserId = useUserId();");
    expect(useTableSource).toContain("[dispatch, enabled, valid, tenantId, tableId, currentToken, currentUserId]");
  });
});
