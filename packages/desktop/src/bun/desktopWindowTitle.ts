import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type DesktopWindowTitleOptions = {
  packagedResourcesDir: string;
  isDev: boolean;
  developmentVersion: string;
  readFile?: (path: string) => string;
  pathExists?: (path: string) => boolean;
};

/** Resolve the displayed version from this installation, never from a newer source checkout. */
export const resolveDesktopWindowTitle = ({
  packagedResourcesDir,
  isDev,
  developmentVersion,
  readFile = (path) => readFileSync(path, "utf8"),
  pathExists = existsSync,
}: DesktopWindowTitleOptions): string => {
  const versionPath = join(packagedResourcesDir, "version.json");
  if (!pathExists(versionPath)) {
    if (isDev) return `Nolo Desktop · v${developmentVersion}`;
    throw new Error(`Desktop installation metadata is missing: ${versionPath}`);
  }

  let version: unknown;
  try {
    version = (JSON.parse(readFile(versionPath)) as { version?: unknown })
      .version;
  } catch (error) {
    throw new Error(
      `Desktop installation metadata is invalid: ${versionPath}`,
      { cause: error },
    );
  }
  if (typeof version !== "string" || !version.trim()) {
    throw new Error(
      `Desktop installation metadata has no valid version: ${versionPath}`,
    );
  }
  return `Nolo Desktop · v${version.trim()}`;
};
