import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(import.meta.dir, relativePath), "utf-8");

describe("table path source contract", () => {
  it("creates tables through dbSlice.write in createTableAction", () => {
    const source = readSource("createTableAction.ts");
    expect(source).toContain('import { write } from "database/dbSlice";');
    expect(source).toContain("write({");
    expect(source).toContain("data: tableMeta");
    expect(source).toContain("customKey: dbKey");
  });

  it("renames tables through dbSlice.patch in tableSlice.renameTable", () => {
    const source = readSource("tableSlice.ts");
    expect(source).toContain("renameTable: create.asyncThunk(");
    expect(source).toContain("patch({");
    expect(source).toContain("displayName: trimmedName");
  });

  it("keeps table deletion sync behind replication helpers", () => {
    const tableSliceSource = readSource("tableSlice.ts");
    const deleteTableSource = readSource("deleteTableAction.ts");

    expect(tableSliceSource).toContain("scheduleWriteReplication(");
    expect(tableSliceSource).not.toContain("noloWriteRequest(");
    expect(deleteTableSource).toContain(
      'import { getRuntimeServerContext } from "database/runtimeServerContext"'
    );
    expect(deleteTableSource).toContain("getRuntimeServerContext(state)");
    expect(deleteTableSource).toContain("scheduleDeleteReplication(");
    expect(deleteTableSource).not.toContain("syncWithServers(");
  });

  it("keeps primary table entrypoints routed through createTable and deleteTable", () => {
    const createHookSource = readSource("useCreateTable.ts");
    const tableUiSource = readSource("../web/ui/Table.tsx");
    const deleteContentSource = readSource("../../create/space/content/deleteContentFromSpaceAction.ts");

    expect(createHookSource).toContain("createTable({");
    expect(tableUiSource).toContain("createTable({");
    expect(deleteContentSource).toContain('await (dispatch as any)(deleteTable({ dbKey: key })).unwrap();');
  });
});
