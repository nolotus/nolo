// packages/shared/contracts/appendInstruction.ts
//
// Cross-client append instruction contract (Phase 1).
// Shared between server control plane, Web/Desktop panel, RN, and CLI.

export type AppendInstructionMode = "enqueue" | "continue";

export interface AppendInstructionPayload {
  dialogKey: string;
  userInput: string;
  mode: AppendInstructionMode;
  runtimeContext?: Record<string, unknown>;
}

export interface AppendInstructionControlRequest {
  action: "append";
  dialogKey: string;
  userInput: string;
  mode: AppendInstructionMode;
  runtimeContext?: Record<string, unknown>;
}

export interface AppendInstructionControlResponseData {
  action: "append";
  dialogKey: string;
  mode: AppendInstructionMode;
  queued?: number;
  status?: string;
  message?: string;
}

export interface AppendInstructionControlResponse {
  ok: boolean;
  data?: AppendInstructionControlResponseData;
  error?: string | { code?: string; message?: string };
}
