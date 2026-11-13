import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { hostTaskEventsRoot, type HostTaskReference } from "./hostTaskEvents";
import { collectTaskRevisionEvidence } from "./taskRevisionEvidence";
import { taskContentRevision } from "./taskProgressEvidence";
export type HostTaskWorkspaceContext = {
  scope: HostTaskReference; baseline: string; taskPaths: string[]; revision: string;
};
export type HostTaskWorkspaceSnapshot = {
  version: 1; scope: HostTaskReference; repoRoot: string; baseline: string;
  taskPaths: string[]; existingDirtyPaths: string[]; status: "ready" | "blocked"; reason?: string;
};
export type HostTaskWorkspaceEvidence =
  | { status: "ready"; context: HostTaskWorkspaceContext }
  | { status: "blocked"; reason: string };
type Env = Record<string, string | undefined>;
function git(cwd: string, args: string[]) {
  const env = { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_NO_REPLACE_OBJECTS: "1" };
  for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR", "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES"]) delete (env as Record<string, unknown>)[key];
  return execFileSync("git", ["--no-optional-locks", ...args], { cwd, env, timeout: 15000, maxBuffer: 8 * 1024 * 1024, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
function pathFor(scope: HostTaskReference, env: Env) {
  return join(hostTaskEventsRoot(env), "workspace-snapshots", createHash("sha256").update(JSON.stringify([scope.taskId, resolve(scope.workspace), scope.dialogId])).digest("hex") + ".json");
}
/** Called before the first task write at trusted host admission. Immutable:
 * later review collects dirty task bytes against this original baseline. */
export function admitHostTaskWorkspace(scope: HostTaskReference, env: Env): HostTaskWorkspaceSnapshot {
  const path = pathFor(scope, env);
  try { return readHostTaskWorkspace(scope, env); } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const snapshot: HostTaskWorkspaceSnapshot = { version: 1, scope: { ...scope, workspace: resolve(scope.workspace) }, repoRoot: "", baseline: "", taskPaths: [], existingDirtyPaths: [], status: "blocked" };
  try {
    const cwd = realpathSync(scope.workspace);
    if (git(cwd, ["rev-parse", "--is-inside-work-tree"]).trim() !== "true") throw new Error("not_git_worktree");
    snapshot.repoRoot = realpathSync(git(cwd, ["rev-parse", "--show-toplevel"]).trim());
    if (cwd !== resolve(scope.workspace)) throw new Error("workspace_symlink_or_noncanonical");
    snapshot.baseline = git(cwd, ["rev-parse", "--verify", "HEAD^{commit}"]).trim();
    const sub = relative(snapshot.repoRoot, cwd).replaceAll("\\", "/");
    snapshot.taskPaths = [sub || "."];
    // Whole-worktree clean admission is deliberately conservative. Existing
    // staged/unstaged/untracked files anywhere cannot become task-owned bytes.
    const status = git(snapshot.repoRoot, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
    const rows = status.split("\0").filter(Boolean);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      snapshot.existingDirtyPaths.push(row.slice(3));
      if (row[0] === "R" || row[0] === "C" || row[1] === "R" || row[1] === "C") snapshot.existingDirtyPaths.push(rows[++i] ?? "");
    }
    if (snapshot.existingDirtyPaths.length) throw new Error("existing_dirty_paths_ownership_unknown");
    if (git(cwd, ["rev-parse", "HEAD"]).trim() !== snapshot.baseline) throw new Error("head_changed_during_admission");
    snapshot.status = "ready";
  } catch (e) { snapshot.reason = e instanceof Error ? e.message : "workspace_unavailable"; }
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, JSON.stringify(snapshot), { flag: "wx", mode: 0o600 });
  return snapshot;
}
export function readHostTaskWorkspace(scope: HostTaskReference, env: Env): HostTaskWorkspaceSnapshot {
  const path = pathFor(scope, env);
  if (lstatSync(path).isSymbolicLink() || realpathSync(path) !== resolve(path)) throw new Error("unsafe_workspace_snapshot_path");
  const s = JSON.parse(readFileSync(path, "utf8")) as HostTaskWorkspaceSnapshot;
  if (s.version !== 1 || s.scope.taskId !== scope.taskId || s.scope.dialogId !== scope.dialogId || s.scope.workspace !== resolve(scope.workspace) || s.scope.taskInstanceId !== scope.taskInstanceId) throw new Error("workspace_snapshot_scope_mismatch");
  return s;
}
/** Evidence production only, NOT a request to classify every child as review. */
export async function collectHostTaskWorkspace(scope: HostTaskReference, env: Env): Promise<HostTaskWorkspaceEvidence> {
  try {
    const s = readHostTaskWorkspace(scope, env);
    if (s.status !== "ready" || s.existingDirtyPaths.length) throw new Error(s.reason ?? "workspace_blocked");
    if (realpathSync(scope.workspace) !== s.scope.workspace || realpathSync(git(scope.workspace, ["rev-parse", "--show-toplevel"]).trim()) !== s.repoRoot) throw new Error("workspace_identity_changed");
    // Re-derive scope, do not trust widened taskPaths in a stale snapshot.
    const paths = [relative(s.repoRoot, s.scope.workspace).replaceAll("\\", "/") || "."];
    if (JSON.stringify(paths) !== JSON.stringify(s.taskPaths)) throw new Error("workspace_scope_changed");
    // An unrelated checkout/reset must not reuse this task's original baseline.
    git(scope.workspace, ["merge-base", "--is-ancestor", s.baseline, "HEAD"]);
    const evidence = await collectTaskRevisionEvidence({ cwd: scope.workspace, baseline: s.baseline, taskPaths: s.taskPaths });
    if (!evidence.complete || evidence.baseline.resolvedSha !== s.baseline) throw new Error("revision_incomplete");
    return { status: "ready", context: { scope, baseline: s.baseline, taskPaths: s.taskPaths, revision: taskContentRevision(evidence) } };
  } catch (e) { return { status: "blocked", reason: e instanceof Error ? e.message : "workspace_snapshot_missing" }; }
}
