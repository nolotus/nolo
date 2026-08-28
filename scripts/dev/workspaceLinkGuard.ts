import { existsSync, lstatSync, readlinkSync, realpathSync } from "node:fs";
import { mkdir, readdir, realpath, rm, symlink } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

type PackageJson = {
  name?: string;
  workspaces?: string[] | { packages?: string[] };
};

type WorkspacePackage = {
  name: string;
  packageDir: string;
};

export type EnsureWorkspacePackageLinksResult = {
  linked: string[];
  repaired: string[];
  unchanged: string[];
};

function normalizePath(path: string) {
  const resolved = resolve(path);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function isInsideOrSame(path: string, parent: string) {
  const relativePath = relative(parent, path);
  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

function packageLinkPath(repoRoot: string, packageName: string) {
  return join(repoRoot, "node_modules", ...packageName.split("/"));
}

function relativeLinkTarget(linkPath: string, packageDir: string) {
  return relative(dirname(linkPath), packageDir) || ".";
}

async function readJson<T>(path: string): Promise<T> {
  return (await Bun.file(path).json()) as T;
}

export async function findRepoRoot(startPath = process.cwd()) {
  let current = resolve(startPath);
  while (true) {
    const packageJsonPath = join(current, "package.json");
    if (existsSync(packageJsonPath)) {
      const packageJson = await readJson<PackageJson>(packageJsonPath).catch(() => null);
      if (packageJson && getWorkspacePatterns(packageJson).length > 0) {
        return current;
      }
    }

    const parent = dirname(current);
    if (parent === current) {
      throw new Error(`Cannot find workspace root from ${startPath}`);
    }
    current = parent;
  }
}

function getWorkspacePatterns(packageJson: PackageJson) {
  if (Array.isArray(packageJson.workspaces)) return packageJson.workspaces;
  return packageJson.workspaces?.packages ?? [];
}

async function readWorkspacePackage(
  packageDir: string,
): Promise<WorkspacePackage | null> {
  const packageJsonPath = join(packageDir, "package.json");
  if (!existsSync(packageJsonPath)) return null;
  const packageJson = await readJson<PackageJson>(packageJsonPath);
  if (!packageJson.name) return null;
  return { name: packageJson.name, packageDir };
}

export async function findWorkspacePackages(repoRoot: string): Promise<WorkspacePackage[]> {
  const rootPackageJson = await readJson<PackageJson>(join(repoRoot, "package.json"));
  const packages: WorkspacePackage[] = [];
  const seen = new Set<string>();

  for (const pattern of getWorkspacePatterns(rootPackageJson)) {
    if (pattern.endsWith("/*")) {
      const workspaceParent = join(repoRoot, pattern.slice(0, -2));
      if (!existsSync(workspaceParent)) continue;

      const entries = await readdir(workspaceParent, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const workspacePackage = await readWorkspacePackage(join(workspaceParent, entry.name));
        if (!workspacePackage || seen.has(workspacePackage.name)) continue;
        seen.add(workspacePackage.name);
        packages.push(workspacePackage);
      }
      continue;
    }

    const workspacePackage = await readWorkspacePackage(join(repoRoot, pattern));
    if (!workspacePackage || seen.has(workspacePackage.name)) continue;
    seen.add(workspacePackage.name);
    packages.push(workspacePackage);
  }

  return packages;
}

function linkPointsToPackage(linkPath: string, packageDir: string) {
  if (!existsSync(linkPath)) return false;
  try {
    const stat = lstatSync(linkPath);
    if (!stat.isSymbolicLink() && !(process.platform === "win32" && stat.isDirectory())) {
      return false;
    }
    const actual = normalizePath(realpathSyncSafe(linkPath));
    const expected = normalizePath(resolve(packageDir));
    return actual === expected;
  } catch {
    return false;
  }
}

function realpathSyncSafe(path: string) {
  try {
    return realpathSync(path);
  } catch {
    // Fall back to resolving the symlink text when the target is temporarily missing.
    const raw = readlinkSync(path);
    return resolve(dirname(path), raw);
  }
}

async function replaceWithWorkspaceLink(linkPath: string, packageDir: string) {
  const desiredTarget = relativeLinkTarget(linkPath, packageDir);
  await mkdir(dirname(linkPath), { recursive: true });

  if (existsSync(linkPath)) {
    const stat = lstatSync(linkPath);
    const isLink = stat.isSymbolicLink();
    const isWindowsJunction =
      process.platform === "win32" && stat.isDirectory() && !stat.isSymbolicLink();

    if (!isLink && !isWindowsJunction) {
      throw new Error(
        `${linkPath} exists and is not a symlink/junction; refuse to replace it. Remove it and re-run workspace link ensure.`,
      );
    }

    await rm(linkPath, { recursive: true, force: true });
  }

  const linkType = process.platform === "win32" ? "junction" : "dir";
  await symlink(desiredTarget, linkPath, linkType);
}

/**
 * Materialize `node_modules/<workspace-pkg> -> packages/<pkg>` links inside this
 * checkout. This is the light worktree fix: third-party deps still walk up to a
 * parent install, but bare workspace specifiers stop resolving into another
 * checkout's package sources (the silent "fake green" failure mode).
 */
export async function ensureWorkspacePackageLinks(
  repoRootInput = process.cwd(),
): Promise<EnsureWorkspacePackageLinksResult> {
  const repoRoot = resolve(repoRootInput);
  const result: EnsureWorkspacePackageLinksResult = {
    linked: [],
    repaired: [],
    unchanged: [],
  };

  await mkdir(join(repoRoot, "node_modules"), { recursive: true });

  for (const workspacePackage of await findWorkspacePackages(repoRoot)) {
    const linkPath = packageLinkPath(repoRoot, workspacePackage.name);
    if (linkPointsToPackage(linkPath, workspacePackage.packageDir)) {
      result.unchanged.push(workspacePackage.name);
      continue;
    }

    const existed = existsSync(linkPath);
    await replaceWithWorkspaceLink(linkPath, workspacePackage.packageDir);
    if (existed) result.repaired.push(workspacePackage.name);
    else result.linked.push(workspacePackage.name);
  }

  return result;
}

export async function validateWorkspacePackageLinks(repoRootInput = process.cwd()) {
  const repoRoot = resolve(repoRootInput);
  const normalizedRepoRoot = normalizePath(await realpath(repoRoot));
  const errors: string[] = [];

  for (const workspacePackage of await findWorkspacePackages(repoRoot)) {
    const linkPath = packageLinkPath(repoRoot, workspacePackage.name);
    if (!existsSync(linkPath)) {
      errors.push(
        `${linkPath} is missing. Run: bun ./scripts/dev/workspaceLinkGuard.ts --ensure`,
      );
      continue;
    }

    const actualPath = normalizePath(await realpath(linkPath));
    const expectedPath = normalizePath(await realpath(workspacePackage.packageDir));
    if (!isInsideOrSame(actualPath, normalizedRepoRoot)) {
      errors.push(
        `${linkPath} points outside this checkout: ${actualPath}. Run: bun ./scripts/dev/workspaceLinkGuard.ts --ensure`,
      );
      continue;
    }

    if (actualPath !== expectedPath) {
      errors.push(
        `${linkPath} points at ${actualPath}, expected ${expectedPath}. Run: bun ./scripts/dev/workspaceLinkGuard.ts --ensure`,
      );
    }
  }

  return errors;
}

function formatEnsureSummary(result: EnsureWorkspacePackageLinksResult) {
  const parts = [
    `linked ${result.linked.length}`,
    `repaired ${result.repaired.length}`,
    `unchanged ${result.unchanged.length}`,
  ];
  return `Workspace package links ensured (${parts.join(", ")}).`;
}

if (import.meta.main) {
  const args = new Set(process.argv.slice(2));
  const shouldEnsure = args.has("--ensure") || !args.has("--check");
  const repoRoot = await findRepoRoot(process.cwd());

  if (shouldEnsure) {
    const result = await ensureWorkspacePackageLinks(repoRoot);
    if (result.linked.length > 0 || result.repaired.length > 0) {
      console.log(formatEnsureSummary(result));
    }
  }

  const errors = await validateWorkspacePackageLinks(repoRoot);
  if (errors.length > 0) {
    console.error(`Workspace package links are unsafe:\n${errors.join("\n")}`);
    process.exit(1);
  }
}
