import { describe, expect, it } from "bun:test";
import {
  createTurnRequest,
  normalizeRunCompletionShape,
  type InternalTurnEvent,
} from "./internalTurnEvent";

describe("internalTurnEvent", () => {
  it("normalizes minimal run completion shape from record", () => {
    const raw = {
      runId: "run-1",
      agentKey: "agent-code",
      status: "done",
      exitCode: 0,
      parentDialogId: "p-dialog-1",
      dialogId: "c-dialog-1",
      ephemeral: false,
      note: "All tasks completed",
      activity: {
        counters: { toolCalls: 3, llmCalls: 2, fileEdits: 1 },
      },
    };
    const shape = normalizeRunCompletionShape(raw);
    expect(shape).toEqual({
      runId: "run-1",
      agentKey: "agent-code",
      status: "done",
      exitCode: 0,
      parentDialogId: "p-dialog-1",
      dialogId: "c-dialog-1",
      ephemeral: false,
      note: "All tasks completed",
      activity: {
        counters: { toolCalls: 3, llmCalls: 2, fileEdits: 1 },
      },
    });
  });

  it("creates TurnRequest from string input", () => {
    const req = createTurnRequest("hello world");
    expect(req).toEqual({
      event: { kind: "user", text: "hello world" },
      text: "hello world",
    });
  });

  it("creates TurnRequest from structured InternalTurnEvent", () => {
    const event: InternalTurnEvent = {
      kind: "child-run-completed",
      runs: [
        {
          runId: "run-1",
          agentKey: "agent-test",
          status: "done",
        },
      ],
      text: "run-1 completed",
    };
    const req = createTurnRequest(event);
    expect(req).toEqual({
      event,
      text: "run-1 completed",
    });
  });
});
