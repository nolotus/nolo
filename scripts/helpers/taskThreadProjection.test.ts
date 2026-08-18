import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expectNoRetiredTaskOrchestrationTerms } from "./retiredTaskOrchestrationTerms";
import { projectTaskThreadStatus } from "./taskThreadProjection";
import type { TaskThreadLoopVerification } from "../verify/taskThreadLoopVerifier";

function baseVerification(
  overrides: Partial<TaskThreadLoopVerification>,
): TaskThreadLoopVerification {
  return {
    ok: true,
    row: {
      dbKey: "row-user-board-task1",
      rowId: "task1",
      title: "Task",
      status: "todo",
      codeStatus: "planned",
      owner: "codex",
      notes: null,
    },
    activityRefs: [],
    latestActivityRef: null,
    dialogs: [],
    assertions: {
      rowReadable: true,
      noMutationAttempted: true,
      rowStatusIsTaskTruth: true,
      dialogEvidenceIsExecutionTruth: true,
    },
    ...overrides,
  };
}

describe("task thread projection", () => {
  test("projects running dialog evidence as in progress", () => {
    const projection = projectTaskThreadStatus(baseVerification({
      activityRefs: [{ type: "dialog", dialogId: "01RUN" }],
      dialogs: [{
        dialogId: "01RUN",
        dialogKey: "dialog-user-01RUN",
        readable: true,
        status: "running",
        checkpointStatus: "running",
        title: null,
        parentDialogId: null,
        rootDialogId: null,
        subjectRefs: [],
        runtimeCheckpoint: {
          status: "running",
          traceSummary: null,
          lastToolNames: [],
          workspaceProgress: null,
          errorMessage: null,
          updatedAt: null,
        },
        artifacts: null,
      }],
    }));

    expect(projection).toMatchObject({
      state: "in_progress_evidence",
      evidence: { runningDialogIds: ["01RUN"] },
    });
  });

  test("projects done dialog with commit/test artifact as review needed", () => {
    const projection = projectTaskThreadStatus(baseVerification({
      activityRefs: [{ type: "dialog", dialogId: "01DONE" }],
      dialogs: [{
        dialogId: "01DONE",
        dialogKey: "dialog-user-01DONE",
        readable: true,
        status: "done",
        checkpointStatus: "done",
        title: null,
        parentDialogId: null,
        rootDialogId: null,
        subjectRefs: [],
        runtimeCheckpoint: {
          status: "done",
          traceSummary: "commit abc; tests passed",
          lastToolNames: ["exec"],
          workspaceProgress: { changedFiles: ["packages/server/example.ts"], tests: ["bun test"] },
          errorMessage: null,
          updatedAt: null,
        },
        artifacts: { commit: "abc", tests: ["bun test"] },
      }],
    }));

    expect(projection).toMatchObject({
      state: "review_needed",
      recommendedCodeStatus: "review_needed",
      evidence: { artifactDialogIds: ["01DONE"] },
    });
  });

  test("projects failed dialog as blocker from dialog evidence", () => {
    const projection = projectTaskThreadStatus(baseVerification({
      activityRefs: [{ type: "dialog", dialogId: "01FAIL" }],
      dialogs: [{
        dialogId: "01FAIL",
        dialogKey: "dialog-user-01FAIL",
        readable: true,
        status: "failed",
        checkpointStatus: "failed",
        title: null,
        parentDialogId: null,
        rootDialogId: null,
        subjectRefs: [],
        runtimeCheckpoint: {
          status: "failed",
          traceSummary: null,
          lastToolNames: [],
          workspaceProgress: null,
          errorMessage: "boom",
          updatedAt: null,
        },
        artifacts: null,
      }],
    }));

    expect(projection).toMatchObject({
      state: "blocker_or_failed",
      evidence: { failedDialogIds: ["01FAIL"] },
    });
  });

  test("source contract avoids retired orchestration protocol and old work queue state", () => {
    const source = readFileSync(join(import.meta.dir, "taskThreadProjection.ts"), "utf8");
    expectNoRetiredTaskOrchestrationTerms(source);
  });
});
