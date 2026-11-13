import { parseProtectedMutation, parseProtectedMutationAck } from "../protectedRecordProtocol";
import type { ProtectedRecordSync, NextMutationSendResult } from "./protectedRecordSync";

/** No discovery, fallback, global fetch or durable token. Caller supplies trusted credentials at send time. */
export function createProtectedRecordTransport(options: {
  sync: ProtectedRecordSync;
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  isAuthorityAllowed: (origin: string) => boolean | Promise<boolean>;
  getToken: (scope: { actorId: string; authorityServer: string }) => Promise<string | null>;
}) {
  return {
    sendNext(scope: { actorId: string; dbKey: string }) {
      return options.sync.withNextMutation(scope, async (entry): Promise<NextMutationSendResult> => {
        const blocked = (reason: string): NextMutationSendResult => ({ outcome: "blocked", reason });
        // Legacy data is a full draft, never a patch. Do not migrate or fabricate epoch/baseline.
        if (entry.operation !== "patch") return blocked("PATCH_INTENT_REQUIRED");
        if (!entry.authorityEpoch?.trim()) return blocked("AUTHORITY_EPOCH_REQUIRED");
        if (!entry.baseRevision?.trim()) return blocked("BASE_REVISION_REQUIRED");
        // Server's route does not decode its path segment. Reject unsupported keys rather than target another key.
        if (!/^page-[A-Za-z0-9_-]+$/.test(scope.dbKey)) return blocked("UNSUPPORTED_DB_KEY");
        let mutation;
        let origin: URL;
        try {
          origin = new URL(entry.authorityServer);
          if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password ||
              origin.search || origin.hash || origin.pathname !== '/') return blocked("INVALID_AUTHORITY");
          mutation = parseProtectedMutation({ protocolVersion: 1, operation: "patch", payload: entry.payload,
            expectedRevision: entry.baseRevision, mutationId: entry.mutationId,
            authorityServer: entry.authorityServer, authorityEpoch: entry.authorityEpoch });
        } catch { return blocked("INVALID_PATCH_INTENT"); }
        let response: Response;
        try {
          if (!await options.isAuthorityAllowed(origin.origin)) return blocked("AUTHORITY_NOT_CONFIGURED");
          const token = await options.getToken({ actorId: scope.actorId, authorityServer: entry.authorityServer });
          if (!token) return blocked("AUTH_REQUIRED");
          response = await options.fetch(`${origin.origin}/api/v1/db/patch/${scope.dbKey}`, {
            method: "PATCH", redirect: "error", credentials: "omit",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(mutation),
          });
        } catch { return { outcome: "pending", reason: "NETWORK_OR_CREDENTIALS_UNAVAILABLE" }; }
        if (response.status === 409) return { outcome: "conflict", reason: "HTTP_409" };
        if (response.status === 401 || response.status === 403) return blocked(`HTTP_${response.status}`);
        if (response.status === 503) return { outcome: "pending", reason: "PROTOCOL_UNAVAILABLE" };
        if (!response.ok) return blocked(`HTTP_${response.status}`);
        try {
          const ack = parseProtectedMutationAck(await response.json());
          if (ack.mutationId !== entry.mutationId || ack.authorityServer !== entry.authorityServer ||
              ack.authorityEpoch !== entry.authorityEpoch) return blocked("ACK_IDENTITY_MISMATCH");
          return { outcome: "acked", revision: ack.revision, record: ack.record };
        } catch { return blocked("INVALID_ACK"); }
      });
    },
  };
}
