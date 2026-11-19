/** Single-node storage classification; callers walk causes, never display text. */
export function isLevelLockError(error: unknown): boolean {
  return typeof error === "object" && error !== null &&
    (error as { code?: unknown }).code === "LEVEL_LOCKED";
}
