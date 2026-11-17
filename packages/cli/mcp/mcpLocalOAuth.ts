import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { CredentialBroker } from "../../agent-runtime/credentialBroker";

// The network factory MUST use the host's pinned MCP network policy, with no
// redirects and TLS/DNS validation. It is a trusted execution-plane dependency.
type Network = { fetch(url: string, init?: RequestInit): Promise<Response> };
export type LocalOAuthContext = { authenticatedUserId: string; connection: { id: string; revision: number; placement: { kind: string } }; signal: AbortSignal };
type Client = { clientId: string; clientSecret?: string; tokenEndpointAuthMethod?: "none" | "client_secret_post"; redirectUri?: string };
type Metadata = { issuer: string; authorization_endpoint: string; token_endpoint: string; registration_endpoint?: string; authorization_response_iss_parameter_supported?: boolean };
type Binding = { owner: string; id: string; revision: number; placement: string; endpointHash: string };
type Stored = { binding: Binding; issuer: string; tokenEndpoint: string; client: Client; accessToken: string; refreshToken?: string; expiresAt?: number; scope: string };
export type LocalOAuthScopeDiagnostic = {
  fieldType: "string" | "array" | "null" | "object" | "number" | "boolean" | "undefined";
  delimiter?: "comma" | "whitespace" | "mixed" | "single";
  itemCount?: number; knownScopes?: string[]; unknownCount?: number; oversized?: boolean;
};
export const MCP_LOCAL_AUTHORIZED_SCOPES = ["zohomail.accounts.read", "zohomail.folders.read", "zohomail.messages.read", "zohomail.messages.create", "ZohoMCP.tool.execute"] as const;
function describeDeniedScope(value: unknown): LocalOAuthScopeDiagnostic {
 if (typeof value !== "string") return { fieldType: value === null ? "null" : Array.isArray(value) ? "array" : typeof value as LocalOAuthScopeDiagnostic["fieldType"] };
 if (value.length > 4096) return { fieldType: "string", oversized: true };
 const comma = value.includes(","), whitespace = /\s/.test(value);
 const items = value.split(/[,\s]+/).filter(Boolean);
 return { fieldType: "string", delimiter: comma ? whitespace ? "mixed" : "comma" : whitespace ? "whitespace" : "single",
  itemCount: items.length, knownScopes: [...new Set(items.filter(item => (MCP_LOCAL_AUTHORIZED_SCOPES as readonly string[]).includes(item)))],
  unknownCount: items.filter(item => !(MCP_LOCAL_AUTHORIZED_SCOPES as readonly string[]).includes(item)).length };
}
class ScopeDeniedError extends Error {
 constructor(readonly diagnostic: LocalOAuthScopeDiagnostic) { super("oauth_scope_denied"); }
}
export type LocalOAuthFailure = { stage: "callback_validation" | "binding_validation" | "token_exchange" | "token_validation" | "token_persistence"; code: string; scope?: LocalOAuthScopeDiagnostic };
export type LocalOAuthAttemptResult = "completed" | "cancelled" | "failed" | "timeout";
type Attempt = { settle: (result: LocalOAuthAttemptResult) => void; binding: Binding; metadata: Metadata; client: Client; verifier: string; state: string; redirect: string; deadline: number; server: Server; timer: ReturnType<typeof setTimeout>; abort: () => void; busy: boolean };
export type LocalOAuthDependencies<C extends LocalOAuthContext> = {
  broker: Pick<CredentialBroker, "get" | "put">; // caller must provide createStrictHostCredentialBroker(), never a file broker
  loadContext(connectionId: string, revision: number): Promise<C | undefined>;
  resolveEndpoint(ctx: C): Promise<string | undefined>;
  networkFactory(url: string): Network;
  issuer: string;
  // Trusted service binding saved by the host, never supplied by a model.
  trustedService: { serviceId: string; accountId: string };
  scopes: readonly string[];
  timeoutMs?: number;
};
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const random = () => randomBytes(32).toString("base64url");
const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const safeUrl = (value: string, origins: string[]) => {
  const u = new URL(value);
  if (u.protocol !== "https:" || u.username || u.password || u.hash || !origins.includes(u.origin)) throw new Error("oauth_endpoint_denied");
  return u.toString();
};
const validSecret = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 16384 && !/[\r\n]/.test(v);
const eqBinding = (a: Binding, b: Binding) => JSON.stringify(a) === JSON.stringify(b);

export function createMcpLocalOAuth<C extends LocalOAuthContext>(deps: LocalOAuthDependencies<C>) {
  const issuer = new URL(deps.issuer);
  if (issuer.protocol !== "https:" || !/^[a-z0-9][a-z0-9-]*\.zohomcp\.com$/.test(issuer.hostname) || issuer.port || issuer.pathname !== "/" || issuer.search || issuer.hash || issuer.username || issuer.password) throw new Error("oauth_issuer_denied");
  const issuerString = issuer.origin;
  if (!deps.trustedService || !/^[a-zA-Z0-9_-]+$/.test(deps.trustedService.serviceId) || !/^[a-zA-Z0-9_-]+$/.test(deps.trustedService.accountId)) throw new Error("oauth_service_binding_required");
  const origins = [issuerString, "https://mcp.zoho.com"];
  const allowedScopes = new Set<string>(MCP_LOCAL_AUTHORIZED_SCOPES);
  if (!deps.scopes.length || deps.scopes.some(s => !allowedScopes.has(s)) || new Set(deps.scopes).size !== deps.scopes.length) throw new Error("oauth_scope_denied");
  const requestedScope = deps.scopes.join(" ");
  const pending = new Map<string, Attempt>();
  const failures = new Map<string, LocalOAuthFailure>();
  const refreshing = new Map<string, Promise<{ accessToken: string } | undefined>>();
  const request = async (url: string, init: RequestInit = {}) => {
    const target = safeUrl(url, origins);
    const response = await deps.networkFactory(target).fetch(target, init);
    if (!response.ok) throw new Error("oauth_request_failed");
    return response.json() as Promise<Record<string, unknown>>;
  };
  async function binding(ctx: C): Promise<Binding> {
    ctx.signal.throwIfAborted();
    if (ctx.connection.placement.kind !== "local") throw new Error("oauth_binding_mismatch");
    const current = await deps.loadContext(ctx.connection.id, ctx.connection.revision);
    if (!current || current.authenticatedUserId !== ctx.authenticatedUserId || current.connection.id !== ctx.connection.id || current.connection.revision !== ctx.connection.revision || current.connection.placement.kind !== "local") throw new Error("oauth_binding_mismatch");
    const endpoint = await deps.resolveEndpoint(current);
    if (!endpoint || new URL(endpoint).origin !== issuerString) throw new Error("oauth_endpoint_denied");
    safeUrl(endpoint, [issuerString]);
    ctx.signal.throwIfAborted();
    return { owner: ctx.authenticatedUserId, id: ctx.connection.id, revision: ctx.connection.revision, placement: "local", endpointHash: hash(endpoint) };
  }
  const ref = (b: Binding) => `mcp-oauth:${hash(JSON.stringify(b))}`;
  async function discover(signal: AbortSignal): Promise<Metadata> {
    const data = await request(`${issuerString}/.well-known/oauth-authorization-server`, { signal });
    if (data.issuer !== issuerString || !Array.isArray(data.response_types_supported) || !data.response_types_supported.includes("code") || !Array.isArray(data.grant_types_supported) || !data.grant_types_supported.includes("authorization_code") || !data.grant_types_supported.includes("refresh_token") || !Array.isArray(data.code_challenge_methods_supported) || !data.code_challenge_methods_supported.includes("S256") || typeof data.authorization_endpoint !== "string" || typeof data.token_endpoint !== "string") throw new Error("oauth_metadata_invalid");
    const auth = new URL(safeUrl(data.authorization_endpoint, ["https://mcp.zoho.com"]));
    const match = /^\/mcp-client\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)\/oauth$/.exec(auth.pathname);
    if (!match || auth.search || match[1] !== deps.trustedService.serviceId || match[2] !== deps.trustedService.accountId) throw new Error("oauth_metadata_invalid");
    const prefix = `https://mcp.zoho.com/baas/mcp/v1/oauth/${match[1]}/${match[2]}`;
    if (data.token_endpoint !== `${prefix}/token` || (data.registration_endpoint !== undefined && data.registration_endpoint !== `${prefix}/register`)) throw new Error("oauth_metadata_invalid");
    return { issuer: issuerString, authorization_endpoint: auth.toString(), token_endpoint: `${prefix}/token`, ...(data.registration_endpoint ? { registration_endpoint: `${prefix}/register` } : {}), authorization_response_iss_parameter_supported: data.authorization_response_iss_parameter_supported === true };
  }
  function close(id: string, settle = true, result: LocalOAuthAttemptResult = "cancelled") {
    const a = pending.get(id); if (!a) return;
    pending.delete(id); clearTimeout(a.timer); a.abort(); a.server.close();
    if (settle) a.settle(result);
  }
  function parseGrantedScope(value: unknown): string {
    // OAuth scope-token grammar, excluding comma because Zoho uses it as a delimiter.
    // Support either comma or ASCII-space separation, never a mixture, duplicates or empty items.
    if (typeof value !== "string" || value.length === 0 || value.length > 4096 ||
      !/^[\x21\x23-\x2B\x2D-\x5B\x5D-\x7E]+(?:[, ][\x21\x23-\x2B\x2D-\x5B\x5D-\x7E]+)*$/.test(value) ||
      (value.includes(",") && value.includes(" "))) throw new ScopeDeniedError(describeDeniedScope(value));
    const items = value.split(value.includes(",") ? "," : " ");
    if (new Set(items).size !== items.length || items.some(item => !deps.scopes.includes(item))) throw new ScopeDeniedError(describeDeniedScope(value));
    return items.join(" ");
  }
  async function tokens(data: Record<string, unknown>, prior?: Stored) {
    const priorScope = prior ? parseGrantedScope(prior.scope) : undefined;
    const scope = parseGrantedScope(data.scope === undefined ? priorScope ?? requestedScope : data.scope);
    if (priorScope && scope.split(" ").some(item => !priorScope.split(" ").includes(item))) throw new ScopeDeniedError(describeDeniedScope(data.scope));
    if (!validSecret(data.access_token) || typeof data.token_type !== "string" || data.token_type.toLowerCase() !== "bearer" || (data.refresh_token !== undefined && !validSecret(data.refresh_token)) || (data.expires_in !== undefined && (typeof data.expires_in !== "number" || !Number.isFinite(data.expires_in) || data.expires_in <= 0 || data.expires_in > 31536000))) throw new Error("oauth_token_invalid");
    const refreshToken = typeof data.refresh_token === "string" ? data.refresh_token : prior?.refreshToken;
    return { accessToken: data.access_token, ...(refreshToken ? { refreshToken } : {}), ...(typeof data.expires_in === "number" ? { expiresAt: Date.now() + data.expires_in * 1000 } : {}), scope };
  }
  async function completeCallback(ctx: C, attemptId: string, callback: { state: string; code: string; issuer?: string; redirectUri: string }): Promise<"completed"> {
    const a = pending.get(attemptId);
    if (!a || a.busy) throw new Error("oauth_attempt_invalid");
    // Consume synchronously before any await; mismatches also invalidate the attempt.
    a.busy = true; close(attemptId, false);
    let stage: LocalOAuthFailure["stage"] = "callback_validation";
    try {
    if (Date.now() >= a.deadline || callback.redirectUri !== a.redirect || !same(callback.state, a.state) || !validSecret(callback.code) || (callback.issuer !== undefined && callback.issuer !== a.metadata.issuer) || (a.metadata.authorization_response_iss_parameter_supported && callback.issuer !== a.metadata.issuer) || !eqBinding(a.binding, await binding(ctx))) throw new Error("oauth_binding_mismatch");
    stage = "token_exchange";
    const body = new URLSearchParams({ grant_type: "authorization_code", code: callback.code, redirect_uri: a.redirect, client_id: a.client.clientId, code_verifier: a.verifier });
    if (a.client.clientSecret) body.set("client_secret", a.client.clientSecret);
    const result = await request(a.metadata.token_endpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" }, body, signal: ctx.signal });
    stage = "token_validation";
    const value = await tokens(result);
    stage = "binding_validation";
    if (!eqBinding(a.binding, await binding(ctx))) throw new Error("oauth_binding_mismatch");
    stage = "token_persistence";
    await deps.broker.put(ref(a.binding), JSON.stringify({ binding: a.binding, issuer: a.metadata.issuer, tokenEndpoint: a.metadata.token_endpoint, client: a.client, ...value } satisfies Stored));
    a.settle("completed");
    return "completed";
    } catch (error) {
      const known = ["oauth_scope_denied", "oauth_token_invalid", "oauth_request_failed", "oauth_binding_mismatch", "network_denied", "cancelled", "timeout"];
      const code = error instanceof Error && known.includes(error.message) ? error.message : "oauth_stage_failed";
      failures.set(attemptId, { stage, code, ...(error instanceof ScopeDeniedError ? { scope: error.diagnostic } : {}) }); a.settle(ctx.signal.aborted ? "cancelled" : "failed"); throw new Error(code);
    }
  }
  async function beginAuthorization(ctx: C, client: Client | { register: true }): Promise<{ authorizationUrl: string; attemptId: string; completion: Promise<LocalOAuthAttemptResult> }> {
    const b = await binding(ctx); const metadata = await discover(ctx.signal);
    const clientKey = `mcp-oauth-client:${hash(JSON.stringify(b))}`;
    let savedClient: Client | undefined;
    if (!("register" in client)) {
      const raw = await deps.broker.get(clientKey);
      if (raw) { try { savedClient = JSON.parse(raw); } catch { throw new Error("oauth_client_store_invalid"); } }
      if (savedClient) {
        if (!validSecret(savedClient.clientId) || !savedClient.redirectUri || !/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}\/oauth\/callback$/.test(savedClient.redirectUri) || Number(new URL(savedClient.redirectUri).port) > 65535 || !["none", "client_secret_post"].includes(savedClient.tokenEndpointAuthMethod ?? "") || (savedClient.tokenEndpointAuthMethod === "client_secret_post" && !validSecret(savedClient.clientSecret))) throw new Error("oauth_client_store_invalid");
      }
      if (savedClient && savedClient.clientId !== client.clientId) throw new Error("oauth_client_binding_mismatch");
    }
    // Bind a real loopback socket before advertising its redirect URI.
    let attemptId = random();
    const server = createServer((req, res) => {
      const attempt = pending.get(attemptId);
      if (!attempt || req.method !== "GET" || req.headers.host !== new URL(attempt.redirect).host) { res.writeHead(400).end("Authorization failed."); return; }
      let u: URL;
      try { u = new URL(req.url ?? "", attempt.redirect); } catch { res.writeHead(400).end("Authorization failed."); return; }
      if (u.pathname !== "/oauth/callback" || u.searchParams.getAll("state").length !== 1 || u.searchParams.getAll("code").length !== 1 || u.searchParams.getAll("iss").length > 1) { res.writeHead(400).end("Authorization failed."); return; }
      void completeCallback(ctx, attemptId, { state: u.searchParams.get("state")!, code: u.searchParams.get("code")!, issuer: u.searchParams.get("iss") ?? undefined, redirectUri: attempt.redirect }).then(() => res.writeHead(200, { "content-type": "text/plain", "cache-control": "no-store" }).end("Authorization completed. You may close this window."), () => res.writeHead(400, { "cache-control": "no-store" }).end("Authorization failed."));
    });
    await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(savedClient?.redirectUri ? Number(new URL(savedClient.redirectUri).port) : 0, "127.0.0.1", () => { server.off("error", reject); resolve(); }); });
    try {
      const address = server.address(); if (!address || typeof address === "string") throw new Error("oauth_loopback_failed");
      const redirect = `http://127.0.0.1:${address.port}/oauth/callback`;
      let registered: Client;
      if ("register" in client) {
        if (!metadata.registration_endpoint) throw new Error("oauth_registration_unavailable");
        const data = await request(metadata.registration_endpoint, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ redirect_uris: [redirect], grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], token_endpoint_auth_method: "none" }), signal: ctx.signal });
        if (!validSecret(data.client_id) || (data.client_secret !== undefined && !validSecret(data.client_secret))) throw new Error("oauth_registration_invalid");
        const method = data.token_endpoint_auth_method ?? (typeof data.client_secret === "string" ? "client_secret_post" : "none");
        if ((method !== "none" && method !== "client_secret_post") || (method === "client_secret_post" && !validSecret(data.client_secret)) || (data.redirect_uris !== undefined && (!Array.isArray(data.redirect_uris) || !data.redirect_uris.includes(redirect)))) throw new Error("oauth_client_invalid");
        registered = { clientId: data.client_id, ...(typeof data.client_secret === "string" ? { clientSecret: data.client_secret } : {}), tokenEndpointAuthMethod: method, redirectUri: redirect };
        await deps.broker.put(clientKey, JSON.stringify(registered));
      } else registered = savedClient ?? client;
      if (!validSecret(registered.clientId) || (registered.clientSecret !== undefined && !validSecret(registered.clientSecret))) throw new Error("oauth_client_invalid");
      if (!eqBinding(b, await binding(ctx))) throw new Error("oauth_binding_mismatch");
      const verifier = random(), state = random(), deadline = Date.now() + (deps.timeoutMs ?? 300000);
      const url = new URL(metadata.authorization_endpoint);
      for (const [k, v] of Object.entries({ response_type: "code", client_id: registered.clientId, redirect_uri: redirect, scope: requestedScope, state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" })) url.searchParams.set(k, v);
      const onAbort = () => close(attemptId); ctx.signal.addEventListener("abort", onAbort, { once: true });
      const timer = setTimeout(() => close(attemptId, true, "timeout"), Math.max(0, deadline - Date.now())); timer.unref();
      let settle!: (result: LocalOAuthAttemptResult) => void;
      const completion = new Promise<LocalOAuthAttemptResult>(resolve => { settle = resolve; });
      pending.set(attemptId, { settle, binding: b, metadata, client: registered, verifier, state, redirect, deadline, server, timer, abort: () => ctx.signal.removeEventListener("abort", onAbort), busy: false });
      if (ctx.signal.aborted) { close(attemptId); throw new Error("oauth_cancelled"); }
      return { authorizationUrl: url.toString(), attemptId, completion };
    } catch (e) { server.close(); throw e; }
  }
  async function resolveCredential(ctx: C): Promise<{ accessToken: string } | undefined> {
    const b = await binding(ctx); const key = ref(b);
    const raw = await deps.broker.get(key); if (!raw) return undefined;
    let stored: Stored; try { stored = JSON.parse(raw) as Stored; } catch { throw new Error("oauth_store_invalid"); }
    if (!stored.binding || !eqBinding(stored.binding, b) || stored.issuer !== issuerString || !validSecret(stored.accessToken) || !stored.client || !validSecret(stored.client.clientId) || typeof stored.tokenEndpoint !== "string") throw new Error("oauth_store_invalid");
    stored.scope = parseGrantedScope(stored.scope);
    if (stored.tokenEndpoint !== `https://mcp.zoho.com/baas/mcp/v1/oauth/${deps.trustedService.serviceId}/${deps.trustedService.accountId}/token`) throw new Error("oauth_store_invalid");
    if (!eqBinding(b, await binding(ctx))) throw new Error("oauth_binding_mismatch");
    if (stored.expiresAt === undefined || stored.expiresAt > Date.now() + 30000) return { accessToken: stored.accessToken };
    const existing = refreshing.get(key); if (existing) { const result = await existing; if (!eqBinding(b, await binding(ctx))) throw new Error("oauth_binding_mismatch"); return result; }
    const work = (async () => {
      if (!validSecret(stored.refreshToken)) return undefined;
      const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: stored.refreshToken, client_id: stored.client.clientId });
      if (stored.client.clientSecret) body.set("client_secret", stored.client.clientSecret);
      const data = await request(stored.tokenEndpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" }, body, signal: ctx.signal });
      const value = await tokens(data, stored);
      if (!eqBinding(b, await binding(ctx))) throw new Error("oauth_binding_mismatch");
      const { expiresAt: _oldExpiry, ...withoutExpiry } = stored;
      await deps.broker.put(key, JSON.stringify({ ...withoutExpiry, ...value }));
      return { accessToken: value.accessToken };
    })();
    refreshing.set(key, work);
    try { const result = await work; if (!eqBinding(b, await binding(ctx))) throw new Error("oauth_binding_mismatch"); return result; } finally { refreshing.delete(key); }
  }
  return { beginAuthorization, completeCallback, resolveCredential, getAttemptFailure: (id: string) => failures.get(id), cancelAuthorization: close };
}
