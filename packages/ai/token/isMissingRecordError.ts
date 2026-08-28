/**
 * Pure "missing record" error detector for Level/MemoryDB-backed token writers.
 *
 * Locality: one seam for "store.get threw because the key is absent" so billing
 * writers, credential registry, and provider-call pipelines share one definition
 * and cannot drift on LEVEL_NOT_FOUND / NOT_FOUND / NotFound message shapes.
 *
 * Keep dependency-free so pure unit tests do not pull store or writer modules.
 */
export function isMissingRecordError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as {
    code?: unknown;
    message?: unknown;
  };
  return (
    e.code === "LEVEL_NOT_FOUND" ||
    e.code === "NOT_FOUND" ||
    e.message === "NotFound"
  );
}
