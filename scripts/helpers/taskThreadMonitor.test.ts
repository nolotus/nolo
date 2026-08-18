import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expectNoRetiredTaskOrchestrationTerms } from "./retiredTaskOrchestrationTerms";
import { assessTaskThreadMonitor } from "./taskThreadMonitor";
import type {
  TaskThreadDialogSummary,
  TaskThreadLoopVerification,
} from "../verify/taskThreadLoopVerifier";

function dialog(overrides: Partial<TaskThreadDialogSummary>): TaskThreadDialogSummary {
  return {
    dialogId: "01DIALOG",
    dialogKey: "dialog-user-01DIALOG",
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
      updatedAt: "2026-06-12T01:00:00.000Z",
    },
    artifacts: null,
    ...overrides,
  };
}

function verification(
  dialogs: TaskThreadDialogSummary[],
  overrides: Partial<TaskThreadLoopVerification> = {},
): Pick<TaskThreadLoopVerification, "row" | "activityRefs" | "dialogs"> {
  return {
    row: {
      dbKey: "row-user-board-task1",
      rowId: "task1",
      title: "Task",
      status: "in_progress",
      codeStatus: "planned",
      owner: "agent",
      notes: null,
    },
    activityRefs: dialogs.map((item) => ({
      type: "dialog" as const,
      dialogId: item.dialogId,
      dialogKey: item.dialogKey ?? undefined,
      updatedAt: typeof item.runtimeCheckpoint?.updatedAt === "string"
        ? item.runtimeCheckpoint.updatedAt
        : undefined,
    })),
    dialogs,
    ...overrides,
  };
}

describe("task thread monitor", () => {
  const nowMs = Date.parse("2026-06-12T01:10:00.000Z");

  test("stays silent for a running dialog with a fresh checkpoint", () => {
    expect(assessTaskThreadMonitor(verification([
      dialog({ dialogId: "01RUN" }),
    ]), { nowMs, staleAfterMs: 30 * 60_000 })).toMatchObject({
      action: "silent",
      reason: "running_checkpoint_fresh",
      evidence: {
        dialogIds: ["01RUN"],
        staleDialogIds: [],
      },
    });
  });

  test("notifies when a running dialog is stale", () => {
    expect(assessTaskThreadMonitor(verification([
      dialog({
        dialogId: "01STALE",
        runtimeCheckpoint: {
          status: "running",
          traceSummary: null,
          lastToolNames: [],
          workspaceProgress: null,
          errorMessage: null,
          updatedAt: "2026-06-12T00:00:00.000Z",
        },
      }),
    ]), { nowMs, staleAfterMs: 30 * 60_000 })).toMatchObject({
      action: "notify",
      reason: "stale_running_dialog",
      evidence: { staleDialogIds: ["01STALE"] },
    });
  });

  test("notifies when dialog evidence failed even if retired report says approved", () => {
    expect(assessTaskThreadMonitor(verification([
      dialog({
        dialogId: "01FAIL",
        status: "failed",
        checkpointStatus: "failed",
        runtimeCheckpoint: {
          status: "failed",
          traceSummary: null,
          lastToolNames: [],
          workspaceProgress: null,
          errorMessage: "test failed",
          updatedAt: "2026-06-12T01:09:00.000Z",
        },
      }),
    ]), { nowMs })).toMatchObject({
      action: "notify",
      reason: "dialog_failed",
      evidence: { failedDialogIds: ["01FAIL"] },
      recommendation: { status: "blocked" },
    });
  });

  test("notifies review-needed for done dialog with commit or test evidence", () => {
    expect(assessTaskThreadMonitor(verification([
      dialog({
        dialogId: "01DONE",
        status: "done",
        checkpointStatus: "done",
        runtimeCheckpoint: {
          status: "done",
          traceSummary: "commit abc; tests passed",
          lastToolNames: ["execShell"],
          workspaceProgress: { commit: "abc", tests: ["bun test"] },
          errorMessage: null,
          updatedAt: "2026-06-12T01:09:00.000Z",
        },
        artifacts: { commit: "abc", tests: ["bun test"] },
      }),
    ]), { nowMs })).toMatchObject({
      action: "notify",
      reason: "review_needed",
      evidence: { artifactDialogIds: ["01DONE"] },
      recommendation: { codeStatus: "review_needed" },
    });
  });

  test("source contract stays read-only and avoids runner or phase writes", () => {
    const source = readFileSync(join(import.meta.dir, "taskThreadMonitor.ts"), "utf8");
    expect(source).not.toContain("taskEvidence.phase");
    expect(source).not.toContain("updateTableRow");
    expectNoRetiredTaskOrchestrationTerms(source);
  });
});
