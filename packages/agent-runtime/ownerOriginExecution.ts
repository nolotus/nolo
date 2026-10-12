import { EXECUTION_BACKEND_KINDS, type ExecutionBackendDescriptor, type ExecutionLease, type ExecutionTicket } from "./executionBackend";

/** Independent of runtimeMode: the model is owner-authorized; tools stay at origin. */
export const OWNER_ORIGIN_EXECUTION_VERSION = 1 as const;

export type OwnerOriginIdentity = {
  /** Existing device identity, or an explicitly ephemeral local-instance identity.
   * The only field server admission authenticates end-to-end: it must match a
   * live connector record registered under the caller's account (block E). */
  machineId: Extract<ExecutionTicket["target"], { kind: "machine" }>["machineId"];
  /** local_instance is ephemeral, not a second durable machine identity. */
  identitySource: "machine" | "local_instance";
  /** Client-declared session snapshot. Lexically validated only; the server
   * has no session registry, so this is NOT server-verified identity. */
  sessionId: string;
  /** Client-declared workspace snapshot, not server-verified. */
  workspaceId: string;
  /** Origin host must supply realpath-resolved absolute snapshots, never model
   * arguments. Shared validation checks lexical shape only, not filesystem truth.
   * Client-declared, not server-verified: the origin host enforces realpath +
   * containment under its own execution policy at tool time. */
  workspaceRoot: NonNullable<ExecutionLease["workspaceRoot"]>;
  /** Client-declared cwd snapshot; same endorsement boundary as workspaceRoot. */
  cwd: string;
};

export type OwnerRequiredModelRoute = {
  kind: "server_agent_oauth";
  agentKey: ExecutionTicket["agentKey"];
  credentialPolicy: "owner_required";
};

/** This is an execution extension, NOT a second chat messages/tools payload schema.
 * B/C must validate this before credential resolution and before any model POST.
 * No caller/platform credential fallback is permitted, including on old servers.
 */
export type OwnerOriginExecution = {
  version: typeof OWNER_ORIGIN_EXECUTION_VERSION;
  controller: "origin_local";
  origin: OwnerOriginIdentity;
  modelRoute: OwnerRequiredModelRoute;
};

/** Protocol vocabulary for B-E; declaration does not imply implemented admission. */
export type OwnerOriginErrorCode =
  | "owner_route_unsupported"
  | "owner_origin_invalid"
  | "owner_model_channel_invalid"
  | "owner_origin_mismatch"
  | "owner_agent_missing"
  | "owner_grant_denied"
  | "owner_grant_revoked"
  | "owner_oauth_unavailable"
  | "owner_provider_unsupported"
  | "origin_unavailable"
  | "origin_authorization_required"
  | "origin_authorization_revoked";

export type OwnerOriginValidation<T> =
  | { ok: true; value: T }
  | { ok: false; code: OwnerOriginErrorCode };

/** Explicit capability acknowledgment from the authenticated server, not guessed
 * from an HTTP 200, discovery billing label, or a UI's isLocal flag.
 */
export type OwnerOriginServerCapability = {
  version: typeof OWNER_ORIGIN_EXECUTION_VERSION;
  credentialPolicy: "owner_required";
  modelRoute: "server_agent_oauth";
};

/** Actual observed tool placement, separate from requested origin. Consumers
 * compare deviceId with their current device ID; no persisted isLocal boolean.
 * Unknown/offline placement must never select the first online machine.
 */
const TOOL_LOCATION_STATUSES = ["ready", "unavailable", "stopped"] as const;

export type ToolExecutionLocation =
  | { status: "unknown" }
  | {
      status: (typeof TOOL_LOCATION_STATUSES)[number];
      hostType: ExecutionBackendDescriptor["kind"];
      /** Presentation alias of origin.machineId; never mint a separate identity. */
      deviceId: OwnerOriginIdentity["machineId"];
      deviceName: string;
      workspace: {
        id: string;
        root: NonNullable<ExecutionLease["workspaceRoot"]>;
        cwd: string;
      };
    };

/** Server-resolved, allowlisted presentation metadata. Not an authorization
 * grant, credential, internal CallPlan, or evidence of actual provider billing.
 */
export type OwnerModelChannelSummary = {
  kind: "server_agent_oauth";
  credentialPolicy: "owner_required";
  agentKey: string;
  ownerUserId: string;
  provider: string;
  model: string;
  billingSource: "owner_subscription";
  requestId: string;
};

/** Presentation contract reserved for consumers; not an implemented run result. */
export type OwnerOriginExecutionSummary = {
  version: typeof OWNER_ORIGIN_EXECUTION_VERSION;
  toolLocation: ToolExecutionLocation;
  modelChannel:
    | { status: "unknown" }
    | { status: "resolved"; route: OwnerModelChannelSummary };
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value === value.trim();
}
function only(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

/** Lexical only, using the POSIX / drive / UNC forms already recognized by
 * workspaceShell.findWorkspaceShellEscapeToken. That module depends on host IO,
 * so do not import it into this cross-end contract. No node:path/fs dependency.
 * Reject dot segments instead of resolving them or claiming canonicality.
 * Do not impose cwd-within-root here: these are identity snapshots, not path
 * capabilities. Containment and any external-access approval belong to the
 * origin host's existing execution policy (including symlink-aware checks).
 */
function absoluteSnapshotPath(value: unknown): value is string {
  if (!text(value) || value.includes("\0")) return false;
  const drive = /^[A-Za-z]:[\\/]/.test(value);
  const unc = value.startsWith("\\\\");
  if (!(value.startsWith("/") || drive || unc)) return false;
  if (unc && !/^\\\\[^\\/]+[\\/][^\\/]+(?:[\\/]|$)/.test(value)) return false;
  // Backslash is a separator only in Windows forms; on POSIX it is a filename.
  const segments = value.split(drive || unc ? /[\\/]/ : /\//);
  return !segments.some((segment) => segment === "." || segment === "..");
}

/** Pure shape check only: it cannot authenticate a caller, resolve realpath,
 * validate containment/a grant, or prove device ownership. Success is NOT
 * permission to execute tools. The origin host must resolve symlinks/realpath
 * and enforce its existing workspace + caller + capability authorization. Server must resolve agent/owner
 * authority independently. Reject extras rather than accepting client claims
 * such as ownerUserId, provider, apiKey, token, or an alternate tool target.
 */
export function validateOwnerOriginExecution(value: unknown): OwnerOriginValidation<OwnerOriginExecution> {
  const invalid = { ok: false, code: "owner_origin_invalid" } as const;
  if (!record(value) || !only(value, ["version", "controller", "origin", "modelRoute"])) return invalid;
  if (value.version !== OWNER_ORIGIN_EXECUTION_VERSION) return { ok: false, code: "owner_route_unsupported" };
  if (value.controller !== "origin_local" || !record(value.origin) || !record(value.modelRoute)) return invalid;
  const origin = value.origin;
  const route = value.modelRoute;
  if (!only(origin, ["machineId", "identitySource", "sessionId", "workspaceId", "workspaceRoot", "cwd"]) ||
      ![origin.machineId, origin.sessionId, origin.workspaceId].every(text) ||
      !["machine", "local_instance"].includes(origin.identitySource as string) ||
      !absoluteSnapshotPath(origin.workspaceRoot) || !absoluteSnapshotPath(origin.cwd) ||
      !only(route, ["kind", "agentKey", "credentialPolicy"]) ||
      route.kind !== "server_agent_oauth" || route.credentialPolicy !== "owner_required" || !text(route.agentKey)) return invalid;
  // Construct a fresh value; callers cannot mutate the input to change a validated binding.
  return { ok: true, value: {
    version: OWNER_ORIGIN_EXECUTION_VERSION,
    controller: "origin_local",
    origin: {
      machineId: origin.machineId as string, identitySource: origin.identitySource as OwnerOriginIdentity["identitySource"],
      sessionId: origin.sessionId as string,
      workspaceId: origin.workspaceId as string, workspaceRoot: origin.workspaceRoot as string,
      cwd: origin.cwd as string,
    },
    modelRoute: { kind: "server_agent_oauth", agentKey: route.agentKey, credentialPolicy: "owner_required" },
  } };
}

/** Invoke before credentials/model traffic. Missing capability is unsupported,
 * not permission to downgrade to legacy routing. */
export function validateOwnerOriginServerCapability(value: unknown): OwnerOriginValidation<OwnerOriginServerCapability> {
  if (!record(value) || value.version !== OWNER_ORIGIN_EXECUTION_VERSION ||
      value.credentialPolicy !== "owner_required" || value.modelRoute !== "server_agent_oauth") {
    return { ok: false, code: "owner_route_unsupported" };
  }
  return { ok: true, value: {
    version: OWNER_ORIGIN_EXECUTION_VERSION, credentialPolicy: "owner_required", modelRoute: "server_agent_oauth",
  } };
}

/** Trusted snapshot MUST come from the initiating process's canonical workspace
 * and existing machine/session identity. Equality and lexical shape are NOT
 * realpath validation, containment, device attestation, or tool authorization:
 * D/E must separately check caller + agent + capabilities + revocation epoch.
 */
export function validateOwnerOriginBinding(
  value: unknown,
  trusted: OwnerOriginIdentity,
  agentKey: string,
): OwnerOriginValidation<OwnerOriginExecution> {
  const parsed = validateOwnerOriginExecution(value);
  if (!parsed.ok) return parsed;
  const origin = parsed.value.origin;
  if (parsed.value.modelRoute.agentKey !== agentKey ||
      origin.machineId !== trusted.machineId || origin.identitySource !== trusted.identitySource || origin.sessionId !== trusted.sessionId ||
      origin.workspaceId !== trusted.workspaceId || origin.workspaceRoot !== trusted.workspaceRoot || origin.cwd !== trusted.cwd) {
    return { ok: false, code: "owner_origin_mismatch" };
  }
  return parsed;
}

/** Project an authenticated server result, never spread it into UI/persistence.
 * Credentials and internal plan fields are discarded even if present in input.
 */
export function projectOwnerModelChannelSummary(value: unknown): OwnerOriginValidation<OwnerModelChannelSummary> {
  if (!record(value) || value.kind !== "server_agent_oauth" || value.credentialPolicy !== "owner_required" ||
      value.billingSource !== "owner_subscription" ||
      ![value.agentKey, value.ownerUserId, value.provider, value.model, value.requestId].every(text)) {
    return { ok: false, code: "owner_model_channel_invalid" };
  }
  return { ok: true, value: {
    kind: "server_agent_oauth", credentialPolicy: "owner_required",
    agentKey: value.agentKey as string, ownerUserId: value.ownerUserId as string,
    provider: value.provider as string, model: value.model as string,
    billingSource: "owner_subscription", requestId: value.requestId as string,
  } };
}

/** Display/persistence projection; missing placement remains explicitly unknown.
 * This does not select a host or grant tool execution authority.
 */
export function projectToolExecutionLocation(value: unknown): ToolExecutionLocation {
  if (!record(value) || !(TOOL_LOCATION_STATUSES as readonly unknown[]).includes(value.status) ||
      !(EXECUTION_BACKEND_KINDS as readonly unknown[]).includes(value.hostType) ||
      !text(value.deviceId) || !text(value.deviceName) || !record(value.workspace) ||
      !text(value.workspace.id) || !absoluteSnapshotPath(value.workspace.root) || !absoluteSnapshotPath(value.workspace.cwd)) return { status: "unknown" };
  return {
    status: value.status as (typeof TOOL_LOCATION_STATUSES)[number],
    hostType: value.hostType as ExecutionBackendDescriptor["kind"],
    deviceId: value.deviceId, deviceName: value.deviceName,
    workspace: { id: value.workspace.id as string, root: value.workspace.root as string, cwd: value.workspace.cwd as string },
  };
}

/** Response headers binding an owner_required dispatch to the admitted route.
 * Clients MUST require both: absence (old server / non-owner path) is a hard
 * failure, never an implicit "it worked". Values carry no credential data.
 * Single source of truth: server emits these, clients verify with verifyOwnerRouteAck.
 */
export const OWNER_ROUTE_VERSION_HEADER = "X-Nolo-Owner-Route-Version";
export const OWNER_ROUTE_REQUEST_ID_HEADER = "X-Nolo-Owner-Route-Request-Id";

export type OwnerRouteAck =
  | { ok: true; version: typeof OWNER_ORIGIN_EXECUTION_VERSION; requestId: string }
  | { ok: false; code: Extract<OwnerOriginErrorCode, "owner_route_unsupported" | "owner_origin_mismatch"> };

/** Client-side check of a dispatch response. A missing/unknown version means the
 * server did not run the owner-only path (old server or no capability).
 */
export function verifyOwnerRouteAck(headers: Headers, expectedRequestId?: string): OwnerRouteAck {
  const version = headers.get(OWNER_ROUTE_VERSION_HEADER);
  const requestId = headers.get(OWNER_ROUTE_REQUEST_ID_HEADER)?.trim();
  if (version !== String(OWNER_ORIGIN_EXECUTION_VERSION) || !requestId) {
    return { ok: false, code: "owner_route_unsupported" };
  }
  if (expectedRequestId !== undefined && requestId !== expectedRequestId) {
    return { ok: false, code: "owner_origin_mismatch" };
  }
  return { ok: true, version: OWNER_ORIGIN_EXECUTION_VERSION, requestId };
}
