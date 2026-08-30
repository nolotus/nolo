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
 *   2. The provider-call marker (`provider-call:{id}:token-record:v1`) is a
 *      fast-path optimization: when a client echoes a provider_call_id whose
 *      marker exists AND the marker's recordKey/userId match this token
 *      record, `handleToken` skips the charge without a ledger round-trip.
 *      It is NOT the security boundary — the ledger idempotency key is.
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
