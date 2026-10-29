/**
 * Workspace path containment guard — the realpath boundary shared by every
 * host-side, path-taking workspace tool.
 *
 * Why this exists: the lexical containment check (`resolve` + `relative`) that
 * guarded external file access does NOT survive symlinks. `ln -s
 * /root/.nolo/credentials x` inside the workspace produces a path that is
 * lexically inside the workspace and physically outside it; the lexical check
 * passes, the `fs` call follows the link, and a host-side tool running with the
 * user's privileges reads (or overwrites) whatever the link points at. The
 * same holds for every missing component of a write target: the deepest
 * existing ancestor may be a symlink pointing out of the workspace, so the new
 * file is created outside it.
 *
 * Contract:
 * - containment is decided on `realpath` of the target, and, for targets that
 *   do not exist yet (writeFile/create), on `realpath` of the deepest existing
 *   ancestor with the remaining segments re-appended;
 * - the workspace root is resolved the same way, so symlinked parents (macOS
 *   `/var` → `/private/var`, a symlinked checkout) never produce false
 *   positives;
 * - a path that is lexically inside the workspace but physically outside is
 *   rejected outright (`path_outside_workspace`) — no confirmation prompt can
 *   make that safe, because the prompt would be showing the agent's harmless
 *   looking path while the real target stays hidden;
 * - paths that are lexically outside stay the caller's business (the
 *   external-access confirmation flow), so this guard does not change the
 *   deliberate "read a file outside the workspace" feature;
 * - rejections never echo a resolved host path back to the caller — only the
 *   request the caller itself supplied.
 *
 * TOCTOU: a check-then-open sequence on a mutable path is racy by construction.
 * `readGuardApprovedFile` / `writeGuardApprovedFile` /
 * `writeGuardApprovedBinaryFile` close that window by re-checking containment
 * on the *opened file descriptor* (`/proc/self/fd/N`, `/dev/fd/N`) before any
 * byte is read or written, instead of trusting the pre-open verdict. Writes
 * additionally open with `O_NOFOLLOW` and, on platforms with fd→path links,
 * create directories relative to a *pinned parent descriptor*, so a component
 * swapped for a symlink after the check cannot redirect the create at all.
 * Two limits remain and are not papered over:
 * - where the platform exposes no fd→path link (Windows), only the pre-open
 *   checks apply and the window stays open;
 * - a directory *renamed* out of the workspace after it was pinned still
 *   receives the new entries (the constructor is inside the workspace when it
 *   is pinned, but a rename is not a swap and cannot be undone by a check).
 */
import { constants as fsConstants } from "node:fs";
import { lstat, mkdir, open, readlink, realpath } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

/** Machine-readable reasons the guard turns a request down. */
export type WorkspacePathRejection = "path_outside_workspace" | "path_unresolvable";

export type WorkspacePathGuardFailure = {
  ok: false;
  error: WorkspacePathRejection;
  /** Echo of the caller's own request — never a resolved host path. */
  target: string;
};

export type WorkspacePathGuardSuccess = {
  ok: true;
  /** The caller's request, for diagnostics/error echo. */
  requested: string;
  /** Path to hand to `fs` calls. Unchanged from the caller's lexical path unless
   * the caller (e.g. the trusted spill flow) overrides it with a canonical one. */
  path: string;
  /** Fully resolved physical path (nearest-existing-ancestor for missing tails). */
  realPath: string;
  /** Whether the path itself existed when resolved (false = create target). */
  exists: boolean;
  /** Caller's policy verdict for the requested path (lexical containment). */
  lexicalInside: boolean;
  /** Whether the physical path stays inside the physical workspace root. */
  insideWorkspace: boolean;
  /** Roots the *opened file's* physical path must stay within (fd re-check). */
  allowedRoots: readonly string[];
};

export type WorkspacePathGuardResult = WorkspacePathGuardSuccess | WorkspacePathGuardFailure;

/**
 * Containment test that is correct at the boundary: `relative()` yields `..`
 * only for a real parent step, so `/ws` vs `/ws-evil`, `/ws` vs `/ws/../ws-evil`
 * and `/ws` vs `/ws/..foo` are all decided without a naked `startsWith`.
 */
export function isPathInsideRoot(root: string, targetPath: string): boolean {
  const rel = relative(resolve(root), resolve(targetPath));
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function isNotFoundError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "ENOENT" || code === "ENOTDIR";
}

/**
 * `realpath` that tolerates a not-yet-existing tail: resolve the deepest
 * existing ancestor physically, then re-append the remaining segments. Used for
 * the "write a file that does not exist" case, where a plain `realpath` throws
 * and a lexical fallback would hide exactly the symlinked-ancestor escape this
 * guard is about.
 *
 * Returns null when the path cannot be resolved for any reason other than
 * absence (symlink loop, permissions, ...): containment is then unknown.
 */
async function realpathAllowMissing(
  targetPath: string
): Promise<{ realPath: string; exists: boolean } | null> {
  const tail: string[] = [];
  let current = resolve(targetPath);
  for (;;) {
    try {
      const real = await realpath(current);
      return {
        realPath: tail.length === 0 ? real : join(real, ...tail.slice().reverse()),
        exists: tail.length === 0,
      };
    } catch (error) {
      if (!isNotFoundError(error)) return null;
      const parent = dirname(current);
      // Reached the filesystem root without finding anything that exists.
      if (parent === current) return null;
      tail.push(basename(current));
      current = parent;
    }
  }
}

/**
 * Single source of truth for "is this path safe to touch".
 *
 * `targetPath` must already be the absolute path the caller intends to open
 * (i.e. the output of `resolveRequestedWorkspacePath`, which owns `~`
 * expansion). `requestedPath` is only used for diagnostics.
 */
export async function resolveWorkspaceSafePath(args: {
  workspaceRoot: string;
  targetPath: string;
  requestedPath?: string;
  /** Caller's policy verdict; defaults to lexical containment of targetPath. */
  lexicalInside?: boolean;
}): Promise<WorkspacePathGuardResult> {
  const requested = args.requestedPath ?? args.targetPath;
  const lexicalRoot = resolve(args.workspaceRoot);
  const targetPath = resolve(args.targetPath);
  const lexicalInside = args.lexicalInside ?? isPathInsideRoot(lexicalRoot, targetPath);

  const [physicalRoot, resolved] = await Promise.all([
    realpath(lexicalRoot).catch(() => null),
    realpathAllowMissing(targetPath),
  ]);

  if (resolved === null) {
    // Containment is unprovable. Inside the workspace that is a fail-closed
    // rejection; outside it the caller's external-access flow still decides, so
    // pre-existing external behaviour is untouched.
    return lexicalInside
      ? { ok: false, error: "path_unresolvable", target: requested }
      : {
          ok: true,
          requested,
          path: targetPath,
          realPath: targetPath,
          exists: false,
          lexicalInside,
          insideWorkspace: false,
          allowedRoots: [targetPath],
        };
  }

  if (physicalRoot === null) {
    // The workspace root itself cannot be resolved (unreadable/deleted): there
    // is nothing to compare symlinks against, so fall back to the caller's
    // lexical verdict instead of rejecting every request.
    return {
      ok: true,
      requested,
      path: targetPath,
      realPath: resolved.realPath,
      exists: resolved.exists,
      lexicalInside,
      insideWorkspace: lexicalInside,
      allowedRoots: [lexicalRoot],
    };
  }

  const insideWorkspace = isPathInsideRoot(physicalRoot, resolved.realPath);
  if (lexicalInside && !insideWorkspace) {
    // Symlink escape: lexically inside, physically outside.
    return { ok: false, error: "path_outside_workspace", target: requested };
  }

  return {
    ok: true,
    requested,
    path: targetPath,
    realPath: resolved.realPath,
    exists: resolved.exists,
    lexicalInside,
    insideWorkspace,
    allowedRoots: insideWorkspace ? [physicalRoot] : [resolved.realPath],
  };
}

/** Turn a guard failure into a throwable with a machine-readable `code`. */
export function workspacePathGuardError(
  failure: WorkspacePathGuardFailure,
  /** Extra operator-facing note appended to the message (never a resolved path). */
  note?: string
): Error & { code: WorkspacePathRejection; target: string } {
  const detail = failure.error === "path_outside_workspace"
    ? `${failure.error}: ${failure.target} (resolves outside the workspace boundary)`
    : `${failure.error}: ${failure.target} (cannot be resolved to a physical path)`;
  const error = new Error(note ? `${detail} — ${note}` : detail) as Error & { code: WorkspacePathRejection; target: string };
  error.code = failure.error;
  error.target = failure.target;
  return error;
}

const FD_LINK_ROOTS = ["/proc/self/fd", "/dev/fd"] as const;

/** `O_NOFOLLOW` is POSIX-only; `O_DIRECTORY` likewise. */
const O_NOFOLLOW = (fsConstants as { O_NOFOLLOW?: number }).O_NOFOLLOW ?? 0;
const O_DIRECTORY = (fsConstants as { O_DIRECTORY?: number }).O_DIRECTORY ?? 0;

/**
 * Physical path of an already-opened file. Read off the fd, so it reflects the
 * file actually opened rather than the path we asked for.
 */
async function resolveOpenedFilePath(handle: FileHandle): Promise<string | null> {
  for (const root of FD_LINK_ROOTS) {
    try {
      const linked = await readlink(`${root}/${handle.fd}`);
      if (isAbsolute(linked)) return linked.replace(/ \(deleted\)$/, "");
    } catch {
      // Platform without fd path links — try the next candidate.
    }
  }
  return null;
}

function assertPathInsideApproval(physicalPath: string, guard: WorkspacePathGuardSuccess): void {
  if (guard.allowedRoots.some((root) => isPathInsideRoot(root, physicalPath))) return;
  throw workspacePathGuardError({
    ok: false,
    error: "path_outside_workspace",
    target: guard.requested,
  });
}

async function assertOpenedFileInsideApproval(
  handle: FileHandle,
  guard: WorkspacePathGuardSuccess
): Promise<void> {
  const openedPath = await resolveOpenedFilePath(handle);
  // No fd→path link on this platform: the pre-open verdict is the only defense
  // and the TOCTOU window stays open (see the module comment).
  if (openedPath === null) return;
  assertPathInsideApproval(openedPath, guard);
}

/** Read a UTF-8 text file, re-verifying containment on the opened descriptor. */
export async function readGuardApprovedFile(guard: WorkspacePathGuardSuccess): Promise<string> {
  const handle = await open(guard.path, "r");
  try {
    await assertOpenedFileInsideApproval(handle, guard);
    return await handle.readFile({ encoding: "utf8" });
  } finally {
    await handle.close();
  }
}

/**
 * Create the directory described by an already-approved guard.
 *
 * `mkdir` is a write of its own and cannot ride on the file approval:
 * `writeFile({path: "../../evil/x"})` would otherwise create arbitrary
 * directory trees wherever the process can write, and
 * `mkdir({recursive:true})` silently walks through any existing symlink
 * component, so a directory request that is lexically inside the workspace can
 * materialize physically outside it. Pre-check refuses a target that already
 * resolves outside the approved roots (nothing gets created); the missing tail
 * is then built one component at a time relative to a *pinned* parent
 * descriptor (`createMissingDirectoryChain`), which is what closes the
 * check-then-create window instead of merely detecting the damage; post-check
 * and the fd check (platforms with fd→path links) verify the directory that was
 * actually produced.
 */
export async function ensureGuardApprovedDirectory(
  guard: WorkspacePathGuardSuccess
): Promise<void> {
  const before = await realpathAllowMissing(guard.path);
  if (before === null) {
    throw workspacePathGuardError({
      ok: false,
      error: "path_unresolvable",
      target: guard.requested,
    });
  }
  assertPathInsideApproval(before.realPath, guard);
  let createdByPinnedWalk = false;
  if (!before.exists) {
    createdByPinnedWalk = await createMissingDirectoryChain(guard);
  }
  const after = await realpathAllowMissing(guard.path);
  if (after === null) {
    throw workspacePathGuardError({
      ok: false,
      error: "path_unresolvable",
      target: guard.requested,
    });
  }
  if (!guard.allowedRoots.some((root) => isPathInsideRoot(root, after.realPath))) {
    // The chain is already on disk at this point: say so instead of implying the
    // rejection was clean, because a moved/swapped component may have left
    // empty directories outside the workspace that a human has to clean up.
    throw workspacePathGuardError(
      { ok: false, error: "path_outside_workspace", target: guard.requested },
      createdByPinnedWalk
        ? "directory creation had already run; verify the filesystem for empty directories created outside the workspace"
        : "directory creation had already run for a path component swapped during the operation"
    );
  }
  let handle: FileHandle;
  try {
    handle = await open(guard.path, "r");
  } catch {
    // Platform that cannot open a directory handle (Windows): the pre/post
    // realpath verdicts above are the whole defense.
    return;
  }
  try {
    await assertOpenedFileInsideApproval(handle, guard);
  } finally {
    await handle.close();
  }
}

/** Open `dirPath` and prove the *inode* it names is inside the approved roots. */
async function openPinnedDirectory(
  dirPath: string,
  guard: WorkspacePathGuardSuccess
): Promise<{ handle: FileHandle; fdRoot: string } | null> {
  let handle: FileHandle;
  try {
    handle = await open(dirPath, fsConstants.O_RDONLY | O_DIRECTORY);
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
  try {
    await assertOpenedFileInsideApproval(handle, guard);
  } catch (error) {
    await handle.close();
    throw error;
  }
  // A platform that can open the directory but cannot address children through
  // the descriptor (`/dev/fd/N/name` on macOS) falls back to path-based mkdir.
  for (const root of FD_LINK_ROOTS) {
    let probe: FileHandle | undefined;
    try {
      probe = await open(`${root}/${handle.fd}`, fsConstants.O_RDONLY);
      return { handle, fdRoot: root };
    } catch {
      // try the next fd space
    } finally {
      await probe?.close();
    }
  }
  await handle.close();
  return null;
}

/**
 * Build the not-yet-existing tail of `guard.path`, one component at a time,
 * every `mkdir` resolved against a descriptor of the directory that already
 * existed when we started.
 *
 * This is the difference between *detecting* and *preventing* the escape:
 * `mkdir(path, {recursive:true})` re-resolves the whole path text at once, so a
 * parent swapped for a symlink after the containment check silently creates the
 * chain outside the workspace — and the rejection arrives afterwards, with the
 * directories already there. Creating each component through a pinned parent
 * makes the OS resolve the new name against that inode, so a swapped path
 * component is irrelevant.
 *
 * Returns false when the platform cannot address children through an fd (the
 * caller then knows the chain was built by the racy path and says so on
 * rejection).
 */
async function createMissingDirectoryChain(guard: WorkspacePathGuardSuccess): Promise<boolean> {
  const missing: string[] = [];
  let existing = resolve(guard.path);
  for (;;) {
    try {
      await lstat(existing);
      break;
    } catch (error) {
      if (!isNotFoundError(error)) throw error;
      const parent = dirname(existing);
      if (parent === existing) {
        throw workspacePathGuardError({
          ok: false,
          error: "path_unresolvable",
          target: guard.requested,
        });
      }
      missing.push(existing);
      existing = parent;
    }
  }
  // Only workspace-internal chains get the pinned walk: an externally approved
  // directory has exactly itself as its allowed root, so its ancestors are not
  // ours to pin (and the user already approved that specific location).
  if (!guard.insideWorkspace) {
    await mkdir(guard.path, { recursive: true });
    return false;
  }
  let pinned = await openPinnedDirectory(existing, guard);
  if (pinned === null) {
    await mkdir(guard.path, { recursive: true });
    return false;
  }
  try {
    for (const target of missing.slice().reverse()) {
      const name = basename(target);
      if (!name || name === "." || name === "..") {
        throw workspacePathGuardError({
          ok: false,
          error: "path_unresolvable",
          target: guard.requested,
        });
      }
      const childPath = `${pinned.fdRoot}/${pinned.handle.fd}/${name}`;
      try {
        await mkdir(childPath);
      } catch (error) {
        // A concurrent creator won the race; the fd check below still decides
        // whether the directory we ended up with is inside the workspace.
        if ((error as NodeJS.ErrnoException | undefined)?.code !== "EEXIST") throw error;
      }
      const child = await open(childPath, fsConstants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW);
      try {
        await assertOpenedFileInsideApproval(child, guard);
      } catch (error) {
        await child.close();
        throw error;
      }
      await pinned.handle.close();
      pinned = { handle: child, fdRoot: pinned.fdRoot };
    }
  } finally {
    await pinned.handle.close();
  }
  return true;
}

/**
 * Open the write handle for an approved path. `O_NOFOLLOW` makes the final
 * component non-redirectable: a symlink there fails with `ELOOP` instead of
 * creating/truncating whatever it points at (without it, a *dangling* link
 * reads as "path does not exist" to the realpath resolution above and
 * `open(O_CREAT)` then materializes the file outside the workspace before the
 * fd check can reject).
 */
async function openGuardApprovedWriteHandle(
  guard: WorkspacePathGuardSuccess
): Promise<FileHandle> {
  let info;
  try {
    info = await lstat(guard.path);
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
    info = null;
  }
  if (info?.isSymbolicLink()) {
    throw workspacePathGuardError({
      ok: false,
      error: "path_outside_workspace",
      target: guard.requested,
    });
  }
  try {
    return await open(
      guard.path,
      fsConstants.O_WRONLY | fsConstants.O_CREAT | O_NOFOLLOW,
      0o666
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ELOOP") {
      // Final component became a symlink between the lstat and the open.
      throw workspacePathGuardError({
        ok: false,
        error: "path_outside_workspace",
        target: guard.requested,
      });
    }
    throw error;
  }
}

async function writeGuardApprovedBytes(
  guard: WorkspacePathGuardSuccess,
  content: string | Uint8Array
): Promise<void> {
  const handle = await openGuardApprovedWriteHandle(guard);
  try {
    // Truncation happens only after the fd is known to be inside the approved
    // roots, so a target swapped for an external symlink is rejected rather
    // than damaged.
    await assertOpenedFileInsideApproval(handle, guard);
    await handle.truncate(0);
    if (typeof content === "string") {
      await handle.writeFile(content, { encoding: "utf8" });
    } else {
      await handle.writeFile(content);
    }
  } finally {
    await handle.close();
  }
}

/**
 * Write a UTF-8 text file, verifying the opened descriptor before truncating.
 * `O_TRUNC` is intentionally absent from the open flags: truncation happens
 * only after the fd is known to be inside the approved roots, so a target
 * swapped for an external symlink is rejected without damaging it.
 */
export async function writeGuardApprovedFile(
  guard: WorkspacePathGuardSuccess,
  content: string
): Promise<void> {
  await writeGuardApprovedBytes(guard, content);
}

/**
 * Binary counterpart of `writeGuardApprovedFile`, for outputs that are produced
 * somewhere other than the caller's own code (a rendered screenshot): the bytes
 * exist only after a long-running render, so the write has to happen here, with
 * its own fd verification, rather than in the producer.
 */
export async function writeGuardApprovedBinaryFile(
  guard: WorkspacePathGuardSuccess,
  content: Uint8Array
): Promise<void> {
  await writeGuardApprovedBytes(guard, content);
}
