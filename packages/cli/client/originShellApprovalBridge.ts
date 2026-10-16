import type { ExecShellApprovalAuthority } from "../../agent-runtime/capabilities/capability";
import { isAbsolute } from "node:path";

/** Host-owned identity; never populate from model arguments or a parent grant. */
export type OriginShellApprovalBinding = Readonly<{
  runId: string;
  agentKey: string;
  ownerUserId: string;
  deviceId: string;
  /** Canonical, realpath-resolved absolute workspace; NOT a shell sandbox. */
  workspaceRoot: string;
}>;
export type OriginShellApprovalCall = OriginShellApprovalBinding & Readonly<{
  toolName: string;
  /** Full verbatim command, not extractShellCommandPreview (which trims). */
  command: string;
  executionPayload?: string;
}>;
export type OriginShellApprovalState =
  | "pending" | "approved" | "denied" | "revoked" | "expired" | "consumed";
export type OriginShellApprovalRequest = OriginShellApprovalCall & Readonly<{
  requestId: string;
  createdAt: number;
  expiresAt: number;
  state: OriginShellApprovalState;
}>;
export type OriginShellApprovalFailure =
  | "identity_mismatch" | "call_mismatch" | "unknown_request"
  | "pending" | "denied" | "revoked" | "expired" | "consumed"
  | "invalid_request" | "capacity";
export type OriginShellApprovalResult =
  | { ok: true; request: OriginShellApprovalRequest }
  | { ok: false; reason: OriginShellApprovalFailure };

export type OriginShellApprovalBridge = {
  request(call: OriginShellApprovalCall): OriginShellApprovalResult;
  /** Trusted human-decision ingress ONLY; not a model tool or ordinary queue message. */
  decide(requestId: string, call: OriginShellApprovalCall, decision: "approve" | "deny"): OriginShellApprovalResult;
  /** Run-wide revocation invalidates pending AND approved requests synchronously. */
  revoke(): void;
  /** Lazy expiration also runs on every operation. Host may schedule this for UI cleanup. */
  timeout(): number;
  /** Per-call check immediately before dispatch, with no intervening await. One use only. */
  consume(requestId: string, call: OriginShellApprovalCall): OriginShellApprovalResult;
};

const IDENTITY_KEYS = ["runId", "agentKey", "ownerUserId", "deviceId", "workspaceRoot"] as const;
const CALL_KEYS = [...IDENTITY_KEYS, "toolName", "command", "executionPayload"] as const;
const MAX_REQUESTS_PER_BRIDGE = 256;

/**
 * In-memory, run-bound capability state, not an IPC/authentication implementation.
 * The trusted host keeps this object private and creates request IDs. The model must
 * never receive decide/revoke or an approval boolean ingress. No session-grant cache,
 * environment flag, parent grant, signing key or automatic approval exists here.
 *
 * resolveWorkspace MUST be the host's realpath resolver, re-run on each call; resolver
 * failure or a changed symlink fails closed. cwd is identity/display, not confinement:
 * UI must say shell can access everything available to the local OS user.
 *
 * IPC/disconnect authentication is a later integration gate: revoke on disconnect and
 * cancel pending UI at expiresAt. This object cannot isolate arbitrary malicious code
 * running as the same UID. Revocation cannot roll back an already dispatched command.
 */
export function createOriginShellApprovalBridge(deps: {
  binding: OriginShellApprovalBinding;
  resolveWorkspace: (path: string) => string;
  now?: () => number;
  /** Test/host injection only; production must supply unpredictable, unique IDs. */
  createRequestId?: () => string;
  timeoutMs?: number;
}): OriginShellApprovalBridge {
  const binding = { ...deps.binding };
  const now = deps.now ?? Date.now;
  const createRequestId = deps.createRequestId ?? (() => crypto.randomUUID());
  const timeoutMs = deps.timeoutMs ?? 60_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 300_000) {
    throw new Error("Shell approval timeout must be finite, > 0 and <= 300000ms");
  }
  const requests = new Map<string, OriginShellApprovalRequest>();
  const fail = (reason: OriginShellApprovalFailure): OriginShellApprovalResult => ({ ok: false, reason });
  const snapshot = (request: OriginShellApprovalRequest): OriginShellApprovalResult =>
    ({ ok: true, request: { ...request } });
  const validIdentity = (call: OriginShellApprovalBinding): boolean => {
    try {
      return IDENTITY_KEYS.every((key) => typeof call[key] === "string" && call[key].trim().length > 0 && call[key] === binding[key])
        && isAbsolute(call.workspaceRoot)
        && deps.resolveWorkspace(call.workspaceRoot) === binding.workspaceRoot;
    } catch {
      return false;
    }
  };
  if (!validIdentity(binding)) throw new Error("Shell approval requires a canonical host binding");

  const timeout = (): number => {
    const time = now();
    let expired = 0;
    for (const [id, request] of requests) {
      if ((request.state === "pending" || request.state === "approved") &&
          (!Number.isFinite(time) || time < request.createdAt || time >= request.expiresAt)) {
        requests.set(id, { ...request, state: "expired" });
        expired += 1;
      }
    }
    return expired;
  };
  const lookup = (id: string, call: OriginShellApprovalCall): OriginShellApprovalResult => {
    timeout();
    if (!validIdentity(call)) return fail("identity_mismatch");
    const request = requests.get(id);
    if (!request) return fail("unknown_request");
    if (!CALL_KEYS.every((key) => request[key] === call[key])) return fail("call_mismatch");
    return snapshot(request);
  };
  return {
    request(call) {
      timeout();
      if (!validIdentity(call)) return fail("identity_mismatch");
      if (typeof call.toolName !== "string" || !call.toolName.trim() ||
          typeof call.command !== "string" || !call.command.trim()) return fail("invalid_request");
      // Retain terminal IDs to reject collisions/replay; bounded for a long-lived run.
      if (requests.size >= MAX_REQUESTS_PER_BRIDGE) return fail("capacity");
      const createdAt = now();
      if (!Number.isFinite(createdAt) || !Number.isFinite(createdAt + timeoutMs)) return fail("invalid_request");
      let requestId: string;
      try { requestId = createRequestId(); } catch { return fail("invalid_request"); }
      if (typeof requestId !== "string" || !requestId.trim() || requests.has(requestId)) return fail("invalid_request");
      // Explicit fields: never copy model-supplied state/approved/requestId extras.
      const request: OriginShellApprovalRequest = {
        ...binding, toolName: call.toolName, command: call.command,
        ...(call.executionPayload !== undefined ? { executionPayload: call.executionPayload } : {}),
        requestId, createdAt, expiresAt: createdAt + timeoutMs, state: "pending",
      };
      requests.set(requestId, request);
      return snapshot(request);
    },
    decide(id, call, decision) {
      const result = lookup(id, call);
      if (!result.ok) return result;
      if (result.request.state !== "pending") {
        return fail(result.request.state === "approved" ? "invalid_request" : result.request.state);
      }
      if (decision !== "approve" && decision !== "deny") return fail("invalid_request");
      const request: OriginShellApprovalRequest = {
        ...result.request, state: decision === "approve" ? "approved" : "denied",
      };
      requests.set(id, request);
      return snapshot(request);
    },
    revoke() {
      for (const [id, request] of requests) {
        if (request.state === "pending" || request.state === "approved") {
          requests.set(id, { ...request, state: "revoked" });
        }
      }
    },
    timeout,
    consume(id, call) {
      const result = lookup(id, call);
      if (!result.ok) return result;
      if (result.request.state !== "approved") return fail(result.request.state);
      const request: OriginShellApprovalRequest = { ...result.request, state: "consumed" };
      requests.set(id, request);
      return snapshot(request);
    },
  };
}

/** Trusted adapter ingress. Human transport decides through bridge.decide, never a boolean return. */
export function createOriginShellApprovalAuthority(args: {
  bridge: OriginShellApprovalBridge;
  binding: OriginShellApprovalBinding;
  requestApproval(request: OriginShellApprovalRequest): Promise<void>;
}): ExecShellApprovalAuthority {
  const callFor = (payload: string): OriginShellApprovalCall => {
    const data = JSON.parse(payload);
    const execution = JSON.parse(data.binding);
    if (execution.workspaceRoot !== args.binding.workspaceRoot) throw new Error("Shell approval workspace mismatch");
    const input = execution.input;
    if (typeof input.command !== "string") throw new Error("Invalid shell approval payload");
    return { ...args.binding, toolName: "execShell", command: input.command, executionPayload: payload };
  };
  return {
    async request(payload) {
      const result = args.bridge.request(callFor(payload));
      if (!result.ok) throw new Error(`Shell approval: ${result.reason}`);
      await args.requestApproval(result.request);
      return result.request.requestId;
    },
    consume(ticket, payload) {
      const result = args.bridge.consume(ticket, callFor(payload));
      if (!result.ok) throw new Error(`Shell approval: ${result.reason}`);
    },
  };
}
