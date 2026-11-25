/**
 * Shared Valibot API procedure contract for idempotent batched database
 * mutations (`POST /api/v1/db/batch`).
 *
 * Lives in `shared/contracts/` (public role, zero private imports) so Web,
 * Desktop, React Native, CLI, and Server share one canonical envelope and
 * runtime schema via `defineApiContract` + `callApiProcedure`.
 */
import * as v from "valibot";
import { defineApiContract } from "desktop-runtime/apiContract";
import { isContractId } from "./executionAttachment";

export const DB_BATCH_PATH = "/api/v1/db/batch" as const;
export const DB_BATCH_MAX_OPERATIONS = 100;

const SafeIdSchema = v.pipe(
  v.string(),
  v.custom<string>((val) => isContractId(val), "Invalid identifier"),
);

const SafeKeySchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "customKey must be non-empty"),
  v.maxLength(512, "customKey exceeds max length"),
);

export interface DbBatchPutOperation {
  opId: string;
  op: "put";
  customKey: string;
  data: Record<string, unknown>;
  indexKeys?: string[];
}

export interface DbBatchDeleteOperation {
  opId: string;
  op: "delete";
  customKey: string;
  force?: boolean;
}

export type DbBatchOperation = DbBatchPutOperation | DbBatchDeleteOperation;

export interface DbBatchInput {
  idempotencyKey?: string;
  operations: DbBatchOperation[];
}

export interface DbBatchOperationResult {
  opId: string;
  op: "put" | "delete";
  customKey: string;
  ok: boolean;
  status: number;
  code?: string;
  message?: string;
}

export interface DbBatchOutput {
  batchId: string;
  idempotencyKey?: string;
  replayed: boolean;
  succeeded: number;
  failed: number;
  results: DbBatchOperationResult[];
}

const DbBatchPutOperationSchema = v.object({
  opId: SafeIdSchema,
  op: v.literal("put"),
  customKey: SafeKeySchema,
  data: v.record(v.string(), v.unknown()),
  indexKeys: v.optional(v.array(SafeKeySchema)),
});

const DbBatchDeleteOperationSchema = v.object({
  opId: SafeIdSchema,
  op: v.literal("delete"),
  customKey: SafeKeySchema,
  force: v.optional(v.boolean()),
});

const DbBatchOperationSchema = v.variant("op", [
  DbBatchPutOperationSchema,
  DbBatchDeleteOperationSchema,
]);

export const dbBatchContract = defineApiContract<DbBatchInput, DbBatchOutput>({
  method: "POST",
  path: DB_BATCH_PATH,
  auth: "required",
  input: v.object({
    idempotencyKey: v.optional(SafeIdSchema),
    operations: v.pipe(
      v.array(DbBatchOperationSchema),
      v.minLength(1, "operations must contain at least 1 item"),
      v.maxLength(
        DB_BATCH_MAX_OPERATIONS,
        `operations cannot exceed ${DB_BATCH_MAX_OPERATIONS} items`,
      ),
    ),
  }),
  output: v.object({
    batchId: v.string(),
    idempotencyKey: v.optional(v.string()),
    replayed: v.boolean(),
    succeeded: v.pipe(v.number(), v.safeInteger(), v.minValue(0)),
    failed: v.pipe(v.number(), v.safeInteger(), v.minValue(0)),
    results: v.array(
      v.object({
        opId: v.string(),
        op: v.picklist(["put", "delete"]),
        customKey: v.string(),
        ok: v.boolean(),
        status: v.pipe(v.number(), v.safeInteger(), v.minValue(100), v.maxValue(599)),
        code: v.optional(v.string()),
        message: v.optional(v.string()),
      }),
    ),
  }),
});
