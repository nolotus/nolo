/**
 * Shared key derivation for the chat-proxy single-billing architecture.
 *
 * The server has exactly one chat-proxy billing entry point —
 * `recordChatProxyTokenUsage` — which (a) writes stable token detail, (b)
 * charges the ledger with a user-scoped idempotency key, then (c) publishes a
 * provider-call marker proving ledger processing succeeded.
 *
 * Defense-in-depth against double-charging the same provider call on the
 * client→server sync path (`handleToken` in dataHandlers):
 *   1. Normal clients remain billable and `handleToken` calls the ledger
 *      with the SAME user-scoped idempotency key that
 *      `recordChatProxyTokenUsage` used. The ledger dedupes the second charge
 *      (or completes a server-side failed attempt), so async billing failures
 *      are retryable without optimistic flags.
 *   2. The provider-call marker (`provider-call:{id}:token-record:v1`) is the
 *      server-owned SECURITY BOUNDARY for using the provider-call charge key
 *      at all: a billing path may pass
 *      `providerCallChargeIdempotencyKey(userId, providerCallId)` to the
 *      ledger ONLY when the durable marker strictly authorizes THIS
 *      (userId, recordKey) pair (`marker.tokenRecord.userId === userId` and
 *      `marker.recordKey === tokenWrite.recordKey`). When the marker is
 *      missing, replayed, or points at another record, every billing path
 *      (handleToken, recordChatProxyTokenUsage, agent-run billing) falls back
 *      to the token record's own `token:${recordKey}` key, so forged or
 *      cross-record provider call ids can never collapse unrelated token
 *      records onto one ledger key. The marker additionally lets `handleToken`
 *      skip the ledger round-trip for a call the server already charged.
 *
 * Keep this module dependency-free so both the server chatHandler path and the
 * dataHandlers path share one definition and cannot drift on key shape.
 */

/** Durable server-owned state marker for a provider call. */
export const providerCallTokenRecordMarkerKey = (
  providerCallId?: string
): string | undefined =>
  providerCallId
    ? `provider-call:${providerCallId}:token-record:v1`
    : undefined;

/** Ledger idempotency key for a provider-call charge. */
export const providerCallChargeIdempotencyKey = (
  userId?: string,
  providerCallId?: string
): string | undefined =>
  userId && providerCallId
    ? `provider-call:${encodeURIComponent(userId)}:${providerCallId}:charge:v1`
    : undefined;

/**
 * LEGACY unscoped provider-call charge key (`provider-call:{id}:charge:v1`),
 * written by the agent-run billing path before marker gating existed.
 * Historical settled charges may still live under this key, so the agent-run
 * path passes it to the ledger as a `legacyIdempotencyKeys` compat probe:
 * retries of records already billed under the old shape converge on that
 * settled charge (duplicate) instead of double-charging after the key-shape
 * migration. NEVER use it for new charges — it is not user-scoped, so two
 * different token records sharing a provider call id would collapse onto one
 * key.
 */
export const legacyUnscopedProviderCallChargeKey = (
  providerCallId?: string
): string | undefined =>
  providerCallId ? `provider-call:${providerCallId}:charge:v1` : undefined;

export type ProviderCallMarkerOutcome =
  | "pending"
  | "client_owned"
  | "charged"
  | "failed";

/**
 * Marker value shape (written by recordChatProxyTokenUsage). Exported as a
 * type-only contract so handleToken can read the stored token record without
 * importing the chat-proxy billing module (avoids a server→server circular).
 */
export interface ProviderCallTokenRecordMarker {
  providerCallId?: string;
  recordKey?: string;
  failureRecordKey?: string;
  tokenRecord?: Record<string, unknown>;
  recordedAt?: number;
  outcome?: ProviderCallMarkerOutcome;
}
