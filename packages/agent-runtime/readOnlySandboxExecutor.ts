// packages/agent-runtime/readOnlySandboxExecutor.ts
//
// Minimal READ-ONLY web/production sandbox (plan item A).
//
// Contract in one sentence: **a single authenticated user may list, read, or
// grep files under exactly one derived root — their own — inside a fresh
// bwrap namespace with no network, no capabilities, no writable bind, and
// kernel-enforced memory/CPU/process limits; every check fails closed.**
//
// What is deliberately NOT here: write, edit, apply-edit, shell, interactive
// sessions, env passthrough, stdin. Those are the operations whose blast radius
// needs a different review, and the whole point of a minimal contract is that
// the set is small enough to reason about.
//
// Why a new executor instead of reusing `LinuxBubblewrapBackend`: that backend
// takes an `ExecutionTicket` whose filesystem authority is caller-shaped
// (`configured-roots`), which is correct for a machine/owner surface and wrong
// for a web surface — nothing in it binds execution to `auth.userId`, and it
// has no resource limits. Wrapping it would have meant adding both checks at a
// layer that is also used by owner-configured tickets. This executor keeps the
// user binding and the limits inseparable from the spawn.

import { closeSync, existsSync, statSync } from "node:fs";
import { isAbsolute } from "node:path";
import { openSeccompFd } from "./linuxBubblewrapBackend";
import { buildSeccompFilter, seccompArchFor, type SeccompArch } from "./linuxSandboxSeccomp";
import {
  buildPrlimitArgs,
  READ_ONLY_SANDBOX_LIMITS,
  resolveReadOnlySandboxLimits,
  type ReadOnlySandboxLimits,
} from "./readOnlySandboxLimits";
import {
  ReadOnlySandboxAdmission,
  type ReadOnlySandboxAdmissionLimits,
  type ReadOnlySandboxAdmissionRejection,
} from "./readOnlySandboxAdmission";
import {
  buildReadOnlyOpArgv,
  isReadOnlySandboxOp,
  openProofedPath,
  resolvePathInSandboxRoot,
  resolveUserSandboxRoot,
  SandboxDeadline,
  type ReadOnlySandboxOp,
} from "./readOnlySandboxScope";

/** In-sandbox mount point for the user's root. Not configurable on purpose:
 * a moving mount point makes every op argv a question about which path was
 * really used. */
const SANDBOX_ROOT_MOUNT = "/sandbox";

/** Hard ceiling on how long we wait for the supervisor's own teardown. */
const TEARDOWN_GRACE_MS = 2_000;

export type ReadOnlySandboxRequest = {
  /** From the verified auth token. Never taken from a request body. */
  userId: string;
  op: ReadOnlySandboxOp;
  /** Path relative to (or inside) the user's root. */
  path: string;
  pattern?: string;
  /** Can only tighten the enforced ceilings. */
  limits?: Partial<ReadOnlySandboxLimits>;
};

export type ReadOnlySandboxResult =
  | {
    ok: true;
    op: ReadOnlySandboxOp;
    /** Path expressed inside the user's root — never an absolute host path. */
    path: string;
    /** Kernel exit status; `null` when the payload died from a signal. */
    exitCode: number | null;
    stdout: string;
    stderr: string;
    /** Which limit stopped the run, when the exit status makes it attributable. */
    limitReached: "cpu" | "wall" | null;
    durationMs: number;
  }
  | {
    ok: false;
    /** Stable machine code; the message is never the only signal. */
    error:
      | "sandbox_unavailable"
      | "sandbox_forbidden_path"
      | "sandbox_forbidden_user"
      | "sandbox_invalid_request"
      | "sandbox_output_limit"
      | "sandbox_timeout"
      | "sandbox_op_failed"
      | "sandbox_denied_by_policy"
      | "sandbox_busy";
    reason: string;
    /** True only when the command itself ran and returned non-zero. */
    executed: boolean;
    exitCode?: number | null;
    stdout?: string;
    stderr?: string;
    limitReached?: "cpu" | "wall" | null;
    /** Set for `sandbox_busy`: which ceiling refused the run, and when to retry. */
    admission?: { reason: ReadOnlySandboxAdmissionRejection; retryAfterMs: number };
    durationMs: number;
  };

export type ReadOnlySandboxDeps = {
  /** Operator-configured parent of per-user roots. */
  baseRoot: string;
  /**
   * Ops gate. REQUIRED (fix L3): the previous default was "enabled when the
   * caller supplied no gate", which means forgetting one argument silently
   * turned the sandbox on. A gate that must be passed is a gate that cannot be
   * forgotten; `readOnlySandboxHandler` supplies the env-var gate, and it
   * defaults to OFF.
   */
  isEnabled: () => boolean;
  /** Test seams only; production uses the real binary and `process.arch`. */
  locateBubblewrap?: () => Promise<string>;
  probeBubblewrap?: (binary: string) => Promise<{ version: string; help: string }>;
  arch?: string;
  /** Probe timeout override (test seam; default 5s). */
  probeTimeoutMs?: number;
  /**
   * Override for the PDEATHSIG wrapper (test seam). `undefined` = auto-detect;
   * `null` = explicitly disabled. There is deliberately NO coupling between this
   * and `locateBubblewrap`: an earlier draft disabled the wrapper whenever a
   * caller supplied a test binary, which meant a test seam silently removed a
   * security control (and made the control untestable through the executor).
   */
  pdeathsigWrapper?: string | null;
  /**
   * Process-wide admission gate (fix H2). Supply the SAME instance for every
   * request in a process — a fresh instance per request enforces nothing,
   * because each one sees its own counters. Defaults to a per-executor
   * instance, which is only correct when one executor is shared per process
   * (as `createReadOnlySandboxExecutor` does when a caller injects one).
   */
  admission?: ReadOnlySandboxAdmission;
  /** Admission ceilings used when `admission` is not supplied. */
  admissionLimits?: Partial<ReadOnlySandboxAdmissionLimits>;
  /**
   * Deadline for the whole pre-spawn preparation phase (fix H1), ms.
   * Defaults to `PREPARATION_DEADLINE_MS`. Not caller-tunable per request on
   * purpose: a request cannot buy itself more preparation time.
   */
  preparationDeadlineMs?: number;
};

/** Default ceiling for everything that happens before the payload exists. */
const PREPARATION_DEADLINE_MS = 10_000;

/**
 * Kill-on-parent-death wrapper (fix M1).
 *
 * THE PROBLEM: `--die-with-parent` protects the PAYLOAD from bwrap's death, but
 * nothing protects bwrap from OUR death. When the server is SIGKILLed
 * (deploy, OOM killer, crash), bwrap is reparented to init and survives, still
 * holding the mount namespace, the user's root fd and the seccomp fd. Measured
 * on this host: a `/usr/bin/sleep 300` grandchild under bwrap outlives a
 * SIGKILL of the spawning process. A restart loop therefore accumulates
 * sandboxed processes with no owner.
 *
 * WHY `setpriv --pdeathsig KILL` AND NOT THE OTHER OPTIONS:
 *   - PR_SET_PDEATHSIG must be set in the CHILD, and it must happen between
 *     fork and exec — from Bun we cannot run code in the child. `setpriv
 *     --pdeathsig KILL -- bwrap …` is a tiny exec-chain wrapper that does
 *     exactly that, needs no new privilege, and is already a dependency of this
 *     design (`prlimit` comes from the same util-linux package, verified
 *     present: util-linux 2.41.6).
 *   - A systemd transient scope would require the server to talk to systemd
 *     (D-Bus availability, a unit per run, a permission decision); the sandbox
 *     must not depend on the host's init system to be safe.
 *   - A startup reaper only cleans up after the NEXT restart, and only if it can
 *     identify the victims without killing unrelated processes; it is a
 *     complement, not a replacement.
 *
 * The signal is inherited-then-cleared semantics: PDEATHSIG fires when the
 * process that FORKED setpriv dies — i.e. our process. Verified on this host by
 * SIGKILLing the parent and observing zero survivors.
 *
 * Note what this does NOT cover: the kernel only delivers PDEATHSIG to the
 * direct child. `setpriv` exec()s bwrap in place, so "the direct child" IS
 * bwrap. If bwrap itself died and left a payload, `--die-with-parent` in the
 * sandbox argv is what covers that half — hence both mechanisms stay.
 */
const PDEATHSIG_WRAPPER = "/usr/bin/setpriv";


const MIN_BWRAP_VERSION = [0, 10, 0] as const;
const REQUIRED_BWRAP_FLAGS = [
  "--unshare-all",
  "--cap-drop",
  "--die-with-parent",
  "--new-session",
  "--ro-bind-fd",
  "--disable-userns",
  "--assert-userns-disabled",
  "--seccomp",
];

/**
 * Pure capability check. Kept separate from the spawn so a test can assert the
 * refusal without a host bwrap.
 */
export function assertReadOnlySandboxBubblewrap(args: { version: string; help: string }): void {
  const match = /^bubblewrap\s+(\d+)\.(\d+)(?:\.(\d+))?\s*$/m.exec(args.version ?? "");
  if (!match) {
    throw new Error("Unrecognized Bubblewrap version; refusing the read-only sandbox");
  }
  const actual = [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
  for (let i = 0; i < 3; i++) {
    if (actual[i] > MIN_BWRAP_VERSION[i]) break;
    if (actual[i] < MIN_BWRAP_VERSION[i]) {
      throw new Error(
        `Bubblewrap ${actual.join(".")} lacks required capabilities (need >= ${MIN_BWRAP_VERSION.join(".")}); refusing the read-only sandbox`,
      );
    }
  }
  const missing = REQUIRED_BWRAP_FLAGS.filter(
    (flag) => !new RegExp(`(^|\\s)${flag}(\\s|$)`, "m").test(args.help ?? ""),
  );
  if (missing.length) {
    throw new Error(
      `Bubblewrap is missing required capabilities: ${missing.join(", ")}; refusing the read-only sandbox`,
    );
  }
}

/**
 * Probe timeout. Same value as `sandboxCommandPrefix.BWRAP_PROBE_TIMEOUT_MS`:
 * a probe is a capability question about a binary we do not control, and a
 * hanging binary must not become a hanging request. Without this the very first
 * request after a bad deploy hangs forever instead of failing closed.
 */
const PROBE_TIMEOUT_MS = 5_000;

const readProbe = async (binary: string, flag: string, timeoutMs = PROBE_TIMEOUT_MS): Promise<string> => {
  const proc = Bun.spawn([binary, flag], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    env: {},
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      try { proc.kill(); } catch { /* already gone */ }
      reject(new Error(`Bubblewrap ${flag} probe timed out after ${timeoutMs}ms; refusing the read-only sandbox`));
    }, timeoutMs);
  });
  try {
    const [out, err, code] = await Promise.race([
      Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]),
      timeout,
    ]);
    if (code !== 0) throw new Error(`Bubblewrap ${flag} probe failed (exit ${code})`);
    return out + err;
  } finally {
    clearTimeout(timer);
    try { proc.kill(); } catch { /* already gone */ }
  }
};

const defaultLocate = async (): Promise<string> => {
  if (process.platform !== "linux") {
    throw new Error("The read-only sandbox requires Linux (user namespaces)");
  }
  for (const binary of ["/usr/bin/bwrap", "/bin/bwrap"]) {
    try {
      statSync(binary);
      return binary;
    } catch {
      /* try next */
    }
  }
  throw new Error("Bubblewrap binary is unavailable; refusing to run the operation on the host");
};

/** Child fd numbers: the root dir handle is 3, the seccomp program 4. */
export const SANDBOX_ROOT_CHILD_FD = 3;
export const SANDBOX_SECCOMP_CHILD_FD = 4;

/**
 * The complete bwrap argv. Pure: the only host fact it takes is the list of
 * system dirs that actually exist (`--ro-bind` on a missing dir aborts bwrap,
 * unlike `--ro-bind-try`).
 *
 * Layout contract, which the `--` placement encodes:
 *   bwrap … --  /usr/bin/prlimit … -- /op …
 * bwrap's own option parsing must end before prlimit, and prlimit's must end
 * before the op argv. Two `--`, in this order: getting it wrong makes bwrap
 * parse later flags as its own and fail with a confusing execvp error.
 */
export function buildSandboxArgv(args: {
  limits: ReadOnlySandboxLimits;
  opArgv: string[];
  /** Absolute system dirs to bind read-only; missing ones are skipped by the caller. */
  optionalSystemDirs: string[];
}): string[] {
  return [
    "--unshare-all", "--unshare-user",
    "--disable-userns", "--assert-userns-disabled",
    "--die-with-parent", "--new-session",
    "--cap-drop", "ALL",
    "--clearenv", "--setenv", "PATH", "/usr/bin:/bin",
    "--tmpfs", "/",
    "--ro-bind", "/usr", "/usr",
    "--proc", "/proc",
    "--dev", "/dev",
    "--size", String(args.limits.tmpfsBytes),
    "--tmpfs", "/tmp",
    ...args.optionalSystemDirs.flatMap((dir) => ["--ro-bind", dir, dir]),
    // Handle-based mount: a later swap of the root path cannot redirect it.
    "--ro-bind-fd", String(SANDBOX_ROOT_CHILD_FD), SANDBOX_ROOT_MOUNT,
    "--chdir", SANDBOX_ROOT_MOUNT,
    "--seccomp", String(SANDBOX_SECCOMP_CHILD_FD),
    "--",
    ...buildPrlimitArgs(args.limits),
    "--",
    ...args.opArgv,
  ];
}

/** System dirs the payload needs; filtered to those present on this host. */
function presentSystemDirs(): string[] {
  return ["/bin", "/lib", "/lib64"].filter((dir) => {
    try {
      statSync(dir);
      return true;
    } catch {
      return false;
    }
  });
}

type RunningChild = {
  stop(): void;
  done: Promise<number | null>;
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
};

/**
 * Spawn the sandboxed payload and track the direct child so teardown is
 * possible from outside the await. `--die-with-parent` is what makes killing
 * bwrap sufficient: the payload receives SIGKILL when its parent dies.
 */
function spawnSandboxed(args: {
  bwrap: string;
  argv: string[];
  inheritedFds: number[];
  /** Absolute path to the PDEATHSIG wrapper; omitted in tests that fake bwrap. */
  pdeathsigWrapper: string | null;
}): RunningChild {
  // `stdio` and the `stdout`/`stderr` shorthands are mutually exclusive: passing
  // both makes Bun leave `child.stdout` undefined, which then fails at the
  // first `getReader()` instead of at the spawn. Exactly one path is built here.
  const options = args.inheritedFds.length
    ? {
      stdin: "ignore" as const,
      stdio: ["ignore", "pipe", "pipe", ...args.inheritedFds] as Array<"ignore" | "pipe" | number>,
      env: { PATH: "/usr/bin:/bin" },
    }
    : {
      stdin: "ignore" as const,
      stdout: "pipe" as const,
      stderr: "pipe" as const,
      env: { PATH: "/usr/bin:/bin" },
    };
  // M1: wrap so the kernel kills the child when THIS process dies. Without it a
  // server restart leaves bwrap (and its mount ns) running with no owner.
  const command = args.pdeathsigWrapper
    ? [args.pdeathsigWrapper, "--pdeathsig", "KILL", "--", args.bwrap, ...args.argv]
    : [args.bwrap, ...args.argv];
  const child = Bun.spawn(command, options as Parameters<typeof Bun.spawn>[1]);
  let stopped = false;
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      try { child.kill(); } catch { /* already gone */ }
    },
    done: child.exited as Promise<number | null>,
    stdout: child.stdout as ReadableStream<Uint8Array>,
    stderr: child.stderr as ReadableStream<Uint8Array>,
  };
}

export class ReadOnlySandboxExecutor {
  private readonly deps: ReadOnlySandboxDeps;
  private readonly arch: string;
  private readonly running = new Set<RunningChild>();
  private readonly admission: ReadOnlySandboxAdmission;
  private readonly preparationDeadlineMs: number;
  private readonly pdeathsigWrapper: string | null;
  private bwrapPath: string | null = null;
  private disposed = false;

  constructor(deps: ReadOnlySandboxDeps) {
    if (typeof deps?.baseRoot !== "string" || !isAbsolute(deps.baseRoot)) {
      throw new Error("Read-only sandbox base root must be an absolute path");
    }
    if (typeof deps.isEnabled !== "function") {
      // Fix L3: a missing gate used to mean "enabled". It is now a construction
      // error, so the sandbox cannot be switched on by an omission.
      throw new Error(
        "Read-only sandbox requires an explicit isEnabled() gate; omitting it is not permission",
      );
    }
    this.deps = deps;
    this.arch = deps.arch ?? process.arch;
    // H2: the aggregate gate. Shared by every request through one executor.
    this.admission = deps.admission ?? new ReadOnlySandboxAdmission(deps.admissionLimits ?? {});
    this.preparationDeadlineMs = deps.preparationDeadlineMs ?? PREPARATION_DEADLINE_MS;
    // M1: resolve the wrapper. `undefined` means auto-detect the real one; an
    // explicit `null` disables it (a test that must observe pre-fix behaviour);
    // a string is used as given. This is deliberately NOT coupled to
    // `locateBubblewrap`: an earlier draft disabled the wrapper whenever a test
    // supplied a fake binary, which let a test seam silently remove a security
    // control.
    this.pdeathsigWrapper = deps.pdeathsigWrapper === undefined
      ? (existsSync(PDEATHSIG_WRAPPER) ? PDEATHSIG_WRAPPER : null)
      : deps.pdeathsigWrapper;
  }

  /**
   * Whether the spawn path can guarantee that no sandbox process outlives this
   * server (fix M1). Ops should refuse to enable the route when this is false: a
   * restart loop would then accumulate orphaned bwrap processes still holding
   * mount namespaces and open handles to user roots.
   */
  orphanContainment(): { enforced: boolean; mechanism: "setpriv-pdeathsig" | "none" } {
    return this.pdeathsigWrapper
      ? { enforced: true, mechanism: "setpriv-pdeathsig" }
      : { enforced: false, mechanism: "none" };
  }

  /** Enabled only when the caller's gate says so; the gate is fail-closed. */
  private enabled(): boolean {
    try {
      return this.deps.isEnabled() === true;
    } catch {
      return false;
    }
  }

  private async resolveBwrap(): Promise<string> {
    if (this.bwrapPath) return this.bwrapPath;
    const binary = this.deps.locateBubblewrap
      ? await this.deps.locateBubblewrap()
      : await defaultLocate();
    const probe = this.deps.probeBubblewrap
      ? await this.deps.probeBubblewrap(binary)
      : {
        version: await readProbe(binary, "--version", this.deps.probeTimeoutMs),
        help: await readProbe(binary, "--help", this.deps.probeTimeoutMs),
      };
    assertReadOnlySandboxBubblewrap(probe);
    this.bwrapPath = binary;
    return binary;
  }

  async execute(request: ReadOnlySandboxRequest): Promise<ReadOnlySandboxResult> {
    const startedAt = Date.now();
    const elapsed = () => Date.now() - startedAt;
    if (this.disposed) {
      return {
        ok: false, error: "sandbox_unavailable",
        reason: "executor disposed", executed: false, durationMs: elapsed(),
      };
    }
    if (!this.enabled()) {
      // Fail-closed ops veto: refuse, never fall back to a host run.
      return {
        ok: false, error: "sandbox_denied_by_policy",
        reason: "read-only sandbox is disabled by operator policy; refusing to run on the host",
        executed: false, durationMs: elapsed(),
      };
    }

    // ── 1. Request shape, before any filesystem or process work ────────────
    if (!isReadOnlySandboxOp(request?.op)) {
      return {
        ok: false, error: "sandbox_invalid_request",
        reason: `unsupported op (expected one of ls, read, grep)`,
        executed: false, durationMs: elapsed(),
      };
    }
    let limits: ReadOnlySandboxLimits;
    try {
      limits = resolveReadOnlySandboxLimits(request.limits ?? {});
    } catch (error) {
      return {
        ok: false, error: "sandbox_invalid_request",
        reason: (error as Error).message, executed: false, durationMs: elapsed(),
      };
    }

    // ── 2. Ownership + allowlist. Derived root only. ────────────────────────
    let root: string;
    let target: string;
    try {
      root = resolveUserSandboxRoot(this.deps.baseRoot, request.userId);
      target = resolvePathInSandboxRoot(request.path, root);
    } catch (error) {
      const message = (error as Error).message;
      const isUser = message.includes("userId");
      return {
        ok: false,
        error: isUser ? "sandbox_forbidden_user" : "sandbox_forbidden_path",
        reason: message, executed: false, durationMs: elapsed(),
      };
    }

    // ── 2b. Aggregate admission (fix H2). BEFORE any filesystem or process
    //        work: the point of a ceiling is that refusing is cheap. The slot is
    //        held for the whole run and released in `finally` below.
    const decision = this.admission.tryAcquire(request.userId);
    if (!decision.ok) {
      return {
        ok: false, error: "sandbox_busy",
        reason:
          decision.reason === "global_concurrency"
            ? "the sandbox is at its global concurrency ceiling; retry shortly"
            : decision.reason === "user_concurrency"
              ? "this user already has a sandbox run in flight; retry when it finishes"
              : "this user has exceeded the sandbox request rate; retry shortly",
        executed: false, admission: { reason: decision.reason, retryAfterMs: decision.retryAfterMs },
        durationMs: elapsed(),
      };
    }
    const releaseAdmission = decision.release;

    // ── 3. Symlink proof + per-user root invariants. The lexer above cannot see
    //        a symlinked component; this opens with O_NOFOLLOW, compares
    //        /proc/self/fd, refuses non-regular files (H1) and enforces the
    //        per-user root invariants (M3/M4). ─────────────────────────────────
    let rootHandle: ReturnType<typeof openProofedPath> | null = null;
    let targetProof: ReturnType<typeof openProofedPath> | null = null;
    try {
      const deadline = new SandboxDeadline(this.preparationDeadlineMs);
      deadline.assertNotExpired("the root proof");
      // The root must satisfy the per-user invariants; the leaf need not be owned
      // by us, but must be a regular file/dir with a single hard link (M3).
      rootHandle = openProofedPath(root, { requireUserRoot: true });
      targetProof = openProofedPath(target);
      deadline.assertNotExpired("the leaf proof");
    } catch (error) {
      if (rootHandle && rootHandle.fd >= 0) {
        try { closeSync(rootHandle.fd); } catch { /* already closed */ }
      }
      releaseAdmission();
      // A missing leaf is a normal "no such file", not a containment failure.
      const missing = (error as NodeJS.ErrnoException)?.code === "ENOENT";
      return {
        ok: false,
        error: missing ? "sandbox_invalid_request" : "sandbox_forbidden_path",
        reason: missing ? `no such path inside the sandbox root (${JSON.stringify(request.path)})` : (error as Error).message,
        executed: false, durationMs: elapsed(),
      };
    }
    // Narrowed and non-null past this point; const aliases keep the closure
    // below free of non-null assertions.
    const rootProof = rootHandle;
    const leafProof = targetProof;

    const closeHandles = () => {
      for (const handle of [rootProof, leafProof]) {
        if (handle.fd >= 0) {
          try { closeSync(handle.fd); } catch { /* already closed */ }
        }
      }
    };

    let seccompFd = -1;
    let child: RunningChild | null = null;
    // H1: one deadline for the whole preparation phase (see `SandboxDeadline`).
    // Everything that can await — the bwrap probe above all — is bounded by it;
    // the timer that limits the payload only starts once the payload exists.
    const preparation = new SandboxDeadline(this.preparationDeadlineMs);
    try {
      // ── 4. Read-only ops only make sense on the mounted tree. Re-derive the
      //        in-sandbox path from the proven relative path. ───────────────
      const opArgv = buildReadOnlyOpArgv({
        op: request.op,
        path: leafProof.path,
        root: rootProof.path,
        ...(request.pattern !== undefined ? { pattern: request.pattern } : {}),
        maxOutputBytes: limits.maxOutputBytes,
      });

      const seccompArch: SeccompArch | undefined = seccompArchFor(this.arch);
      if (!seccompArch) {
        return {
          ok: false, error: "sandbox_unavailable",
          reason: `no seccomp policy for architecture ${this.arch}; refusing`,
          executed: false, durationMs: elapsed(),
        };
      }
      let bwrap: string;
      try {
        bwrap = await preparation.race("the bwrap capability probe", this.resolveBwrap());
      } catch (error) {
        return {
          ok: false, error: "sandbox_unavailable",
          reason: (error as Error).message, executed: false, durationMs: elapsed(),
        };
      }
      seccompFd = openSeccompFd(buildSeccompFilter(seccompArch));

      const argv = buildSandboxArgv({ limits, opArgv, optionalSystemDirs: presentSystemDirs() });

      // H1: the last chance to refuse before a process exists. If preparation
      // burned the whole budget (a slow probe, a cold page cache), starting the
      // payload now would exceed the caller's patience with no bound on total
      // time; refusing here keeps the deadline meaningful for the whole request.
      preparation.assertNotExpired("the spawn");

      child = spawnSandboxed({
        bwrap, argv,
        inheritedFds: [rootProof.fd, seccompFd],
        pdeathsigWrapper: this.pdeathsigWrapper,
      });
      this.running.add(child);

      let stdout = "";
      let stderr = "";
      let outputExceeded = false;
      // Readers are tracked so a kill can unblock them. Killing the direct child
      // is not enough on its own: a payload that inherited the pipe write end
      // keeps the fd open, so `reader.read()` never sees `done` and the await
      // hangs for as long as that orphan lives (observed: a 60s test timeout on a
      // 1ms wall limit). `cancel()` is what actually releases the read.
      const activeReaders = new Set<ReadableStreamDefaultReader<Uint8Array>>();
      const collect = async (stream: ReadableStream<Uint8Array>): Promise<string> => {
        const reader = stream.getReader();
        activeReaders.add(reader);
        const chunks: Uint8Array[] = [];
        let total = 0;
        try {
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > limits.maxOutputBytes) {
              outputExceeded = true;
              stopEverything();
              break;
            }
            chunks.push(value);
          }
        } catch {
          // A cancelled reader rejects; that is the teardown path, not a failure.
        } finally {
          activeReaders.delete(reader);
          try { reader.releaseLock(); } catch { /* already released */ }
        }
        return new TextDecoder().decode(Buffer.concat(chunks));
      };

      let limitReached: "cpu" | "wall" | null = null;
      /** Kill the child AND unblock every pending read. Idempotent. */
      const stopEverything = () => {
        child?.stop();
        for (const reader of activeReaders) {
          reader.cancel().catch(() => { /* already closed */ });
        }
      };
      const wallTimer = setTimeout(() => {
        limitReached = "wall";
        stopEverything();
      }, limits.wallMs);

      let exitCode: number | null;
      try {
        const [out, err, code] = await Promise.all([
          collect(child.stdout),
          collect(child.stderr),
          child.done,
        ]);
        stdout = out;
        stderr = err;
        exitCode = code;
      } finally {
        clearTimeout(wallTimer);
      }

      if (outputExceeded) {
        return {
          ok: false, error: "sandbox_output_limit",
          reason: `output exceeded ${limits.maxOutputBytes} bytes; the run was stopped`,
          executed: true, exitCode: exitCode ?? 0, stdout, stderr,
          limitReached: null, durationMs: elapsed(),
        };
      }
      if (limitReached === "wall") {
        return {
          ok: false, error: "sandbox_timeout",
          reason: `wall-clock limit of ${limits.wallMs}ms reached; the run was killed`,
          executed: true, exitCode: exitCode ?? null, stdout, stderr,
          limitReached: "wall", durationMs: elapsed(),
        };
      }
      // Attribution from exit status alone: SIGXCPU (152) is unambiguous.
      // Address-space exhaustion is NOT attributable here (a failed malloc and a
      // genuine crash share a nonzero status), so it is reported as a plain
      // non-zero exit rather than guessed at.
      if (exitCode === 152) limitReached = "cpu";
      if (exitCode !== 0) {
        return {
          ok: false, error: "sandbox_op_failed",
          reason: limitReached === "cpu"
            ? `CPU limit of ${limits.cpuSeconds}s was reached (SIGXCPU)`
            : `operation exited with status ${exitCode}`,
          executed: true, exitCode, stdout, stderr, limitReached, durationMs: elapsed(),
        };
      }
      return {
        ok: true, op: request.op,
        path: leafProof.path.slice(rootProof.path.length + 1) || ".",
        exitCode: exitCode ?? 0, stdout, stderr,
        limitReached: null, durationMs: elapsed(),
      };
    } catch (error) {
      return {
        ok: false, error: "sandbox_unavailable",
        reason: (error as Error).message, executed: false, durationMs: elapsed(),
      };
    } finally {
      if (child) {
        child.stop();
        this.running.delete(child);
        // Bounded wait so teardown cannot itself hang the caller; the payload
        // dies via --die-with-parent regardless of what this await returns.
        await Promise.race([
          child.done.catch(() => null),
          new Promise((resolve) => setTimeout(resolve, TEARDOWN_GRACE_MS)),
        ]);
      }
      if (seccompFd >= 0) {
        try { closeSync(seccompFd); } catch { /* already closed */ }
      }
      closeHandles();
      // H2: the slot is released on EVERY exit path (success, timeout, throw).
      // `release()` is idempotent, so a double call cannot inflate the ceiling.
      releaseAdmission();
    }
  }

  /** Kill every in-flight run and refuse new ones. Idempotent. */
  async dispose(): Promise<void> {
    this.disposed = true;
    const running = [...this.running];
    this.running.clear();
    for (const child of running) child.stop();
    await Promise.all(running.map((child) =>
      Promise.race([
        child.done.catch(() => null),
        new Promise((resolve) => setTimeout(resolve, TEARDOWN_GRACE_MS)),
      ])
    ));
  }
}
