// packages/shared/contracts/appendInstruction.test.ts
import { describe, expect, it } from "bun:test";
import type {
  AppendInstructionMode,
  AppendInstructionPayload,
  AppendInstructionControlRequest,
  AppendInstructionControlResponse,
} from "./appendInstruction";

describe("shared appendInstruction contract", () => {
  it("allows valid modes", () => {
    const enqueueMode: AppendInstructionMode = "enqueue";
    const continueMode: AppendInstructionMode = "continue";
    expect(enqueueMode).toBe("enqueue");
    expect(continueMode).toBe("continue");
  });

  it("shapes control request with action append", () => {
    const req: AppendInstructionControlRequest = {
      action: "append",
      dialogKey: "dialog-user-123",
      userInput: "do extra work",
      mode: "enqueue",
      runtimeContext: { priority: "high" },
    };
    expect(req.action).toBe("append");
    expect(req.dialogKey).toBe("dialog-user-123");
    expect(req.userInput).toBe("do extra work");
    expect(req.mode).toBe("enqueue");
  });

  it("shapes response with optional queued count", () => {
    const res: AppendInstructionControlResponse = {
      ok: true,
      data: {
        action: "append",
        dialogKey: "dialog-user-123",
        mode: "enqueue",
        queued: 2,
      },
    };
    expect(res.ok).toBe(true);
    expect(res.data?.queued).toBe(2);
  });
});
