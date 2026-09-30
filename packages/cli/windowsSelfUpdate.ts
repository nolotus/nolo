import { spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, isAbsolute, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";

export type WindowsUpdateState = {
  status: "pending" | "success" | "failed";
  currentVersion: string;
  channel: "alpha" | "latest";
  targetVersion?: string;
  startedAt: string;
  finishedAt?: string;
  logPath: string;
  helperPid?: number;
  message?: string;
  updateId?: string;
  lockPath?: string;
  /**
   * Backwards-compatible phase diagnostics. Older helpers never wrote these,
   * so every reader must treat them as optional. `phase` names the helper step
   * in progress; `phaseDeadline` is the bounded wall-clock ISO time after which
   * that phase is considered hung.
   */
  phase?: string;
  phaseStartedAt?: string;
  phaseDeadline?: string;
  /**
   * Separate notification acknowledgement. Terminal results are retained on
   * disk for `nolo update status` diagnostics; this field records that the
   * one-shot startup notice was already shown so it is not repeated.
   */
  noticeAcknowledgedAt?: string;
};

export type WindowsUpdateLaunchOptions = {
  channel: "alpha" | "latest";
  currentVersion: string;
  entrypointPath: string;
  env?: NodeJS.ProcessEnv;
  parentPid?: number;
  execPath?: string;
  homeDir?: string;
  tempDir?: string;
  nodePath?: string;
  npmCliPath?: string;
  powershellPath?: string;
  launchDetached?: (input: {
    execPath: string;
    helperPath: string;
    payload: string;
    env: NodeJS.ProcessEnv;
  }) => number;
};

const UPDATE_STATE_FILE = "update-result.json";
const UPDATE_STALE_MS = 15 * 60 * 1000;
/**
 * Hard ceiling for a pending record that cannot be aged from `startedAt`
 * (corrupt/missing/future timestamp). When `startedAt` is unusable we fall
 * back to the state file's own mtime — which the helper rewrites on every
 * phase transition — and additionally never let an un-ageable record outlive
 * this absolute bound. This is deliberately larger than UPDATE_STALE_MS so a
 * merely-slow healthy helper is never raced, while still guaranteeing a
 * permanently-corrupt record cannot block startup forever.
 */
const UPDATE_CORRUPT_MAX_AGE_MS = 30 * 60 * 1000;
const UPDATE_LOCK_FILE = "update.lock";

function resolveNoloHome(env: NodeJS.ProcessEnv, homeDir = homedir()): string {
  return env.NOLO_HOME?.trim() || join(homeDir, ".nolo");
}

export function resolveWindowsUpdateStatePath(
  env: NodeJS.ProcessEnv = process.env,
  homeDir = homedir(),
): string {
  return join(resolveNoloHome(env, homeDir), "updates", UPDATE_STATE_FILE);
}

function resolveTrustedWindowsToolPaths(
  env: NodeJS.ProcessEnv,
  execPath: string,
  overrides: Pick<
    WindowsUpdateLaunchOptions,
    "nodePath" | "npmCliPath" | "powershellPath"
  >,
): { nodePath: string; npmCliPath: string; powershellPath: string } {
  const nodePath = overrides.nodePath ?? execPath;
  const npmCliPath =
    overrides.npmCliPath ??
    join(dirname(nodePath), "node_modules", "npm", "bin", "npm-cli.js");
  const windowsRoot = env.SystemRoot?.trim() || env.WINDIR?.trim();
  const powershellPath =
    overrides.powershellPath ??
    (windowsRoot
      ? join(
          windowsRoot,
          "System32",
          "WindowsPowerShell",
          "v1.0",
          "powershell.exe",
        )
      : "");
  for (const [label, path] of Object.entries({
    nodePath,
    npmCliPath,
    powershellPath,
  })) {
    if (!path || !isAbsolute(path) || !existsSync(path)) {
      throw new Error(
        `Could not resolve trusted ${label}: ${path || "missing"}`,
      );
    }
  }
  return { nodePath, npmCliPath, powershellPath };
}

function removeOwnedLock(lockPath: string, updateId: string): void {
  try {
    const raw = readFileSync(lockPath, "utf8").trim();
    const owner = raw.startsWith("{")
      ? (JSON.parse(raw) as { updateId?: string }).updateId
      : raw;
    if (owner === updateId) {
      rmSync(lockPath, { force: true });
    }
  } catch {
    // Another updater owns it, or it is already gone.
  }
}

function writeJsonAtomic(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const tempPath = `${path}.${process.pid}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(tempPath, path);
}

export function readWindowsUpdateState(
  env: NodeJS.ProcessEnv = process.env,
  homeDir = homedir(),
): WindowsUpdateState | null {
  const statePath = resolveWindowsUpdateStatePath(env, homeDir);
  if (!existsSync(statePath)) return null;
  try {
    const parsed = JSON.parse(
      readFileSync(statePath, "utf8"),
    ) as WindowsUpdateState;
    if (!parsed || !["pending", "success", "failed"].includes(parsed.status)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export type WindowsUpdateStartupNotice = {
  blocking: boolean;
  text: string;
};

/**
 * How a pending record is classified for blocking purposes. Both the startup
 * guard and `nolo update status` must use this same classification so they can
 * never disagree about whether a second CLI process may proceed.
 */
export type WindowsUpdatePendingClassification =
  | "active"
  | "stale"
  | "corrupt-unageable";

export type WindowsUpdatePendingAssessment = {
  classification: WindowsUpdatePendingClassification;
  /** Milliseconds elapsed using the best available timestamp; NaN when none. */
  ageMs: number;
  /** Whether `startedAt` itself was usable (vs. mtime fallback). */
  startedAtUsable: boolean;
  /**
   * True only when the record should be treated as still potentially live and
   * therefore block a concurrent updater. Never read as a confirmation that
   * the helper is actually running — it is "not yet provably dead".
   */
  blocksStartup: boolean;
};

/**
 * Classify a pending update record without ever blocking forever and without
 * ever racing a possibly-live helper. Reads the state file's mtime as a
 * fallback age source only — it never mutates `startedAt` (a pure read; the
 * helper keeps re-writing the file on each phase so mtime is a liveness hint,
 * not a field we reset).
 *
 * Rules:
 * - Usable `startedAt` → age from it; stale iff age >= UPDATE_STALE_MS.
 * - Future `startedAt` (age < 0) is treated as just-written → active.
 * - Unusable `startedAt` → fall back to the file's mtime. If mtime is also
 *   unusable, or younger than UPDATE_CORRUPT_MAX_AGE_MS, we conservatively
 *   treat the record as still-live (`corrupt-unageable` but blocking) to avoid
 *   racing a live helper; once it outlives the hard bound it is `stale`.
 * - We never "reclaim" purely because a phase deadline passed: a stage may
 *   legitimately exceed its soft deadline while the helper is still working.
 *   Only the total age bounds decide.
 */
export function assessWindowsUpdatePending(
  state: WindowsUpdateState,
  now: number,
  statePath: string,
): WindowsUpdatePendingAssessment {
  const startedAtMs = Date.parse(state.startedAt);
  // Mild clock skew (e.g. up to 5 min in the future) is tolerated and blocks;
  // an impossibly far-future timestamp (corrupted date) must not block forever.
  const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
  if (Number.isFinite(startedAtMs) && (startedAtMs - now) <= MAX_CLOCK_SKEW_MS) {
    const ageMs = now - startedAtMs;
    // A future or just-written timestamp must not mark the record stale.
    const stale = ageMs >= UPDATE_STALE_MS;
    return {
      classification: stale ? "stale" : "active",
      ageMs,
      startedAtUsable: true,
      blocksStartup: !stale,
    };
  }

  // startedAt is unusable (missing/corrupt). Fall back to the file's mtime,
  // which the helper refreshes on each phase write.
  let mtimeAge = Number.NaN;
  try {
    mtimeAge = now - statSync(statePath).mtimeMs;
  } catch {
    // Cannot stat → cannot age at all; handled below as still-live.
  }
  if (!Number.isFinite(mtimeAge) || mtimeAge < UPDATE_CORRUPT_MAX_AGE_MS) {
    return {
      classification: "corrupt-unageable",
      ageMs: mtimeAge,
      startedAtUsable: false,
      blocksStartup: true,
    };
  }
  return {
    classification: "stale",
    ageMs: mtimeAge,
    startedAtUsable: false,
    blocksStartup: false,
  };
}

/**
 * Read the detached updater's durable result. A fresh pending result blocks a
 * second CLI process from racing npm; terminal results are shown once then
 * retained on disk for `nolo update status` diagnostics.
 *
 * Blocking rules (never block forever on bad data):
 * - The update owner itself (matching `ownerUpdateId`) is never blocked.
 * - A pending record is classified by `assessWindowsUpdatePending` — corrupt
 *   `startedAt` degrades to a hard-bounded block via file mtime, never a
 *   permanent lock-out.
 * - A pending record that outlives its bound is reported stopped; the stale
 *   *lock* is removed (ownership-safe) but the failed record itself is
 *   retained for diagnostics rather than deleted.
 */
export function consumeWindowsUpdateStartupNotice(
  env: NodeJS.ProcessEnv = process.env,
  options: { homeDir?: string; now?: number; ownerUpdateId?: string } = {},
): WindowsUpdateStartupNotice | null {
  const homeDir = options.homeDir ?? homedir();
  const statePath = resolveWindowsUpdateStatePath(env, homeDir);
  const state = readWindowsUpdateState(env, homeDir);
  if (!state) return null;

  if (state.status === "pending") {
    if (
      options.ownerUpdateId &&
      state.updateId &&
      options.ownerUpdateId === state.updateId
    ) {
      return null;
    }
    const now = options.now ?? Date.now();
    const assessment = assessWindowsUpdatePending(state, now, statePath);
    if (assessment.blocksStartup) {
      return {
        blocking: true,
        text:
          `A Nolo update may still be in progress (${describeUpdatePhase(state)}). ` +
          `Run "nolo update status" for details, or retry shortly.\n` +
          `Log: ${state.logPath}`,
      };
    }
    // The pending record outlived its bound: the helper is presumed dead. Free
    // the ownership lock so a future update can proceed, but keep the record
    // itself on disk so `nolo update status` can diagnose the abandoned run.
    // We never delete a record we did not write.
    if (state.lockPath && state.updateId) {
      removeOwnedLock(state.lockPath, state.updateId);
    }
    return {
      blocking: false,
      text: `The previous Nolo update helper stopped unexpectedly and its lock was released. Verify with "nolo -v" / "nolo update status"; a manual npm repair may be required.\nLog: ${state.logPath}`,
    };
  }

  // Terminal results are kept on disk so `nolo update status` can still
  // diagnose them. Show the one-shot notice only until acknowledged.
  if (state.noticeAcknowledgedAt) {
    return null;
  }
  const acknowledged = {
    ...state,
    noticeAcknowledgedAt: new Date().toISOString(),
  };
  try {
    writeJsonAtomic(statePath, acknowledged);
  } catch {
    // A read-only home dir must not swallow the notice; fall through and show
    // it even though it may repeat on the next launch.
  }
  if (state.status === "success") {
    return {
      blocking: false,
      text: `Nolo updated successfully: ${state.currentVersion} -> ${state.targetVersion ?? "latest"}.\nLog: ${state.logPath}`,
    };
  }
  return {
    blocking: false,
    text: `Nolo update failed. Verify with "nolo -v"; npm may require a manual repair.${state.message ? `\n${state.message}` : ""}\nLog: ${state.logPath}`,
  };
}

function describeUpdatePhase(state: WindowsUpdateState): string {
  if (state.phase) {
    return `phase: ${state.phase}`;
  }
  return "helper running";
}

export type WindowsUpdateStatusReport = {
  status: "none" | "pending" | "success" | "failed";
  /**
   * Whether the pending record still blocks a concurrent updater — i.e. it
   * has not yet provably outlived its bound. This is unverified evidence, not
   * a confirmation the helper process is actually running.
   */
  alive: boolean;
  /** Pending classification detail, present only when status === "pending". */
  pendingClassification?: WindowsUpdatePendingClassification;
  text: string;
};

/**
 * Lightweight diagnostic for `nolo update status`. Reads only the update state
 * file and the package version — it must stay free of application/DB imports
 * so it can answer even while an update blocks normal startup.
 */
export function getWindowsUpdateStatus(
  env: NodeJS.ProcessEnv = process.env,
  options: {
    homeDir?: string;
    now?: number;
    currentVersion?: string;
  } = {},
): WindowsUpdateStatusReport {
  const homeDir = options.homeDir ?? homedir();
  const state = readWindowsUpdateState(env, homeDir);
  const now = options.now ?? Date.now();
  const version = options.currentVersion ?? "unknown";

  if (!state) {
    return {
      status: "none",
      alive: false,
      text:
        `No recorded Nolo update.\n` +
        `Installed version: ${version}`,
    };
  }

  const lines: string[] = [];
  lines.push(`Update status: ${state.status}`);
  lines.push(`Installed version: ${version}`);
  lines.push(`Channel: ${state.channel}`);
  lines.push(`From version: ${state.currentVersion}`);
  if (state.targetVersion) lines.push(`Target version: ${state.targetVersion}`);
  if (state.phase) lines.push(`Phase: ${state.phase}`);
  lines.push(`Started: ${state.startedAt}`);
  if (state.phaseStartedAt) lines.push(`Phase started: ${state.phaseStartedAt}`);
  if (state.phaseDeadline) lines.push(`Phase deadline: ${state.phaseDeadline}`);
  if (state.finishedAt) lines.push(`Finished: ${state.finishedAt}`);
  if (state.helperPid) lines.push(`Helper pid: ${state.helperPid}`);
  if (state.message) lines.push(`Message: ${state.message}`);
  lines.push(`Log: ${state.logPath}`);

  if (state.status === "pending") {
    const statePath = resolveWindowsUpdateStatePath(env, homeDir);
    const assessment = assessWindowsUpdatePending(state, now, statePath);
    // Surface phase-deadline evidence without claiming the helper is dead: a
    // phase may legitimately overrun its soft deadline while still running.
    const deadline = state.phaseDeadline ? Date.parse(state.phaseDeadline) : NaN;
    const pastDeadline = Number.isFinite(deadline) && now > deadline;
    if (pastDeadline) {
      lines.push(
        `Phase deadline elapsed: the recorded phase has run past its soft ` +
          `ceiling. This can be a hung helper, but it can also be a slow ` +
          `install — the lock is NOT auto-released on this evidence alone.`,
      );
    }
    switch (assessment.classification) {
      case "active":
        lines.push(
          `Diagnosis: update record is fresh (${describeUpdatePhase(state)}). ` +
            `The helper process has not been verified alive; the record simply ` +
            `has not outlived its bound, so startup is still blocked.`,
        );
        break;
      case "corrupt-unageable":
        lines.push(
          `Diagnosis: update record has an unreadable start time and cannot be ` +
            `aged reliably. Startup stays conservatively blocked until the ` +
            `record outlives its hard bound; inspect the log to tell a hung ` +
            `helper from a live one.`,
        );
        break;
      case "stale":
        lines.push(
          `Diagnosis: update record has outlived its bound; the helper is ` +
            `presumed stopped. The startup guard releases the stale lock on ` +
            `next start, then this record remains here for diagnosis.`,
        );
        break;
    }
    return {
      status: "pending",
      alive: assessment.blocksStartup,
      pendingClassification: assessment.classification,
      text: lines.join("\n"),
    };
  }

  if (state.status === "success") {
    lines.push(
      state.noticeAcknowledgedAt
        ? `Diagnosis: update applied and already acknowledged.`
        : `Diagnosis: update applied; notice pending on next start.`,
    );
  } else {
    lines.push(`Diagnosis: update failed; see the log above.`);
  }
  return { status: state.status, alive: false, text: lines.join("\n") };
}

export function defaultLaunchWindowsUpdateHelper(input: {
  execPath: string;
  helperPath: string;
  payload: string;
  env: NodeJS.ProcessEnv;
}): number {
  const child = spawn(input.execPath, [input.helperPath, input.payload], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env: input.env,
  });
  child.unref();
  if (!child.pid) {
    throw new Error("Windows update helper did not start");
  }
  return child.pid;
}

/**
 * Build a dependency-free CommonJS helper. It lives under the OS temp dir,
 * never under node_modules, so npm can replace the package after the parent
 * process releases classic-level.node.
 */
export function buildWindowsUpdateHelperSource(): string {
  return String.raw`"use strict";
const { spawnSync } = require("node:child_process");
const { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } = require("node:fs");
const { dirname, isAbsolute, join, normalize, relative } = require("node:path");

const payload = JSON.parse(Buffer.from(process.argv[2], "base64url").toString("utf8"));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (line) => appendFileSync(payload.logPath, "[" + new Date().toISOString() + "] " + line + "\n", "utf8");
const writeState = (next) => {
  mkdirSync(dirname(payload.statePath), { recursive: true });
  const temp = payload.statePath + "." + payload.updateId + ".tmp";
  writeFileSync(temp, JSON.stringify(next, null, 2) + "\n", "utf8");
  renameSync(temp, payload.statePath);
};
// Record the current helper step with a bounded wall-clock deadline so the
// startup guard can tell a live phase from a hung one. Deadline is a soft
// ceiling: a phase that overruns it is reported stale, not killed.
const setPhase = (base, phase, budgetMs) => {
  const phaseStartedAt = new Date().toISOString();
  const phaseDeadline = new Date(Date.now() + budgetMs).toISOString();
  try {
    writeState({ ...base, status: "pending", phase, phaseStartedAt, phaseDeadline });
  } catch (error) {
    log("Could not persist phase " + phase + ": " + (error && error.message ? error.message : String(error)));
  }
  return { ...base, status: "pending", phase, phaseStartedAt, phaseDeadline };
};
const runNpm = (args) => {
  const command = [payload.nodePath, payload.npmCliPath, ...args].join(" ");
  log("> " + command);
  const result = spawnSync(payload.nodePath, [payload.npmCliPath, ...args], {
    encoding: "utf8",
    windowsHide: true,
    env: process.env,
    cwd: payload.updateDir,
    timeout: args[0] === "install" ? 5 * 60 * 1000 : 30 * 1000,
  });
  if (result.stdout) appendFileSync(payload.logPath, result.stdout, "utf8");
  if (result.stderr) appendFileSync(payload.logPath, result.stderr, "utf8");
  if (result.error) throw result.error;
  return { code: result.status == null ? 1 : result.status, stdout: String(result.stdout || "").trim() };
};
const listOtherNoloPids = () => {
  const script = "$selfPid=" + process.pid + "; Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $selfPid -and ($_.Name -ieq 'node.exe' -or $_.Name -ieq 'bun.exe') -and $_.CommandLine -and $_.CommandLine -match '\\\\node_modules\\\\nolo-cli\\\\index\\.js' } | ForEach-Object { $_.ProcessId }";
  const result = spawnSync(payload.powershellPath, ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    windowsHide: true,
    env: process.env,
    cwd: payload.updateDir,
    timeout: 10 * 1000,
  });
  if (result.error || result.status !== 0) {
    throw new Error("Could not verify that all other Nolo windows are closed");
  }
  return String(result.stdout || "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
};
const parseVersion = (raw) => {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(String(raw).trim());
  return match ? { main: [Number(match[1]), Number(match[2]), Number(match[3])], pre: match[4] ? match[4].split(".") : [] } : null;
};
const compare = (a, b) => {
  const pa = parseVersion(a); const pb = parseVersion(b);
  if (!pa || !pb) throw new Error("Invalid version comparison: " + a + " / " + b);
  for (let i = 0; i < 3; i++) if (pa.main[i] !== pb.main[i]) return pa.main[i] < pb.main[i] ? -1 : 1;
  if (!pa.pre.length && !pb.pre.length) return 0;
  if (!pa.pre.length) return 1;
  if (!pb.pre.length) return -1;
  for (let i = 0; i < Math.max(pa.pre.length, pb.pre.length); i++) {
    const x = pa.pre[i], y = pb.pre[i];
    if (x === undefined) return -1; if (y === undefined) return 1; if (x === y) continue;
    const xn = /^\d+$/.test(x) ? Number(x) : NaN, yn = /^\d+$/.test(y) ? Number(y) : NaN;
    if (!Number.isNaN(xn) && !Number.isNaN(yn)) return xn < yn ? -1 : 1;
    if (!Number.isNaN(xn)) return -1; if (!Number.isNaN(yn)) return 1;
    return x < y ? -1 : 1;
  }
  return 0;
};
const isWithin = (root, candidate) => {
  const rel = relative(normalize(root), normalize(candidate));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
};
const quoteCmd = (value) => '"' + String(value).replace(/"/g, '""') + '"';
const quotePowerShell = (value) => "'" + String(value).replace(/'/g, "''") + "'";
const quoteSh = (value) => "'" + String(value).replace(/'/g, "'\\''") + "'";
const switchWindowsShims = (shimDir, entrypoint) => {
  const shims = [
    { path: join(shimDir, "nolo.cmd"), content: "@ECHO off\r\n" + quoteCmd(payload.nodePath) + " " + quoteCmd(entrypoint) + " %*\r\n" },
    { path: join(shimDir, "nolo.ps1"), content: "& " + quotePowerShell(payload.nodePath) + " " + quotePowerShell(entrypoint) + " $args\r\nexit $LASTEXITCODE\r\n" },
    { path: join(shimDir, "nolo"), content: "#!/bin/sh\nexec " + quoteSh(payload.nodePath.replace(/\\/g, "/")) + " " + quoteSh(entrypoint.replace(/\\/g, "/")) + " \"$@\"\n" },
  ];
  mkdirSync(shimDir, { recursive: true });
  const prepared = shims.map((shim) => {
    const temp = shim.path + "." + payload.updateId + ".new";
    const backup = shim.path + "." + payload.updateId + ".bak";
    writeFileSync(temp, shim.content, "utf8");
    return { ...shim, temp, backup, existed: existsSync(shim.path) };
  });
  const activated = [];
  try {
    for (const shim of prepared) {
      if (shim.existed) renameSync(shim.path, shim.backup);
      try {
        renameSync(shim.temp, shim.path);
      } catch (error) {
        if (shim.existed) {
          try { renameSync(shim.backup, shim.path); } catch {}
        }
        throw error;
      }
      try { chmodSync(shim.path, 0o755); } catch {}
      activated.push(shim);
    }
  } catch (error) {
    for (const shim of [...activated].reverse()) {
      try { rmSync(shim.path, { force: true }); } catch {}
      if (shim.existed) {
        try { renameSync(shim.backup, shim.path); } catch {}
      }
    }
    for (const shim of prepared) try { rmSync(shim.temp, { force: true }); } catch {}
    throw error;
  }
  return {
    rollback: () => {
      for (const shim of [...activated].reverse()) {
        try { rmSync(shim.path, { force: true }); } catch {}
        if (shim.existed) {
          try { renameSync(shim.backup, shim.path); } catch {}
        }
      }
    },
    commit: () => {
      for (const shim of prepared) {
        try { rmSync(shim.backup, { force: true }); } catch {}
      }
    },
  };
};

(async () => {
  let uncommittedVersionPrefix = null;
  const base = {
    status: "pending",
    currentVersion: payload.currentVersion,
    channel: payload.channel,
    startedAt: payload.startedAt,
    logPath: payload.logPath,
    helperPid: process.pid,
    updateId: payload.updateId,
    lockPath: payload.lockPath,
  };
  let progress = base;
  try {
    progress = setPhase(base, "wait-parent-exit", 480 * 250 + 60 * 1000);
    log("Waiting for parent process " + payload.parentPid + " to exit");
    let parentExited = false;
    for (let waited = 0; waited < 480; waited++) {
      try { process.kill(payload.parentPid, 0); await delay(250); }
      catch { parentExited = true; break; }
    }
    if (!parentExited) throw new Error("Timed out waiting for the current Nolo process to exit");
    await delay(250);

    progress = setPhase(progress, "wait-other-windows", 120 * 1000 + 30 * 1000);
    const otherProcessDeadline = Date.now() + 120 * 1000;
    let otherPids = listOtherNoloPids();
    let checks = 0;
    while (otherPids.length > 0 && Date.now() < otherProcessDeadline) {
      if (checks === 0 || checks % 10 === 0) log("Waiting for other Nolo processes: " + otherPids.join(", "));
      await delay(1000);
      otherPids = listOtherNoloPids();
      checks++;
    }
    if (otherPids.length > 0) {
      throw new Error("Other Nolo processes are still running: " + otherPids.join(", "));
    }

    progress = setPhase(progress, "resolve-prefix", 30 * 1000);
    const prefixResult = runNpm(["prefix", "-g"]);
    if (prefixResult.code !== 0 || !prefixResult.stdout) throw new Error("Could not resolve npm global prefix");
    const prefix = prefixResult.stdout.split(/\r?\n/).at(-1).trim();
    const expectedRoot = normalize(join(prefix, "node_modules", "nolo-cli")).toLowerCase();
    const managedRoot = normalize(payload.managedRoot).toLowerCase();
    const oldEntrypoint = normalize(payload.entrypointPath).toLowerCase();
    if (!isWithin(expectedRoot, oldEntrypoint) && !isWithin(managedRoot, oldEntrypoint)) {
      throw new Error("Refusing to update a different npm prefix. Current entrypoint: " + payload.entrypointPath + "; npm prefix: " + prefix);
    }

    progress = setPhase(progress, "resolve-target-version", 30 * 1000);
    const targetResult = runNpm(["view", "nolo-cli@" + payload.channel, "version"]);
    if (targetResult.code !== 0 || !parseVersion(targetResult.stdout)) {
      throw new Error("Could not resolve nolo-cli@" + payload.channel + " target version");
    }
    const targetVersion = targetResult.stdout.split(/\r?\n/).at(-1).trim();
    if (compare(targetVersion, payload.currentVersion) < 0) {
      throw new Error("Refusing to downgrade " + payload.currentVersion + " to " + targetVersion);
    }

    if (compare(targetVersion, payload.currentVersion) > 0) {
      progress = setPhase(progress, "install-target", 5 * 60 * 1000 + 30 * 1000);
      const versionPrefix = join(payload.managedRoot, targetVersion + "-" + payload.updateId);
      uncommittedVersionPrefix = versionPrefix;
      mkdirSync(versionPrefix, { recursive: true });
      // Install the exact version resolved from the dist-tag above — never the
      // floating channel tag — so the staged package is the verified one.
      const install = runNpm(["install", "-g", "--prefix", versionPrefix, "nolo-cli@" + targetVersion, "--force", "--progress"]);
      if (install.code !== 0) throw new Error("npm install exited with code " + install.code);
      const stagedPackagePath = join(versionPrefix, "node_modules", "nolo-cli", "package.json");
      const staged = JSON.parse(readFileSync(stagedPackagePath, "utf8"));
      if (staged.version !== targetVersion) {
        throw new Error("Staged version mismatch: expected " + targetVersion + ", got " + (staged.version || "unknown"));
      }
      const stagedEntrypoint = join(versionPrefix, "node_modules", "nolo-cli", "index.js");
      if (!existsSync(stagedEntrypoint)) throw new Error("Staged nolo entrypoint is missing");
      progress = setPhase(progress, "switch-shims", 60 * 1000);
      const switchedShims = switchWindowsShims(prefix, stagedEntrypoint);
      const verify = spawnSync(payload.nodePath, [stagedEntrypoint, "-v"], {
        encoding: "utf8",
        windowsHide: true,
        env: { ...process.env, NOLO_UPDATE_OWNER_ID: payload.updateId },
        cwd: payload.updateDir,
        timeout: 30 * 1000,
      });
      if (verify.error || verify.status !== 0 || !String(verify.stdout || "").includes(targetVersion)) {
        switchedShims.rollback();
        throw new Error("The staged CLI failed its post-switch version check; the previous launch shims were restored");
      }
      switchedShims.commit();
      uncommittedVersionPrefix = null;
      for (const entry of readdirSync(payload.managedRoot)) {
        const candidate = join(payload.managedRoot, entry);
        if (normalize(candidate) !== normalize(versionPrefix)) {
          try { rmSync(candidate, { recursive: true, force: true }); } catch {}
        }
      }
      log("Verified nolo-cli " + targetVersion + " at " + stagedEntrypoint);
    } else {
      log("Already current at " + targetVersion);
    }
    writeState({ ...progress, status: "success", phase: "done", targetVersion, finishedAt: new Date().toISOString() });
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    log("ERROR: " + message);
    if (uncommittedVersionPrefix) {
      try { rmSync(uncommittedVersionPrefix, { recursive: true, force: true }); } catch {}
    }
    writeState({ ...progress, status: "failed", finishedAt: new Date().toISOString(), message });
    process.exitCode = 1;
  } finally {
    try {
      const lock = JSON.parse(readFileSync(payload.lockPath, "utf8"));
      if (lock.updateId === payload.updateId) {
        rmSync(payload.lockPath, { force: true });
      }
    } catch {}
    try { rmSync(__filename, { force: true }); } catch {}
  }
})();
`;
}

export function scheduleWindowsSelfUpdate(
  options: WindowsUpdateLaunchOptions,
): { helperPid: number; statePath: string; logPath: string } {
  const env = options.env ?? process.env;
  const homeDir = options.homeDir ?? homedir();
  const statePath = resolveWindowsUpdateStatePath(env, homeDir);
  const updateDir = dirname(statePath);
  const managedRoot = join(resolveNoloHome(env, homeDir), "cli", "versions");
  const lockPath = join(updateDir, UPDATE_LOCK_FILE);
  const updateId = randomUUID();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logPath = join(updateDir, `update-${stamp}.log`);
  const helperPath = join(
    options.tempDir ?? tmpdir(),
    `nolo-update-${randomUUID()}.cjs`,
  );
  const startedAt = new Date().toISOString();
  mkdirSync(updateDir, { recursive: true });
  mkdirSync(dirname(helperPath), { recursive: true });
  try {
    const lockFd = openSync(lockPath, "wx");
    try {
      writeSync(
        lockFd,
        JSON.stringify({ updateId, startedAt }),
        undefined,
        "utf8",
      );
    } finally {
      closeSync(lockFd);
    }
  } catch (error) {
    // The only state-less lock window is before this process writes pending
    // metadata. Reclaim it after the same hard upper bound used by startup.
    if (!readWindowsUpdateState(env, homeDir)) {
      try {
        const lock = JSON.parse(readFileSync(lockPath, "utf8")) as {
          startedAt?: string;
        };
        const age = Date.now() - Date.parse(lock.startedAt ?? "");
        if (Number.isFinite(age) && age >= UPDATE_STALE_MS) {
          rmSync(lockPath, { force: true });
          return scheduleWindowsSelfUpdate(options);
        }
      } catch {
        // Unknown/non-owned locks fail closed; never unlink them blindly.
      }
    }
    throw new Error(
      `Another Nolo update is already pending (${lockPath}): ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const execPath = options.execPath ?? process.execPath;
  let trustedTools: ReturnType<typeof resolveTrustedWindowsToolPaths>;
  try {
    trustedTools = resolveTrustedWindowsToolPaths(env, execPath, options);
  } catch (error) {
    removeOwnedLock(lockPath, updateId);
    throw error;
  }
  const pending: WindowsUpdateState = {
    status: "pending",
    currentVersion: options.currentVersion,
    channel: options.channel,
    startedAt,
    logPath,
    updateId,
    lockPath,
  };
  try {
    writeFileSync(helperPath, buildWindowsUpdateHelperSource(), "utf8");
    writeFileSync(logPath, `[${startedAt}] Windows update scheduled\n`, "utf8");
    writeJsonAtomic(statePath, pending);
  } catch (error) {
    removeOwnedLock(lockPath, updateId);
    rmSync(helperPath, { force: true });
    throw error;
  }

  const payload = Buffer.from(
    JSON.stringify({
      parentPid: options.parentPid ?? process.pid,
      currentVersion: options.currentVersion,
      channel: options.channel,
      entrypointPath: normalize(options.entrypointPath),
      startedAt,
      statePath,
      logPath,
      updateDir,
      updateId,
      lockPath,
      managedRoot,
      ...trustedTools,
    }),
    "utf8",
  ).toString("base64url");

  const launch = options.launchDetached ?? defaultLaunchWindowsUpdateHelper;
  let helperPid: number;
  try {
    helperPid = launch({
      execPath: options.execPath ?? process.execPath,
      helperPath,
      payload,
      env,
    });
  } catch (error) {
    const state = readWindowsUpdateState(env, homeDir);
    if (state?.updateId === updateId) {
      rmSync(statePath, { force: true });
    }
    removeOwnedLock(lockPath, updateId);
    rmSync(helperPath, { force: true });
    throw error;
  }
  try {
    writeJsonAtomic(statePath, { ...pending, helperPid });
  } catch (error) {
    // The helper and its ownership lock are already live. Never tear them
    // down because a best-effort metadata enrichment failed.
    try {
      writeFileSync(
        logPath,
        `[${new Date().toISOString()}] Could not persist helper pid: ${error instanceof Error ? error.message : String(error)}\n`,
        { encoding: "utf8", flag: "a" },
      );
    } catch {}
  }
  return { helperPid, statePath, logPath };
}
