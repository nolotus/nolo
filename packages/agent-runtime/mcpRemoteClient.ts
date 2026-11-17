import { permitsMcpRead } from "./mcpReadPolicy";
import { createHash } from "node:crypto";
import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020.js";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { ToolSchema } from "@modelcontextprotocol/core";

// Structural validator interface avoids importing SDK internals into the CLI.
type JsonSchemaType = Record<string, unknown> & { $schema?: string };
type jsonSchemaValidator = { getValidator<T>(schema: JsonSchemaType): (input: unknown) => { valid: true; data: T; errorMessage: undefined } | { valid: false; data: undefined; errorMessage: string } };
import { createMcpNetworkPolicy, type McpNetworkPolicy, type McpNetworkPolicyOptions } from "./mcpNetworkPolicy";
import { parseMcpCallToolInput, parseMcpListToolsInput, sameMcpPlacement, type McpClientAdapter, type McpExecutionContext, type McpConnection, type McpPlacement, type McpToolDescriptor, type McpToolCatalog, type McpErrorCode, type McpResult, type McpCallOutput, type JsonValue } from "./mcpConnectionSpecs";

/** Execution plane MUST be the actual host, never copied from model/request data.
 * Resolvers receive trusted live context and must enforce plane/account scoped refs.
 * This adapter does not grant use permission or implement the confirmation bridge. */
export type McpRemoteClientDependencies = {
  placement: McpPlacement;
  resolveEndpoint(context: McpExecutionContext): Promise<string | undefined>;
  /** Trusted execution-plane loader; never supplied in tool/model input. Required for calls.
   * Reloads use permission, enabled state and revision after all network waits. */
  revalidateBeforeCall?(context: McpExecutionContext): Promise<McpResult<McpConnection>>;
  resolveCredential?(context: McpExecutionContext): Promise<{ accessToken: string } | undefined>;
  /** Optional trusted resolver for the pinned network policy, not an arbitrary fetch. */
  resolveDns?: McpNetworkPolicyOptions["resolve"];
  limits?: { timeoutMs?: number; maxPages?: number; maxTools?: number; maxCatalogBytes?: number; maxResponseBytes?: number };
};
const knownCodes: McpErrorCode[] = ["network_denied", "limit_exceeded", "untrusted_schema", "cancelled", "timeout", "credential_unavailable", "authentication_required", "catalog_stale", "invalid_tool_arguments", "forbidden", "disabled", "revision_conflict", "placement_unavailable"];
const fail = (code: McpErrorCode): McpResult<never> => ({ ok: false, error: { code } });
function bounded(value: unknown, maxBytes = 262144): string {
  let nodes = 0;
  const visit = (v: unknown, depth: number): void => {
    if (++nodes > 10000 || depth > 32) throw new Error("limit_exceeded");
    if (v === null || typeof v === "string" || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v))) return;
    if (typeof v !== "object" || (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null)) throw new Error("untrusted_schema");
    for (const [key, d] of Object.entries(Object.getOwnPropertyDescriptors(v))) {
      if (Array.isArray(v) && key === "length") continue;
      if (["__proto__", "constructor", "prototype"].includes(key) || !Object.hasOwn(d, "value")) throw new Error("untrusted_schema");
      visit(d.value, depth + 1);
    }
  };
  visit(value, 0);
  const json = JSON.stringify(value);
  if (Buffer.byteLength(json) > maxBytes) throw new Error("limit_exceeded");
  return json;
}
/** Strict AJV draft-07/2020-12, no remote references or code supplied by providers.
 * Conservative safety profile: references, regex, formats and recursive/dynamic
 * schemas fail closed (not silently ignored). Limits are checked before compile.
 * C may reuse this provider; it never authorizes a tool based on annotations. */
export function createMcpRemoteSchemaValidator(): jsonSchemaValidator {
  return { getValidator<T>(schema: JsonSchemaType) {
    try {
      bounded(schema, 32768);
      const inspect = (value: unknown): void => {
        if (!value || typeof value !== "object" || Array.isArray(value)) return;
        for (const [key, entry] of Object.entries(value)) {
          if (["$ref", "$dynamicRef", "$recursiveRef", "pattern", "patternProperties", "format", "$data", "$async"].includes(key)) throw 0;
          // Only schema-valued positions are traversed. Map keys and annotation/instance
          // values are data, not keywords; AJV still rejects unknown schema semantics.
          if (["properties", "$defs", "definitions", "dependentSchemas"].includes(key)) {
            if (entry && typeof entry === "object") Object.values(entry).forEach(inspect);
          } else if (["allOf", "anyOf", "oneOf", "prefixItems"].includes(key)) {
            if (Array.isArray(entry)) entry.forEach(inspect);
          } else if (key === "items") {
            if (Array.isArray(entry)) entry.forEach(inspect); else inspect(entry);
          } else if (key === "dependencies") {
            if (entry && typeof entry === "object") Object.values(entry).forEach(v => { if (!Array.isArray(v)) inspect(v); });
          } else if (["additionalProperties", "additionalItems", "contains", "propertyNames", "not", "if", "then", "else", "unevaluatedProperties", "unevaluatedItems", "contentSchema"].includes(key)) inspect(entry);
        }
      };
      inspect(schema);
      const dialect = schema.$schema;
      if (dialect && !["https://json-schema.org/draft/2020-12/schema", "http://json-schema.org/draft-07/schema#"].includes(dialect)) throw 0;
      const Constructor = dialect?.includes("2020-12") ? Ajv2020 : Ajv;
      const ajv = new Constructor({ strict: true, allErrors: false, validateFormats: true, ownProperties: true, coerceTypes: false, useDefaults: false, removeAdditional: false, inlineRefs: false, loopEnum: 32, loopRequired: 32, code: { optimize: false } });
      const validate = ajv.compile(schema);
      return (input: unknown) => {
        try { bounded(input); return validate(input) ? { valid: true as const, data: input as T, errorMessage: undefined } : { valid: false as const, data: undefined, errorMessage: "invalid_tool_arguments" }; }
        catch { return { valid: false as const, data: undefined, errorMessage: "invalid_tool_arguments" }; }
      };
    } catch { throw new Error("untrusted_schema"); }
  } };
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function digest(value: unknown): string { return createHash("sha256").update(canonical(value)).digest("hex"); }

/** Stateless sessions: handshake + complete bounded discovery per invocation;
 * call re-discovers to detect drift, never replays tools/call. Cursor is an opaque
 * bounded offset bound to a fresh full catalog digest, not a provider cursor.
 * No authProvider: OAuth is explicit via createMcpRemoteOAuth, never SDK fallback.
 */
export function createMcpRemoteClient(deps: McpRemoteClientDependencies): McpClientAdapter {
  const validator = createMcpRemoteSchemaValidator();
  const limits = { timeoutMs: 30000, maxPages: 16, maxTools: 512, maxCatalogBytes: 1024 * 1024, maxResponseBytes: 2 * 1024 * 1024, ...deps.limits };
  async function session<T>(context: McpExecutionContext, operation: (client: Client, changed: () => boolean) => Promise<T>, calling = false): Promise<McpResult<T>> {
    const c = context.connection;
    if (c.schemaVersion !== 1) return fail("unsupported_version");
    if (!sameMcpPlacement(c.placement, deps.placement)) return fail("placement_unavailable");
    if (c.transport.kind !== "streamable-http") return fail("placement_unavailable");
    if (!c.enabled) return fail("disabled");
    if (c.ownerUserId !== context.authenticatedUserId) return fail("forbidden");
    if (context.signal.aborted) return fail("cancelled");
    const timeout = AbortSignal.timeout(limits.timeoutMs);
    const signal = AbortSignal.any([context.signal, timeout]);
    let client: Client | undefined;
    let policy: McpNetworkPolicy | undefined;
    try {
      const endpoint = await deps.resolveEndpoint(context);
      if (!endpoint) return fail("credential_unavailable");
      const credential = c.auth.kind !== "none" ? await deps.resolveCredential?.(context) : undefined;
      if (c.auth.kind !== "none" && (!credential?.accessToken || /[\r\n]/u.test(credential.accessToken))) return fail("credential_unavailable");
      let sent = false;
      policy = createMcpNetworkPolicy({ beforeSend: async (_input, init) => {
        // Official POSTs use serialized JSON. GET/listen and DELETE/close
        // have no body and cannot invoke a tool; batches are not supported.
        if (typeof init?.body !== "string") return;
        const message = JSON.parse(init.body);
        if (Array.isArray(message)) throw new Error("transport_error");
        if (message.method !== "tools/call") return;
        if (!calling || sent || !deps.revalidateBeforeCall) throw new Error("forbidden");
        sent = true; // One attempt only, including failed authorization. No retry.
        const latest = await deps.revalidateBeforeCall(context);
        signal.throwIfAborted();
        if (!latest.ok) throw new Error(latest.error.code);
        const live = latest.value;
        if (live.id !== c.id || live.ownerUserId !== context.authenticatedUserId) throw new Error("forbidden");
        if (!sameMcpPlacement(live.placement, deps.placement)) throw new Error("placement_unavailable");
        if (!live.enabled) throw new Error("disabled");
        if (live.revision !== c.revision) throw new Error("revision_conflict");
        if (!permitsMcpRead(live, message.params?.name, message.params?.arguments ?? {})) throw new Error("forbidden");
      }, placement: deps.placement, savedEndpoint: endpoint, resolve: deps.resolveDns, timeoutMs: limits.timeoutMs, maxResponseBytes: limits.maxResponseBytes });
      let networkError: McpErrorCode | undefined;
      const fetch = async (input: string | URL | Request, init?: RequestInit) => {
        try {
          const url = new URL(input instanceof Request ? input.url : String(input));
          // Prevent credentials moving to a server-announced cross-origin endpoint.
          if (url.origin !== new URL(endpoint).origin) throw new Error("network_denied");
          const headers = new Headers(init?.headers);
          if (credential) headers.set("authorization", `Bearer ${credential.accessToken}`);
          const response = await policy!.fetch(input, { ...init, headers, signal });
          if (response.status === 401 || response.status === 403) { await response.body?.cancel(); throw new Error("authentication_required"); }
          return response;
        } catch (error) { if (error instanceof Error && knownCodes.includes(error.message as McpErrorCode)) networkError = error.message as McpErrorCode; throw error; }
      };
      const transport = new StreamableHTTPClientTransport(new URL(endpoint), { fetch, requestInit: { redirect: "error" }, reconnectionOptions: { maxRetries: 0, initialReconnectionDelay: 1000, maxReconnectionDelay: 1000, reconnectionDelayGrowFactor: 1 } });
      // Explicit modern opt-in: SDK v2 still defaults to the legacy handshake.
      // No HTTP+SSE fallback, and no pre-2025-06-18 protocol compatibility.
      client = new Client({ name: "nolo-mcp", version: "1.0.0" }, {
        capabilities: {}, jsonSchemaValidator: validator, inputRequired: { autoFulfill: false },
        versionNegotiation: { mode: "auto" },
        supportedProtocolVersions: ["2026-07-28", "2025-11-25", "2025-06-18"],
        listMaxPages: limits.maxPages,
      });
      let changed = false;
      client.setNotificationHandler("notifications/tools/list_changed", () => { changed = true; });
      const cancel = () => { void client?.close().catch(() => {}); };
      signal.addEventListener("abort", cancel, { once: true });
      try {
        signal.throwIfAborted();
        await client.connect(transport, { signal, timeout: limits.timeoutMs });
        if (client.getNegotiatedProtocolVersion() === "2026-07-28" && client.getServerCapabilities()?.tools?.listChanged) await client.listen({ toolsListChanged: true }, { signal, timeout: limits.timeoutMs });
        const value = await operation(client, () => changed);
        signal.throwIfAborted();
        return { ok: true, value };
      } catch (error) { if (networkError) throw new Error(networkError); throw error; }
      finally { signal.removeEventListener("abort", cancel); }
    } catch (error) {
      if (context.signal.aborted) return fail("cancelled");
      if (timeout.aborted) return fail("timeout");
      return fail(error instanceof Error && knownCodes.includes(error.message as McpErrorCode) ? error.message as McpErrorCode : "transport_error");
    } finally { await client?.close().catch(() => {}); }
  }
  async function catalog(client: Client, context: McpExecutionContext, changed: () => boolean): Promise<McpToolCatalog> {
    const tools: McpToolDescriptor[] = [];
    const names = new Set<string>(); const cursors = new Set<string>();
    let cursor: string | undefined;
    let complete = false;
    for (let page = 0; page < limits.maxPages; page++) {
      const result = await client.request({ method: "tools/list", params: cursor ? { cursor } : {} }, { signal: context.signal, timeout: limits.timeoutMs });
      bounded(result, limits.maxCatalogBytes);
      for (const tool of result.tools) {
        if (!tool.name || tool.name.length > 256 || names.has(tool.name)) throw new Error("untrusted_schema");
        names.add(tool.name);
        if (!permitsMcpRead(context.connection, tool.name)) continue;
        validator.getValidator(tool.inputSchema);
        if (tool.outputSchema) validator.getValidator(tool.outputSchema);
        tools.push({ name: tool.name, ...(tool.description !== undefined ? { description: tool.description } : {}), inputSchema: tool.inputSchema, ...(tool.outputSchema !== undefined ? { outputSchema: tool.outputSchema } : {}), ...(tool.annotations !== undefined ? { annotations: tool.annotations } : {}) });
        if (tools.length > limits.maxTools) throw new Error("limit_exceeded");
      }
      bounded(tools, limits.maxCatalogBytes);
      cursor = result.nextCursor;
      if (!cursor) { complete = true; break; }
      if (cursor.length > 2048 || cursors.has(cursor)) throw new Error("limit_exceeded");
      cursors.add(cursor);
    }
    if (!complete) throw new Error("limit_exceeded");
    if (changed()) throw new Error("catalog_stale");
    const c = context.connection;
    return { connectionId: c.id, connectionRevision: c.revision, catalogRevision: digest({ owner: context.authenticatedUserId, id: c.id, revision: c.revision, placement: c.placement, tools }), tools };
  }
  function check(context: McpExecutionContext, id: string, revision: number): McpResult<true> {
    return id !== context.connection.id ? fail("not_found") : revision !== context.connection.revision ? fail("revision_conflict") : { ok: true, value: true };
  }
  return {
    async listTools(context, input) {
      const parsed = parseMcpListToolsInput(input); if (!parsed.ok) return parsed;
      input = parsed.value;
      const checked = check(context, input.connectionId, input.expectedRevision); if (!checked.ok) return checked;
      return session(context, async (client, changed) => {
        const result = await catalog(client, context, changed);
        let offset = 0;
        if (input.cursor) {
          const match = /^([a-f0-9]{64}):([0-9]{1,4})$/u.exec(input.cursor);
          if (!match || match[1] !== result.catalogRevision) throw new Error("catalog_stale");
          offset = Number(match[2]);
          if (offset >= result.tools.length || offset % 64) throw new Error("catalog_stale");
        }
        return { ...result, tools: result.tools.slice(offset, offset + 64), ...(offset + 64 < result.tools.length ? { nextCursor: `${result.catalogRevision}:${offset + 64}` } : {}) };
      });
    },
    async callTool(context, input) {
      const parsed = parseMcpCallToolInput(input); if (!parsed.ok) return parsed;
      input = parsed.value;
      const checked = check(context, input.connectionId, input.expectedRevision); if (!checked.ok) return checked;
      if (!permitsMcpRead(context.connection, input.toolName, input.arguments)) return fail("forbidden");
      return session<McpCallOutput>(context, async (client, changed) => {
        const snapshot = await catalog(client, context, changed);
        if (snapshot.catalogRevision !== input.catalogRevision) throw new Error("catalog_stale");
        const tool = snapshot.tools.find(tool => tool.name === input.toolName);
        if (!tool) throw new Error("catalog_stale");
        if (!validator.getValidator(tool.inputSchema as JsonSchemaType)(input.arguments).valid) throw new Error("invalid_tool_arguments");
        if (changed()) throw new Error("catalog_stale");
        // Exactly one tools/call. No auth retry, fallback, resumption or replay.
        const result = await client.callTool({ name: input.toolName, arguments: input.arguments }, { signal: context.signal, timeout: limits.timeoutMs, toolDefinition: ToolSchema.parse(tool) });
        bounded(result, limits.maxResponseBytes);
        if (tool.outputSchema && !result.isError && (!result.structuredContent || !validator.getValidator(tool.outputSchema as JsonSchemaType)(result.structuredContent).valid)) throw new Error("untrusted_schema");
        return { connectionId: snapshot.connectionId, connectionRevision: snapshot.connectionRevision, catalogRevision: snapshot.catalogRevision, content: result.content as JsonValue[], ...(result.structuredContent ? { structuredContent: result.structuredContent as Record<string, JsonValue> } : {}), ...(typeof result.isError === "boolean" ? { isError: result.isError } : {}) };
      }, true);
    },
  };
}
