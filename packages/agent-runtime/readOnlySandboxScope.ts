// packages/agent-runtime/readOnlySandboxScope.ts
//
// Owner binding + directory allowlist for the minimal read-only web sandbox.
//
// Two questions, one file, because they are the same question: "may THIS user
// see THIS path?"
//
//   1. Ownership. Every execution is bound to an authenticated `auth.userId`.
//      The user's sandbox root is derived from that id, never passed in by the
//      caller: `<base>/users/<userId>`. A caller cannot ask for another user's
//      tree by passing a path, because the path is validated against the
//      derived root afterwards.
//
//   2. Allowlist. Exactly ONE root is allowed (the user's own). There is no
//      "extra roots" knob in this contract: the minimal read-only sandbox needs
//      to prove containment before it earns configurability.
//
// Containment is checked twice on purpose:
//   - Lexically, before touching the filesystem (cheap, rejects `../`),
//   - and by opening the path with O_NOFOLLOW and re-reading
//     `/proc/self/fd/<n>`, which is the only check that sees what the kernel
//     actually resolved (a symlink in ANY component is refused, including a
//     symlink whose target would still be inside the root — "inside the root
//     today" is not a containment guarantee).
//
// Pure except for the open/readlink proof, which is exported separately so the
// lexical half is testable without a filesystem fixture.

import { closeSync, constants as fsConstants, fstatSync, lstatSync, openSync, readlinkSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

/** Ops the minimal contract exposes. Deliberately not a shell. */
export const READ_ONLY_SANDBOX_OPS = ["ls", "read", "grep"] as const;
export type ReadOnlySandboxOp = (typeof READ_ONLY_SANDBOX_OPS)[number];

export function isReadOnlySandboxOp(value: unknown): value is ReadOnlySandboxOp {
  return typeof value === "string" && (READ_ONLY_SANDBOX_OPS as readonly string[]).includes(value);
}

/**
 * User ids are used as a path component, so they are validated as a token
 * rather than escaped. Nolo ids are opaque ASCII (`user-…`); anything with a
 * separator, a dot-segment, or a NUL is refused outright instead of being
 * normalized into something safe-looking.
 */
const USER_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function assertSandboxUserId(userId: unknown): string {
  if (typeof userId !== "string" || !userId.trim()) {
    throw new Error("Sandbox execution requires an authenticated userId");
  }
  const trimmed = userId.trim();
  if (trimmed === "." || trimmed === ".." || trimmed.includes("/") || trimmed.includes("\\") ||
    trimmed.includes("\0") || !USER_ID_PATTERN.test(trimmed)) {
    throw new Error(`Refusing sandbox for malformed userId: ${JSON.stringify(userId)}`);
  }
  return trimmed;
}

/**
 * The single allow-listed root for a user. Derived, never supplied.
 * `baseRoot` is the operator-configured parent (e.g. `/srv/nolo/sandbox`).
 */
export function resolveUserSandboxRoot(baseRoot: string, userId: unknown): string {
  const id = assertSandboxUserId(userId);
  if (typeof baseRoot !== "string" || !isAbsolute(baseRoot)) {
    throw new Error("Sandbox base root must be an absolute path");
  }
  const base = resolve(baseRoot);
  const root = join(base, "users", id);
  // Defence in depth: the join above cannot escape for a validated id, but the
  // containment claim must not rest on that reasoning alone.
  if (!isLexicallyInside(base, root) || root === base) {
    throw new Error("Resolved sandbox root escapes the base root");
  }
  return root;
}

/** Lexical containment; non-absolute inputs never match. */
export function isLexicallyInside(parent: string, child: string): boolean {
  if (!isAbsolute(parent) || !isAbsolute(child)) return false;
  const rel = relative(resolve(parent), resolve(child));
  if (rel === "") return true;
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/**
 * Resolve a caller-supplied path inside ONE allow-listed root.
 * Relative paths are resolved against the root (not against process.cwd(),
 * which would silently answer a different question). Traversal outside the
 * root is refused with a stable message; the path is never normalized into
 * something acceptable.
 */
export function resolvePathInSandboxRoot(rawPath: unknown, root: string): string {
  if (typeof rawPath !== "string" || !rawPath.length) {
    throw new Error("Sandbox path must be a non-empty string");
  }
  if (rawPath.includes("\0")) throw new Error("Sandbox path must not contain NUL");
  const absoluteRoot = resolve(root);
  const candidate = resolve(absoluteRoot, rawPath);
  if (!isLexicallyInside(absoluteRoot, candidate)) {
    throw new Error(`Forbidden: path outside the sandbox root (${JSON.stringify(rawPath)})`);
  }
  return candidate;
}

export type ProofedPath = {
  /** Lexically resolved absolute path that was proven to be what it claims. */
  path: string;
  /** True when the path is a directory. */
  directory: boolean;
  /** Kept open for the caller to bind; -1 has already been closed. */
  fd: number;
  dev: number;
  ino: number;
};

/**
 * File types the sandbox is willing to open at all (fix H1).
 *
 * WHY THIS IS A SECURITY BOUNDARY AND NOT A CONVENIENCE CHECK: `open(2)` on a
 * FIFO whose other end has no writer blocks in the kernel until a writer
 * appears — forever, if none ever does. That call is synchronous, so it also
 * blocks the event loop of the server process, not just one request. A user who
 * can place a FIFO in their own root (they can: it is their directory) could
 * therefore pin a request thread permanently. `O_NONBLOCK` alone is not enough
 * (it makes the open succeed, it does not make the object safe to use), and a
 * timer cannot interrupt a synchronous syscall — so the object type itself is
 * refused before it is opened, and re-checked on the resulting fd.
 *
 * A directory or a regular file is all the read-only contract needs; everything
 * else (FIFO, socket, block/char device, and any type added by a future kernel)
 * fails closed.
 */
const isAllowedFileType = (mode: number): "directory" | "file" | null => {
  // `fsConstants.S_IFMT` is the mask (0o170000), not a function.
  const kind = mode & fsConstants.S_IFMT;
  if (kind === fsConstants.S_IFDIR) return "directory";
  if (kind === fsConstants.S_IFREG) return "file";
  return null;
};

/**
 * Restate a refused `lstat` result in terms the caller can act on. The symlink
 * case is separated from the special-file case on purpose: both are refusals,
 * but "this is a symlink" and "this is a FIFO" lead an operator to different
 * fixes, and collapsing them into one message was itself a (minor) review
 * finding (I1).
 */
const describeRefusedType = (path: string, mode: number): string => {
  const kind = mode & fsConstants.S_IFMT;
  if (kind === fsConstants.S_IFLNK) {
    return `Forbidden: sandbox path is a symlink (${JSON.stringify(path)}); symlinks are not followed`;
  }
  return (
    `Forbidden: sandbox path is not a regular file or directory (${JSON.stringify(path)}); ` +
    `special files such as FIFOs are refused because opening one can block indefinitely`
  );
};

/**
 * Open `path` and prove from the fd itself that the kernel resolved exactly
 * this path — no symlink in any component, at open time.
 *
 * O_NOFOLLOW only guards the FINAL component, so a symlinked parent directory
 * would slip through open() while `readlink /proc/self/fd/N` shows the real
 * target. That mismatch is the proof, and it is why this exists rather than a
 * `realpathSync` comparison (which would resolve the symlink first and then
 * compare two resolved paths, i.e. always agree with itself).
 *
 * The returned fd (for directories) is what bwrap mounts via --ro-bind-fd, so
 * the mount is handle-based and a later path swap cannot redirect it.
 *
 * FIX H1 (blocking open): the type is decided from `lstat` BEFORE anything is
 * opened, so a FIFO is refused without ever calling `open(2)` on it. The check
 * is repeated on the fd after the open (fstat), because lstat and open are two
 * separate lookups and a same-uid writer can swap the path in between; the fd
 * is the only thing that cannot lie about what was actually opened.
 *
 * FIX M3/M4 (per-user root as an ENFORCED invariant, not an ops convention):
 * when `options.requireUserRoot` is set, the root must additionally be a real
 * directory (not a symlink), owned by the current euid, not group/other
 * writable, and carry exactly one link count (see `assertUserRootInvariants`).
 */
export function openProofedPath(
  path: string,
  options: { requireUserRoot?: boolean } = {},
): ProofedPath {
  if (!isAbsolute(path)) throw new Error("Sandbox path must be absolute");
  const expected = resolve(path);
  const pre = lstatSync(expected);
  const preType = isAllowedFileType(pre.mode);
  if (!preType) {
    throw new Error(describeRefusedType(path, pre.mode));
  }
  const directory = pre.isDirectory();
  if (options.requireUserRoot) assertUserRootInvariants({ path, expected, stat: pre });
  let fd: number;
  try {
    fd = openSync(
      expected,
      fsConstants.O_RDONLY |
        fsConstants.O_NOFOLLOW |
        // A non-blocking open cannot sit in open(2) even if the object type is
        // swapped between lstat and open (defence in depth; the type check is
        // the actual gate).
        fsConstants.O_NONBLOCK |
        (directory ? fsConstants.O_DIRECTORY : 0),
    );
  } catch (error) {
    // O_NOFOLLOW on a symlinked FINAL component surfaces as ELOOP from the
    // kernel, which is a refusal — but "ELOOP: too many symbolic links" is not
    // a message a caller can act on, so it is restated in containment terms.
    if ((error as NodeJS.ErrnoException)?.code === "ELOOP") {
      throw new Error(
        `Forbidden: sandbox path is a symlink (${JSON.stringify(path)}); symlinks are not followed`,
      );
    }
    throw error;
  }
  try {
    const actual = readlinkSync(`/proc/self/fd/${fd}`);
    if (actual !== expected) {
      throw new Error(
        `Forbidden: sandbox path resolves through a symlink (${JSON.stringify(path)} -> ${JSON.stringify(actual)})`,
      );
    }
    const opened = fstatSync(fd);
    // The fd type must match what lstat promised: this is the half of the check
    // that a race cannot forge, since it reads the object that is actually open.
    const fdType = isAllowedFileType(opened.mode);
    if (!fdType || (fdType === "directory") !== directory) {
      throw new Error(
        `Forbidden: sandbox path changed type between check and open (${JSON.stringify(path)}); refusing`,
      );
    }
    // M3: a FILE's link count and owner are checked on the fd, so the values come
    // from the object actually opened rather than from a lookup that a rename
    // could have invalidated. Directories are exempt (link count == subdirs).
    if (!directory) assertLeafFileInvariants({ path, stat: opened });
    if (options.requireUserRoot) {
      assertUserRootInvariants({ path, expected, stat: opened, fromFd: true });
    }
    return { path: expected, directory, fd, dev: opened.dev, ino: opened.ino };
  } catch (error) {
    closeSync(fd);
    throw error;
  }
}

/**
 * The uid this process runs as. `process.geteuid` is optional in the Node/Bun
 * typings (it is absent on Windows), and this module is Linux-only by
 * construction — but a missing implementation must fail closed rather than
 * compare against `undefined` and pass.
 */
function currentEuid(): number {
  const geteuid = process.geteuid;
  if (typeof geteuid !== "function") {
    throw new Error("Sandbox ownership checks require process.geteuid (POSIX only)");
  }
  return geteuid.call(process);
}

/**
 * The invariants a FILE must satisfy to be readable through this sandbox.
 *
 * ALWAYS enforced (not only for the root), because M3's attack targets a leaf:
 * a hard link inside the user's root pointing at an inode whose other name is
 * outside it passes every lexical and symlink check — the inode really is at
 * this name, `readlink /proc/self/fd/N` agrees, and O_NOFOLLOW has nothing to
 * refuse. The only in-process signal is `st_nlink > 1`.
 *
 * `fs.protected_hardlinks=1` is NOT sufficient as the boundary: it stops an
 * unprivileged user from CREATING such a link, but does nothing about a link
 * that already exists (created before the setting was applied, by root, or
 * restored from another host), and the review found no check that the sysctl is
 * even set on the production image. Refusing is the only answer that does not
 * depend on how the host was configured.
 */
function assertLeafFileInvariants(args: { path: string; stat: { uid: number; nlink: number } }): void {
  const { path, stat } = args;
  if (stat.nlink !== 1) {
    throw new Error(
      `Forbidden: sandbox file has ${stat.nlink} hard links (${JSON.stringify(path)}); ` +
      `another name may exist outside this user's root, so the containment proof is void`,
    );
  }
  const euid = currentEuid();
  if (stat.uid !== euid) {
    throw new Error(
      `Forbidden: sandbox file is owned by uid ${stat.uid}, not the server uid ${euid} ` +
      `(${JSON.stringify(path)})`,
    );
  }
}

/**
 * Per-user root invariants (fix M3 + M4).
 *
 * THE PROBLEM THE REVIEW FOUND: isolation between two users rested on an
 * operations convention — "put each user's tree on its own filesystem, with
 * `protected_hardlinks=1`". Nothing in the code checked it, so a single
 * mis-provisioned base root silently turned every per-user boundary into a
 * suggestion. A convention that is not enforced is not a boundary.
 *
 * THE INVARIANTS, each refused rather than repaired (fail closed):
 *
 *   1. Real directory, not a symlink. `lstat` is used, so a symlinked root is
 *      visible as such instead of being silently followed.
 *   2. Owned by the uid the server runs as. If another account owns the root,
 *      that account can replace its contents after every check here.
 *   3. Not group- or other-writable. A writable root is one a different uid can
 *      turn into a cross-user read (plant a hard link, plant a symlink, swap a
 *      directory).
 *
 * Deliberately NOT claimed: this cannot detect that the root lives on a
 * filesystem shared with another user's root, because "same filesystem" is not
 * an error condition observable from the path alone. What it does guarantee is
 * that the ownership and mode checks above hold, so a shared filesystem can no
 * longer by itself become a cross-user read.
 */
export function assertUserRootInvariants(args: {
  path: string;
  expected: string;
  stat: { uid: number; mode: number; nlink: number; isDirectory(): boolean };
  fromFd?: boolean;
}): void {
  const { path, stat } = args;
  if (!stat.isDirectory()) {
    // A root that is not a directory is a provisioning error, not a file to read.
    throw new Error(`Forbidden: sandbox root is not a directory (${JSON.stringify(path)})`);
  }
  const euid = currentEuid();
  if (stat.uid !== euid) {
    throw new Error(
      `Forbidden: sandbox root is owned by uid ${stat.uid}, not the server uid ${euid} ` +
      `(${JSON.stringify(path)}); cross-user isolation cannot be guaranteed`,
    );
  }
  if ((stat.mode & 0o022) !== 0) {
    throw new Error(
      `Forbidden: sandbox root is group/other writable (mode ${(stat.mode & 0o777).toString(8)}) ` +
      `(${JSON.stringify(path)}); another account could rewrite the tree after validation`,
    );
  }
  // A directory's link count encodes its subdirectories and says nothing about
  // cross-user reachability, so it is intentionally not constrained here.
}

/**
 * Prove a path is what it says it is, then close the handle (read-only ops on
 * FILES are served by the mounted root, not by the handle).
 */
export function assertProofedPath(path: string): ProofedPath {
  const proofed = openProofedPath(path);
  closeSync(proofed.fd);
  return { ...proofed, fd: -1 };
}

/**
 * Deadline helper for the pre-spawn half of a run (fix H1).
 *
 * WHY A SEPARATE MECHANISM FROM THE WALL TIMER IN THE EXECUTOR: the executor's
 * `wallMs` timer is armed AFTER the spawn, because it is a limit on the
 * sandboxed payload. Everything before the spawn — `lstat`, `readlink`, the
 * bwrap capability probe, the seccomp file — happens outside that window, and
 * none of it is interruptible by a timer if a syscall blocks. So the whole
 * preparation phase needs an explicit, observable deadline of its own, and each
 * step must be able to fail at it.
 *
 * What this class can and cannot do, stated plainly: it can enforce a deadline
 * around every AWAIT (the probe is a subprocess with its own kill), and it can
 * refuse to start work whose deadline has already passed. It cannot interrupt a
 * synchronous syscall — that is why the object-type gate in `openProofedPath`
 * exists. The two mechanisms are complements, not substitutes: type gating
 * removes the known blocking points, the deadline bounds everything that can be
 * awaited.
 */
export class SandboxDeadline {
  private readonly deadlineAt: number;
  readonly totalMs: number;
  private readonly startedAt: number;

  constructor(totalMs: number) {
    if (!Number.isFinite(totalMs) || totalMs <= 0) {
      throw new Error(`Sandbox deadline must be a positive number of ms (got ${String(totalMs)})`);
    }
    this.totalMs = totalMs;
    this.startedAt = Date.now();
    this.deadlineAt = this.startedAt + totalMs;
  }

  /** Milliseconds left; never negative. */
  remainingMs(): number {
    return Math.max(0, this.deadlineAt - Date.now());
  }

  expired(): boolean {
    return this.remainingMs() === 0;
  }

  elapsedMs(): number {
    return Date.now() - this.startedAt;
  }

  /** Throws a stable, attributable error when the deadline has passed. */
  assertNotExpired(stage: string): void {
    if (this.expired()) {
      throw new Error(
        `sandbox preparation deadline of ${this.totalMs}ms exceeded before ${stage}; ` +
        `refusing to continue (the payload was never started)`,
      );
    }
  }

  /**
   * Await `work`, but fail at the deadline. `onTimeout` runs once when the
   * deadline wins, which is how a probe subprocess gets killed instead of
   * being left behind.
   */
  async race<T>(stage: string, work: Promise<T>, onTimeout?: () => void): Promise<T> {
    this.assertNotExpired(stage);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const limited = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        try { onTimeout?.(); } catch { /* cleanup is best effort */ }
        reject(new Error(
          `sandbox preparation deadline of ${this.totalMs}ms exceeded during ${stage}; ` +
          `refusing to continue (the payload was never started)`,
        ));
      }, this.remainingMs());
    });
    try {
      return await Promise.race([work, limited]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
}

/** Op → argv inside the sandbox. No shell, no glob expansion, no `sh -c`. */
export function buildReadOnlyOpArgv(args: {
  op: ReadOnlySandboxOp;
  path: string;
  root: string;
  pattern?: string;
  maxOutputBytes: number;
}): string[] {
  const relativePath = relative(resolve(args.root), args.path) || ".";
  const target = resolve("/sandbox", relativePath);
  if (args.op === "ls") {
    // -printf keeps the output machine-readable; find without -L never
    // follows symlinks, so a planted link cannot pull host files into a list.
    return ["/usr/bin/find", target, "-mindepth", "1", "-maxdepth", "1", "-printf", "%y\t%s\t%f\n"];
  }
  if (args.op === "read") {
    return ["/usr/bin/head", "-c", String(args.maxOutputBytes), "--", target];
  }
  const pattern = args.pattern;
  if (typeof pattern !== "string" || !pattern.length) {
    throw new Error("grep requires a non-empty pattern");
  }
  // -F: the pattern is a literal. A regex engine is a denial-of-service surface
  // (catastrophic backtracking) inside a resource-limited sandbox, and nothing
  // in the minimal contract needs interpolation.
  // -I: skip binary files. `-e` carries the pattern so a value starting with
  // '-' is still a pattern, and `--` then ends option parsing before the target
  // (without the `--` here, grep treats the target as another pattern file).
  return ["/usr/bin/grep", "-rnFI", "-e", pattern.slice(0, 512), "--", target];
}
