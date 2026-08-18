// packages/core/retryAfterMs.ts
function normalizeNonNegativeMs(value, fallbackMs) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : Math.round(Number(fallbackMs)) || 0;
}
function parseRetryAfterHeaderMs(value, nowMs = Date.now()) {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) {
    if (seconds < 0) return null;
    return Math.round(seconds * 1e3);
  }
  const parsedDateMs = Date.parse(trimmed);
  if (Number.isFinite(parsedDateMs)) {
    return Math.max(0, parsedDateMs - nowMs);
  }
  return null;
}

// packages/app/utils/retryAfter.ts
var resolveRetryAfterMs = (headers, fallbackMs, bodyRetryAfterMs) => {
  const headerDelayMs = parseRetryAfterHeaderMs(headers?.get("Retry-After"));
  if (headerDelayMs !== null) return headerDelayMs;
  return normalizeNonNegativeMs(bodyRetryAfterMs, fallbackMs);
};

export {
  normalizeNonNegativeMs,
  parseRetryAfterHeaderMs,
  resolveRetryAfterMs
};
