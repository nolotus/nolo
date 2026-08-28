import { describe, expect, test } from "bun:test";
import {
  extractTaskThreadActivityRefs,
  verifyTaskThreadLoopReadOnly,
} from "./taskThreadLoopVerifier";

describe("task thread loop verifier", () => {
  test("extracts activity refs without requiring retired queue fields", () => {
    const row = {
      dbKey: "row-user-table-row1",
      values: { status: "todo", codeStatus: "review_needed" },
      meta: {
        activityRefs: [
          { type: "dialog", dialogId: "01ABC", dialogKey: "dialog-user-01ABC", status: "running" },
        ],
        latestActivityRef: { type: "dialog", dialogId: "01ABC", dialogKey: "dialog-user-01ABC", status: "running" },
      },
    };

    const refs = extractTaskThreadActivityRefs(row);
    expect(refs.activityRefs).toHaveLength(1);
    expect(refs.activityRefs[0]).toMatchObject({ dialogId: "01ABC", status: "running" });
  });

  test("reports row fields plus linked dialog checkpoint and artifact evidence", async () => {
    const result = await verifyTaskThreadLoopReadOnly({
      tenantId: "user",
      row: {
        dbKey: "row-user-table-row1",
        values: { title: "Low risk task", status: "todo", codeStatus: "none", owner: "Codex" },
        meta: {
          activityRefs: [{ type: "dialog", dialogId: "01DONE", status: "done" }],
          internalScratch: "not task evidence",
        },
      },
      readDialog: async (dialogKey) => ({
        status: "done",
        title: "implementation dialog",
        runtimeCheckpoint: {
          status: "done",
          lastToolNames: ["exec_command"],
        },
        artifacts: { commit: "abc", tests: ["bun test"] },
        subjectRefs: [{ kind: "table-row", id: "row-user-table-row1" }],
        dialogKey,
      }),
    });

    expect(result.assertions).toMatchObject({
      noMutationAttempted: true,
      rowStatusIsTaskTruth: true,
      dialogEvidenceIsExecutionTruth: true,
    });
    expect(JSON.stringify(result)).not.toContain("internalScratch");
    expect(JSON.stringify(result)).not.toContain("not task evidence");
    expect(result.dialogs[0]).toMatchObject({
      dialogId: "01DONE",
      dialogKey: "dialog-user-01DONE",
      readable: true,
      status: "done",
      checkpointStatus: "done",
    });
  });

  test("keeps dialog read failures as evidence gaps instead of failing the row smoke", async () => {
    const result = await verifyTaskThreadLoopReadOnly({
      tenantId: "user",
      row: {
        values: { status: "in_progress", codeStatus: "none" },
        meta: { latestActivityRef: { type: "dialog", dialogId: "01MISS" } },
      },
      readDialog: async () => {
        throw new Error("not found");
      },
    });

    expect(result.ok).toBe(true);
    expect(result.dialogs[0]).toMatchObject({
      dialogId: "01MISS",
      readable: false,
      error: "not found",
    });
  });

  test("can recover linked dialogs from subject refs without row-side caches", async () => {
    const result = await verifyTaskThreadLoopReadOnly({
      tenantId: "user",
      row: {
        dbKey: "row-user-table-row1",
        values: { title: "Subject ref task", status: "todo", codeStatus: "planned" },
        meta: {},
      },
      readDialog: async () => {
        throw new Error("row cache path should not be used");
      },
      subjectDialogCandidates: [
        {
          dbKey: "dialog-user-01SUBJECT",
          id: "01SUBJECT",
          status: "done",
          title: "subject-linked implementation",
          subjectRefs: [{ kind: "table-row", id: "row-user-table-row1", role: "task" }],
          runtimeCheckpoint: {
            status: "done",
          },
          artifacts: [{ kind: "test", command: "bun test subjectRefLookup.test.ts" }],
        },
      ],
    });

    expect(result.activityRefs).toEqual([]);
    expect(result.latestActivityRef).toBeNull();
    expect(result.dialogs).toHaveLength(1);
    expect(result.dialogs[0]).toMatchObject({
      dialogId: "01SUBJECT",
      dialogKey: "dialog-user-01SUBJECT",
      readable: true,
      status: "done",
      checkpointStatus: "done",
      sourceRef: {
        role: "subject-ref",
      },
    });
  });
});
