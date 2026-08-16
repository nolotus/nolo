import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  expectNoRetiredTaskOrchestrationTerms,
  RETIRED_TASK_EVENTS_FIELD,
} from "./retiredTaskOrchestrationTerms";
import {
  applyReviewDialogDecisionToTaskRow,
  buildReviewerDialogHandoff,
} from "./taskReviewDialog";

describe("task review dialog helper", () => {
  test("builds reviewer handoff with task row and reviewed evidence subject refs", () => {
    const handoff = buildReviewerDialogHandoff({
      taskRowDbKey: "row-user-board-task",
      reviewerAgentKey: "agent-reviewer",
      implementationDialogId: "dialog-impl",
      commit: "abc123",
      artifactIds: ["artifact-test"],
      pageIds: ["page-plan"],
      taskTitle: "Retire external review state",
    });

    expect(handoff.targetAgentKey).toBe("agent-reviewer");
    expect(handoff.subjectRefs).toEqual([
      { kind: "table-row", id: "row-user-board-task", role: "subject" },
      { kind: "dialog", id: "dialog-impl", role: "review-target" },
      { kind: "external", id: "commit:abc123", role: "commit" },
      { kind: "external", id: "artifact-test", role: "artifact" },
      { kind: "page", id: "page-plan", role: "evidence" },
    ]);
    expect(handoff.message).toContain("Review this task using dialog evidence");
    expect(handoff.message).toContain("task row: row-user-board-task");
    expect(handoff.message).toContain("implementation dialog: dialog-impl");
    expect(handoff.message).toContain("commit: abc123");
    expect(handoff.message).toContain("queryDialogsBySubjectRef");
    expect(handoff.message).toContain("nolo dialog query --row-dbkey");
    expect(handoff.message).toContain("exclude it from row evidence queries");
    expect(handoff.message).toContain("directly dispatch the rework agent/dialog");
    expect(handoff.message).toContain("report the rework dialog id");
    expect(handoff.message).toContain("Review decision: approved | needs_changes | blocked");
    expectNoRetiredTaskOrchestrationTerms(handoff.message);
  });

  test("approval asks the active board to delete without writing external review state", () => {
    const result = applyReviewDialogDecisionToTaskRow({
      row: {
        dbKey: "row-user-board-task",
        values: { status: "in_progress", codeStatus: "review_needed", notes: "ready" },
        meta: { internalScratch: "not evidence" },
      },
      reviewerDialogId: "dialog-review",
      decision: "approved",
      summary: "No issues found.",
    });

    expect(result.action).toBe("delete");
    expect(result.row).toBeNull();
    expect(result.evidenceNote).toContain("dialog-review");
  });

  test("changes requested returns task to todo and keeps only task evidence meta", () => {
    const result = applyReviewDialogDecisionToTaskRow({
      row: {
        dbKey: "row-user-board-task",
        values: { status: "in_progress", codeStatus: "review_needed", notes: "ready" },
        meta: {
          activityRefs: [{ kind: "dialog", dialogId: "dialog-impl" }],
          [RETIRED_TASK_EVENTS_FIELD]: [{ type: "dialog", dialogId: "dialog-event-only" }],
          internalScratch: "not evidence",
        },
      },
      reviewerDialogId: "dialog-review",
      decision: "needs_changes",
      summary: "Add a source-contract test.",
      findings: ["Missing negative test"],
    });

    expect(result.action).toBe("update");
    expect(result.row?.values).toMatchObject({
      status: "待处理",
      codeStatus: "未开始",
    });
    expect(result.row?.values.notes).toContain("Review needs changes");
    expect(result.row?.values.notes).toContain("dialog-review");
    expect(result.row?.values.notes).toContain("Missing negative test");
    expect(result.row?.meta).toEqual({
      activityRefs: [{ kind: "dialog", dialogId: "dialog-impl" }],
    });
    expectNoRetiredTaskOrchestrationTerms(JSON.stringify(result.row));
    expect(JSON.stringify(result.row)).not.toContain("dialog-event-only");
  });

  test("blocked review marks the task blocked with reviewer evidence", () => {
    const result = applyReviewDialogDecisionToTaskRow({
      row: {
        dbKey: "row-user-board-task",
        values: { status: "in_progress", codeStatus: "review_needed" },
        meta: {},
      },
      reviewerDialogId: "dialog-review",
      decision: "blocked",
      summary: "Cannot inspect the implementation dialog.",
    });

    expect(result.action).toBe("update");
    expect(result.row?.values).toMatchObject({
      status: "阻塞",
      codeStatus: "阻塞/证据不足",
    });
    expect(result.row?.values.notes).toContain("Review blocked");
    expect(result.row?.values.notes).toContain("dialog-review");
  });

  test("source contract avoids retired review primitives as truth", () => {
    const source = readFileSync(join(import.meta.dir, "taskReviewDialog.ts"), "utf8");
    expectNoRetiredTaskOrchestrationTerms(source);
  });
});
