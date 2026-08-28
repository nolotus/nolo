export const OPEN_SOURCE_PACKAGE_OVERLAY = {
  repository: {
    type: "git",
    url: "git+https://github.com/nolotus/nolo.git",
  },
  bugs: {
    url: "https://github.com/nolotus/nolo/issues",
  },
  homepage: "https://github.com/nolotus/nolo#readme",
  scripts: {
    test: "bun test",
    "pack:dry-run": "npm pack --dry-run",
  },
} as const;

export function applyOpenSourcePackageOverlay(
  manifest: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...manifest,
    repository: OPEN_SOURCE_PACKAGE_OVERLAY.repository,
    bugs: OPEN_SOURCE_PACKAGE_OVERLAY.bugs,
    homepage: OPEN_SOURCE_PACKAGE_OVERLAY.homepage,
    scripts: { ...OPEN_SOURCE_PACKAGE_OVERLAY.scripts },
  };
}