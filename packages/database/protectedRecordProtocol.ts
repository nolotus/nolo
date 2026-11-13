/** Dependency-free wire contract. Validation is not authorization or authority resolution. */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type ProtectedRecord = { [key: string]: JsonValue };
export const PROTECTED_RECORD_PROTOCOL_VERSION = 1 as const;

export type ProtectedMutationIdentity = {
  mutationId: string;
  authorityServer: string;
  authorityEpoch: string;
};
export type ProtectedMutationBaseline =
  | { expectedRevision: string; createOnly?: never }
  | { createOnly: true; expectedRevision?: never };

/**
 * dbKey belongs to the transport target; actor identity comes from authenticated server context.
 * replace replaces the entire record. v1 patch follows routes/patch.ts deepMerge:
 * record-valued fields merge recursively; arrays/scalars replace the field.
 * null deletes a field already present in the merge target; if absent, existing
 * deepMerge assigns null. This is the existing handler contract, not JSON Merge Patch.
 * Validation preserves the payload (including null); only the handler applies it.
 * patch requires an existing revision; only replace permits create-only.
 * Unknown versions/operations/fields are rejected, never downgraded to legacy writes.
 */
export type ProtectedMutation = ProtectedMutationIdentity & { protocolVersion: 1 } & (
  | ({ operation: "replace"; payload: ProtectedRecord } & ProtectedMutationBaseline)
  | { operation: "patch"; payload: ProtectedRecord; expectedRevision: string; createOnly?: never }
);

/** Common ACK fields; generic record preserves legacy client's JSON-valued local format. */
export type ProtectedMutationAckFields<RecordValue extends JsonValue = ProtectedRecord> =
  ProtectedMutationIdentity & { revision: string; record: RecordValue };
export type ProtectedMutationAck = ProtectedMutationAckFields & { protocolVersion: 1 };

/** Validation only: no serialization, hashing, storage, IO or execution of accessors/toJSON. */
function assertJson(value: unknown, ancestors = new Set<object>()): asserts value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (typeof value !== "object" || value === null || ancestors.has(value)) {
    throw new TypeError("Invalid JSON value");
  }
  const array = Array.isArray(value);
  const proto = Object.getPrototypeOf(value);
  if (!array && proto !== Object.prototype && proto !== null) throw new TypeError("Invalid JSON object");
  const keys = Reflect.ownKeys(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (array && keys.length !== value.length + 1) throw new TypeError("Invalid JSON array");
  ancestors.add(value);
  try {
    for (const key of keys) {
      if (array && key === "length") continue;
      if (typeof key !== "string") throw new TypeError("Invalid JSON key");
      const descriptor = descriptors[key];
      if (!descriptor.enumerable || !("value" in descriptor)) throw new TypeError("Invalid JSON property");
      if (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length)) {
        throw new TypeError("Invalid JSON array index");
      }
      assertJson(descriptor.value, ancestors);
    }
  } finally {
    ancestors.delete(value);
  }
}

function assertRecord(value: unknown): asserts value is ProtectedRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Expected JSON record");
  assertJson(value);
}

function envelope(value: unknown, fields: readonly string[]): ProtectedRecord {
  assertRecord(value);
  if (value.protocolVersion !== PROTECTED_RECORD_PROTOCOL_VERSION) throw new TypeError("Unsupported protocolVersion");
  if (Object.keys(value).some(key => !fields.includes(key))) throw new TypeError("Unknown protocol field");
  for (const key of ["mutationId", "authorityServer", "authorityEpoch"]) nonEmpty(value[key], key);
  return value;
}

function nonEmpty(value: unknown, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) throw new TypeError(`Invalid ${field}`);
}

const identityFields = ["protocolVersion", "mutationId", "authorityServer", "authorityEpoch"];

function assertProtectedMutation(input: unknown): asserts input is ProtectedMutation {
  const value = envelope(input, [...identityFields, "operation", "payload", "expectedRevision", "createOnly"]);
  if (value.operation !== "replace" && value.operation !== "patch") throw new TypeError("Unsupported operation");
  assertRecord(value.payload);
  if (Object.hasOwn(value, "createOnly")) {
    if (value.createOnly !== true || Object.hasOwn(value, "expectedRevision") || value.operation !== "replace") {
      throw new TypeError("Invalid create-only baseline");
    }
  } else {
    nonEmpty(value.expectedRevision, "expectedRevision");
  }
}

/** Returns validated input without rewriting it; caller owns its lifetime and later mutation. */
export function parseProtectedMutation(input: unknown): ProtectedMutation {
  assertProtectedMutation(input);
  return input;
}

/** Success ACK is a full committed record, not an echoed patch or client claim. */
export function parseProtectedMutationAck(input: unknown): ProtectedMutationAck {
  const value = envelope(input, [...identityFields, "revision", "record"]);
  nonEmpty(value.revision, "revision");
  assertRecord(value.record);
  return value as ProtectedMutationAck;
}
