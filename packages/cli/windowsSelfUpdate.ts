import { spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
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
 * Read the detached updater's durable result. Terminal results are consumed
 * once; a fresh pending result blocks a second CLI process from racing npm.
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
    const startedAt = Date.parse(state.startedAt);
    const age = (options.now ?? Date.now()) - startedAt;
    // Every helper phase has a hard deadline; the total is bounded below this
    // stale threshold. Do not trust a reusable Windows PID as ownership proof.
    if (!Number.isFinite(age) || age < UPDATE_STALE_MS) {
      return {
        blocking: true,
        text: `Nolo update is still running. Try again shortly.\nLog: ${state.logPath}`,
      };
    }
    if (state.lockPath && state.updateId) {
      removeOwnedLock(state.lockPath, state.updateId);
    }
    rmSync(statePath, { force: true });
    return {
      blocking: false,
      text: `The previous Nolo update helper stopped unexpectedly. Verify with "nolo -v"; a manual npm repair may be required.\nLog: ${state.logPath}`,
    };
  }

  rmSync(statePath, { force: true });
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
  try {
    log("Waiting for parent process " + payload.parentPid + " to exit");
    let parentExited = false;
    for (let waited = 0; waited < 480; waited++) {
      try { process.kill(payload.parentPid, 0); await delay(250); }
      catch { parentExited = true; break; }
    }
    if (!parentExited) throw new Error("Timed out waiting for the current Nolo process to exit");
    await delay(250);

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

    const prefixResult = runNpm(["prefix", "-g"]);
    if (prefixResult.code !== 0 || !prefixResult.stdout) throw new Error("Could not resolve npm global prefix");
    const prefix = prefixResult.stdout.split(/\r?\n/).at(-1).trim();
    const expectedRoot = normalize(join(prefix, "node_modules", "nolo-cli")).toLowerCase();
    const managedRoot = normalize(payload.managedRoot).toLowerCase();
    const oldEntrypoint = normalize(payload.entrypointPath).toLowerCase();
    if (!isWithin(expectedRoot, oldEntrypoint) && !isWithin(managedRoot, oldEntrypoint)) {
      throw new Error("Refusing to update a different npm prefix. Current entrypoint: " + payload.entrypointPath + "; npm prefix: " + prefix);
    }

    const targetResult = runNpm(["view", "nolo-cli@" + payload.channel, "version"]);
    if (targetResult.code !== 0 || !parseVersion(targetResult.stdout)) {
      throw new Error("Could not resolve nolo-cli@" + payload.channel + " target version");
    }
    const targetVersion = targetResult.stdout.split(/\r?\n/).at(-1).trim();
    if (compare(targetVersion, payload.currentVersion) < 0) {
      throw new Error("Refusing to downgrade " + payload.currentVersion + " to " + targetVersion);
    }

    if (compare(targetVersion, payload.currentVersion) > 0) {
      const versionPrefix = join(payload.managedRoot, targetVersion + "-" + payload.updateId);
      uncommittedVersionPrefix = versionPrefix;
      mkdirSync(versionPrefix, { recursive: true });
      const install = runNpm(["install", "-g", "--prefix", versionPrefix, "nolo-cli@" + payload.channel, "--force", "--progress"]);
      if (install.code !== 0) throw new Error("npm install exited with code " + install.code);
      const stagedPackagePath = join(versionPrefix, "node_modules", "nolo-cli", "package.json");
      const staged = JSON.parse(readFileSync(stagedPackagePath, "utf8"));
      if (staged.version !== targetVersion) {
        throw new Error("Staged version mismatch: expected " + targetVersion + ", got " + (staged.version || "unknown"));
      }
      const stagedEntrypoint = join(versionPrefix, "node_modules", "nolo-cli", "index.js");
      if (!existsSync(stagedEntrypoint)) throw new Error("Staged nolo entrypoint is missing");
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
    writeState({ ...base, status: "success", targetVersion, finishedAt: new Date().toISOString() });
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    log("ERROR: " + message);
    if (uncommittedVersionPrefix) {
      try { rmSync(uncommittedVersionPrefix, { recursive: true, force: true }); } catch {}
    }
    writeState({ ...base, status: "failed", finishedAt: new Date().toISOString(), message });
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
