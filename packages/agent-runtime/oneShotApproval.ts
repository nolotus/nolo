/** Extracted run-bound state machine shared by shell and MCP. Not an authentication channel. */
export type OneShotApprovalState = "pending" | "approved" | "denied" | "revoked" | "expired" | "consumed";
export type OneShotApprovalFailure = "identity_mismatch" | "call_mismatch" | "unknown_request" | "pending" | "denied" | "revoked" | "expired" | "consumed" | "invalid_request" | "capacity";
export type OneShotApprovalRequest<T> = T & { requestId: string; createdAt: number; expiresAt: number; state: OneShotApprovalState };
export type OneShotApprovalResult<T> = { ok: true; request: OneShotApprovalRequest<T> } | { ok: false; reason: OneShotApprovalFailure };
export function createOneShotApproval<T extends object>(deps: {
  validIdentity(call: T): boolean;
  validCall(call: T): boolean;
  matches(saved: T, current: T): boolean;
  /** Return only trusted binding fields, never request state supplied by a caller. */
  project(call: T): T;
  now?: () => number;
  createRequestId?: () => string;
  timeoutMs?: number;
}) {
  const now = deps.now ?? Date.now;
  const createRequestId = deps.createRequestId ?? (() => crypto.randomUUID());
  const timeoutMs = deps.timeoutMs ?? 60_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 300_000) throw new Error("Invalid approval timeout");
  const MAX_REQUESTS_PER_BRIDGE = 256;
  const requests = new Map<string, OneShotApprovalRequest<T>>();
  const fail = (reason: OneShotApprovalFailure): OneShotApprovalResult<T> => ({ ok: false, reason });
  const snapshot = (request: OneShotApprovalRequest<T>): OneShotApprovalResult<T> =>
    ({ ok: true, request: { ...request } });

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
  const lookup = (id: string, call: T): OneShotApprovalResult<T> => {
    timeout();
    if (!deps.validIdentity(call)) return fail("identity_mismatch");
    const request = requests.get(id);
    if (!request) return fail("unknown_request");
    if (!deps.matches(request, call)) return fail("call_mismatch");
    return snapshot(request);
  };
  return {
    request(call: T) {
      timeout();
      if (!deps.validIdentity(call)) return fail("identity_mismatch");
      if (!deps.validCall(call)) return fail("invalid_request");
      // Retain terminal IDs to reject collisions/replay; bounded for a long-lived run.
      if (requests.size >= MAX_REQUESTS_PER_BRIDGE) return fail("capacity");
      const createdAt = now();
      if (!Number.isFinite(createdAt) || !Number.isFinite(createdAt + timeoutMs)) return fail("invalid_request");
      let requestId: string;
      try { requestId = createRequestId(); } catch { return fail("invalid_request"); }
      if (typeof requestId !== "string" || !requestId.trim() || requests.has(requestId)) return fail("invalid_request");
      // Explicit fields: never copy model-supplied state/approved/requestId extras.
      const request: OneShotApprovalRequest<T> = {
        ...deps.project(call),
        requestId, createdAt, expiresAt: createdAt + timeoutMs, state: "pending",
      };
      requests.set(requestId, request);
      return snapshot(request);
    },
    decide(id: string, call: T, decision: "approve" | "deny") {
      const result = lookup(id, call);
      if (!result.ok) return result;
      if (result.request.state !== "pending") {
        return fail(result.request.state === "approved" ? "invalid_request" : result.request.state);
      }
      if (decision !== "approve" && decision !== "deny") return fail("invalid_request");
      const request: OneShotApprovalRequest<T> = {
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
    consume(id: string, call: T) {
      const result = lookup(id, call);
      if (!result.ok) return result;
      if (result.request.state !== "approved") return fail(result.request.state);
      const request: OneShotApprovalRequest<T> = { ...result.request, state: "consumed" };
      requests.set(id, request);
      return snapshot(request);
    },
  };
}
