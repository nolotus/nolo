import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Best-effort root-.gitignore parity for JS fallbacks (search / glob collect).
 *
 * Deliberately NOT a full Git ignore engine. Supported subset:
 * - only the workspace ROOT `.gitignore` is consulted (nested per-directory
 *   files, `.git/info/exclude` and global `core.excludesFile` are not read;
 *   ripgrep/grep remain the source of truth for full semantics);
 * - comment (`#`) and negation (`!`) lines are skipped, so a negated pattern
 *   can never re-include an already-ignored file;
 * - a `dir/` line becomes `dir/**`, covering the directory itself and
 *   everything beneath it;
 * - a bare directory-style pattern without globstar or trailing slash
 *   (`build-output`) also matches files beneath it (`build-output/**`); Git
 *   would additionally ignore a *file* with that exact name, which the
 *   caller's basename fallback covers;
 * - unanchored patterns (after stripping a leading `/`) match at any depth.
 *
 * Callers combine these patterns with their own glob matcher and must pass
 * `includeIgnored` through: when true, ignore filtering is skipped entirely.
 */
function isIgnorableFsError(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: string }).code;
    return code === "ENOENT" || code === "ENOTDIR";
  }
  return false;
}

export async function readRootGitignorePatterns(workspaceRoot: string): Promise<string[]> {
  let content: string;
  try {
    content = await readFile(resolve(workspaceRoot, ".gitignore"), "utf8");
  } catch (err) {
    if (isIgnorableFsError(err)) return [];
    throw err;
  }
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("!"))
    .flatMap((line) => {
      const unanchored = line.replace(/^\//, "");
      // dir/ → everything beneath it.
      if (unanchored.endsWith("/")) return [`${unanchored}**`];
      // Already a globstar pattern → use as-is.
      if (unanchored.includes("**")) return [unanchored];
      // Bare or path-style pattern: match the exact entry itself AND
      // everything beneath it (git treats a matching directory as ignoring
      // its contents; a matching file is ignored directly).
      return [unanchored, `${unanchored}/**`];
    });
}

export async function hasRootGitignore(workspaceRoot: string): Promise<boolean> {
  try {
    await stat(resolve(workspaceRoot, ".gitignore"));
    return true;
  } catch (err) {
    if (isIgnorableFsError(err)) return false;
    throw err;
  }
}