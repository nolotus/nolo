/** Shared management contract only. No secrets, storage, transports or execution grants. */
export const PLUGIN_MANAGEMENT_TOOL_NAMES = ["listPlugins", "setPluginEnabled", "configurePlugin", "diagnosePlugin"] as const;
export type PluginManagementToolName = typeof PLUGIN_MANAGEMENT_TOOL_NAMES[number];
export const PLUGIN_KINDS = ["ui", "data-source", "system-capability", "cloud", "mcp"] as const;
export type PluginKind = typeof PLUGIN_KINDS[number];
export type PluginTarget = { kind: "server" | "local" } | { kind: "machine"; machineId: string };
export type PluginSubject = { kind: PluginKind; id?: string; connectionId?: string };
export type PluginManagementInput = {
  kind?: PluginKind;
  target?: PluginTarget;
  subject?: PluginSubject;
  enabled?: boolean;
  expectedRevision?: number;
  mode?: "configuration" | "connectivity";
};
export type PluginManagementError =
  | "invalid_input"
  | "authentication_required"
  | "forbidden"
  | "unavailable"
  | "placement_unavailable"
  | "revision_conflict"
  | "approval_required";
export type PluginManagementResult<T = unknown> =
  | { ok: true; value: T }
  | { ok: false; error: { code: PluginManagementError } };
export const managementFailure = (code: PluginManagementError): PluginManagementResult<never> => ({
  ok: false,
  error: { code },
});
export type PluginView = {
  kind: PluginKind;
  id: string;
  connectionId?: string;
  label?: string;
  enabled?: boolean;
  state?: "absent" | "disabled" | "enabled";
  revision?: number;
  credentialConfigured?: boolean;
  actions: ("configure" | "setEnabled" | "diagnose")[];
  configFields?: { key: string; required: boolean; secret: boolean }[];
};
const text = { type: "string", minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9_.:-]*$" } as const;
const object = (properties: Record<string, unknown>, required: string[] = Object.keys(properties)) => ({
  type: "object",
  additionalProperties: false,
  properties,
  required,
});
const target = {
  oneOf: [
    object({ kind: { enum: ["server", "local"] } }),
    object({ kind: { const: "machine" }, machineId: text }),
  ],
};
const subject = {
  oneOf: [
    object({ kind: { enum: ["ui", "data-source", "system-capability"] }, id: text }),
    object({ kind: { const: "cloud" }, id: text, connectionId: text }, ["kind", "id"]),
    object({ kind: { const: "mcp" }, id: text, connectionId: text }, ["kind", "id"]),
    object({ kind: { const: "mcp" }, connectionId: text }),
  ],
};
const revision = { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
export const PLUGIN_MANAGEMENT_SCHEMAS = {
  listPlugins: {
    name: "listPlugins",
    description: "Discover registered plugins and authenticated account configuration; does not connect or execute.",
    parameters: object({ kind: { enum: PLUGIN_KINDS }, target }, []),
  },
  setPluginEnabled: {
    name: "setPluginEnabled",
    description: "Change an existing account plugin switch. MCP requires expectedRevision. Does not grant execution or start programs.",
    parameters: object({ subject, target, enabled: { type: "boolean" }, expectedRevision: revision }, ["subject", "enabled"]),
  },
  configurePlugin: {
    name: "configurePlugin",
    description: "Return the authenticated UI entry and required field metadata without reading secret endpoints or credential refs.",
    parameters: object({ subject, target }, ["subject"]),
  },
  diagnosePlugin: {
    name: "diagnosePlugin",
    description: "Inspect configuration facts. Connectivity requires the execution approval bridge; never implicitly launches or connects.",
    parameters: object({ subject, target, mode: { enum: ["configuration", "connectivity"] } }, ["subject", "mode"]),
  },
} as const;

function record(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value))
  );
}
const identifier = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value);
const keys = (value: Record<string, unknown>, allowed: readonly string[]) =>
  Object.keys(value).every((key) => allowed.includes(key));

/** Validates independently of the provider's schema enforcement. Unknown fields fail closed. */
export function parsePluginManagementInput(
  tool: PluginManagementToolName,
  value: unknown,
): PluginManagementResult<PluginManagementInput> {
  const bad = () => managementFailure("invalid_input");
  try {
    if (!record(value) || !keys(value, Object.keys(PLUGIN_MANAGEMENT_SCHEMAS[tool].parameters.properties))) return bad();
    if (value.target !== undefined) {
      const t = value.target;
      if (
        !record(t) ||
        !keys(t, t.kind === "machine" ? ["kind", "machineId"] : ["kind"]) ||
        !["server", "local", "machine"].includes(String(t.kind)) ||
        (t.kind === "machine" && !identifier(t.machineId))
      ) {
        return bad();
      }
    }
    if (tool === "listPlugins") {
      if (value.kind !== undefined && !PLUGIN_KINDS.includes(value.kind as PluginKind)) return bad();
    } else {
      const s = value.subject;
      if (
        !record(s) ||
        !keys(s, ["kind", "id", "connectionId"]) ||
        !PLUGIN_KINDS.includes(s.kind as PluginKind) ||
        (s.id !== undefined && !identifier(s.id)) ||
        (s.connectionId !== undefined && !identifier(s.connectionId)) ||
        (s.kind === "mcp" ? !s.id && !s.connectionId : !s.id)
      ) {
        return bad();
      }
      if (!["mcp", "cloud"].includes(String(s.kind)) && s.connectionId !== undefined) return bad();
      if (
        tool === "setPluginEnabled" &&
        (typeof value.enabled !== "boolean" ||
          (s.kind === "mcp" && !s.connectionId) ||
          (s.kind === "mcp" && value.expectedRevision === undefined))
      ) {
        return bad();
      }
      if (
        value.expectedRevision !== undefined &&
        (!Number.isSafeInteger(value.expectedRevision) || (value.expectedRevision as number) < 1)
      ) {
        return bad();
      }
      if (tool === "diagnosePlugin" && !["configuration", "connectivity"].includes(String(value.mode))) return bad();
    }
    return { ok: true, value: structuredClone(value) as PluginManagementInput };
  } catch {
    return bad();
  }
}
