export const REVOKE_SESSIONS_PURPOSE = "revoke_sessions" as const;

export const DEFAULT_REVOKE_PROOF_TTL_SEC = 60;
export const MAX_REVOKE_PROOF_TTL_SEC = 300;

export interface BuildRevokeSessionProofPayloadInput {
  userId: string;
  username?: string;
  publicKey?: string;
  tokenVersion: number;
}

export interface RevokeSessionProofPayload {
  userId: string;
  username?: string;
  publicKey?: string;
  tokenVersion: number;
  purpose: typeof REVOKE_SESSIONS_PURPOSE;
  iat: number;
  nbf: number;
  exp: number;
}

/**
 * Single-authority replay protection design note:
 * Replay prevention binds the proof cryptographically to the user's current `tokenVersion`.
 * Within the authoritative user write instance (or instances routing users requests to core
 * via NOLO_SERVER_CORE_BASE_URL), execution is serialized per user via `userWriteLockManager`.
 * The first arriving request validates `proof.tokenVersion === user.tokenVersion` and atomically
 * advances `tokenVersion` in the authority store. Any concurrent race or subsequent replay
 * reaching the write authority observes `user.tokenVersion !== proof.tokenVersion` and is rejected.
 * Note: Cross-cluster multi-active deployments without core write proxying require centralized
 * session authority or external coordination to prevent cross-region split-brain replays.
 */
export function buildRevokeSessionProofPayload(
  input: BuildRevokeSessionProofPayloadInput,
  options?: { nowSec?: number; ttlSec?: number }
): RevokeSessionProofPayload {
  if (
    typeof input.tokenVersion !== "number" ||
    !Number.isSafeInteger(input.tokenVersion) ||
    input.tokenVersion < 0
  ) {
    throw new TypeError("tokenVersion must be a non-negative safe integer");
  }

  const nowSec = options?.nowSec ?? Math.floor(Date.now() / 1000);
  if (typeof nowSec !== "number" || !Number.isSafeInteger(nowSec) || nowSec <= 0) {
    throw new TypeError("nowSec must be a positive safe integer");
  }

  const ttlSec = options?.ttlSec ?? DEFAULT_REVOKE_PROOF_TTL_SEC;
  if (
    typeof ttlSec !== "number" ||
    !Number.isSafeInteger(ttlSec) ||
    ttlSec <= 0 ||
    ttlSec > MAX_REVOKE_PROOF_TTL_SEC
  ) {
    throw new TypeError(
      `ttlSec must be an integer between 1 and ${MAX_REVOKE_PROOF_TTL_SEC}`
    );
  }

  return {
    userId: input.userId,
    username: input.username,
    publicKey: input.publicKey,
    tokenVersion: input.tokenVersion,
    purpose: REVOKE_SESSIONS_PURPOSE,
    iat: nowSec,
    nbf: nowSec,
    exp: nowSec + ttlSec,
  };
}

export interface VerifyRevokeSessionProofResult {
  ok: boolean;
  reason?: string;
}

export function verifyRevokeSessionProofPayload(
  payload: any,
  expectedUserId: string,
  currentUserTokenVersion: number,
  nowSec = Math.floor(Date.now() / 1000)
): VerifyRevokeSessionProofResult {
  if (!payload || typeof payload !== "object") {
    return { ok: false, reason: "invalid_payload" };
  }
  if (payload.purpose !== REVOKE_SESSIONS_PURPOSE) {
    return { ok: false, reason: "invalid_purpose" };
  }
  if (payload.userId !== expectedUserId) {
    return { ok: false, reason: "user_mismatch" };
  }

  // Reject NaN, Infinity, non-integers, missing fields
  if (
    typeof payload.tokenVersion !== "number" ||
    !Number.isSafeInteger(payload.tokenVersion) ||
    payload.tokenVersion < 0
  ) {
    return { ok: false, reason: "invalid_token_version" };
  }

  if (
    typeof payload.iat !== "number" ||
    !Number.isSafeInteger(payload.iat) ||
    typeof payload.exp !== "number" ||
    !Number.isSafeInteger(payload.exp) ||
    typeof payload.nbf !== "number" ||
    !Number.isSafeInteger(payload.nbf)
  ) {
    return { ok: false, reason: "invalid_timestamps" };
  }

  // Inverted time window rejection
  if (
    payload.exp <= payload.iat ||
    payload.nbf > payload.exp ||
    payload.iat > payload.nbf
  ) {
    return { ok: false, reason: "inverted_time_window" };
  }

  // nbf enforcement (allow max 10s clock skew)
  if (nowSec < payload.nbf - 10) {
    return { ok: false, reason: "token_not_active" };
  }

  // iat future bound (allow max 10s clock skew)
  if (payload.iat > nowSec + 10) {
    return { ok: false, reason: "token_used_before_issued" };
  }

  // exp expiration check
  if (nowSec > payload.exp) {
    return { ok: false, reason: "expired" };
  }

  // TTL upper bound check
  if (payload.exp - payload.iat > MAX_REVOKE_PROOF_TTL_SEC) {
    return { ok: false, reason: "ttl_exceeds_max" };
  }

  // Stale tokenVersion check
  if (payload.tokenVersion !== currentUserTokenVersion) {
    return { ok: false, reason: "stale_token_version" };
  }

  return { ok: true };
}
