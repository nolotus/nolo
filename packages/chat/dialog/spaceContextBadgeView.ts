/**
 * Pure display projection for the Space context badge.
 *
 * The badge answers one question: "which Space does this surface belong to, and
 * which folder is bound to that Space?" It deliberately keeps the Space binding
 * separate from the dialog's actual execution cwd — a Space-bound folder must
 * never be painted as if it were the cwd, and an explicit per-dialog cwd
 * override is projected as its own segment so the two can be told apart.
 *
 * No React, no store, no storage access: every input is passed in so the rules
 * are unit-testable and the component stays a thin renderer.
 */

export interface SpaceContextFolderView {
  /** Basename of the folder, safe to render truncated. */
  name: string;
  /** Full path, used for the title tooltip. */
  path: string;
}

export interface SpaceContextView {
  /** Resolved Space name, or null when it must not be shown. */
  spaceName: string | null;
  /** The Space's device-local bound folder, when one exists. */
  spaceFolder: SpaceContextFolderView | null;
  /**
   * The dialog's actual execution cwd, only when it is an explicit override
   * that differs from the Space binding. Never derived from the Space folder.
   */
  cwdFolder: SpaceContextFolderView | null;
}

const trimPath = (value: string): string => value.trim().replace(/[\\/]+$/, "");

/** Basename of an absolute folder path, tolerant of a trailing slash. */
export function folderBasename(path: string): string {
  const clean = trimPath(path);
  if (!clean) return "";
  const parts = clean.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || clean;
}

const toFolder = (path: string): SpaceContextFolderView | null => {
  const clean = trimPath(path);
  if (!clean) return null;
  return { name: folderBasename(clean), path: clean };
};

/**
 * Project raw inputs into the display model.
 *
 * Rules:
 * - no explicit Space name → `spaceName` null (never invent a name);
 * - the Space's bound folder is shown as its own segment;
 * - `cwd` is shown only when it is an explicit override AND differs from the
 *   Space binding, so the Space folder is never misread as the cwd.
 */
export function projectSpaceContextView(
  spaceName: string | null | undefined,
  spaceFolderPath: string | null,
  cwdPath: string | null,
  cwdIsOverride: boolean,
): SpaceContextView {
  const name = typeof spaceName === "string" ? spaceName.trim() : "";
  const spaceFolder = spaceFolderPath ? toFolder(spaceFolderPath) : null;
  const cwdFolder =
    cwdIsOverride && cwdPath && trimPath(cwdPath) !== trimPath(spaceFolderPath ?? "")
      ? toFolder(cwdPath)
      : null;
  return { spaceName: name || null, spaceFolder, cwdFolder };
}
