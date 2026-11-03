// Shared between server control plane, Web/Desktop panel, RN, and CLI.
import {
  EXECUTION_ATTACHMENT_LIMITS,
  hasOnlyContractKeys,
  isContractId,
  isContractRecord,
  isContractText,
  isExpectedExecution,
  validateContractJson,
  type ContractValidationResult,
  type ExecutionCommandStage,
  type ExpectedExecution,
} from "./executionAttachment";

// Preserve the existing barrel without modifying index.ts.
export * from "./executionAttachment";

export type AppendInstructionMode = "enqueue" | "continue";

export interface AppendInstructionPayload {
  dialogKey: string;
  userInput: string;
  mode: AppendInstructionMode;
  runtimeContext?: Record<string, unknown>;
  // Optional only for legacy callers. Reliable retries retain commandId and
  // identical contents; handlers must reject conflicting reuse atomically.
  commandId?: string;
  expectedExecutionId?: string;
  expectedLeaseEpoch?: number;
}

// New attached-execution callers use this narrow, fully fenced form. A legacy
// request has no reliable-delivery guarantee merely because validation succeeds.
export type FencedAppendInstructionPayload = AppendInstructionPayload & ExpectedExecution & {
  commandId: string;
};

export interface AppendInstructionControlRequest extends AppendInstructionPayload {
  action: "append";
}

export type FencedAppendInstructionControlRequest = FencedAppendInstructionPayload & { action: "append" };

export interface AppendInstructionControlResponseData {
  action: "append";
  dialogKey: string;
  mode: AppendInstructionMode;
  queued?: number;
  status?: string; // legacy run status; NOT a delivery stage
  message?: string;
  commandId?: string;
  stage?: ExecutionCommandStage;
  executionId?: string;
  leaseEpoch?: number;
  messageId?: string; // required by attached append's applied receipt
  code?: string;
}

export interface AppendInstructionControlResponse {
  ok: boolean;
  data?: AppendInstructionControlResponseData;
  error?: string | { code?: string; message?: string };
}

const payloadKeys = ["dialogKey", "userInput", "mode", "runtimeContext", "commandId", "expectedExecutionId", "expectedLeaseEpoch"];

function validPayload(value: Record<string, unknown>, control: boolean): boolean {
  if (!hasOnlyContractKeys(value, control ? [...payloadKeys, "action"] : payloadKeys)) return false;
  if (control && value.action !== "append") return false;
  if (!isContractId(value.dialogKey) || !isContractText(value.userInput, EXECUTION_ATTACHMENT_LIMITS.inputBytes)
    || (value.mode !== "enqueue" && value.mode !== "continue")) return false;
  if (value.runtimeContext !== undefined && !isContractRecord(value.runtimeContext)) return false;
  if (value.commandId !== undefined && !isContractId(value.commandId)) return false;
  // A partial fence is never meaningful; a fenced command also needs an id.
  if (value.expectedExecutionId !== undefined || value.expectedLeaseEpoch !== undefined) {
    if (!isContractId(value.commandId) || !isExpectedExecution(value)) return false;
  }
  return true;
}

// These check shape/limits ONLY. Owner comes from authentication, never from
// payload or runtimeContext. Authorize the existing dialog and atomically compare
// execution/lease at the handler. No change to cancelled-run continuation policy.
export function validateAppendInstructionPayload(value: unknown): ContractValidationResult<AppendInstructionPayload> {
  const error = validateContractJson(value);
  if (error) return { ok: false, error };
  return isContractRecord(value) && validPayload(value, false)
    ? { ok: true, value: value as unknown as AppendInstructionPayload }
    : { ok: false, error: "malformed" };
}

export function validateAppendInstructionControlRequest(value: unknown): ContractValidationResult<AppendInstructionControlRequest> {
  const error = validateContractJson(value);
  if (error) return { ok: false, error };
  return isContractRecord(value) && validPayload(value, true)
    ? { ok: true, value: value as unknown as AppendInstructionControlRequest }
    : { ok: false, error: "malformed" };
}

export function isFencedAppendInstructionPayload(value: unknown): value is FencedAppendInstructionPayload {
  const result = validateAppendInstructionPayload(value);
  return result.ok && isContractId(result.value.commandId)
    && isExpectedExecution(result.value as unknown as Record<string, unknown>);
}

export function isFencedAppendInstructionControlRequest(value: unknown): value is FencedAppendInstructionControlRequest {
  const result = validateAppendInstructionControlRequest(value);
  return result.ok && isContractId(result.value.commandId)
    && isExpectedExecution(result.value as unknown as Record<string, unknown>);
}
