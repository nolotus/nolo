const TOPIC_KEY_MAX_LENGTH = 128;
const TOPIC_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9._:-]{0,127})$/;

/**
 * Normalize and validate an optional explicit memory topicKey.
 * - undefined / null / whitespace-only string -> undefined (treated as omitted)
 * - trims and lowercases
 * - enforces length <= 128 and safe identifier characters [a-z0-9._:-] starting with [a-z0-9]
 */
export function normalizeTopicKey(
  raw: string | null | undefined,
): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "string") {
    throw new Error("rememberMemory: topicKey must be a string");
  }
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.length > TOPIC_KEY_MAX_LENGTH) {
    throw new Error(
      `rememberMemory: topicKey must be <= ${TOPIC_KEY_MAX_LENGTH} characters`,
    );
  }
  if (!TOPIC_KEY_PATTERN.test(normalized)) {
    throw new Error(
      "rememberMemory: topicKey must start with [a-z0-9] and only contain [a-z0-9._:-]",
    );
  }
  return normalized;
}
