/**
 * Shared pure filesystem "path missing" detector.
 *
 * Node/Bun file reads surface missing paths as:
 * - `error.code === "ENOENT"` (errno/name may also carry ENOENT)
 * - message text matching ENOENT / "no such file" / "not exist"
 *
 * Keep one definition so apply-edit handlers and future FS readers
 * cannot drift on missing-path handling.
 *
 * Dependency-free so pure unit tests do not pull server handler modules.
 */
export function isFsNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as {
    code?: unknown;
    errno?: unknown;
    name?: unknown;
    message?: unknown;
  };
  const code = e.code ?? e.errno ?? e.name;
  if (code === "ENOENT") return true;
  const msg = String(e.message ?? "");
  return /ENOENT|no such file|not exist/i.test(msg);
}
