import { describe, expect, test } from "bun:test";

import {
  assertTableSchemaWriteAllowed,
  isTableSchemaWriteAction,
  tableSchemaWriteSafetyMessage,
} from "./tableDataSafety";

describe("tableDataSafety", () => {
  test("classifies only schema-mutating table actions", () => {
    expect(isTableSchemaWriteAction("add-column")).toBe(true);
    expect(isTableSchemaWriteAction("query")).toBe(false);
    expect(isTableSchemaWriteAction("update-row")).toBe(false);
    expect(isTableSchemaWriteAction("add-row")).toBe(false);
  });

  test("allows row actions without explicit schema-write confirmation", () => {
    expect(() =>
      assertTableSchemaWriteAllowed({ action: "update-row", allowSchemaWrite: false })
    ).not.toThrow();
  });

  test("blocks add-column without explicit schema-write confirmation", () => {
    expect(() =>
      assertTableSchemaWriteAllowed({ action: "add-column", allowSchemaWrite: false })
    ).toThrow(/--schema-write-ok/);
  });

  test("allows add-column when the caller explicitly accepts schema-write risk", () => {
    expect(() =>
      assertTableSchemaWriteAllowed({ action: "add-column", allowSchemaWrite: true })
    ).not.toThrow();
  });

  test("explains the operational boundary", () => {
    const message = tableSchemaWriteSafetyMessage("add-column");
    expect(message).toContain("serialized per table");
    expect(message).toContain("Server-side schema CAS/locking is not implemented");
  });
});
