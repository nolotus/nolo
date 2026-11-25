/**
 * Shared Valibot API procedure contracts for Attached Execution (cross-device Agent Run).
 *
 * Lives in `shared/contracts/` (public role) so Web, Desktop, React Native,
 * CLI, and Server share exact input/output types and runtime validation via
 * `defineApiContract` + `callApiProcedure` without any external RPC library.
 */
import * as v from "valibot";
import { defineApiContract } from "desktop-runtime/apiContract";
import {
  EXECUTION_ATTACHMENT_LIMITS,
  isContractId,
  validateExecutionAttachmentFrame,
  type ExecutionCommandReceipt,
  type ExecutionEvent,
  type ExecutionStatus,
} from "./executionAttachment";

export const ATTACHED_EXECUTION_EVENTS_PATH = "/api/agent/runs/attached/events" as const;
export const ATTACHED_EXECUTION_RECEIPT_PATH = "/api/agent/runs/attached/receipt" as const;

const ContractIdString = v.pipe(
  v.string(),
  v.custom<string>((val) => isContractId(val), "Invalid contract identifier"),
);

/**
 * Query-string or JSON safe-integer counter (`0..Number.MAX_SAFE_INTEGER`).
 * Rejects empty/whitespace strings (`""`, `"  "`), decimals, signs, and unsafe integers.
 */
const QueryCounterSchema = (minimum: number) =>
  v.pipe(
    v.union([
      v.number(),
      v.pipe(
        v.string(),
        v.regex(/^\d+$/, "Counter must be a base-10 non-negative integer string"),
        v.transform((raw) => Number(raw)),
      ),
    ]),
    v.number(),
    v.safeInteger(),
    v.minValue(minimum),
  );

const ExecutionStatusSchema = v.picklist([
  "running",
  "done",
  "failed",
  "cancelled",
]) as v.BaseSchema<unknown, ExecutionStatus, v.BaseIssue<unknown>>;

/**
 * Delegate frame validation directly to the single source of truth
 * (`validateExecutionAttachmentFrame`) so event and receipt invariants
 * (such as `append` + `applied` requiring `messageId`, `rejected`/`uncertain`
 * requiring `code`, and strict key whitelists) never drift across schemas.
 */
export const ExecutionEventWireSchema = v.custom<ExecutionEvent>((value) => {
  const checked = validateExecutionAttachmentFrame(value);
  return checked.ok && checked.value.type === "execution.event";
}, "Invalid execution.event frame");

export const ExecutionReceiptWireSchema = v.custom<ExecutionCommandReceipt>((value) => {
  const checked = validateExecutionAttachmentFrame(value);
  return checked.ok && checked.value.type === "execution.command.receipt";
}, "Invalid execution.command.receipt frame");

export interface ReadAttachedExecutionEventsInput {
  dialogKey: string;
  leaseEpoch?: number | string;
  afterSeq?: number | string;
  limit?: number | string;
}

export interface ReadAttachedExecutionEventsOutput {
  events: ExecutionEvent[];
  nextAfterSeq: number;
  latestSeq: number;
  leaseEpoch: number;
  status: ExecutionStatus;
  hasMore: boolean;
}

export const readAttachedExecutionEventsContract = defineApiContract<
  ReadAttachedExecutionEventsInput,
  ReadAttachedExecutionEventsOutput
>({
  method: "GET",
  path: ATTACHED_EXECUTION_EVENTS_PATH,
  auth: "required",
  input: v.object({
    dialogKey: ContractIdString,
    leaseEpoch: v.optional(QueryCounterSchema(1)),
    afterSeq: v.optional(QueryCounterSchema(0)),
    limit: v.optional(QueryCounterSchema(1)),
  }) as unknown as v.BaseSchema<
    unknown,
    ReadAttachedExecutionEventsInput,
    v.BaseIssue<unknown>
  >,
  output: v.object({
    events: v.array(ExecutionEventWireSchema),
    nextAfterSeq: v.pipe(v.number(), v.safeInteger(), v.minValue(0)),
    latestSeq: v.pipe(v.number(), v.safeInteger(), v.minValue(0)),
    leaseEpoch: v.pipe(v.number(), v.safeInteger(), v.minValue(1)),
    status: ExecutionStatusSchema,
    hasMore: v.boolean(),
  }),
});

export interface ReadAttachedExecutionReceiptInput {
  dialogKey: string;
  commandId: string;
}

export interface ReadAttachedExecutionReceiptOutput {
  found: boolean;
  receipt?: ExecutionCommandReceipt;
  createdAt?: number;
  updatedAt?: number;
}

export const readAttachedExecutionReceiptContract = defineApiContract<
  ReadAttachedExecutionReceiptInput,
  ReadAttachedExecutionReceiptOutput
>({
  method: "GET",
  path: ATTACHED_EXECUTION_RECEIPT_PATH,
  auth: "required",
  input: v.object({
    dialogKey: ContractIdString,
    commandId: ContractIdString,
  }),
  output: v.object({
    found: v.boolean(),
    receipt: v.optional(ExecutionReceiptWireSchema),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }),
});
