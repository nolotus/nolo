import {
  closeSync, constants as fsConstants, fstatSync, mkdtempSync, openSync, readlinkSync,
  rmdirSync, unlinkSync, writeSync,
} from "node:fs";
import { access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import type {
  ExecutionBackend, ExecutionBackendDescriptor, ExecutionEvent,
  ExecutionLease, ExecutionReleaseReason, ExecutionRequest,
  ExecutionResult, ExecutionTicket,
} from "./executionBackend";
import { validateConfiguredRootExecutionLease } from "./executionLeaseValidation";
import { buildSeccompFilter, seccompArchFor, type SeccompArch } from "./linuxSandboxSeccomp";

const ID = "linux-bubblewrap-v1";
const MAX_OUTPUT_BYTES = 1024 * 1024;
type RootIdentity = { path: string; dev: number; ino: number };
type ActiveLease = {
  ticket: ExecutionTicket; lease: ExecutionLease; bwrap: string;
  // Private snapshots: mounts are built only from these, never from the
  // caller-held (frozen) lease or the caller-owned Ticket object.
  readable: RootIdentity[]; writable: RootIdentity[];
  // Non-removable seccomp policy (F6): no AF_UNIX socket(), no io_uring.
  seccomp: Uint8Array;
  running: Set<ReturnType<typeof Bun.spawn>>;
};
// Paths that are sandbox mount points or host pseudo-filesystems. Mounting a
// configured root equal to/inside these would expose host kernel/IPC state
// (e.g. /proc environ, /run/user D-Bus sockets) or shadow the sandbox layout.
const PSEUDO_FS = ["/proc", "/sys", "/dev", "/run"];
const SANDBOX_MOUNTS = ["/", "/usr", "/bin", "/lib", "/lib64", "/tmp"];
const inside = (parent: string, child: string) => {
  const rel = relative(parent, child);
  return rel === "" || (rel !== ".." && !rel.startsWith("../") && !isAbsolute(rel));
};

/**
 * Open a root as a directory handle and prove, from the handle itself, that
 * the opened object lives at the exact lexical path (no symlink in any
 * component at open time). The returned fd is what Bubblewrap mounts via
 * --(ro-)bind-fd. This is NOT window-free: bwrap mounts the fd through its
 * /proc/self/fd magic link, so a resolve→mount race still exists inside bwrap.
 * bwrap (>=0.10, bubblewrap.c bind-fd handling) re-checks the mounted
 * object's dev/ino against the fd after mounting and aborts before running
 * the payload on mismatch; we additionally pin dev/ino from prepare().
 */
function openRootHandle(path: string): { fd: number; identity: RootIdentity } {
  if (typeof path !== "string" || !isAbsolute(path) || path.includes("\0")) {
    throw new Error("Sandbox root must be absolute");
  }
  const expected = resolve(path);
  if (SANDBOX_MOUNTS.includes(expected) ||
    PSEUDO_FS.some((reserved) => inside(reserved, expected))) {
    throw new Error("Sandbox root overlaps a reserved sandbox/pseudo filesystem path");
  }
  let fd: number;
  try {
    fd = openSync(expected, fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW);
  } catch {
    throw new Error("Sandbox root must be an existing directory without symlinks");
  }
  try {
    if (readlinkSync(`/proc/self/fd/${fd}`) !== expected) {
      throw new Error("Sandbox root cannot contain symlinks");
    }
    const st = fstatSync(fd);
    if (!st.isDirectory()) throw new Error("Sandbox root must be a directory");
    return { fd, identity: { path: expected, dev: st.dev, ino: st.ino } };
  } catch (error) {
    closeSync(fd);
    throw error;
  }
}

/**
 * Materialize the seccomp program as a read-only fd for `bwrap --seccomp FD`.
 * The file lives in a fresh 0700 directory and is unlinked before spawn, so
 * only the returned fd references it. bwrap reads the program and closes the
 * fd before exec'ing the payload; the parent closes its copy after spawn.
 */
function openSeccompFd(program: Uint8Array): number {
  const dir = mkdtempSync(join(tmpdir(), "nolo-bwrap-seccomp-"));
  const file = join(dir, "filter.bpf");
  let writer = -1;
  let reader = -1;
  try {
    writer = openSync(file, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_NOFOLLOW, 0o600);
    if (writeSync(writer, program) !== program.byteLength) throw new Error("Short seccomp write");
    reader = openSync(file, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const w = fstatSync(writer);
    const r = fstatSync(reader);
    if (w.ino !== r.ino || w.dev !== r.dev || r.size !== program.byteLength) {
      throw new Error("Seccomp program file was replaced");
    }
    return reader;
  } catch (error) {
    if (reader >= 0) closeSync(reader);
    throw new Error(`Cannot prepare seccomp policy; refusing sandbox (${(error as Error).message})`);
  } finally {
    if (writer >= 0) closeSync(writer);
    try { unlinkSync(file); } catch { /* not created */ }
    try { rmdirSync(dir); } catch { /* best effort */ }
  }
}

function identifyRoot(path: string): RootIdentity {
  const { fd, identity } = openRootHandle(path);
  closeSync(fd);
  return identity;
}

/** Re-open an authorized root and require the same inode and path. */
function reopenAuthorizedRoot(expected: RootIdentity): number {
  const { fd, identity } = openRootHandle(expected.path);
  if (identity.dev !== expected.dev || identity.ino !== expected.ino) {
    closeSync(fd);
    throw new Error("Sandbox root identity changed since prepare");
  }
  return fd;
}

/** Minimum bwrap: --disable-userns/--assert-userns-disabled need >=0.8,
 * --bind-fd/--ro-bind-fd need >=0.10, --seccomp FD is much older. Older
 * binaries are refused (no path-bind / no-seccomp downgrade). */
export const MIN_BWRAP_VERSION: readonly [number, number, number] = [0, 10, 0];
const REQUIRED_BWRAP_FLAGS = ["--bind-fd", "--ro-bind-fd", "--disable-userns", "--assert-userns-disabled", "--seccomp"];

export type BubblewrapProbe = { version: string; help: string };
export type BubblewrapHost = {
  locate(): Promise<string>;
  probe(binary: string): Promise<BubblewrapProbe>;
};

/** Pure capability check over `bwrap --version` and `bwrap --help` output. */
export function assertBubblewrapCapabilities({ version, help }: BubblewrapProbe): void {
  const match = /^bubblewrap\s+(\d+)\.(\d+)(?:\.(\d+))?\s*$/m.exec(version);
  if (!match) throw new Error("Unrecognized Bubblewrap version; refusing sandbox");
  const actual = [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
  for (let i = 0; i < 3; i++) {
    if (actual[i] > MIN_BWRAP_VERSION[i]) break;
    if (actual[i] < MIN_BWRAP_VERSION[i]) {
      throw new Error(`Bubblewrap ${actual.join(".")} lacks required capabilities (need >= ${MIN_BWRAP_VERSION.join(".")}); refusing sandbox`);
    }
  }
  const missing = REQUIRED_BWRAP_FLAGS.filter((flag) =>
    !new RegExp(`(^|\\s)${flag}(\\s|$)`, "m").test(help));
  if (missing.length) {
    throw new Error(`Bubblewrap is missing required capabilities: ${missing.join(", ")}; refusing sandbox`);
  }
}

async function runProbe(binary: string, flag: string): Promise<string> {
  const proc = Bun.spawn([binary, flag], { stdin: "ignore", stdout: "pipe", stderr: "pipe", env: {} });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited,
  ]);
  if (code !== 0) throw new Error(`Bubblewrap ${flag} probe failed (exit ${code})`);
  return out + err;
}

const defaultBubblewrapHost: BubblewrapHost = {
  locate: () => locateBubblewrap(),
  probe: async (binary) => ({
    version: await runProbe(binary, "--version"),
    help: await runProbe(binary, "--help"),
  }),
};

async function locateBubblewrap(): Promise<string> {
  if (process.platform !== "linux") throw new Error("Bubblewrap backend requires Linux");
  for (const binary of ["/usr/bin/bwrap", "/bin/bwrap"]) {
    try { await access(binary); return binary; } catch { /* try next */ }
  }
  throw new Error("Bubblewrap binary is unavailable; refusing Full Host fallback");
}

/**
 * Experimental local Linux backend. Not yet connected to production routing.
 * Its mounts are intentionally narrow; it refuses dynamic/legacy workspace
 * authority and never degrades to Full Host when setup fails.
 * No assurance of production sandbox security without adversarial Linux CI.
 */
export class LinuxBubblewrapBackend implements ExecutionBackend {
  private readonly leases = new Map<string, ActiveLease>();
  private readonly host: BubblewrapHost;
  private readonly arch: string;
  /** `host`/`arch` are injectable for tests only; production uses the real
   * binary and `process.arch`. */
  constructor(options: { host?: BubblewrapHost; arch?: string } = {}) {
    this.host = options.host ?? defaultBubblewrapHost;
    this.arch = options.arch ?? process.arch;
  }
  describe(): ExecutionBackendDescriptor {
    return {
      id: ID, kind: "local-sandbox",
      capabilities: {
        executionClasses: ["oneshot"], streamingExec: false, filesystem: true,
        persistentFilesystem: false, processSignals: true, inboundPorts: false,
        networkPolicy: false, snapshots: false, gpu: false,
        isolationModes: ["os-sandbox"],
      },
    };
  }

  async prepare(ticket: ExecutionTicket): Promise<ExecutionLease> {
    if (ticket.version !== 1 || ticket.target.kind !== "server" ||
      ticket.executionClass !== "oneshot" || ticket.requestedIsolation !== "os-sandbox" ||
      !ticket.shellAllowed || !ticket.toolNames.includes("execShell") ||
      !ticket.ticketId || !ticket.grantId ||
      ticket.filesystem.readScope !== "configured-roots" ||
      ticket.filesystem.writeScope !== "configured-roots" ||
      ticket.filesystem.readableRoots.length === 0 ||
      ticket.filesystem.writableRoots.length === 0) {
      throw new Error("Unsupported Bubblewrap Ticket; no fallback allowed");
    }
    // Seccomp policy is mandatory; unknown ABIs are refused before any lease.
    const seccompArch: SeccompArch | undefined = seccompArchFor(this.arch);
    if (!seccompArch) {
      throw new Error(`Unsupported architecture ${this.arch} for sandbox seccomp policy; refusing sandbox`);
    }
    const seccomp = buildSeccompFilter(seccompArch);
    const bwrap = await this.host.locate();
    // Fail closed if the binary cannot do fd-pinned mounts / userns disabling.
    assertBubblewrapCapabilities(await this.host.probe(bwrap));
    // Snapshot the Ticket so later caller mutation cannot change authority.
    const snapshot = structuredClone(ticket);
    const readable = snapshot.filesystem.readableRoots.map(identifyRoot);
    const writable = snapshot.filesystem.writableRoots.map(identifyRoot);
    const readableRoots = readable.map((root) => root.path);
    const writableRoots = writable.map((root) => root.path);
    // Nested read-only mounts under writable mounts are not reliably read-only:
    // writable parents can rename/unlink mount paths. Reject overlapping roots.
    for (const read of readableRoots) for (const write of writableRoots) {
      if (inside(read, write) || inside(write, read)) throw new Error("Overlapping read/write mounts refused");
    }
    const lease: ExecutionLease = Object.freeze({
      leaseId: crypto.randomUUID(), backendId: ID, ticketId: snapshot.ticketId,
      grantId: snapshot.grantId, createdAt: Date.now(),
      readableRoots: Object.freeze([...readableRoots]) as string[],
      writableRoots: Object.freeze([...writableRoots]) as string[],
    });
    if (!validateConfiguredRootExecutionLease(snapshot, lease)) {
      throw new Error("ExecutionLease exceeds configured Ticket scope");
    }
    this.leases.set(lease.leaseId, { ticket: snapshot, lease, bwrap, readable, writable, seccomp, running: new Set() });
    return lease;
  }

  async execute(lease: ExecutionLease, request: ExecutionRequest,
    onEvent?: (event: ExecutionEvent) => void): Promise<ExecutionResult> {
    const active = this.leases.get(lease.leaseId);
    if (!active || active.lease !== lease || active.lease.ticketId !== lease.ticketId ||
      active.lease.grantId !== lease.grantId || active.lease.backendId !== lease.backendId)
      throw new Error("Unknown, expired or tampered sandbox lease");
    if (request.kind !== "command" || !request.argv.length ||
      request.argv.some(a => typeof a !== "string" || a.includes("\0")) ||
      request.env || request.stdin !== undefined) {
      throw new Error("Unsupported command input (env and stdin are intentionally denied)");
    }
    if (request.timeoutMs !== undefined &&
      (!Number.isFinite(request.timeoutMs) || request.timeoutMs <= 0)) {
      throw new Error("Sandbox timeout must be finite and positive");
    }
    if (request.cwd && !active.writable.some(({ path: root }) =>
      isAbsolute(request.cwd!) && inside(root, resolve(request.cwd!)))) {
      throw new Error("Command cwd outside writable sandbox roots");
    }
    if (!validateConfiguredRootExecutionLease(active.ticket, active.lease)) {
      throw new Error("ExecutionLease authority changed before execution");
    }
    const bwrap = active.bwrap;
    // Pin every root as an fd whose inode matches the prepare-time identity;
    // Bubblewrap mounts these handles, so a later path swap cannot redirect
    // the mount (handle-based, not a repeated realpath check).
    const rootFds: number[] = [];
    try {
      for (const root of [...active.readable, ...active.writable]) rootFds.push(reopenAuthorizedRoot(root));
      // Last extra fd: seccomp program (child fd 3 + number of roots).
      rootFds.push(openSeccompFd(active.seccomp));
    } catch (error) {
      for (const fd of rootFds) closeSync(fd);
      throw error;
    }
    const seccompChildFd = 3 + active.readable.length + active.writable.length;
    const args = [
      "--unshare-all", "--unshare-user", "--disable-userns", "--assert-userns-disabled",
      "--die-with-parent", "--new-session", "--cap-drop", "ALL",
      "--tmpfs", "/",
      "--clearenv", "--setenv", "PATH", "/usr/bin:/bin",
      "--ro-bind", "/usr", "/usr", "--proc", "/proc", "--dev", "/dev",
      "--tmpfs", "/tmp",
    ];
    for (const dir of ["/bin", "/lib", "/lib64"]) {
      try { await access(dir); args.push("--ro-bind", dir, dir); } catch { /* absent */ }
    }
    // Child fd numbers equal their index in stdio (3, 4, ...).
    active.readable.forEach((root, i) => args.push("--ro-bind-fd", String(3 + i), root.path));
    active.writable.forEach((root, i) =>
      args.push("--bind-fd", String(3 + active.readable.length + i), root.path));
    // Installed by bwrap (with no_new_privs) immediately before exec; the
    // payload cannot remove it. bwrap closes the fd after loading.
    args.push("--seccomp", String(seccompChildFd));
    args.push("--chdir", request.cwd ?? active.writable[0].path, "--", ...request.argv);
    const executionId = crypto.randomUUID();
    let processHandle: ReturnType<typeof Bun.spawn>;
    try {
      processHandle = Bun.spawn([bwrap, ...args], {
        stdio: ["ignore", "pipe", "pipe", ...rootFds],
        env: { PATH: "/usr/bin:/bin" },
      });
    } finally {
      for (const fd of rootFds) closeSync(fd);
    }
    active.running.add(processHandle);
    onEvent?.({ type: "started", executionId, at: Date.now() });
    const cap = async (stream: ReadableStream<Uint8Array>, type: "stdout" | "stderr") => {
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > MAX_OUTPUT_BYTES) {
            processHandle.kill();
            throw new Error("Sandbox output limit exceeded");
          }
          chunks.push(value);
        }
        const text = new TextDecoder().decode(Buffer.concat(chunks));
        if (text) onEvent?.({ type, executionId, chunk: text, seq: 0 });
        return text;
      } finally { reader.releaseLock(); }
    };
    const limitMs = Math.min(
      request.timeoutMs && request.timeoutMs > 0 ? request.timeoutMs : 60_000,
      (active.ticket.maxRunSeconds ?? 60) * 1000,
    );
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      processHandle.kill();
    }, limitMs);
    try {
      const [stdout, stderr, exitCode] = await Promise.all([
        cap(processHandle.stdout as ReadableStream<Uint8Array>, "stdout"),
        cap(processHandle.stderr as ReadableStream<Uint8Array>, "stderr"),
        processHandle.exited,
      ]);
      onEvent?.({ type: "exited", executionId, exitCode });
      return { executionId, ok: !timedOut && exitCode === 0, exitCode, output: { stdout, stderr, timedOut } };
    } finally {
      clearTimeout(timeout);
      if (processHandle.exitCode === null) processHandle.kill();
      active.running.delete(processHandle);
    }
  }

  async release(lease: ExecutionLease, _reason: ExecutionReleaseReason): Promise<void> {
    const active = this.leases.get(lease.leaseId);
    if (!active) return;
    if (active.lease !== lease) throw new Error("Cannot release a foreign lease");
    this.leases.delete(lease.leaseId);
    for (const processHandle of active.running) processHandle.kill();
    active.running.clear();
  }
}
