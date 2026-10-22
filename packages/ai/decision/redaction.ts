const SECRET = /\b(?:bearer\s+|api[_-]?key[=: ]+|token[=: ]+|password[=: ]+)[^\s,;]+/gi;
const ABS_PATH = /(?:\/home\/[^\s"']+|\/Users\/[^\s"']+|[A-Za-z]:\\[^\s"']+)/g;
const INTERNAL_URL = /https?:\/\/(?:localhost|127\.0\.0\.1|[^/\s]+\.internal)(?:[^\s]*)/gi;
export function redactJudgmentText(value: string): string { return value.replace(SECRET, "[REDACTED_SECRET]").replace(ABS_PATH, "[REDACTED_PATH]").replace(INTERNAL_URL, "[REDACTED_INTERNAL_URL]"); }
