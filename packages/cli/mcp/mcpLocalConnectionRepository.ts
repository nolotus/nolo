import { createHash, randomUUID } from "node:crypto";
import type { AuthorityStore } from "../../database-engine/authorityStoreTypes";
import { isLevelNotFoundError } from "../../database/levelNotFoundError";
import type { CredentialBroker } from "../../agent-runtime/credentialBroker";
import { createCliLocalMcpConnectionRevisionWriter } from "../localRuntimeAuthority";
import { parseMcpConnectionWrite, sameMcpPlacement, toMcpConnectionSummary,
  type McpConnection, type McpConnectionWrite, type McpPlacement, type McpResult, type McpErrorCode,
  type McpExecutionContext } from "../../agent-runtime/mcpConnectionSpecs";

/** Host-only lifecycle capability. Must refresh/persist in strict OS storage before returning.
 * No model-selected ref, endpoint, token bytes or mutable private connection record is passed in.
 * Returning undefined or throwing fails closed; never falls back to an older bearer token. */
export type McpLocalAccessTokenResolver = (binding: {
  authenticatedUserId: string; connectionId: string; connectionRevision: number;
  placement: { kind: "local" }; signal: AbortSignal;
}) => Promise<{ accessToken: string } | undefined>;

export type McpLocalUseInput = { authenticatedUserId: string; connectionId: string; expectedRevision: number; placement: McpPlacement };
/** Trusted local settings only. Ref strings in connection are placeholders, never lookup authority.
 * A save installs fresh broker refs from these values; enable/disable preserves installed refs. */
export type McpLocalSaveInput = { connection: McpConnectionWrite; endpoint?: string; credential?: string;
  connectionId?: string; expectedRevision?: number };
const good = <T>(value: T): McpResult<T> => ({ ok: true, value });
const bad = (code: McpErrorCode): McpResult<never> => ({ ok: false, error: { code } });
const uuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

/** Local authority ONLY: no hybrid store, sync, fetch, delete or raw record writes.
 * The authenticated account and actual placement are bound by the host at construction. */
export function createMcpLocalConnectionRepository(deps: {
  authority: AuthorityStore; broker: CredentialBroker; authenticatedUserId: string; placement: McpPlacement;
  resolveAccessToken?: McpLocalAccessTokenResolver;
}) {
  const { authority, broker, authenticatedUserId: user } = deps;
  const placement = structuredClone(deps.placement);
  if (!user || placement.kind === "server") throw new Error("Local MCP host identity required");
  const writer = createCliLocalMcpConnectionRevisionWriter(authority, user);
  const prefix = `mcp-private:v1:${encodeURIComponent(user)}:connection:`;
  const refPrefix = `mcp-local:${createHash("sha256").update(user).digest("hex")}:`;
  async function read(id: string): Promise<McpConnection | undefined> {
    if (!uuid(id)) return undefined;
    let row: Record<string, unknown> | undefined;
    try { row = await authority.get(prefix + id); }
    catch (e) { if (isLevelNotFoundError(e)) return undefined; throw e; }
    if (!row || row.ownerUserId !== user || !Number.isSafeInteger(row.revision) || Number(row.revision) < 1) return undefined;
    const { ownerUserId: _, revision, ...write } = row;
    const parsed = parseMcpConnectionWrite(write);
    if (!parsed.ok || !sameMcpPlacement(parsed.value.placement, placement)) return undefined;
    const connection = { ...parsed.value, id, ownerUserId: user, revision: Number(revision) };
    const refs = installedRefs(connection);
    if (refs.some(ref => !ref.startsWith(refPrefix))) return undefined;
    return connection;
  }
  async function loadForUse(input: McpLocalUseInput): Promise<McpResult<McpConnection>> {
    if (input.authenticatedUserId !== user) return bad("forbidden");
    if (!sameMcpPlacement(input.placement, placement)) return bad("placement_unavailable");
    if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1) return bad("invalid_input");
    const row = await read(input.connectionId);
    if (!row) return bad("forbidden");
    if (row.revision !== input.expectedRevision) return bad("revision_conflict");
    if (!row.enabled) return bad("disabled");
    return good(row);
  }
  const fromContext = (ctx: McpExecutionContext) => loadForUse({ authenticatedUserId: ctx.authenticatedUserId,
    connectionId: ctx.connection.id, expectedRevision: ctx.connection.revision, placement: ctx.connection.placement });
  async function resolve(ctx: McpExecutionContext, purpose: "endpoint" | "credential"): Promise<string | undefined> {
    const current = await fromContext(ctx);
    if (!current.ok || ctx.signal.aborted) return undefined;
    const c = current.value;
    const ref = purpose === "endpoint" ? c.transport.endpointRef
      : (c.auth.kind === "bearer" ? c.auth.credentialRef : undefined);
    if (!ref) return undefined;
    const value = await broker.get(ref);
    // Recheck after asynchronous credential I/O; never trust the context's ref fields.
    return value && (await fromContext(ctx)).ok && !ctx.signal.aborted ? value : undefined;
  }
  return {
    loadForUse,
    async summary() {
      const result = [];
      for await (const [key] of authority.iterator({ gte: prefix, lt: prefix + "\uffff", values: false })) {
        const row = await read(key.slice(prefix.length));
        if (row) result.push(toMcpConnectionSummary(row));
      }
      return result;
    },
    /** Host-authenticated local management capability, never exposed as a model executor. */
    async save(input: McpLocalSaveInput): Promise<McpResult<ReturnType<typeof toMcpConnectionSummary>>> {
      const parsed = parseMcpConnectionWrite(input.connection);
      if (!parsed.ok) return parsed;
      const c = structuredClone(parsed.value);
      if (!sameMcpPlacement(c.placement, placement)) return bad("placement_unavailable");
      if ((input.connectionId === undefined) !== (input.expectedRevision === undefined)) return bad("invalid_input");
      if (input.expectedRevision !== undefined && (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1 || input.expectedRevision >= Number.MAX_SAFE_INTEGER)) return bad("invalid_input");
      if (input.connectionId !== undefined) {
        const current = await read(input.connectionId);
        if (!current) return bad("forbidden");
        if (current.revision !== input.expectedRevision) return bad("revision_conflict");
      }
      const values: [string, string][] = [];
      const install = (value: string) => { const ref = refPrefix + randomUUID(); values.push([ref, value]); return ref; };
      const validValue = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 16384 && !v.includes("\0");
      {
        const value = input.endpoint;
        if (!validValue(value)) return bad("credential_unavailable");
        (c.transport as { endpointRef: string }).endpointRef = install(value);
      }
      if (c.auth.kind === "bearer") {
        if (!validValue(input.credential)) return bad("invalid_input");
        c.auth.credentialRef = install(input.credential);
      }
      // Broker values stay on this execution plane. Failed CAS may leave unreachable refs;
      // no destructive cleanup and no ref reuse/reassignment on a later save.
      for (const [ref, value] of values) {
        await broker.put(ref, value);
        // Acknowledged persistence must be readable before the connection becomes visible.
        // Production management injects only the strict OS store (no session fallback).
        if (await broker.get(ref) !== value) return bad("credential_unavailable");
      }
      const value = { ...c, ownerUserId: user };
      if (input.connectionId === undefined) {
        const created = await writer.create(value);
        if (created.status !== "updated") return bad("revision_conflict");
        return good(toMcpConnectionSummary({ ...c, ownerUserId: user, id: created.id, revision: 1 }));
      }
      const updated = await writer.update(input.connectionId, input.expectedRevision!, value);
      return updated.status === "updated" ? good(toMcpConnectionSummary({ ...c, ownerUserId: user, id: input.connectionId, revision: input.expectedRevision! + 1 })) : bad("revision_conflict");
    },
    async setEnabled(connectionId: string, expectedRevision: number, enabled: boolean) {
      if (typeof enabled !== "boolean" || !Number.isSafeInteger(expectedRevision) || expectedRevision < 1 || expectedRevision >= Number.MAX_SAFE_INTEGER) return bad("invalid_input");
      const row = await read(connectionId);
      if (!row) return bad("forbidden");
      if (row.revision !== expectedRevision) return bad("revision_conflict");
      const { id: _, revision: __, ...value } = row;
      const updated = await writer.update(connectionId, expectedRevision, { ...value, enabled });
      return updated.status === "updated" ? good(toMcpConnectionSummary({ ...row, enabled, revision: expectedRevision + 1 })) : bad("revision_conflict");
    },
    resolveEndpoint: (ctx: McpExecutionContext) => resolve(ctx, "endpoint"),
    async resolveCredential(ctx: McpExecutionContext) {
      if (ctx.connection.auth.kind === "oauth") {
        if (!deps.resolveAccessToken) return undefined;
        const loaded = await fromContext(ctx);
        if (!loaded.ok || loaded.value.auth.kind !== "oauth" || loaded.value.placement.kind !== "local" || ctx.signal.aborted) return undefined;
        try {
          const token = await deps.resolveAccessToken({ authenticatedUserId: user, connectionId: loaded.value.id,
            connectionRevision: loaded.value.revision, placement: { kind: "local" }, signal: ctx.signal });
          if (!token || typeof token.accessToken !== "string" || !token.accessToken || /[\r\n]/u.test(token.accessToken) || ctx.signal.aborted || !(await fromContext(ctx)).ok) return undefined;
          return { accessToken: token.accessToken };
        } catch { return undefined; }
      }
      const accessToken = await resolve(ctx, "credential");
      return accessToken ? { accessToken } : undefined;
    },

  };
}
function installedRefs(c: McpConnectionWrite): string[] {
 return [c.transport.endpointRef, ...(c.auth.kind === "bearer" ? [c.auth.credentialRef] : [])];
}
