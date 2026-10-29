// packages/agent-runtime/sandboxCommandPrefix.ts
//
// G6 wiring: bubblewrap (bwrap) sandbox as an execShell *command prefix*.
//
// Why a prefix and not a new execution backend: runWorkspaceCommand already
// splices `commandPrefix` ahead of the argv it spawns
// (workspaceShell.ts → `[...(args.commandPrefix ?? []), ...args.command]`), so
// a trailing `--` turns the whole spawn into
//   [bwrap, <args…>, "--", /bin/bash, -c, <cmd>]
// with **zero** changes to spawnChildProcess, the process registry, the
// detach/envelope logic, or the approval binding (which hashes commandPrefix).
//
// Host-neutral by construction: the argv builder and the env gate are pure
// string/array work (no fs, no spawn). Only probeBwrap() is node-only — bwrap
// can be *installed yet unusable* (unprivileged user namespaces disabled →
// "setting up uid map: Permission denied"), which a PATH lookup cannot detect.
// The probe is injectable, so tests never depend on the host having bwrap.
//
// Baseline verified live on Fedora 44 / bubblewrap 0.12.0 (2026-10-28):
//   - workspace bind visible AND writable at the same absolute path
//   - `env` inside the sandbox shows only PATH/HOME/TMPDIR/PWD/SHLVL
//   - 127.0.0.1:38123 unreachable (own netns), 4 PIDs visible (own pidns)
// Two ordering rules came out of that run and are load-bearing:
//   1. `--size` must come BEFORE the `--tmpfs` it sizes ("--size must be
//      followed by --tmpfs"), hence tmpfs size then tmpfs.
//   2. The workspace bind must come AFTER `--tmpfs /tmp`, or a workspace
//      located under /tmp is shadowed by the tmpfs and `--chdir` fails.
// A third rule was added after review (2026-10-28 case):
//   3. Shadow mounts for sensitive workspace paths (`data/`, `.env*`, `.git`,
//      NOLO_HOME) must come AFTER the workspace bind — bwrap applies mounts in
//      argv order, so a shadow emitted earlier would be re-exposed by the
//      workspace bind that follows it.
//
// ⚠️ Scope of this helper: it is only SAFE-AS-IS for an EMPTY per-run
// workspace (the alpha `/tmp/nolo-hosted-workspaces/<ulid>` case). Three other
// call sites hand it a real repository checkout (cliLocalToolExecutors.ts,
// desktopAgentRuntimeTurnService.ts, workspaceLease.ts); binding a checkout
// exposes that checkout's `data/leveldb` + `.env` (verified live: CASE A reads
// both, CASE B on an empty temp dir reads neither). That hole is CLOSED: the
// shadow pass below runs on every prefix build (rule 3), the shadow targets
// track the app's own path helpers (`resolveNoloStateDir`, `NOLO_SERVER_DB_PATH`)
// rather than hand-written constants, and anything unresolvable refuses to
// build a prefix at all — a sandbox that {looks isolated but isn't} is worse
// than no sandbox.
//
// ⚠️ Fail-closed, not fail-open: `NOLO_SHELL_SANDBOX=1` is a statement of
// intent ("I want isolation"). If bwrap is missing/unusable or a shadow target
// cannot be resolved, the prefix is NOT produced and
// `resolveShellSandboxPlan()` tells the caller to refuse the command instead of
// running it on the host. The plan's `status` string (`host:unavailable:<why>`)
// is what the caller is expected to surface on every execShell result.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, realpathSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve as resolvePath, sep } from "node:path";

import type { ExecutionPolicy } from "./executionEndpoint";
import { resolveNoloStateDir } from "./noloStateDir";
import { resolveExecutableOnPath } from "./runtimeCompat";

/** Set to "1" to route execShell through the bwrap prefix. Default: host. */
export const SHELL_SANDBOX_ENV = "NOLO_SHELL_SANDBOX";

/** tmpfs for /tmp. bwrap's default is 50% of RAM (800M on a 1.6G box). */
export const DEFAULT_SANDBOX_TMPFS_SIZE_BYTES = 128 * 1024 * 1024;

/**
 * System trees the sandbox needs to be usable at all, bind-mounted read-only.
 * `-try` variants keep the prefix valid on hosts without /lib64 or /sbin.
 * /etc carries NSS + CA certs (curl/git TLS); /usr/local carries locally
 * installed runtimes. Nothing else from the host is visible.
 */
export const SANDBOX_SYSTEM_RO_BINDS = [
  "/usr",
  "/lib",
  "/lib64",
  "/bin",
  "/sbin",
  "/etc",
  "/usr/local",
] as const;

export const SANDBOX_PATH = "/usr/bin:/bin";
export const SANDBOX_TMP_DIR = "/tmp";

export type BwrapPrefixArgs = {
  /** Absolute workspace path; also the sandbox cwd and the writable bind target. */
  workspaceRoot: string;
  /** true → `--bind` (writable); false → `--ro-bind` (read-only inspection). */
  workspaceWritable: boolean;
  /** Absolute path to the bwrap binary, resolved on the HOST (outside the sandbox). */
  bwrapPath: string;
  tmpfsSizeBytes?: number;
  /** Extra `--setenv KEY=VALUE` pairs, applied after the baseline env. */
  env?: Record<string, string>;
  /**
   * Paths inside the workspace bind that must be hidden. Emitted AFTER the
   * workspace bind (mount order decides the winner) — see rule 3 in the header.
   */
  shadowTargets?: readonly BwrapShadowTarget[];
};

/** How a sensitive workspace path is hidden from the sandboxed command. */
export type BwrapShadowTarget = {
  /** Absolute path, always inside the workspace bind. */
  path: string;
  /**
   * `dir` → create an empty tmpfs there (contents unreachable);
   * `file` → bind /dev/null over it (reads as empty, writes go nowhere);
   * `readonly` → bind the path to itself read-only (`.git`: reads work, writes fail).
   */
  mode: "dir" | "file" | "readonly";
};

/**
 * Pure argv builder — no probing, no spawn, no fs. Returns the full bwrap argv
 * ending with `--` so the caller's command follows as the payload.
 */
export function buildBwrapArgs(args: BwrapPrefixArgs): string[] {
  const workspaceRoot = args.workspaceRoot;
  const tmpfsSize = normalizePositiveInteger(args.tmpfsSizeBytes, DEFAULT_SANDBOX_TMPFS_SIZE_BYTES);

  const argv: string[] = [
    args.bwrapPath,
    // Namespaces + lifecycle: no net, no pid, no ipc, no uts, no cgroup, no
    // user-ns escape surface; the child dies with us; no controlling tty.
    "--unshare-all",
    "--die-with-parent",
    "--new-session",
    // No capabilities at all: mount/ptrace/bpf are the escape primitives.
    "--cap-drop",
    "ALL",
  ];

  for (const path of SANDBOX_SYSTEM_RO_BINDS) {
    argv.push("--ro-bind-try", path, path);
  }

  argv.push(
    "--proc",
    "/proc",
    "--dev",
    "/dev",
    // size before tmpfs (see the ordering note in the file header)
    "--size",
    String(tmpfsSize),
    "--tmpfs",
    SANDBOX_TMP_DIR,
  );

  // Workspace LAST among the mounts: a tmpfs on /tmp would otherwise hide a
  // workspace that lives under /tmp.
  argv.push(
    args.workspaceWritable ? "--bind" : "--ro-bind",
    workspaceRoot,
    workspaceRoot,
    "--chdir",
    workspaceRoot,
  );

  // Sensitive paths INSIDE that workspace bind (data/leveldb, .env, .git,
  // NOLO_HOME): mount order decides the winner, so these must follow the bind.
  for (const target of args.shadowTargets ?? []) {
    if (!target.path) continue;
    if (target.mode === "readonly") {
      argv.push("--ro-bind", target.path, target.path);
    } else if (target.mode === "dir") {
      argv.push("--dir", target.path, "--tmpfs", target.path);
    } else {
      argv.push("--ro-bind", "/dev/null", target.path);
    }
  }

  // clearenv is the credential boundary: no SECRET_KEY, no provider keys, no
  // NOLO_* host config reaches the command. Baseline env is re-added explicitly.
  argv.push(
    "--clearenv",
    "--setenv",
    "PATH",
    SANDBOX_PATH,
    // HOME/TMPDIR must be writable and ephemeral; without HOME most tooling
    // (git, curl, ssh) refuses to start.
    "--setenv",
    "HOME",
    SANDBOX_TMP_DIR,
    "--setenv",
    "TMPDIR",
    SANDBOX_TMP_DIR,
  );

  for (const [key, value] of Object.entries(args.env ?? {})) {
    if (!key || key === "PATH" || key === "HOME" || key === "TMPDIR") continue;
    argv.push("--setenv", key, value);
  }

  argv.push("--");
  return argv;
}

export type BwrapProbeResult = {
  available: boolean;
  bwrapPath: string | null;
  /** Why it is unavailable (also the warn text). Absent when available. */
  reason?: string;
};

/** Injectable probe: lets tests simulate "no bwrap" without touching the host. */
export type SandboxProbe = () => BwrapProbeResult;

const BWRAP_PROBE_TIMEOUT_MS = 5_000;

/**
 * Real capability probe (node-only, Linux-only).
 *
 * Two steps on purpose: `--version` proves the binary runs, then a REAL
 * sandbox spawn proves user namespaces are actually usable
 * (`kernel.unprivileged_userns_clone=0` / seccomp-blocked userns: bwrap exists
 * but every sandbox spawn fails).
 *
 * Step 2 must spawn the SAME argv shape production will spawn, pointing at a
 * throwaway empty directory: a hand-written `--unshare-all --ro-bind / /`
 * probe passes on hosts where the production argv hard-fails (`--size` before
 * `--tmpfs` requires bwrap ≥ 0.6, Debian 11 ships 0.4.1). A probe that does
 * not exercise `--proc` / `--dev` / `--size` / workspace `--bind` is a
 * false-positive generator.
 */
export function probeBwrap(): BwrapProbeResult {
  if (process.platform !== "linux") {
    return {
      available: false,
      bwrapPath: null,
      reason: `bwrap sandbox unsupported on ${process.platform}`,
    };
  }
  const bwrapPath = resolveExecutableOnPath("bwrap");
  if (!bwrapPath) {
    return { available: false, bwrapPath: null, reason: "bwrap not found on PATH" };
  }
  const version = spawnSync(bwrapPath, ["--version"], {
    timeout: BWRAP_PROBE_TIMEOUT_MS,
    encoding: "utf8",
  });
  if (version.error || version.status !== 0) {
    return {
      available: false,
      bwrapPath,
      reason: `bwrap --version failed: ${describeProbeFailure(version)}`,
    };
  }

  // Production-shaped spawn: identical argv, empty temp workspace.
  let probeWorkspace: string | null = null;
  try {
    probeWorkspace = mkdtempSync(join(tmpdir(), "nolo-bwrap-probe-"));
    const probeArgv = buildBwrapArgs({
      workspaceRoot: probeWorkspace,
      workspaceWritable: true,
      bwrapPath,
      shadowTargets: [],
    });
    // argv ends with "--" already; the payload goes right after it.
    const payload = resolveExecutableOnPath("true") ?? "/bin/true";
    const spawnArgv = [...probeArgv.slice(1), payload];
    const sandbox = spawnSync(bwrapPath, spawnArgv, {
      timeout: BWRAP_PROBE_TIMEOUT_MS,
      encoding: "utf8",
    });
    if (sandbox.error || sandbox.status !== 0) {
      return {
        available: false,
        bwrapPath,
        reason: `bwrap cannot run the production argv: ${describeProbeFailure(sandbox)}`,
      };
    }
  } catch (error) {
    return {
      available: false,
      bwrapPath,
      reason: `bwrap production-argv probe failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    if (probeWorkspace) {
      try {
        rmSync(probeWorkspace, { recursive: true, force: true });
      } catch {
        // A leftover empty dir in tmpdir is not worth failing the probe over.
      }
    }
  }

  return { available: true, bwrapPath };
}

/**
 * How long a probe answer is trusted. Stale answers are load-bearing bugs in
 * both directions: a cached POSITIVE goes on to break every execShell after the
 * host changes (userns disabled, bwrap downgraded), and a cached NEGATIVE keeps
 * the sandbox off after ops fixed the host. TTL bounds both; a sandbox-class
 * spawn failure additionally invalidates immediately (`noteBwrapSpawnFailure`).
 */
export const BWRAP_PROBE_TTL_MS = 5 * 60_000;

let cachedProbe: BwrapProbeResult | null = null;
let cachedProbeAt = 0;

/** Process-wide probe memo with a TTL: cheap per turn, never permanently wrong. */
export function probeBwrapCached(): BwrapProbeResult {
  const now = Date.now();
  if (cachedProbe && now - cachedProbeAt < BWRAP_PROBE_TTL_MS) return cachedProbe;
  cachedProbe = probeBwrap();
  cachedProbeAt = now;
  return cachedProbe;
}

/** Drop the memo; the next call re-probes. */
export function invalidateBwrapProbeCache(): void {
  cachedProbe = null;
  cachedProbeAt = 0;
}

/**
 * Feed a failed spawn's stderr back in: a `bwrap:` diagnostic means the host
 * changed under us, so the cached positive is wrong and must be re-probed.
 * Returns true when the cache was invalidated.
 */
export function noteBwrapSpawnFailure(stderr: unknown): boolean {
  const text = typeof stderr === "string" ? stderr : "";
  if (!text.includes("bwrap:")) return false;
  invalidateBwrapProbeCache();
  return true;
}

export function resetBwrapProbeCacheForTests(): void {
  invalidateBwrapProbeCache();
}

/** Reasons already warned about in this process (bwrap missing is not per-command news). */
const warnedReasons = new Set<string>();

export function resetSandboxWarningsForTests(): void {
  warnedReasons.clear();
}

export type BuildBwrapCommandPrefixArgs = {
  workspaceRoot: string;
  workspaceWritable: boolean;
  probe?: SandboxProbe;
  /** Warn sink; defaults to console.warn. An injected sink is never de-duplicated. */
  warn?: (message: string) => void;
  tmpfsSizeBytes?: number;
  env?: Record<string, string>;
  /**
   * Sensitive-path resolver. Defaults to `resolveSandboxShadowTargets`, which
   * reuses the app's own path helpers. A resolver that cannot answer must
   * return `{ ok: false }` — the prefix is then refused (never silently
   * un-shadowed).
   */
  resolveShadowTargets?: SandboxShadowResolver;
};

export type SandboxShadowPlan =
  | { ok: true; targets: BwrapShadowTarget[] }
  | { ok: false; reason: string };

export type SandboxShadowResolver = (workspaceRoot: string) => SandboxShadowPlan;

/**
 * Resolve the paths inside `workspaceRoot` that must be hidden from a
 * sandboxed command. Reuses the app's own path resolution (env + NOLO_HOME
 * helpers) instead of hand-written constants, so the shadow list cannot drift
 * away from where the data actually lives.
 *
 * Only paths that are strictly INSIDE the workspace bind matter — nothing else
 * from the host is mounted into the sandbox. Anything that cannot be resolved
 * (relative `NOLO_SERVER_DB_PATH`, an unreadable workspace, a stat error other
 * than "missing") fails closed with `{ ok: false }`.
 *
 * ⚠️ Reasons are MODEL-VISIBLE (they end up in `plan.status` / `plan.reason`
 * and are returned to the model), so they name the failed target by SYMBOL
 * (`.env`, `data`, `.git`, `NOLO_HOME`, `NOLO_SERVER_DB_PATH`, `workspace`)
 * and only the errno code (`ELOOP`, `EACCES`, …) — never an absolute host path.
 * `describeFsError` is deliberately not used here: Node puts the path in
 * `error.message` (e.g. `ELOOP: too many symbolic links encountered, lstat
 * '/root/ws/.env'`), which would leak the host layout.
 */
export function resolveSandboxShadowTargets(
  workspaceRoot: string,
  env: Record<string, string | undefined> = process.env,
): SandboxShadowPlan {
  const root = canonicalizeWorkspaceRoot(workspaceRoot);
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch (error) {
    // A workspace that does not exist yet has nothing to hide (the bind fails
    // at spawn, which is the caller's problem). Anything else means we cannot
    // enumerate what lives there — refuse rather than guess.
    if (isMissingPathError(error)) return { ok: true, targets: [] };
    return {
      ok: false,
      reason: `workspace is not readable (${describeFsErrorCode(error)})`,
    };
  }

  const candidates: {
    path: string;
    mode: BwrapShadowTarget["mode"];
    /** Symbolic name for reasons — never the resolved host path (see header). */
    symbol: string;
  }[] = [];
  for (const entry of entries) {
    if (entry === ".env" || entry.startsWith(".env.")) {
      candidates.push({ path: join(root, entry), mode: "file", symbol: entry });
    }
  }
  if (entries.includes(".git")) {
    // Read-only, not hidden: git reads still work, history cannot be rewritten.
    candidates.push({ path: join(root, ".git"), mode: "readonly", symbol: ".git" });
  }
  if (entries.includes("data")) {
    // Covers data/leveldb, data/wal, data/chat-proxy-internal-token, uploads.
    candidates.push({ path: join(root, "data"), mode: "dir", symbol: "data" });
  }

  const serverDbPath = env.NOLO_SERVER_DB_PATH?.trim();
  if (serverDbPath) {
    // Same precedence as resolveServerDbPath(); a relative value is unresolvable here.
    if (!serverDbPath.startsWith(sep)) {
      return {
        ok: false,
        // The value itself is not echoed: it is caller env, not our business to
        // replay into a model-visible string.
        reason: `NOLO_SERVER_DB_PATH is not absolute — cannot derive a shadow target`,
      };
    }
    candidates.push({ path: serverDbPath, mode: "dir", symbol: "NOLO_SERVER_DB_PATH" });
  }

  const noloHome = dirname(resolveNoloStateDir("credentials"));
  candidates.push({ path: noloHome, mode: "dir", symbol: "NOLO_HOME" });

  const targets: BwrapShadowTarget[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    let real: string;
    try {
      real = realpathSync(candidate.path);
    } catch (error) {
      // Not present → nothing to hide (this is the empty-hosted-workspace case).
      if (isMissingPathError(error)) continue;
      return {
        ok: false,
        reason: `cannot resolve ${candidate.symbol} (${describeFsErrorCode(error)})`,
      };
    }
    // Outside the workspace bind (or the workspace itself) → unreachable anyway.
    if (!isStrictlyInside(root, real)) continue;
    if (seen.has(real)) continue;
    seen.add(real);

    let mode = candidate.mode;
    try {
      const stats = statSync(real);
      if (mode === "dir" && !stats.isDirectory()) mode = "file";
      else if (mode === "file" && stats.isDirectory()) mode = "dir";
    } catch (error) {
      if (isMissingPathError(error)) continue;
      return {
        ok: false,
        reason: `cannot stat ${candidate.symbol} (${describeFsErrorCode(error)})`,
      };
    }
    targets.push({ path: real, mode });
  }

  return { ok: true, targets };
}

type BwrapPrefixOutcome =
  | { ok: true; prefix: string[] }
  | { ok: false; reason: string };

function buildBwrapPrefixOutcome(args: BuildBwrapCommandPrefixArgs): BwrapPrefixOutcome {
  const probe = (args.probe ?? probeBwrapCached)();
  if (!probe.available || !probe.bwrapPath) {
    const reason = probe.reason ?? "unknown reason";
    emitSandboxWarning(
      args.warn,
      `[shell-sandbox] bwrap unavailable (${reason}); refusing to fall back to the HOST (fail-closed)`,
      reason,
    );
    return { ok: false, reason };
  }
  const workspaceRoot = canonicalizeWorkspaceRoot(args.workspaceRoot);
  const resolveShadowTargets = args.resolveShadowTargets ?? resolveSandboxShadowTargets;
  const shadow = resolveShadowTargets(workspaceRoot);
  if (!shadow.ok) {
    emitSandboxWarning(
      args.warn,
      `[shell-sandbox] cannot shadow sensitive workspace paths (${shadow.reason}); refusing to fall back to the HOST (fail-closed)`,
      `shadow:${shadow.reason}`,
    );
    return { ok: false, reason: shadow.reason };
  }
  return {
    ok: true,
    prefix: buildBwrapArgs({
      workspaceRoot,
      workspaceWritable: args.workspaceWritable,
      bwrapPath: probe.bwrapPath,
      shadowTargets: shadow.targets,
      ...(args.tmpfsSizeBytes !== undefined ? { tmpfsSizeBytes: args.tmpfsSizeBytes } : {}),
      ...(args.env ? { env: args.env } : {}),
    }),
  };
}

/**
 * Build the execShell prefix, or `null` when no prefix can be produced.
 *
 * @deprecated `null` is ambiguous — it cannot be told apart from "the switch is
 * off". Any caller that treats it as "run on the host" reproduces the
 * fail-open bug this module was fixed for. Use `resolveShellSandboxPlan`.
 */
export function buildBwrapCommandPrefix(args: BuildBwrapCommandPrefixArgs): string[] | null {
  const outcome = buildBwrapPrefixOutcome(args);
  return outcome.ok ? outcome.prefix : null;
}

/** `NOLO_SHELL_SANDBOX=1` (or "true") enables the prefix. Anything else = host. */
export function isShellSandboxEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env[SHELL_SANDBOX_ENV];
  if (typeof raw !== "string") return false;
  const value = raw.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

/**
 * The ops kill switch: `NOLO_SHELL_SANDBOX=0|false|off` (case-insensitive).
 *
 * This is NOT the same question as `isShellSandboxEnabled`. That one asks
 * "did someone ask for isolation?" (a feature switch, owner machine); this
 * one asks "did the operator forbid isolation?" (an ops override, every
 * policy). Under `isolated-strictly` the env var no longer opts *in* — it can
 * only veto. And a veto means "do not execute", never "execute on the host":
 * turning the sandbox off is turning the *execution* off.
 */
export function isShellSandboxExplicitlyDisabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env[SHELL_SANDBOX_ENV];
  if (typeof raw !== "string") return false;
  const value = raw.trim().toLowerCase();
  return value === "0" || value === "false" || value === "off";
}

export type ResolveShellSandboxPrefixArgs = {
  workspaceRoot: string;
  /** Defaults to true: execShell is the write path, not an inspection path. */
  workspaceWritable?: boolean;
  env?: Record<string, string | undefined>;
  probe?: SandboxProbe;
  warn?: (message: string) => void;
  tmpfsSizeBytes?: number;
  envVars?: Record<string, string>;
  resolveShadowTargets?: SandboxShadowResolver;
  /**
   * Which execution policy asks for this shell.
   *
   * - `host-trusted` (owner machine): `NOLO_SHELL_SANDBOX` stays a feature
   *   switch — unset/negative means "run on the host", `1` means "isolate".
   * - `isolated-strictly` (web origin, third-party code): the env var is an
   *   **ops override**, not a feature switch. Isolation is the default; the
   *   env var can only veto it (`0|false|off` → refuse, never fall back to
   *   the host).
   *
   * Defaults to `isolated-strictly` (fail-closed): an undeclared policy must
   * never be read as "the operator trusts the host".
   */
  executionPolicy?: ExecutionPolicy;
};

/**
 * The switch's three outcomes, and what each one obliges the caller to do:
 *
 * - `off`         → run on the host. That IS the configured behaviour.
 * - `sandbox`     → prepend `prefix`; `status` ("bwrap") goes on the result.
 * - `unavailable` → the switch is ON but isolation is impossible. The caller
 *                   must FAIL the command: `status` is
 *                   `host:unavailable:<why>` and is meant to be surfaced on
 *                   every execShell result so a degraded host is never silent.
 */
export type ShellSandboxPlan =
  | { kind: "off"; status: "host" }
  | { kind: "sandbox"; status: "bwrap"; prefix: string[] }
  | {
      kind: "unavailable";
      status: string;
      error: "shell_sandbox_unavailable";
      reason: string;
    };

/** The one entry point server/host wiring should call. Fails CLOSED. */
export function resolveShellSandboxPlan(args: ResolveShellSandboxPrefixArgs): ShellSandboxPlan {
  const env = args.env ?? process.env;
  const policy = args.executionPolicy ?? "isolated-strictly";

  if (policy === "host-trusted") {
    // Owner machine: unchanged behaviour. The env var is a feature switch —
    // off means "the operator asked for host execution".
    if (!isShellSandboxEnabled(env)) return { kind: "off", status: "host" };
  } else {
    // isolated-strictly: the env var is an ops override that can only VETO
    // isolation. A veto means "do not execute" — never "execute on the host".
    if (isShellSandboxExplicitlyDisabled(env)) {
      const reason =
        "shell sandbox was explicitly disabled by the operator; refusing to run the command on the host (fail-closed)";
      emitSandboxWarning(
        args.warn,
        `[shell-sandbox] ${reason}`,
        "operator-disabled",
      );
      return {
        kind: "unavailable",
        status: `host:unavailable:${reason}`,
        error: "shell_sandbox_unavailable",
        reason,
      };
    }
    // Not disabled → isolation is mandatory: probe and build the prefix. The
    // "switch on" wording is gone; there is no "not on" state any more.
  }

  const outcome = buildBwrapPrefixOutcome({
    workspaceRoot: args.workspaceRoot,
    workspaceWritable: args.workspaceWritable ?? true,
    ...(args.probe ? { probe: args.probe } : {}),
    ...(args.warn ? { warn: args.warn } : {}),
    ...(args.tmpfsSizeBytes !== undefined ? { tmpfsSizeBytes: args.tmpfsSizeBytes } : {}),
    ...(args.envVars ? { env: args.envVars } : {}),
    ...(args.resolveShadowTargets ? { resolveShadowTargets: args.resolveShadowTargets } : {}),
  });
  if (!outcome.ok) {
    // Model-visible boundary: scrub absolute host paths from both fields. The
    // producers are symbolic already; this catches probe stderr (bwrap quotes
    // the paths it was handed) and any future regression.
    const reason = redactHostPaths(outcome.reason);
    return {
      kind: "unavailable",
      status: `host:unavailable:${reason}`,
      error: "shell_sandbox_unavailable",
      reason,
    };
  }
  return { kind: "sandbox", status: "bwrap", prefix: outcome.prefix };
}

/**
 * Legacy prefix-only view of `resolveShellSandboxPlan`.
 *
 * @deprecated Prefer `resolveShellSandboxPlan`: `null` here means "off" OR
 * "unavailable", and only the plan can tell them apart.
 */
export function resolveShellSandboxCommandPrefix(
  args: ResolveShellSandboxPrefixArgs,
): string[] | null {
  const plan = resolveShellSandboxPlan(args);
  return plan.kind === "sandbox" ? plan.prefix : null;
}

function emitSandboxWarning(
  warn: ((message: string) => void) | undefined,
  message: string,
  dedupeKey: string,
): void {
  if (warn) {
    // Injected sink = the caller wants every occurrence (tests / diagnostics).
    warn(message);
    return;
  }
  if (warnedReasons.has(dedupeKey)) return;
  warnedReasons.add(dedupeKey);
  console.warn(message);
}

/**
 * bwrap resolves bind sources symlink-aware but compares paths textually; hand
 * it the real path so a workspace reached through a symlink still mounts at
 * the cwd the caller spawns with.
 */
function canonicalizeWorkspaceRoot(workspaceRoot: string): string {
  const absolute = resolvePath(workspaceRoot);
  try {
    return realpathSync(absolute);
  } catch {
    return absolute;
  }
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

/** True for a path strictly below `root` (the root itself is excluded). */
function isStrictlyInside(root: string, candidate: string): boolean {
  const prefix = root.endsWith(sep) ? root : `${root}${sep}`;
  return candidate.length > prefix.length && candidate.startsWith(prefix);
}

function isMissingPathError(error: unknown): boolean {
  const code = typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: unknown }).code
    : undefined;
  return code === "ENOENT" || code === "ENOTDIR";
}

function describeFsError(error: unknown): string {
  if (error instanceof Error) {
    const code = "code" in error ? ` ${String((error as { code?: unknown }).code)}` : "";
    return `${error.message}${code}`;
  }
  return String(error);
}

/**
 * Errno code only (`ELOOP`, `EACCES`, …). Never `error.message`: Node embeds
 * the absolute path in it, and these strings are handed to the model.
 */
function describeFsErrorCode(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: unknown }).code
    : undefined;
  return typeof code === "string" && code ? code : "unknown error";
}

/**
 * Last line of defence for the model-visible plan strings: redact anything
 * shaped like an absolute host path. Sources are already symbolic, but probe
 * stderr comes from bwrap and can quote the paths it was given
 * (`bwrap: Can't find source path /root/ws`), so the plan is scrubbed as a
 * whole rather than trusting each producer.
 *
 * Guarantee: any `/…` or `C:\…` token that starts at a word boundary becomes
 * `<path>`, whether it has one segment (`/secrets`) or many. Known bound: a
 * path containing spaces is only fully swallowed within the next
 * `PATH_TAIL_WINDOW_WORDS` words, and absorbing a tail also eats the plain
 * words in between (`<path> but src/lib` → `<path>`). Over-redacting a word of
 * an error message is the cheaper mistake; a surviving user name is not.
 */
export function redactHostPaths(text: string): string {
  if (!text) return text;
  return absorbPathTail(
    text
      // Any absolute POSIX token: /root, /secrets, /root/.nolo/data/x — and
      // commas are filename characters, so they must not end the match.
      .replace(/(^|[\s(["'`{(\[=,;:<>])\/[^\s"'`();:]*/g, "$1<path>")
      // Windows: C:\Users\x
      .replace(/(^|[\s(["'`{(\[=,;:<>])[A-Za-z]:\\[^\s"'`(),;:]*/g, "$1<path>"),
  );
}

/** How far a space-containing path tail is followed. */
const PATH_TAIL_WINDOW_WORDS = 6;

/**
 * `<path>` only ever covers one whitespace-delimited token, so the rest of a
 * path that contains spaces stays behind (`/home/john doe/x` → `<path> doe/x`)
 * — and that tail is the part carrying the user name. Absorb the following
 * words through the last one that still looks like a path segment.
 */
function absorbPathTail(text: string): string {
  if (!text.includes("<path>")) return text;
  const parts = text.split(/(\s+)/); // even indices are words, odd are the gaps
  const result: string[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const word = parts[i];
    result.push(word);
    // The anchor may carry a prefix or suffix (`(<path>`, `"<path>`,
    // `source=<path>`): the replaced token is not always the whole word.
    if (!word.includes("<path>")) continue;
    let absorbThrough = -1;
    const limit = Math.min(parts.length - 1, i + PATH_TAIL_WINDOW_WORDS * 2);
    for (let j = i + 2; j <= limit; j += 2) {
      const candidate = parts[j];
      // A path segment wins over the terminator test: file names contain dots
      // (`doe/secret/file.txt`), so a `.` inside a path-looking word is not the
      // end of the path.
      if (/[/\\]/.test(candidate)) {
        absorbThrough = j;
        continue;
      }
      // Otherwise a sentence terminator ends the path: prose must not be eaten.
      if (/[.;:!?]/.test(candidate)) break;
    }
    // Drop the absorbed tail instead of re-emitting it.
    if (absorbThrough > i) i = absorbThrough;
  }
  return result.join("");
}

function describeProbeFailure(result: { status: number | null; stderr?: string | Buffer | null }): string {
  const stderr = typeof result.stderr === "string"
    ? result.stderr.trim()
    : result.stderr
      ? result.stderr.toString("utf8").trim()
      : "";
  if (stderr) return stderr.split("\n")[0] ?? stderr;
  return `exit ${result.status ?? "null"}`;
}
