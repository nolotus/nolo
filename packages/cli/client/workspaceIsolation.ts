import * as fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export type WorkspaceIsolation = {
  mode: "none" | "auto"; kind: "none" | "git-worktree" | "directory-snapshot";
  effectiveCwd: string; root?: string; sourceRoot?: string; branch?: string;
};
export class WorkspaceIsolationError extends Error {
  readonly code = "workspace_isolation_refused";
}
type Options = {
  baseCwd: string; runId: string; mode?: "none" | "auto"; readOnly?: boolean;
  noloHome?: string; platform?: NodeJS.Platform;
  maxFiles?: number; maxBytes?: number;
  execFile?: typeof execFileSync;
};
const dependencies = new Set(["node_modules", ".venv"]);
const refuse = (reason: string): never => { throw new WorkspaceIsolationError(`${reason}；请缩小到具体子文件夹后重试 workspaceIsolation:auto`); };

/** No fs/command calls on the default/read-only path. Isolation is not a security sandbox. */
export function prepareWorkspaceIsolation(options: Options): WorkspaceIsolation {
  const { baseCwd, runId, mode = "none", readOnly, platform = process.platform } = options;
  if (mode !== "auto" || readOnly === true) return { mode, kind: "none", effectiveCwd: baseCwd };
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(runId)) refuse("不安全的 runId");
  const exec = options.execFile ?? execFileSync;
  const command = (file: string, args: string[]) => String(exec(file, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000, env: { ...process.env, LC_ALL: "C", LANG: "C" } }));
  const source = fs.realpathSync(baseCwd);
  let repoRoot: string | undefined;
  try { repoRoot = command("git", ["-C", source, "rev-parse", "--show-toplevel"]).trim(); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // Without Git, inspect all ancestors: linked worktrees use a .git file,
      // regular repositories a directory. Neither may become a plain snapshot.
      for (let ancestor = source; ; ancestor = dirname(ancestor)) {
        try {
          fs.lstatSync(join(ancestor, ".git"));
          throw new WorkspaceIsolationError("检测到 Git 仓库，但 Git 命令未安装；请安装 Git 后重试");
        } catch (markerError) {
          if ((markerError as NodeJS.ErrnoException).code !== "ENOENT") throw markerError;
        }
        if (ancestor === dirname(ancestor)) break;
      }
    } else if (!String((error as { stderr?: unknown }).stderr).includes("not a git repository")) {
      // Timeout / permission errors are not proof of a non-Git directory.
      throw error;
    }
  }
  const linkDependencies = (from: string, to: string) => {
    for (const name of dependencies) {
      const target = join(from, name), link = join(to, name);
      try {
        if (fs.statSync(target).isDirectory() && !fs.existsSync(link)) fs.symlinkSync(target, link, platform === "win32" ? "junction" : "dir");
      } catch { /* Optional dependency mount; never replace existing entries. */ }
    }
  };
  if (repoRoot) {
    repoRoot = fs.realpathSync(repoRoot);
    const subRel = relative(repoRoot, source);
    if (isAbsolute(subRel) || subRel.split(/[\\/]/).includes("..")) refuse("目录不在仓库内");
    const shortId = createHash("sha256").update(runId).digest("hex").slice(0, 12);
    const commonDirOutput = command("git", ["-C", source, "rev-parse", "--git-common-dir"]).trim();
    const commonDir = fs.realpathSync(resolve(source, commonDirOutput));
    const worktreeHostRoot = basename(commonDir) === ".git" ? dirname(commonDir) : repoRoot;
    const root = join(worktreeHostRoot, ".worktrees", `run-${shortId}`), branch = `nolo/run-${shortId}`;
    if (platform === "win32" && root.length > 210) refuse("隔离目录路径过长");
    command("git", ["-C", repoRoot, "-c", "checkout.workers=0", "-c", "core.longpaths=true", "worktree", "add", root, "-b", branch, "HEAD"]);
    linkDependencies(repoRoot, root);
    if (worktreeHostRoot !== repoRoot) linkDependencies(worktreeHostRoot, root);
    return { mode, kind: "git-worktree", effectiveCwd: join(root, subRel), root, sourceRoot: repoRoot, branch };
  }
  if (source === dirname(source) || source === fs.realpathSync(homedir())) refuse("不能隔离文件系统根目录或用户主目录");
  let files = 0, bytes = 0, entries = 0;
  const scan = (dir: string, top: boolean, depth = 0) => {
    if (depth > 64) refuse("目录嵌套超过 64 层上限");
    const handle = fs.opendirSync(dir);
    try {
      let entry: fs.Dirent | null;
      while ((entry = handle.readSync())) {
        if (top && dependencies.has(entry.name)) continue;
        if (++entries > 4000) refuse("目录条目超过 4000 上限");
        const path = join(dir, entry.name), stat = fs.lstatSync(path);
        if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) refuse("普通业务目录含符号链接或特殊文件，不能安全复制");
        if (stat.isDirectory()) scan(path, false, depth + 1);
        else if (++files > (options.maxFiles ?? 2000) || (bytes += stat.size) > (options.maxBytes ?? 200 * 1024 * 1024)) refuse("目录超过文件数或总大小上限（2000 文件 / 200 MiB）");
      }
    } finally { handle.closeSync(); }
  };
  scan(source, true);
  const root = resolve(options.noloHome ?? join(homedir(), ".nolo"), "workspaces", runId);
  const rel = relative(source, root);
  if (!rel || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel))) refuse("快照目标不能位于源目录内");
  fs.mkdirSync(dirname(root), { recursive: true });
  fs.mkdirSync(root); // exclusive ownership: never merge into an existing snapshot
  try {
  for (const entry of fs.readdirSync(source)) {
    if (dependencies.has(entry)) continue;
    const from = join(source, entry), to = join(root, entry);
    let copied = false;
    try {
      if (platform === "darwin") { command("cp", ["-cR", from, to]); copied = true; }
      else if (platform === "linux") { command("cp", ["-a", "--reflink=always", "--", from, to]); copied = true; }
    } catch { /* Unsupported CoW: overwrite partial copied files with Node copy. */ }
    if (!copied) fs.cpSync(from, to, { recursive: true, force: true, dereference: false });
  }
  linkDependencies(source, root);
  } catch (error) {
    try { rollbackWorkspaceIsolation({ mode, kind: "directory-snapshot", effectiveCwd: root, root, sourceRoot: source }); }
    catch (cleanupError) { throw new AggregateError([error, cleanupError], `复制失败；隔离目录保留待处理: ${root}`); }
    throw error;
  }
  return { mode, kind: "directory-snapshot", effectiveCwd: root, root, sourceRoot: source };
}

/** Fail closed: only remove a task-owned unused workspace with a verified full source copy. */
export function rollbackWorkspaceIsolation(workspace: WorkspaceIsolation): void {
  const { root, sourceRoot, branch, kind } = workspace;
  if (!root || !sourceRoot) return;
  if (kind === "git-worktree") {
    const git = (args: string[]) => String(execFileSync("git", ["-C", sourceRoot, ...args], { encoding: "utf8" }));
    for (const name of dependencies) {
      const link = join(root, name), original = join(sourceRoot, name);
      if (!git(["-C", root, "ls-files", "--", name]).trim()) {
        try {
          if (fs.lstatSync(link).isSymbolicLink() && fs.realpathSync(link) === fs.realpathSync(original)) fs.unlinkSync(link);
        } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      }
    }
    if (git(["-C", root, "status", "--porcelain", "--ignored"]).trim()) throw new Error(`隔离目录含未验证内容，保留 ${root}`);
    execFileSync("git", ["-C", sourceRoot, "merge-base", "--is-ancestor", branch!, "HEAD"]);
    git(["worktree", "remove", root]);
    git(["branch", "-d", branch!]);
  } else if (kind === "directory-snapshot") {
    const verify = (path: string) => {
      for (const entry of fs.readdirSync(path)) {
        const target = join(path, entry), original = join(sourceRoot, relative(root, target));
        const stat = fs.lstatSync(target);
        if (path === root && dependencies.has(entry) && stat.isSymbolicLink() && fs.realpathSync(target) === fs.realpathSync(original)) continue;
        if (stat.isDirectory() && fs.statSync(original).isDirectory()) verify(target);
        else if (!stat.isFile() || !fs.statSync(original).isFile() || !fs.readFileSync(target).equals(fs.readFileSync(original))) throw new Error(`隔离副本有唯一内容，保留 ${root}`);
      }
    };
    verify(root);
    fs.rmSync(root, { recursive: true });
  }
}
