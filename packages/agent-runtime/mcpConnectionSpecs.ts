/** Pure cross-runtime MCP contract. No I/O, SDK, secret resolution or authorization. */
import type { CredentialRef } from "./credentialBroker";

export const MCP_CONNECTION_SCHEMA_VERSION = 1 as const;
export const MCP_TOOL_NAMES = Object.freeze(["listMcpConnections", "listMcpTools", "callMcpTool"] as const);
export type McpPlacement = { kind: "server" } | { kind: "local" } | { kind: "machine"; machineId: string };
export type McpPresetId = "zoho-mail" | "home-assistant" | "github";
export type McpPresetSpec = Readonly<{
  id: McpPresetId;
  title: string;
  summary: string;
  defaultAuthKind: "none" | "bearer";
  endpointPlaceholder: string;
  note: string;
}>;
export const MCP_PRESET_SPECS: readonly McpPresetSpec[] = Object.freeze([
  Object.freeze({
    id: "zoho-mail",
    title: "Zoho Mail MCP",
    summary: "接入 Zoho 官方为你账号生成的专属 MCP HTTPS 服务地址，在受控工具白名单与确认门下读取或检索邮件。",
    defaultAuthKind: "none",
    endpointPlaceholder: "https://mail.zoho.com/mcp/...",
    note: "Zoho 生成的专属 Server URL 内含访问密钥，保存时将直接加密存入受控密文库，不会以明文回显。",
  }),
  Object.freeze({
    id: "home-assistant",
    title: "Home Assistant MCP",
    summary: "接入公网 HTTPS 可达的 Home Assistant 官方 MCP Server（如 /api/mcp），经每次调用确认后查看或控制实体。",
    defaultAuthKind: "bearer",
    endpointPlaceholder: "https://ha.example.com/api/mcp",
    note: "服务端连接仅访问公网 HTTPS（自动拦截内网/私网地址），需提供长期访问令牌（Bearer Token）。",
  }),
  Object.freeze({
    id: "github",
    title: "GitHub MCP",
    summary: "接入 GitHub 官方托管的远程 MCP Server（无需自建），可访问仓库、Issue、PR 等资源，工具调用仍受白名单与每次调用确认门约束。",
    defaultAuthKind: "bearer",
    endpointPlaceholder: "https://api.githubcopilot.com/mcp/",
    note: "请填写上方提示的官方地址，并使用 GitHub 个人访问令牌（PAT）作为 Bearer Token，暂不支持 OAuth。可使用细粒度 PAT，仅授权需要访问的仓库；只读场景按需授予 Contents、Issues、Pull requests 等仓库权限的只读级别。实际权限取决于 PAT 授予的仓库范围和权限，预设不会把令牌限制为只读。令牌保存时会加密存入受控密文库，不会以明文回显。",
  }),
]);
export function getMcpPresetSpec(id: string | null | undefined): McpPresetSpec | undefined {
  return MCP_PRESET_SPECS.find((spec) => spec.id === id);
}
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
export type McpConnectionSummary = Pick<McpConnection, "schemaVersion" | "id" | "label" | "enabled" | "revision" | "presetId" | "placement" | "allowedToolNames" | "readPolicies"> & {
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
const placements: ContractSchema = {
  oneOf: [
    { type: "object", required: ["kind"], properties: { kind: { const: "local" } }, additionalProperties: false },
    { type: "object", required: ["kind"], properties: { kind: { const: "server" } }, additionalProperties: false },
    { type: "object", required: ["kind", "machineId"], properties: { kind: { const: "machine" }, machineId: idSchema }, additionalProperties: false },
  ],
};
export const MCP_CONNECTION_WRITE_SCHEMA: ContractSchema = {
 type: "object", required: ["schemaVersion", "label", "enabled", "placement", "transport", "auth", "allowedToolNames", "readPolicies"],
 properties: {
 schemaVersion: { const: 1 }, label: { type: "string", minLength: 1, maxLength: 160, pattern: "^[^:/\\\\\\r\\n]+$" }, enabled: { type: "boolean" },
 presetId: { enum: MCP_PRESET_SPECS.map((preset) => preset.id) }, placement: placements,
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
export const MCP_LIST_CONNECTIONS_INPUT_SCHEMA = freezeSchema(objectSchema({}, []));

export type McpServerCreateInput = {
  label: string;
  enabled: boolean;
  presetId?: McpPresetId;
  allowedToolNames: string[];
  readPolicies: McpReadPolicy[];
  authKind: "none" | "bearer";
  endpoint: string;
  credential?: string;
};

export type McpServerUpdateInput = {
  connectionId: string;
  expectedRevision: number;
  label: string;
  enabled: boolean;
  presetId?: McpPresetId;
  allowedToolNames: string[];
  readPolicies: McpReadPolicy[];
  authKind: "none" | "bearer";
  /** Omit when keeping the existing encrypted endpoint unchanged. */
  endpoint?: string;
  /** Omit when keeping the existing encrypted bearer token unchanged. */
  credential?: string;
};

export type McpServerDeleteInput = {
  expectedRevision: number;
};

function isValidHttpsEndpointUrl(raw: string): boolean {
  if (!raw || raw.length > 16384) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password && !parsed.hash;
  } catch {
    return false;
  }
}

export function parseMcpServerCreateInput(value: unknown): McpResult<McpServerCreateInput> {
  if (!isBoundedJson(value) || !isRecord(value)) return failure("invalid_input");
  const allowedKeys = new Set(["label", "enabled", "presetId", "allowedToolNames", "readPolicies", "authKind", "endpoint", "credential"]);
  if (Object.keys(value).some((k) => !allowedKeys.has(k))) return failure("invalid_input");
  if (typeof value.label !== "string" || !matches({ type: "string", minLength: 1, maxLength: 160, pattern: "^[^:/\\\\\\r\\n]+$" }, value.label.trim())) {
    return failure("invalid_input");
  }
  if (typeof value.enabled !== "boolean") return failure("invalid_input");
  if (value.presetId !== undefined && !getMcpPresetSpec(String(value.presetId))) return failure("invalid_input");
  if (value.authKind !== "none" && value.authKind !== "bearer") return failure("invalid_input");
  if (typeof value.endpoint !== "string" || !isValidHttpsEndpointUrl(value.endpoint.trim())) {
    return failure("invalid_input");
  }
  if (value.authKind === "bearer") {
    if (typeof value.credential !== "string" || !value.credential.trim() || value.credential.length > 16384) {
      return failure("invalid_input");
    }
  } else if (value.credential !== undefined && value.credential !== "") {
    return failure("invalid_input");
  }
  const allowedToolsRaw = value.allowedToolNames ?? [];
  const readPoliciesRaw = value.readPolicies ?? [];
  const probe = parseMcpConnectionWrite({
    schemaVersion: 1,
    label: value.label.trim(),
    enabled: value.enabled,
    ...(value.presetId ? { presetId: value.presetId as McpPresetId } : {}),
    allowedToolNames: allowedToolsRaw,
    readPolicies: readPoliciesRaw,
    placement: { kind: "server" },
    transport: { kind: "streamable-http", endpointRef: "probe-ref" },
    auth: value.authKind === "bearer" ? { kind: "bearer", credentialRef: "probe-cred" } : { kind: "none" },
  });
  if (!probe.ok) return probe;
  return {
    ok: true,
    value: {
      label: probe.value.label,
      enabled: probe.value.enabled,
      ...(probe.value.presetId ? { presetId: probe.value.presetId } : {}),
      allowedToolNames: probe.value.allowedToolNames,
      readPolicies: probe.value.readPolicies,
      authKind: value.authKind,
      endpoint: value.endpoint.trim(),
      ...(value.authKind === "bearer" ? { credential: (value.credential as string).trim() } : {}),
    },
  };
}

export function parseMcpServerUpdateInput(value: unknown): McpResult<McpServerUpdateInput> {
  if (!isBoundedJson(value) || !isRecord(value)) return failure("invalid_input");
  const allowedKeys = new Set(["connectionId", "expectedRevision", "label", "enabled", "presetId", "allowedToolNames", "readPolicies", "authKind", "endpoint", "credential"]);
  if (Object.keys(value).some((k) => !allowedKeys.has(k))) return failure("invalid_input");
  if (!matches(idSchema, value.connectionId) || !matches(revisionSchema, value.expectedRevision)) {
    return failure("invalid_input");
  }
  if (typeof value.label !== "string" || !matches({ type: "string", minLength: 1, maxLength: 160, pattern: "^[^:/\\\\\\r\\n]+$" }, value.label.trim())) {
    return failure("invalid_input");
  }
  if (typeof value.enabled !== "boolean") return failure("invalid_input");
  if (value.presetId !== undefined && !getMcpPresetSpec(String(value.presetId))) return failure("invalid_input");
  if (value.authKind !== "none" && value.authKind !== "bearer") return failure("invalid_input");
  let nextEndpoint: string | undefined;
  if (value.endpoint !== undefined && value.endpoint !== "") {
    if (typeof value.endpoint !== "string" || !isValidHttpsEndpointUrl(value.endpoint.trim())) {
      return failure("invalid_input");
    }
    nextEndpoint = value.endpoint.trim();
  }
  let nextCredential: string | undefined;
  if (value.credential !== undefined && value.credential !== "") {
    if (value.authKind !== "bearer" || typeof value.credential !== "string" || !value.credential.trim() || value.credential.length > 16384) {
      return failure("invalid_input");
    }
    nextCredential = value.credential.trim();
  }
  const probe = parseMcpConnectionWrite({
    schemaVersion: 1,
    label: value.label.trim(),
    enabled: value.enabled,
    ...(value.presetId ? { presetId: value.presetId as McpPresetId } : {}),
    allowedToolNames: value.allowedToolNames ?? [],
    readPolicies: value.readPolicies ?? [],
    placement: { kind: "server" },
    transport: { kind: "streamable-http", endpointRef: "probe-ref" },
    auth: value.authKind === "bearer" ? { kind: "bearer", credentialRef: "probe-cred" } : { kind: "none" },
  });
  if (!probe.ok) return probe;
  return {
    ok: true,
    value: {
      connectionId: value.connectionId as string,
      expectedRevision: value.expectedRevision as number,
      label: probe.value.label,
      enabled: probe.value.enabled,
      ...(probe.value.presetId ? { presetId: probe.value.presetId } : {}),
      allowedToolNames: probe.value.allowedToolNames,
      readPolicies: probe.value.readPolicies,
      authKind: value.authKind,
      ...(nextEndpoint !== undefined ? { endpoint: nextEndpoint } : {}),
      ...(nextCredential !== undefined ? { credential: nextCredential } : {}),
    },
  };
}

export function parseMcpServerDeleteInput(value: unknown): McpResult<McpServerDeleteInput> {
  if (!isBoundedJson(value) || !isRecord(value)) return failure("invalid_input");
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== "expectedRevision" || !matches(revisionSchema, value.expectedRevision)) {
    return failure("invalid_input");
  }
  return { ok: true, value: { expectedRevision: value.expectedRevision as number } };
}

/** Public/model projection uses explicit allowlist, no object spread of private records. */
export function toMcpConnectionSummary(connection: McpConnection): McpConnectionSummary {
  return {
    schemaVersion: 1, id: connection.id, label: connection.label, enabled: connection.enabled, revision: connection.revision,
    ...(connection.presetId ? { presetId: connection.presetId } : {}),
    allowedToolNames: [...connection.allowedToolNames],
    readPolicies: structuredClone(connection.readPolicies),
    placement: connection.placement.kind === "machine" ? { kind: "machine", machineId: connection.placement.machineId } : { kind: connection.placement.kind },
    transportKind: connection.transport.kind, authKind: connection.auth.kind,
    endpointConfigured: true,
    credentialConfigured: connection.auth.kind === "bearer",
  };
}
