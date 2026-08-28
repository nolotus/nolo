import { describe, expect, test } from "bun:test";
import { renderDialogStatus, resolveDialogActiveHealth, resolveDialogTerminalState } from "./dialogStatus";

describe("dialog status helper", () => {
  test("renders a compact recovery view for active background dialogs", () => {
    const output = renderDialogStatus({
      dialogId: "01ACTIVE",
      status: "running",
      runtimeCheckpoint: {
        lastUserInput: "review this diff",
        lastToolNames: ["readFile", "execShell"],
      },
      artifacts: {
        changedFiles: ["packages/cli/agentRunCommand.ts"],
      },
    });

    expect(resolveDialogTerminalState({ dialogId: "01ACTIVE", status: "running" })).toBe("active");
    expect(output).toContain("status: running");
    expect(output).toContain("state: active");
    expect(output).toContain("activeHealth: checkpoint-without-updatedAt");
    expect(output).toContain("files: packages/cli/agentRunCommand.ts");
    expect(output).toContain("poll again: nolo dialog status 01ACTIVE");
  });

  test("renders stale active diagnostics when background execution has no checkpoint", () => {
    const snapshot = {
      dialogId: "01STALE",
      status: "running",
      updatedAt: "2026-05-20T00:00:00.000Z",
      runtimeCheckpoint: null,
    };
    const output = renderDialogStatus(snapshot);

    expect(resolveDialogTerminalState(snapshot)).toBe("active");
    expect(resolveDialogActiveHealth(snapshot, Date.parse("2026-05-20T00:10:00.000Z"))).toBe("no-checkpoint");
    expect(output).toContain("activeHealth: no-checkpoint");
  });

  test("detects stale running checkpoints", () => {
    const snapshot = {
      dialogId: "01STALECHECKPOINT",
      status: "running",
      runtimeCheckpoint: {
        status: "running",
        updatedAt: Date.parse("2026-05-20T00:00:00.000Z"),
      },
    };

    expect(resolveDialogActiveHealth(snapshot, Date.parse("2026-05-20T00:10:00.000Z"))).toBe(
      "stale-running"
    );
  });

  test("renders lineage and subject refs for execution dialogs", () => {
    const output = renderDialogStatus({
      dialogId: "01CHILD",
      status: "pending",
      parentDialogId: "01PARENT",
      rootDialogId: "01ROOT",
      subjectRefs: [
        { kind: "table-row", id: "row-0e95801d90-01KWSK4Q4TESXQ06SW39JN2TTJ-01TASK", role: "subject" },
        { kind: "table-row", id: "frontend", role: "assignment" },
        { kind: "external", id: "artifact-1", role: "artifact" },
      ],
    });

    expect(output).toContain("parentDialogId: 01PARENT");
    expect(output).toContain("rootDialogId: 01ROOT");
    expect(output).toContain(
      "subjects: table-row:row-0e95801d90-01KWSK4Q4TESXQ06SW39JN2TTJ-01TASK#subject, table-row:frontend#assignment, external:artifact-1#artifact"
    );
  });

  test("prefers failed checkpoint when dialog status is not terminal", () => {
    const output = renderDialogStatus({
      dialogId: "01FAILED",
      status: "running",
      runtimeCheckpoint: {
        status: "failed",
        errorMessage: "background agent run timed out after 120000ms",
      },
      toolErrors: ["execShell"],
    });

    expect(resolveDialogTerminalState({
      dialogId: "01FAILED",
      status: "running",
      runtimeCheckpoint: { status: "failed" },
    })).toBe("failed");
    expect(output).toContain("checkpoint: failed");
    expect(output).toContain("state: failed");
    expect(output).toContain("error: background agent run timed out after 120000ms");
    expect(output).toContain("--continue 01FAILED");
  });
});
