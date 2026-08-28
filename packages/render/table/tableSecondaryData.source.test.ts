import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(import.meta.dir, relativePath), "utf-8");

describe("table secondary data source contract", () => {
  it("creates default rows through dbSlice.write and mounts tables into spaces", () => {
    const source = readSource("createTableAction.ts");
    expect(source).toContain("type: DataType.TABLE_ROW as const");
    expect(source).toContain("write({");
    expect(source).toContain("(addContentToSpace as any)({");
  });

  it("persists row mutations through local-first db paths", () => {
    const source = readSource("tableSlice.ts");
    expect(source).toContain("type: DataType.TABLE_ROW as const");
    expect(source).toContain("write({");
    expect(source).toContain("patch({");
    expect(source).toContain("scheduleWriteReplication(");
  });
});
