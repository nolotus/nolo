import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Table export dependencies", () => {
  test("loads xlsx only when XLSX export is requested", () => {
    const source = readFileSync(join(import.meta.dir, "Table.tsx"), "utf8");

    expect(source).not.toContain('import * as XLSX from "xlsx"');
    expect(source).toContain('const XLSX = await import("xlsx")');
  });
});
