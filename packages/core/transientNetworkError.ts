import { isAbortError } from "./abortError";

/**
 * Shared pure detector for transient HTTP client network failures.
 *
 * Fetch aborts (`AbortError`, often from AbortSignal.timeout) and connection
 * failures (`TypeError` under undici/Bun fetch) are the two shapes email and
 * other outbound HTTP clients treat as retryable. Keep one definition so
 * Resend, Cloudflare Email, and future callers cannot drift. Abort detection
 * reuses `isAbortError` so cancellation shapes cannot diverge.
 *
 * Dependency-free so pure unit tests do not pull provider modules.
 */
export function isTransientNetworkError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return isAbortError(error) || error instanceof TypeError;
}
