import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expectNoRetiredTaskOrchestrationTerms } from "./retiredTaskOrchestrationTerms";
import { verifyStrictSubjectRefQueryResults } from "./subjectRefQueryVerifier";

describe("subject ref query verifier", () => {
  const target = { kind: "tableRow", id: "row-user-board-task-1", role: "task" };

  test("passes only when every returned dialog contains the requested subject ref", () => {
    const result = verifyStrictSubjectRefQueryResults(
      [
        {
          dbKey: "dialog-user-01MATCH",
          id: "01MATCH",
          status: "done",
          subjectRefs: [{ kind: "table-row", id: "row-user-board-task-1", role: "task" }],
          runtimeCheckpoint: { status: "done" },
        },
      ],
      target
    );

    expect(result.ok).toBe(true);
    expect(result.returnedCount).toBe(1);
    expect(result.matchedCount).toBe(1);
    expect(result.unmatchedDialogs).toEqual([]);
    expect(result.matches[0]).toMatchObject({
      dialogId: "01MATCH",
      dialogKey: "dialog-user-01MATCH",
      checkpointStatus: "done",
    });
  });

  test("fails when the endpoint returns broad unrelated dialogs", () => {
    const result = verifyStrictSubjectRefQueryResults(
      [
        {
          dbKey: "dialog-user-01MATCH",
          id: "01MATCH",
          subjectRefs: [{ kind: "table-row", id: "row-user-board-task-1" }],
        },
        {
          dbKey: "dialog-user-01OTHER",
          id: "01OTHER",
          subjectRefs: [{ kind: "table-row", id: "row-user-board-other" }],
        },
      ],
      target
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("unmatched_results");
    expect(result.returnedCount).toBe(2);
    expect(result.matchedCount).toBe(1);
    expect(result.unmatchedDialogs).toEqual([
      {
        dialogId: "01OTHER",
        dialogKey: "dialog-user-01OTHER",
        subjectRefs: [{ kind: "table-row", id: "row-user-board-other" }],
      },
    ]);
  });

  test("fails empty results by default but can allow empty deployment probes", () => {
    expect(verifyStrictSubjectRefQueryResults([], target)).toMatchObject({
      ok: false,
      reason: "empty_results",
      returnedCount: 0,
    });
    expect(verifyStrictSubjectRefQueryResults([], target, { allowEmpty: true })).toMatchObject({
      ok: true,
      reason: "ok",
      returnedCount: 0,
    });
  });

  test("source contract does not reintroduce row-cache or retired orchestration truth", () => {
    const source = readFileSync(join(import.meta.dir, "subjectRefQueryVerifier.ts"), "utf8");
    expect(source).not.toContain("activityRefs");
    expect(source).not.toContain("latestActivityRef");
    expectNoRetiredTaskOrchestrationTerms(source);
  });
});
