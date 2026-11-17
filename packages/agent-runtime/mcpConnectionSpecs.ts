/** Pure cross-runtime MCP contract. No I/O, SDK, secret resolution or authorization. */
import type { CredentialRef } from "./credentialBroker";

export const MCP_CONNECTION_SCHEMA_VERSION = 1 as const;
export const MCP_TOOL_NAMES = Object.freeze(["listMcpConnections", "listMcpTools", "callMcpTool"] as const);
export type McpPlacement = { kind: "server" } | { kind: "local" } | { kind: "machine"; machineId: string };
export type McpPresetId = "zoho-mail";
export type McpAuth = { kind: "none" } | { kind: "oauth" } | { kind: "bearer"; credentialRef: CredentialRef };
export type McpTransport = { kind: "streamable-http"; endpointRef: CredentialRef };
/** Host-audited exact argument constraints. Every supplied argument must be listed.
 * Empty values permit arbitrary JSON for an audited read-only parameter; nonempty values require explicit presence and an exact JSON value match. */
export type McpReadPolicy = { toolName: string; arguments: Record<string, JsonValue[]> };

/** Authenticated settings input, NOT a model tool input. Owner/id/revision are never accepted here. */
export type McpConnectionWrite = {
  schemaVersion: typeof MCP_CONNECTION_SCHEMA_VERSION;
  label: string;
  enabled: boolean;
  presetId?: McpPresetId;
  allowedToolNames: string[];
  readPolicies: McpReadPolicy[];
  placement: McpPlacement;
  transport: McpTransport;
  auth: McpAuth;
};
/** Private per-account record; refs and executable details must not be returned to model/list APIs. */
export type McpConnection = McpConnectionWrite & { id: string; ownerUserId: string; revision: number };
export type McpConnectionSummary = Pick<McpConnection, "schemaVersion" | "id" | "label" | "enabled" | "revision" | "presetId" | "placement"> & {
  transportKind: McpTransport["kind"];
  authKind: McpAuth["kind"];
  endpointConfigured: boolean;
  credentialConfigured: boolean;
};
export type McpConnectionUpdate = { connectionId: string; expectedRevision: number; connection: McpConnectionWrite };
export type McpListToolsInput = { connectionId: string; expectedRevision: number; cursor?: string };
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type McpCallToolInput = {
  connectionId: string; expectedRevision: number; catalogRevision: string;
  toolName: string; arguments: Record<string, JsonValue>;
};
export type McpErrorCode =
  | "invalid_input" | "unsupported_version" | "forbidden" | "not_found" | "disabled"
  | "revision_conflict" | "catalog_stale" | "placement_unavailable" | "credential_unavailable"
  | "authentication_required" | "network_denied" | "invalid_tool_arguments" | "untrusted_schema"
  | "limit_exceeded" | "cancelled" | "timeout" | "transport_error"
  /** No host approval channel exists in this execution plane (e.g. headless run). Not a refusal. */
  | "approval_unavailable";
/** Fixed codes only: never attach provider exceptions, URLs, args, refs or arbitrary input paths. */
export type McpResult<T> = { ok: true; value: T } | { ok: false; error: { code: McpErrorCode } };
const failure = (code: McpErrorCode): McpResult<never> => ({ ok: false, error: { code } });

/** External schemas/annotations/content are untrusted data, not our settings schema or authorization. */
export type McpToolDescriptor = {
  name: string; description?: string; inputSchema: unknown; outputSchema?: unknown; annotations?: unknown;
};
export type McpToolCatalog = {
  connectionId: string; connectionRevision: number; catalogRevision: string;
  tools: McpToolDescriptor[]; nextCursor?: string;
};
export type McpCallOutput = {
  connectionId: string; connectionRevision: number; catalogRevision: string;
  content: JsonValue[]; structuredContent?: Record<string, JsonValue>; isError?: boolean;
};
/** Internal binding to feed EXISTING confirmation machinery. Not a permission, ticket or model input. */
export type McpInvocationBinding = {
  authenticatedUserId: string; agentKey: string; dialogId: string;
  connectionId: string; connectionRevision: number; placement: McpPlacement;
  catalogRevision: string; toolName: string;
  /** Digest of canonical JSON args, computed by the trusted adapter, never supplied by the model. */
  argumentsDigest: string;
};
export type McpCallResult = McpResult<McpCallOutput> | {
  ok: true; status: "requires_confirmation"; binding: McpInvocationBinding;
};
/** Only trusted adapter constructs this AFTER live connection/use/machine/confirmation checks.
 * This is a dependency contract, not proof those checks have occurred. Never deserialize from requests.
 */
export type McpExecutionContext = {
  authenticatedUserId: string; agentKey: string; dialogId: string;
  connection: McpConnection; signal: AbortSignal;
};
export interface McpClientAdapter {
  listTools(context: McpExecutionContext, input: McpListToolsInput): Promise<McpResult<McpToolCatalog>>;
  callTool(context: McpExecutionContext, input: McpCallToolInput): Promise<McpResult<McpCallOutput>>;
}
export function sameMcpPlacement(a: McpPlacement, b: McpPlacement): boolean {
  return a.kind === b.kind && (a.kind !== "machine" || (b.kind === "machine" && a.machineId === b.machineId));
}
/** JSON Schema draft 2020-12 subset, authored here only. NOT an external MCP schema evaluator. */
type ContractSchema = {
  readonly type?: "object" | "array" | "string" | "integer" | "boolean";
  readonly const?: string | number | boolean;
  readonly enum?: readonly string[];
  readonly oneOf?: readonly ContractSchema[];
  readonly properties?: Readonly<Record<string, ContractSchema>>;
  readonly required?: readonly string[];
  readonly additionalProperties?: false | ContractSchema;
  readonly propertyNames?: ContractSchema;
  readonly items?: ContractSchema;
  readonly minLength?: number; readonly maxLength?: number; readonly pattern?: string;
  readonly minimum?: number; readonly maximum?: number; readonly maxItems?: number; readonly maxProperties?: number;
};
function freezeSchema<T extends object>(value: T): T {
  for (const child of Object.values(value)) if (child && typeof child === "object") freezeSchema(child);
  return Object.freeze(value);
}
const text = (maxLength: number): ContractSchema => ({ type: "string", minLength: 1, maxLength, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
const idSchema: ContractSchema = { ...text(128), pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$" };
// Shared ref subset accepted by local broker and server secret key adapters; no URLs or paths.
const refSchema: ContractSchema = { ...text(128), pattern: "^[A-Za-z0-9][A-Za-z0-9_:-]{0,127}$" };
const revisionSchema: ContractSchema = { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const objectSchema = (properties: Record<string, ContractSchema>, required = Object.keys(properties)): ContractSchema =>
  ({ type: "object", properties, required, additionalProperties: false });
const placements: ContractSchema = { type: "object", required: ["kind"], properties: { kind: { const: "local" } }, additionalProperties: false };
export const MCP_CONNECTION_WRITE_SCHEMA: ContractSchema = {
 type: "object", required: ["schemaVersion", "label", "enabled", "placement", "transport", "auth", "allowedToolNames", "readPolicies"],
 properties: {
 schemaVersion: { const: 1 }, label: { type: "string", minLength: 1, maxLength: 160, pattern: "^[^:/\\\\\\r\\n]+$" }, enabled: { type: "boolean" },
 presetId: { enum: ["zoho-mail"] }, placement: placements,
 allowedToolNames: { type: "array", maxItems: 256, items: text(160) },
 readPolicies: { type: "array", maxItems: 256, items: { type: "object", required: ["toolName", "arguments"], properties: { toolName: text(160), arguments: { type: "object", maxProperties: 128, additionalProperties: { type: "array", maxItems: 256 } } }, additionalProperties: false } },
 transport: { type: "object", required: ["kind", "endpointRef"], properties: { kind: { const: "streamable-http" }, endpointRef: refSchema }, additionalProperties: false },
 auth: { oneOf: [{ type: "object", required: ["kind"], properties: { kind: { const: "oauth" } }, additionalProperties: false }, { type: "object", required: ["kind"], properties: { kind: { const: "none" } }, additionalProperties: false }, { type: "object", required: ["kind", "credentialRef"], properties: { kind: { const: "bearer" }, credentialRef: refSchema }, additionalProperties: false }] }
 }, additionalProperties: false
};
export const MCP_CONNECTION_UPDATE_SCHEMA = freezeSchema(objectSchema({
  connectionId: idSchema, expectedRevision: revisionSchema, connection: MCP_CONNECTION_WRITE_SCHEMA,
}));
export const MCP_LIST_TOOLS_INPUT_SCHEMA = freezeSchema(objectSchema({
  connectionId: idSchema, expectedRevision: revisionSchema, cursor: text(2048),
}, ["connectionId", "expectedRevision"]));
export const MCP_CALL_TOOL_INPUT_SCHEMA = freezeSchema(objectSchema({
  connectionId: idSchema, expectedRevision: revisionSchema, catalogRevision: idSchema,
  toolName: text(256), arguments: { type: "object", additionalProperties: {} },
}));

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
}
/** Limited to our finite authored schemas. Never call on remote inputSchema/outputSchema. */
function matches(schema: ContractSchema, value: unknown): boolean {
  if (schema.oneOf && schema.oneOf.filter(branch => matches(branch, value)).length !== 1) return false;
  if (schema.const !== undefined && value !== schema.const) return false;
  if (schema.enum && (typeof value !== "string" || !schema.enum.includes(value))) return false;
  switch (schema.type) {
    case "string":
      return typeof value === "string" && value.length >= (schema.minLength ?? 0) && value.length <= (schema.maxLength ?? Infinity) &&
        (!schema.pattern || new RegExp(schema.pattern, "u").test(value));
    case "integer":
      return typeof value === "number" && Number.isSafeInteger(value) && value >= (schema.minimum ?? -Infinity) && value <= (schema.maximum ?? Infinity);
    case "boolean": return typeof value === "boolean";
    case "array": return Array.isArray(value) && value.length <= (schema.maxItems ?? Infinity) && value.every(item => !schema.items || matches(schema.items, item));
    case "object": {
      if (!isRecord(value) || Object.keys(value).length > (schema.maxProperties ?? Infinity)) return false;
      if (schema.required?.some(key => !Object.hasOwn(value, key))) return false;
      return Object.entries(value).every(([key, entry]) => {
        if (schema.propertyNames && !matches(schema.propertyNames, key)) return false;
        const property = schema.properties && Object.hasOwn(schema.properties, key) ? schema.properties[key] : schema.additionalProperties;
        return property === undefined || property === false ? property !== false : matches(property, entry);
      });
    }
    default: return true;
  }
}
/** Bounds JSON before traversing our schema; reject prototype keys, cycles, getters and non-JSON objects. */
function isBoundedJson(value: unknown, depth = 0, budget = { nodes: 0, chars: 0 }): boolean {
  if (++budget.nodes > 10000 || depth > 32) return false;
  if (typeof value === "string") return (budget.chars += value.length) <= 262144;
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (!Array.isArray(value) && !isRecord(value)) return false;
  return Object.entries(Object.getOwnPropertyDescriptors(value)).every(([key, descriptor]) => {
    if (Array.isArray(value) && key === "length") return true;
    if (["__proto__", "prototype", "constructor"].includes(key) || !Object.hasOwn(descriptor, "value")) return false;
    budget.chars += key.length;
    return budget.chars <= 262144 && isBoundedJson(descriptor.value, depth + 1, budget);
  });
}
function parse<T>(schema: ContractSchema, value: unknown): McpResult<T> {
  if (!isBoundedJson(value) || !matches(schema, value)) return failure("invalid_input");
  // Snapshot validated data to break aliases with caller-owned input.
  return { ok: true, value: JSON.parse(JSON.stringify(value)) as T };
}
/** Runtime semantic checks are mandatory in addition to JSON Schema shape validation. */
export function parseMcpConnectionWrite(value: unknown): McpResult<McpConnectionWrite> {
  const parsed = parse<McpConnectionWrite>(MCP_CONNECTION_WRITE_SCHEMA, value);
  if (!parsed.ok) {
    if (isRecord(value) && Object.getOwnPropertyDescriptor(value, "schemaVersion")?.value !== undefined &&
      Object.getOwnPropertyDescriptor(value, "schemaVersion")?.value !== 1) return failure("unsupported_version");
    return parsed;
  }
  const connection = parsed.value;
  if (new Set(connection.allowedToolNames).size !== connection.allowedToolNames.length ||
      new Set(connection.readPolicies.map(p => p.toolName)).size !== connection.readPolicies.length ||
      connection.readPolicies.some(p => !connection.allowedToolNames.includes(p.toolName))) return failure("invalid_input");
  return parsed;
}
export function parseMcpConnectionUpdate(value: unknown): McpResult<McpConnectionUpdate> {
  const parsed = parse<McpConnectionUpdate>(MCP_CONNECTION_UPDATE_SCHEMA, value);
  if (!parsed.ok) return parsed;
  const connection = parseMcpConnectionWrite(parsed.value.connection);
  return connection.ok ? { ok: true, value: { ...parsed.value, connection: connection.value } } : connection;
}
export function parseMcpListToolsInput(value: unknown): McpResult<McpListToolsInput> {
  return parse<McpListToolsInput>(MCP_LIST_TOOLS_INPUT_SCHEMA, value);
}
export function parseMcpCallToolInput(value: unknown): McpResult<McpCallToolInput> {
  return parse<McpCallToolInput>(MCP_CALL_TOOL_INPUT_SCHEMA, value);
}
/** Public/model projection uses explicit allowlist, no object spread of private records. */
export function toMcpConnectionSummary(connection: McpConnection): McpConnectionSummary {
  return {
    schemaVersion: 1, id: connection.id, label: connection.label, enabled: connection.enabled, revision: connection.revision,
    ...(connection.presetId ? { presetId: connection.presetId } : {}),
    placement: connection.placement.kind === "machine" ? { kind: "machine", machineId: connection.placement.machineId } : { kind: connection.placement.kind },
    transportKind: connection.transport.kind, authKind: connection.auth.kind,
    endpointConfigured: true,
    credentialConfigured: connection.auth.kind === "bearer",
  };
}
