/**
 * Shared pure HTTP status retry detector for outbound clients.
 *
 * Email providers (Resend, Cloudflare Email) and similar HTTP senders treat
 * rate-limits (`429`) and upstream failures (`status >= 500`) as retryable.
 * Keep one definition so retry eligibility cannot drift across adapters.
 *
 * Dependency-free so pure unit tests do not pull provider modules.
 */
export function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status >= 500;
}
