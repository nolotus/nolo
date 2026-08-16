export const FETCH_RETRY_BASE_MS = 1200;
export const FETCH_RETRY_MAX_MS = 15000;
export const FETCH_RETRY_JITTER_MS = 600;

export const calculateRetryDelayMs = (
  attempt: number,
  randomValue: number
) => {
  const safeAttempt = Math.max(1, Math.min(attempt, 6));
  const exponentialDelay = Math.min(
    FETCH_RETRY_MAX_MS,
    FETCH_RETRY_BASE_MS * 2 ** (safeAttempt - 1)
  );
  const jitter = Math.floor(
    Math.max(0, Math.min(randomValue, 0.9999)) * FETCH_RETRY_JITTER_MS
  );
  return exponentialDelay + jitter;
};

