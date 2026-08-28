import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  dialogMatchesSubjectRef,
  extractDialogSubjectRefs,
  filterDialogsBySubjectRef,
} from "./subjectRefLookup";
import { expectNoRetiredTaskOrchestrationTerms } from "./retiredTaskOrchestrationTerms";

describe("subject ref dialog lookup", () => {
  test("matches task rows from dialog subjectRefs without row-side indexes", () => {
    const dialogs = [
      {
        dbKey: "dialog-user-01MATCH",
        id: "01MATCH",
        status: "done",
        title: "Implementation",
        subjectRefs: [{ kind: "table-row", id: "row-user-board-task-1", role: "task" }],
        runtimeCheckpoint: { status: "done" },
        artifacts: [{ kind: "commit", sha: "abc" }],
      },
      {
        dbKey: "dialog-user-01OTHER",
        id: "01OTHER",
        status: "running",
        subjectRefs: [{ kind: "page", id: "page-brief" }],
      },
    ];

    expect(filterDialogsBySubjectRef(dialogs, {
      kind: "table-row",
      id: "row-user-board-task-1",
    })).toEqual([
      expect.objectContaining({
        dialogId: "01MATCH",
        dialogKey: "dialog-user-01MATCH",
        status: "done",
        checkpointStatus: "done",
        hasArtifacts: true,
      }),
    ]);
  });

  test("normalizes tableRow and table-row aliases", () => {
    const dialog = {
      subjectRefs: [{ kind: "tableRow", id: "row-user-board-task-1" }],
    };

    expect(extractDialogSubjectRefs(dialog)).toEqual([
      { kind: "table-row", id: "row-user-board-task-1" },
    ]);
    expect(dialogMatchesSubjectRef(dialog, {
      kind: "table-row",
      id: "row-user-board-task-1",
    })).toBe(true);
  });

  test("ignores malformed refs and does not treat role as identity", () => {
    const dialog = {
      subjectRefs: [
        null,
        { kind: "table-row" },
        { id: "row-user-board-task-1" },
        { kind: "table-row", id: "row-user-board-task-1", role: "review-target" },
      ],
    };

    expect(filterDialogsBySubjectRef([dialog], {
      kind: "table-row",
      id: "row-user-board-task-1",
      role: "task",
    })).toHaveLength(1);
  });

  test("source contract stays dialog-subject based", () => {
    const source = readFileSync(join(import.meta.dir, "subjectRefLookup.ts"), "utf8");
    expect(source).not.toContain("activityRefs");
    expect(source).not.toContain("latestActivityRef");
    expectNoRetiredTaskOrchestrationTerms(source);
  });
});
