import { resolveMcpLocalHost } from "./mcpLocalResolver";
import { createDefaultMcpLocalOAuthManager } from "./mcpLocalOAuthHost";
import type { McpExecutionContext } from "../../agent-runtime/mcpConnectionSpecs";
import { getDefaultCliLocalRuntimeAuthority } from "../localRuntimeAuthority";
import type { CredentialBroker } from "../../agent-runtime/credentialBroker";
import { createStrictHostCredentialBroker } from "../../agent-runtime/desktopHostCredentialBroker";
import type { AuthorityStore } from "../../database-engine/authorityStoreTypes";
import { type McpLocalAccessTokenResolver, createMcpLocalConnectionRepository } from "./mcpLocalConnectionRepository";
import { createMcpExecutionBridge } from "../../agent-runtime/mcpExecutionBridge";
import { createMcpRemoteClient } from "../../agent-runtime/mcpRemoteClient";
import { confirmMcpOnHost } from "./mcpHostConfirmation";

/** Trusted host API, never a model executor. Endpoint bytes stay in the strict OS store. */
export async function openMcpLocalManagement(args: { authenticatedUserId: string; env?: Record<string, string | undefined>; authority?: AuthorityStore; broker?: CredentialBroker; resolveAccessToken?: McpLocalAccessTokenResolver }) {
 const authority = args.authority ?? await getDefaultCliLocalRuntimeAuthority({ env: args.env });
 return createMcpLocalConnectionRepository({ authority, broker: args.broker ?? createStrictHostCredentialBroker({ env: args.env }), authenticatedUserId: args.authenticatedUserId, placement: { kind: "local" }, resolveAccessToken: args.resolveAccessToken });
}
/** Structural API compatible with createMcpLocalOAuth, without importing its implementation. */
export type McpLocalOAuthManagerFactory = (host: {
 authenticatedUserId: string;
 broker: CredentialBroker;
 repository: Awaited<ReturnType<typeof openMcpLocalManagement>>;
}) => { resolveCredential(ctx: Pick<McpExecutionContext, "authenticatedUserId" | "connection" | "signal">): Promise<{ accessToken: string } | undefined> };

/** One repository/manager per CLI adapter lifetime. Token bytes are never cached here. */
export async function openMcpLocalRuntimeManagement(args: Omit<Parameters<typeof openMcpLocalManagement>[0], "resolveAccessToken"> & {
 createOAuthManager?: McpLocalOAuthManagerFactory;
}) {
 const broker = args.broker ?? createStrictHostCredentialBroker({ env: args.env });
 const createOAuthManager = args.createOAuthManager ?? createDefaultMcpLocalOAuthManager;
 let manager: ReturnType<McpLocalOAuthManagerFactory> | undefined;
 const repository: Awaited<ReturnType<typeof openMcpLocalManagement>> = await openMcpLocalManagement({ ...args, broker,
  ...({ resolveAccessToken: async (binding: Parameters<McpLocalAccessTokenResolver>[0]) => {
   const loaded = await repository.loadForUse({ authenticatedUserId: binding.authenticatedUserId,
    connectionId: binding.connectionId, expectedRevision: binding.connectionRevision, placement: binding.placement });
   if (!loaded.ok || binding.signal.aborted || !manager) return undefined;
   return manager.resolveCredential({ authenticatedUserId: binding.authenticatedUserId, connection: loaded.value, signal: binding.signal });
  } }) });
 manager = createOAuthManager({ authenticatedUserId: args.authenticatedUserId, broker, repository });
 return repository;
}

/** Installs from an existing controlled-store reference in-process, never argv JSON or files. */
export async function installMcpLocalFromStore(args: Parameters<typeof openMcpLocalManagement>[0] & {
 endpointSourceRef: string; credentialSourceRef?: string; sourceBroker: CredentialBroker;
 input: Omit<Parameters<Awaited<ReturnType<typeof openMcpLocalManagement>>["save"]>[0], "endpoint" | "credential">;
}) {
 const endpoint = await args.sourceBroker.get(args.endpointSourceRef);
 const credential = args.credentialSourceRef ? await args.sourceBroker.get(args.credentialSourceRef) : undefined;
 if (!endpoint || (args.credentialSourceRef && !credential)) return { ok: false as const, error: { code: "credential_unavailable" as const } };
 const repository = await openMcpLocalManagement(args);
 return repository.save({ ...args.input, endpoint, ...(credential ? { credential } : {}) });
}
export function createMcpLocalRuntimeAdapter(args: { repository: Awaited<ReturnType<typeof openMcpLocalManagement>>; identity: { authenticatedUserId: string; agentKey: string; dialogId: string }; signal: AbortSignal }) {
 const { repository, identity, signal } = args;
 const adapter = createMcpRemoteClient({ placement: { kind: "local" }, resolveDns: resolveMcpLocalHost, resolveEndpoint: repository.resolveEndpoint,
 resolveCredential: repository.resolveCredential, revalidateBeforeCall: async ctx => {
 const current = await repository.loadForUse({ ...identity, placement: { kind: "local" }, connectionId: ctx.connection.id, expectedRevision: ctx.connection.revision });
 return current;
 } });
 const bridge = createMcpExecutionBridge({ identity, placement: { kind: "local" }, signal,
 load: (connectionId, expectedRevision) => repository.loadForUse({ ...identity, placement: { kind: "local" }, connectionId, expectedRevision }),
 confirm: confirmMcpOnHost, adapter });
 return { listMcpConnections: async () => signal.aborted ? ({ ok: false, error: { code: "cancelled" } }) : ({ ok: true, value: await repository.summary() }),
 listMcpTools: (input: unknown) => bridge.execute("listMcpTools", input), callMcpTool: (input: unknown) => bridge.execute("callMcpTool", input),
 async close() { bridge.revoke(); } };
}
