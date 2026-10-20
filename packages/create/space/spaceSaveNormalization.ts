/** Write-time compatibility cleanup. Reads stay tolerant of legacy records. */

export interface SpaceSavePatch {
  /** The patch payload actually submitted to the database. */
  changes: Record<string, unknown>;
  /** True when a legacy Space folder was detected and removed by this patch. */
  hasLegacyCleanup: boolean;
}

/**
 * Space no longer owns a local working directory — the desktop cwd comes from
 * the Project bound to the Dialog. Any `boundFolder` still present on a legacy
 * record is stripped on the next save: the database patch protocol uses `null`
 * to REMOVE a key, not to persist null.
 */
export function normalizeSpaceSavePatch(
  previous: { boundFolder?: string | null },
  changes: Record<string, unknown>,
): SpaceSavePatch {
  const { boundFolder: _ignored, ...safeChanges } = changes;
  const hasLegacyCleanup =
    Object.prototype.hasOwnProperty.call(previous, "boundFolder") &&
    (previous.boundFolder ?? null) !== null;
  return {
    changes: hasLegacyCleanup ? { ...safeChanges, boundFolder: null } : safeChanges,
    hasLegacyCleanup,
  };
}
