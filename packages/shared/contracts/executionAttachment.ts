// Shared wire contract for attaching an ALREADY RUNNING execution to the run
// control plane. No start/input field exists on attach: attachment must not replay
// agent.run. All identities are opaque, distinct scopes (never interchangeable).
// Import directly, or through appendInstruction / the existing contracts barrel.
export const EXECUTION_ATTACHMENT_LIMITS = {
  messageBytes: 64 * 1024,
  inputBytes: 32 * 1024,
  textBytes: 8 * 1024,
  idBytes: 512,
  jsonDepth: 16,
  jsonNodes: 8192,
} as const;

export type ExecutionOrigin = "tui" | "desktop" | "connector";
export type ExecutionStatus = "running" | "done" | "failed" | "cancelled";
export type ExecutionCommandStage = "queued" | "accepted" | "applied" | "rejected" | "uncertain";

export interface ExecutionIdentity {
  dialogKey: string; // existing dialog record key, not a new session
  runId: string; // existing run control-plane identity, not a WS requestId
  executionId: string; // one execution attempt
  hostSessionId: string; // one live host process instance
  machineId: string; // authenticated connector machine
  leaseEpoch: number; // server-issued fencing generation; positive when attached
}

export interface AttachedExecution extends ExecutionIdentity {
  origin: ExecutionOrigin;
  seq: number; // monotonic host event sequence within this execution + lease
}

export interface ExpectedExecution {
  expectedExecutionId: string;
  expectedLeaseEpoch: number;
}

// Authentication/owner/server-instance scope is deliberately NOT in wire payloads.
// Handlers must derive it from their authenticated connection and stored record,
// authorize dialogKey + machineId, and atomically compare the full binding before
// accepting a frame. A successful shape check is NOT an authorization decision.
export interface ExecutionAttach extends Omit<AttachedExecution, "leaseEpoch"> {
  type: "execution.attach";
  leaseEpoch: number; // 0 on first attach; previous grant on reconnect, never self-granted
  status: "running";
  checkpoint?: string;
}

export interface ExecutionAttached extends ExecutionIdentity {
  type: "execution.attached";
  seq: number; // last durably accepted event seq, not an event increment
  pendingCommandIds: string[]; // bounded replay hints; durable ledger remains authoritative
}

export type ExecutionEventData =
  | { kind: "status"; phase: string }
  | { kind: "checkpoint"; text: string }
  | { kind: "input.accepted"; commandId: string }
  | { kind: "input.applied"; commandId: string; messageId: string }
  | { kind: "terminal"; status: Exclude<ExecutionStatus, "running">; message?: string };

export interface ExecutionEvent extends ExecutionIdentity {
  type: "execution.event";
  seq: number;
  event: ExecutionEventData;
}

// commandId is the durable idempotency key, scoped to authenticated owner/server
// and dialog. Redelivery MUST retain the same id and contents; conflicting reuse
// must be rejected. These types do not implement the durable command ledger.
export type ExecutionCommand = ExecutionIdentity & ExpectedExecution & {
  type: "execution.command";
  commandId: string;
} & (
  | { kind: "append"; mode: "enqueue" | "continue"; userInput: string }
  | { kind: "cancel" }
);

export type ExecutionAppendCommand = Extract<ExecutionCommand, { kind: "append" }>;
export type ExecutionCancelCommand = Extract<ExecutionCommand, { kind: "cancel" }>;

export type ExecutionReceiptOutcome =
  | { stage: "queued" } // server durable receipt only
  | { stage: "accepted" } // host durable receipt, not model application
  | { stage: "applied"; messageId: string } // stable user message identity
  | { stage: "rejected"; code: string; message?: string }
  | { stage: "uncertain"; code: string; message?: string };

// Cancel applied means cancellation was requested at the host, NOT proof of
// terminal process exit. Append applied always requires a stable messageId.
export type ExecutionCommandReceipt = ExecutionIdentity & {
  type: "execution.command.receipt";
  commandId: string;
} & (
  | ({ kind: "append" } & ExecutionReceiptOutcome)
  | ({ kind: "cancel" } & (Exclude<ExecutionReceiptOutcome, { stage: "applied" }> | { stage: "applied" }))
);

export interface ExecutionHeartbeat extends ExecutionIdentity {
  type: "execution.heartbeat";
  seq: number; // last emitted seq; heartbeat does not advance progress
}

export type ExecutionAttachmentFrame = ExecutionAttach | ExecutionAttached | ExecutionEvent
  | ExecutionCommand | ExecutionCommandReceipt | ExecutionHeartbeat;

export type ContractValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: "malformed" | "too_large" };

type RecordValue = Record<string, unknown>;
const encoder = new TextEncoder();
const identityKeys = ["dialogKey", "runId", "executionId", "hostSessionId", "machineId", "leaseEpoch"];
const idKeys = identityKeys.slice(0, -1);

export function isContractRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === "object"
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

export function hasOnlyContractKeys(value: RecordValue, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

export function isContractText(value: unknown, maxBytes: number): value is string {
  return typeof value === "string" && value.trim().length > 0
    && value.length <= maxBytes && encoder.encode(value).byteLength <= maxBytes;
}

export function isContractId(value: unknown): value is string {
  return isContractText(value, EXECUTION_ATTACHMENT_LIMITS.idBytes)
    && value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value);
}

export function isContractCounter(value: unknown, minimum = 0): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
}

// Bounded JSON-only preflight, before schema validation. Rejects cycles, accessors,
// custom prototypes/toJSON, unsupported values, non-finite numbers and deep trees.
// Transport must ALSO enforce the byte cap before decoding an untrusted frame.
export function validateContractJson(value: unknown): "malformed" | "too_large" | undefined {
  let nodes = 0;
  let bytes = 0;
  const ancestors = new Set<object>();
  const visit = (item: unknown, depth: number): "malformed" | "too_large" | undefined => {
    if (++nodes > EXECUTION_ATTACHMENT_LIMITS.jsonNodes || depth > EXECUTION_ATTACHMENT_LIMITS.jsonDepth) return "too_large";
    if (item === null || typeof item === "boolean") bytes += item === false ? 5 : 4;
    else if (typeof item === "number") {
      if (!Number.isFinite(item)) return "malformed";
      bytes += String(item).length;
    } else if (typeof item === "string") {
      if (item.length > EXECUTION_ATTACHMENT_LIMITS.messageBytes) return "too_large";
      bytes += encoder.encode(JSON.stringify(item)).byteLength;
    } else if (typeof item === "object") {
      if ((!Array.isArray(item) && !isContractRecord(item)) || ancestors.has(item)) return "malformed";
      ancestors.add(item);
      const array = Array.isArray(item);
      if (array && item.length > EXECUTION_ATTACHMENT_LIMITS.jsonNodes) return "too_large";
      const keys = Reflect.ownKeys(item);
      if (keys.length > EXECUTION_ATTACHMENT_LIMITS.jsonNodes) return "too_large";
      // Sparse arrays / named array properties are not canonical wire JSON.
      if (array && keys.length !== item.length + 1) return "malformed";
      bytes += 2;
      let count = 0;
      for (const key of keys) {
        if (array && key === "length") continue;
        if (typeof key !== "string") return "malformed";
        if (key.length > EXECUTION_ATTACHMENT_LIMITS.messageBytes) return "too_large";
        if (array && key !== String(count)) return "malformed";
        const descriptor = Object.getOwnPropertyDescriptor(item, key);
        if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return "malformed";
        bytes += (count++ > 0 ? 1 : 0) + (array ? 0 : encoder.encode(JSON.stringify(key)).byteLength + 1);
        const error = visit(descriptor.value, depth + 1);
        if (error) return error;
      }
      ancestors.delete(item);
    } else return "malformed";
    return bytes > EXECUTION_ATTACHMENT_LIMITS.messageBytes ? "too_large" : undefined;
  };
  try { return visit(value, 0); } catch { return "malformed"; }
}

export function isExpectedExecution(value: RecordValue): boolean {
  return isContractId(value.expectedExecutionId) && isContractCounter(value.expectedLeaseEpoch, 1);
}

/** Compare the whole binding at the persistence/host boundary, not only runId.
 * Authorization and atomic CAS/lease expiry checks remain the caller's job. */
export function matchesExecutionIdentity(expected: ExecutionIdentity, actual: ExecutionIdentity): boolean {
  return identityKeys.every((key) => expected[key as keyof ExecutionIdentity] === actual[key as keyof ExecutionIdentity]);
}

export function matchesExpectedExecution(expected: ExpectedExecution, actual: ExecutionIdentity): boolean {
  return expected.expectedExecutionId === actual.executionId && expected.expectedLeaseEpoch === actual.leaseEpoch;
}

function validEvent(value: unknown): value is ExecutionEventData {
  if (!isContractRecord(value)) return false;
  switch (value.kind) {
    case "status": return hasOnlyContractKeys(value, ["kind", "phase"]) && isContractText(value.phase, 512);
    case "checkpoint": return hasOnlyContractKeys(value, ["kind", "text"]) && isContractText(value.text, EXECUTION_ATTACHMENT_LIMITS.textBytes);
    case "input.accepted": return hasOnlyContractKeys(value, ["kind", "commandId"]) && isContractId(value.commandId);
    case "input.applied": return hasOnlyContractKeys(value, ["kind", "commandId", "messageId"]) && isContractId(value.commandId) && isContractId(value.messageId);
    case "terminal": return hasOnlyContractKeys(value, ["kind", "status", "message"])
      && ["done", "failed", "cancelled"].includes(value.status as string)
      && (value.message === undefined || isContractText(value.message, EXECUTION_ATTACHMENT_LIMITS.textBytes));
    default: return false;
  }
}

function validFrame(value: RecordValue): boolean {
  if (!idKeys.every((key) => isContractId(value[key]))) return false;
  if (!isContractCounter(value.leaseEpoch, value.type === "execution.attach" ? 0 : 1)) return false;
  const only = (...keys: string[]) => hasOnlyContractKeys(value, [...identityKeys, "type", ...keys]);
  switch (value.type) {
    case "execution.attach": return only("origin", "seq", "status", "checkpoint")
      && ["tui", "desktop", "connector"].includes(value.origin as string)
      && value.status === "running" && isContractCounter(value.seq)
      && (value.checkpoint === undefined || isContractText(value.checkpoint, EXECUTION_ATTACHMENT_LIMITS.textBytes));
    case "execution.attached": return only("seq", "pendingCommandIds") && isContractCounter(value.seq)
      && Array.isArray(value.pendingCommandIds) && value.pendingCommandIds.length <= 128
      && value.pendingCommandIds.every(isContractId) && new Set(value.pendingCommandIds).size === value.pendingCommandIds.length;
    case "execution.event": return only("seq", "event") && isContractCounter(value.seq, 1) && validEvent(value.event);
    case "execution.heartbeat": return only("seq") && isContractCounter(value.seq);
    case "execution.command": return isContractId(value.commandId) && isExpectedExecution(value)
      && value.expectedExecutionId === value.executionId && value.expectedLeaseEpoch === value.leaseEpoch
      && (value.kind === "cancel" ? only("commandId", "kind", "expectedExecutionId", "expectedLeaseEpoch")
        : value.kind === "append" && only("commandId", "kind", "expectedExecutionId", "expectedLeaseEpoch", "mode", "userInput")
          && (value.mode === "enqueue" || value.mode === "continue") && isContractText(value.userInput, EXECUTION_ATTACHMENT_LIMITS.inputBytes));
    case "execution.command.receipt": {
      if (!isContractId(value.commandId) || (value.kind !== "append" && value.kind !== "cancel")) return false;
      const base = ["commandId", "kind", "stage"];
      switch (value.stage) {
        case "queued": case "accepted": return only(...base);
        case "applied": return value.kind === "append" ? only(...base, "messageId") && isContractId(value.messageId) : only(...base);
        case "rejected": case "uncertain": return only(...base, "code", "message") && isContractId(value.code)
          && (value.message === undefined || isContractText(value.message, EXECUTION_ATTACHMENT_LIMITS.textBytes));
        default: return false;
      }
    }
    default: return false;
  }
}

export function validateExecutionAttachmentFrame(value: unknown): ContractValidationResult<ExecutionAttachmentFrame> {
  const error = validateContractJson(value);
  if (error) return { ok: false, error };
  if (!isContractRecord(value) || !validFrame(value)) return { ok: false, error: "malformed" };
  return { ok: true, value: value as unknown as ExecutionAttachmentFrame };
}

export function isExecutionAttachmentFrame(value: unknown): value is ExecutionAttachmentFrame {
  return validateExecutionAttachmentFrame(value).ok;
}

/** Use at text transport boundaries to enforce the raw UTF-8 cap BEFORE JSON
 * decoding. Object validators cannot detect oversized whitespace/escaped input. */
export function parseExecutionAttachmentFrame(raw: string): ContractValidationResult<ExecutionAttachmentFrame> {
  if (typeof raw !== "string") return { ok: false, error: "malformed" };
  if (raw.length > EXECUTION_ATTACHMENT_LIMITS.messageBytes
    || encoder.encode(raw).byteLength > EXECUTION_ATTACHMENT_LIMITS.messageBytes) {
    return { ok: false, error: "too_large" };
  }
  try { return validateExecutionAttachmentFrame(JSON.parse(raw)); }
  catch { return { ok: false, error: "malformed" }; }
}
