import { describe, expect, test } from "bun:test";

import { classifySharedObjectWrite } from "./writeContracts";

const TASK_BOARD_TABLE_ID = "01KWSK4Q4TESXQ06SW39JN2TTJ";

describe("shared object write contracts", () => {
  test("allows evidence append broadly but treats shared table rows as contract-bound", () => {
    expect(classifySharedObjectWrite({
      objectKind: "dialog",
      field: "message",
    })).toEqual({ allowed: true, reason: "evidence-write" });

    expect(classifySharedObjectWrite({
      objectKind: "table-row",
      tableId: TASK_BOARD_TABLE_ID,
      field: "status",
    })).toEqual({ allowed: true, reason: "contract-bound-shared-state" });
  });

  test("does not treat unrelated table rows as shared task-board writes", () => {
    expect(classifySharedObjectWrite({
      objectKind: "table-row",
      tableId: "customers",
      field: "title",
    })).toEqual({ allowed: true, reason: "contract-bound-shared-state" });
  });
});
