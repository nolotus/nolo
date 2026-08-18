/**
 * Shared LevelDB lifecycle error detector.
 *
 * When the DB or an iterator is closed mid-flight, Level surfaces:
 * - `error.code === "LEVEL_DATABASE_NOT_OPEN"`
 * - `error.code === "LEVEL_ITERATOR_NOT_OPEN"`
 *
 * Keep this pure and dependency-free so server handlers and schedulers can
 * share one definition for "store unavailable right now" without drifting.
 */
export function isLevelLifecycleError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  return (
    code === "LEVEL_DATABASE_NOT_OPEN" || code === "LEVEL_ITERATOR_NOT_OPEN"
  );
}
