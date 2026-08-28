import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, posix, resolve, win32 } from "node:path";

const DESKTOP_APP_ID = "chat.nolo.desktop";
/** Max parents to walk when locating the monorepo root from a nested .app path. */
const MONOREPO_PUBLIC_WALK_MAX_DEPTH = 14;

type RuntimePathOptions = {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
};

export type DesktopPublicDirSource =
  | "env"
  | "monorepo-dev"
  | "installed"
  | "packaged";

export type ResolveDesktopPublicDirOptions = {
  isDev: boolean;
  /** Packaged Resources/app/public (production install path). */
  installedPublicDir: string;
  /** Electrobun views sibling public (dev bundle fallback). */
  packagedPublicDir: string;
  env?: NodeJS.ProcessEnv;
  /** Directories to walk upward when searching for monorepo public/. */
  searchFrom?: string[];
  /** Injectable for tests. Defaults to node:fs existsSync. */
  pathExists?: (path: string) => boolean;
};

export type ResolvedDesktopPublicDir = {
  publicDir: string;
  source: DesktopPublicDirSource;
};

export const resolveDesktopDataRoot = ({
  platform = process.platform,
  env = process.env,
  homeDir = homedir(),
}: RuntimePathOptions = {}) => {
  const pathApi = platform === "win32" ? win32 : posix;

  if (platform === "win32") {
    return env.LOCALAPPDATA?.trim() || pathApi.join(homeDir, "AppData", "Local");
  }

  if (platform === "darwin") {
    return pathApi.join(homeDir, "Library", "Application Support");
  }

  return env.XDG_DATA_HOME?.trim() || pathApi.join(homeDir, ".local", "share");
};

export const resolveDesktopChannelDir = (
  channel: string,
  options?: RuntimePathOptions
) => {
  const platform = options?.platform ?? process.platform;
  const pathApi = platform === "win32" ? win32 : posix;
  return pathApi.join(resolveDesktopDataRoot({ ...options, platform }), DESKTOP_APP_ID, channel);
};

export const resolveDesktopLlamaSupervisorLogDir = (
  channel: string,
  options?: RuntimePathOptions
) => {
  const platform = options?.platform ?? process.platform;
  const pathApi = platform === "win32" ? win32 : posix;
  return pathApi.join(
    resolveDesktopChannelDir(channel, { ...options, platform }),
    "logs",
    "llama-supervisor"
  );
};

/**
 * True when `dir` looks like bun-nolo monorepo root that owns a web `public/` tree.
 * Requires both latest-assets.json and packages/desktop so random public/ folders do not match.
 */
export const isMonorepoPublicRoot = (
  repoRoot: string,
  pathExists: (path: string) => boolean = existsSync
) =>
  pathExists(join(repoRoot, "public", "latest-assets.json")) &&
  pathExists(join(repoRoot, "packages", "desktop", "package.json"));

/**
 * Walk parents of each start path and return the first monorepo `public/` directory.
 * Used so channel=dev Desktop can serve live esDev/esBuild output instead of a stale
 * copy baked into Resources/app/public.
 */
export const findMonorepoPublicDir = (
  searchFrom: string[],
  pathExists: (path: string) => boolean = existsSync
): string | null => {
  const seen = new Set<string>();

  for (const start of searchFrom) {
    if (!start) continue;
    let dir = resolve(start);
    for (let depth = 0; depth < MONOREPO_PUBLIC_WALK_MAX_DEPTH; depth += 1) {
      if (seen.has(dir)) break;
      seen.add(dir);

      if (isMonorepoPublicRoot(dir, pathExists)) {
        return join(dir, "public");
      }

      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  return null;
};

/**
 * Walk parents of each start path and return the first matching bun-nolo monorepo root
 * (the directory that contains both `public/latest-assets.json` and
 * `packages/desktop/package.json`). Returns the repo root, not `public/`.
 *
 * Reuses `findMonorepoPublicDir` and strips the trailing `public` segment so
 * callers get a stable cwd target instead of a `public/` dir.
 */
export const findMonorepoRoot = (
  searchFrom: string[],
  pathExists: (path: string) => boolean = existsSync
): string | null => {
  const monorepoPublic = findMonorepoPublicDir(searchFrom, pathExists);
  if (!monorepoPublic) return null;
  return dirname(monorepoPublic);
};

/**
 * Resolve which static UI tree Desktop's embedded server should serve.
 *
 * Priority:
 * 1. NOLO_PUBLIC_DIR env (explicit override, any channel)
 * 2. channel=dev + monorepo public/ found by walk-up (live web build)
 *    — unless NOLO_DESKTOP_USE_PACKAGED_PUBLIC=1 forces packaged/installed assets
 * 3. non-dev: installed Resources/app/public when present
 * 4. packaged views-sibling public (Electrobun copy)
 */
export const resolveDesktopPublicDir = ({
  isDev,
  installedPublicDir,
  packagedPublicDir,
  env = process.env,
  searchFrom = [],
  pathExists = existsSync,
}: ResolveDesktopPublicDirOptions): ResolvedDesktopPublicDir => {
  const override = env.NOLO_PUBLIC_DIR?.trim();
  if (override) {
    const resolvedOverride = resolve(override);
    if (pathExists(resolvedOverride)) {
      return { publicDir: resolvedOverride, source: "env" };
    }
  }

  const forcePackaged = env.NOLO_DESKTOP_USE_PACKAGED_PUBLIC === "1";

  if (isDev && !forcePackaged) {
    const monorepoPublic = findMonorepoPublicDir(
      [
        ...searchFrom,
        packagedPublicDir,
        installedPublicDir,
        process.cwd(),
      ].filter(Boolean),
      pathExists
    );
    if (monorepoPublic) {
      return { publicDir: monorepoPublic, source: "monorepo-dev" };
    }
  }

  if (!isDev && pathExists(installedPublicDir)) {
    return { publicDir: resolve(installedPublicDir), source: "installed" };
  }

  return { publicDir: resolve(packagedPublicDir), source: "packaged" };
};
