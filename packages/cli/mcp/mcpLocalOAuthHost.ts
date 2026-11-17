import { resolveMcpLocalHost } from "./mcpLocalResolver";
import { createMcpLocalOAuth, MCP_LOCAL_AUTHORIZED_SCOPES, type LocalOAuthContext } from "./mcpLocalOAuth";
import type { McpLocalOAuthManagerFactory } from "./mcpLocalRuntimeAdapter";
import { createMcpNetworkPolicy } from "../../agent-runtime/mcpNetworkPolicy";
const fetchPublic = (url: string, signal: AbortSignal) => createMcpNetworkPolicy({ placement: { kind: "server" }, savedEndpoint: url, resolve: resolveMcpLocalHost }).fetch(url, { signal });
/** Public same-origin metadata only; never trust service/account IDs supplied by a model. */
export async function discoverMcpLocalOAuthService(issuer: string, signal: AbortSignal, fetchMetadata = fetchPublic) {
 const origin = new URL(issuer);
 if (origin.protocol !== "https:" || origin.origin !== issuer || !/^[a-z0-9-]+\.zohomcp\.com$/.test(origin.hostname)) throw new Error("oauth_endpoint_denied");
 const response = await fetchMetadata(`${issuer}/.well-known/oauth-authorization-server`, signal);
 if (!response.ok) throw new Error("oauth_metadata_invalid");
 const data = await response.json();
 if (data.issuer !== issuer) throw new Error("oauth_metadata_invalid");
 const auth = new URL(data.authorization_endpoint);
 const match = /^\/mcp-client\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)\/oauth$/.exec(auth.pathname);
 if (auth.origin !== "https://mcp.zoho.com" || auth.username || auth.password || auth.hash || auth.search || !match) throw new Error("oauth_metadata_invalid");
 const prefix = `https://mcp.zoho.com/baas/mcp/v1/oauth/${match[1]}/${match[2]}`;
 if (data.token_endpoint !== `${prefix}/token` || data.registration_endpoint !== `${prefix}/register`) throw new Error("oauth_metadata_invalid");
 return { serviceId: match[1]!, accountId: match[2]! };
}
/** No registration/browser side effect during construction or token resolution. */
export const createDefaultMcpLocalOAuthManager = ({ authenticatedUserId, broker, repository }: Parameters<McpLocalOAuthManagerFactory>[0],
 networkFactory: (url: string) => { fetch(url: string, init?: RequestInit): Promise<Response> } = (url: string) => createMcpNetworkPolicy({ placement: { kind: "server" }, savedEndpoint: url, resolve: resolveMcpLocalHost })) => {
 const managers = new Map<string, Promise<ReturnType<typeof createMcpLocalOAuth<LocalOAuthContext>>>>();
 const load = async (id: string, revision: number, signal: AbortSignal) => {
  const result = await repository.loadForUse({ authenticatedUserId, connectionId: id, expectedRevision: revision, placement: { kind: "local" } });
  return result.ok && result.value.auth.kind === "oauth" ? { authenticatedUserId, connection: result.value, signal } : undefined;
 };
 const endpoint = async (ctx: LocalOAuthContext) => {
  const current = await load(ctx.connection.id, ctx.connection.revision, ctx.signal);
  if (!current) return undefined;
  return repository.resolveEndpoint({ ...current, agentKey: "host-mcp-oauth", dialogId: "host-mcp-oauth" });
 };
 async function managerFor(ctx: LocalOAuthContext) {
  if (ctx.authenticatedUserId !== authenticatedUserId || ctx.signal.aborted) throw new Error("oauth_binding_mismatch");
  const savedEndpoint = await endpoint(ctx); if (!savedEndpoint) throw new Error("oauth_binding_mismatch");
  const issuer = new URL(savedEndpoint).origin;
  const key = JSON.stringify([ctx.connection.id, ctx.connection.revision, savedEndpoint]);
  let pending = managers.get(key);
  if (!pending) {
   pending = discoverMcpLocalOAuthService(issuer, ctx.signal, (url, signal) => networkFactory(url).fetch(url, { signal })).then(trustedService => createMcpLocalOAuth({ broker, issuer, trustedService, scopes: MCP_LOCAL_AUTHORIZED_SCOPES,
    loadContext: (id, revision) => load(id, revision, new AbortController().signal), resolveEndpoint: endpoint,
    networkFactory }));
   managers.set(key, pending); pending.catch(() => { if (managers.get(key) === pending) managers.delete(key); });
  }
  return pending;
 }
 return { resolveCredential: async (ctx: LocalOAuthContext) => (await managerFor(ctx)).resolveCredential(ctx),
  beginAuthorization: async (ctx: LocalOAuthContext, client: { register: true } | { clientId: string }) => (await managerFor(ctx)).beginAuthorization(ctx, client),
  getAttemptFailure: async (ctx: LocalOAuthContext, attemptId: string) => (await managerFor(ctx)).getAttemptFailure(attemptId),
  cancelAuthorization: async (_ctx: LocalOAuthContext, attemptId: string) => { await Promise.all([...managers.values()].map(async pending => { try { (await pending).cancelAuthorization(attemptId); } catch {} })); } };
};
