const SENSITIVE_KEY_PATTERN =
  /^(authorization|cookie|set-cookie|x-csrf-token|csrf|ct0|auth_token|token|access_token|refresh_token|secret)$/i;

const SENSITIVE_STRING_PATTERN =
  /\b(Bearer\s+[A-Za-z0-9._~+/=-]+|auth_token=[^;\s]+|ct0=[^;\s]+)\b/i;

export function redactXReaderValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactXReaderValue(item));
  }

  if (value && typeof value === "object") {
    const redacted: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      redacted[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? "[REDACTED]"
        : redactXReaderValue(child);
    }
    return redacted;
  }

  if (typeof value === "string" && SENSITIVE_STRING_PATTERN.test(value)) {
    return "[REDACTED]";
  }

  return value;
}
