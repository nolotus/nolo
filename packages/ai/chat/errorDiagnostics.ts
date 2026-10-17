/** Shared trust boundary: only structured fields, never parse an error message/body. */
export type SafeErrorDiagnostics = Record<string, string | number>;
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};

export function httpOrigin(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : undefined;
  } catch { return undefined; }
}

const identifier = (value: unknown, max = 160): string | undefined =>
  typeof value === "string" && value.length <= max &&
  /^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/.test(value) &&
  !value.includes("://") && !/^(sk-|Bearer|AIza)/i.test(value) ? value : undefined;

export function sanitizeErrorDiagnostics(value: unknown): SafeErrorDiagnostics | undefined {
  const input = record(value);
  const out: SafeErrorDiagnostics = {};
  for (const key of ["requestId", "provider", "model", "code"] as const) {
    const safe = identifier(input[key], key === "code" ? 80 : 160);
    if (safe) out[key] = safe;
  }
  if (typeof input.releaseSha === "string" && /^[a-fA-F0-9]{7,64}$/.test(input.releaseSha)) out.releaseSha = input.releaseSha;
  const origin = httpOrigin(input.requestOrigin);
  if (origin) out.requestOrigin = origin;
  if (["found", "not_found", "invalid_record", "lookup_error", "not_requested"].includes(input.lookupStatus as string)) out.lookupStatus = input.lookupStatus as string;
  if (typeof input.status === "number" && Number.isInteger(input.status) && input.status >= 100 && input.status <= 599) out.status = input.status;
  if (["config_protocol", "empty", "policy", "transient"].includes(input.category as string)) out.category = input.category as string;
  return Object.keys(out).length ? out : undefined;
}

/** Input is a decoded API envelope (or structured thrown error), not raw text. */
export function extractErrorDiagnostics(value: unknown, status?: number): SafeErrorDiagnostics | undefined {
  const envelope = record(value);
  const error = record(envelope.error ?? value);
  const diagnostics = record(record(error.details).diagnostics);
  return sanitizeErrorDiagnostics({ ...diagnostics, code: error.code, status: status ?? error.status });
}
