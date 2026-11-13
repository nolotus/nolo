// packages/agent-runtime/readOnlySandboxLimits.ts
//
// Resource limits for the minimal read-only web sandbox (plan item A).
//
// Pure string work only: no fs, no spawn, no env. The limits are handed to the
// kernel by wrapping the payload in `prlimit`, which is already available in
// the sandbox because /usr is bind-mounted read-only. Verified locally
// (bubblewrap 0.12.0 / util-linux 2.41.6): inside the namespace
// `prlimit --as=268435456 --cpu=2 --nproc=64 --nofile=64 -- /bin/sh -c
// 'ulimit -v'` reports 262144 KiB, so the limits survive bwrap's exec chain.
//
// Why prlimit and not bwrap flags: bwrap exposes no rlimit option (checked
// with `bwrap --help | grep -c rlimit` -> 0 on 0.12.0). The only kernel-level
// route available without new privileges is a pre-exec prlimit wrapper.
//
// Honesty note carried into the executor: CPU and wall-clock exhaustion are
// *attributable* (SIGXCPU / our own timer), so they are reported as limits.
// Address-space exhaustion is NOT attributable from the exit status alone
// (a failed malloc and a genuine crash both surface as a nonzero exit), so the
// executor reports the raw exit code instead of guessing a causal label.

/** Defaults are the minimal contract; callers may only tighten them. */
export const READ_ONLY_SANDBOX_LIMITS = Object.freeze({
  /** RLIMIT_AS: 256 MiB of address space per sandboxed process. */
  memoryBytes: 256 * 1024 * 1024,
  /** RLIMIT_CPU soft limit (seconds); hard limit is +1s so SIGXCPU lands first. */
  cpuSeconds: 10,
  /** Wall-clock ceiling enforced by the supervisor (ms), independent of CPU time. */
  wallMs: 15_000,
  /** RLIMIT_NPROC / RLIMIT_NOFILE: a fork bomb has nothing to fork for. */
  maxProcesses: 64,
  maxOpenFiles: 64,
  /** Size of the private tmpfs mounted at /tmp (bytes). */
  tmpfsBytes: 32 * 1024 * 1024,
  /** Hard cap on bytes captured from stdout+stderr before the run is killed. */
  maxOutputBytes: 1024 * 1024,
} as const);

export type ReadOnlySandboxLimits = {
  memoryBytes: number;
  cpuSeconds: number;
  wallMs: number;
  maxProcesses: number;
  maxOpenFiles: number;
  tmpfsBytes: number;
  maxOutputBytes: number;
};

const positiveInt = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value > 0;

/**
 * Resolve limits from optional caller overrides.
 *
 * Fail-closed: an override that is not a positive integer is refused, never
 * silently replaced by the default (a typo must not become "unlimited"), and
 * an override can only LOWER a ceiling — raising it is refused rather than
 * quietly clamped, because a silently clamped limit reads to the caller as an
 * accepted setting.
 */
export function resolveReadOnlySandboxLimits(
  overrides: Partial<ReadOnlySandboxLimits> = {},
): ReadOnlySandboxLimits {
  const resolved: ReadOnlySandboxLimits = { ...READ_ONLY_SANDBOX_LIMITS };
  for (const key of Object.keys(overrides) as Array<keyof ReadOnlySandboxLimits>) {
    const raw = overrides[key];
    if (raw === undefined) continue;
    if (!(key in READ_ONLY_SANDBOX_LIMITS)) {
      throw new Error(`Unknown sandbox limit: ${String(key)}`);
    }
    if (!positiveInt(raw)) {
      throw new Error(`Sandbox limit ${String(key)} must be a positive integer (got ${String(raw)})`);
    }
    const ceiling = READ_ONLY_SANDBOX_LIMITS[key];
    if (raw > ceiling) {
      throw new Error(
        `Sandbox limit ${String(key)}=${raw} exceeds the enforced ceiling ${ceiling}; raising limits is not supported`,
      );
    }
    resolved[key] = raw;
  }
  return resolved;
}

/**
 * `prlimit` argv that applies `limits` to the payload. Terminated by `--` so
 * the caller appends the payload argv.
 *
 * `--cpu=<soft>:<hard>` (not plain `--cpu=`) so the kernel raises SIGXCPU
 * before SIGKILL; a bare value sets both and the process dies without a
 * diagnosable status. `--fsize` is deliberately absent: nothing in a read-only
 * sandbox should be able to write a host file, and a writable-looking limit
 * would imply otherwise.
 */
export function buildPrlimitArgs(limits: ReadOnlySandboxLimits): string[] {
  const memory = String(limits.memoryBytes);
  const cpuSoft = String(limits.cpuSeconds);
  const cpuHard = String(limits.cpuSeconds + 1);
  return [
    "/usr/bin/prlimit",
    `--as=${memory}:${memory}`,
    `--cpu=${cpuSoft}:${cpuHard}`,
    `--nproc=${limits.maxProcesses}:${limits.maxProcesses}`,
    `--nofile=${limits.maxOpenFiles}:${limits.maxOpenFiles}`,
  ];
}

/** Exit status the kernel produces for SIGXCPU (128 + 24) or SIGKILL (128 + 9). */
export const SIGXCPU_EXIT_CODE = 152;
export const SIGKILL_EXIT_CODE = 137;

/** Only CPU exhaustion is attributable from the exit status. */
export function attributeLimitFromExit(
  exitCode: number | null | undefined,
): "cpu" | null {
  return exitCode === SIGXCPU_EXIT_CODE ? "cpu" : null;
}
