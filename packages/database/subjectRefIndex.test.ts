import { describe, expect, test } from "bun:test";
import { expectNoRetiredTaskOrchestrationTerms } from "../../scripts/helpers/retiredTaskOrchestrationTerms";
import {
  buildSubjectRefIndexPutOps,
  buildSubjectRefIndexRange,
  normalizeSubjectRefsForIndex,
} from "./subjectRefIndex";

describe("subject ref index", () => {
  test("normalizes subject refs and tableRow aliases for indexing", () => {
    expect(normalizeSubjectRefsForIndex([
      { kind: "tableRow", id: "row-user-board-1", role: "task" },
      { kind: "table-row", id: "row-user-board-1", role: "duplicate" },
      { kind: "page", id: "page-brief" },
      { kind: "", id: "missing-kind" },
      { kind: "dialog" },
    ])).toEqual([
      { kind: "table-row", id: "row-user-board-1" },
      { kind: "page", id: "page-brief" },
    ]);
  });

  test("builds owner-scoped index put ops without creating workflow state", () => {
    const ops = buildSubjectRefIndexPutOps({
      ownerId: "user-1",
      recordKey: "dialog-user-1-01DIALOG",
      record: {
        subjectRefs: [
          { kind: "table-row", id: "row-user-1-board-1", role: "task" },
          { kind: "page", id: "page-user-1-brief", role: "brief" },
        ],
      },
    });

    const rowRange = buildSubjectRefIndexRange("user-1", {
      kind: "tableRow",
      id: "row-user-1-board-1",
    });
    const pageRange = buildSubjectRefIndexRange("user-1", {
      kind: "page",
      id: "page-user-1-brief",
    });

    expect(ops).toHaveLength(2);
    expect(ops.map((op) => op.type)).toEqual(["put", "put"]);
    expect(ops.map((op) => op.value)).toEqual([
      "dialog-user-1-01DIALOG",
      "dialog-user-1-01DIALOG",
    ]);
    expect(ops[0].key.startsWith(rowRange.start)).toBe(true);
    expect(ops[1].key.startsWith(pageRange.start)).toBe(true);
    expectNoRetiredTaskOrchestrationTerms(ops[0].key);
  });
});
