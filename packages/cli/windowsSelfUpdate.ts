import { spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, isAbsolute, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";

// 2026-10-27 减法：删除 WindowsUpdateState（pending/success/failed 状态机）
// 与配套的 phase/notice 字段。更新器只做"装新版本 + 切入口"，不维护跨进程结果记录。

export type WindowsUpdateLaunchOptions = {
  channel: "alpha" | "latest";
  currentVersion: string;
  entrypointPath: string;
  env?: NodeJS.ProcessEnv;
  execPath?: string;
  homeDir?: string;
  tempDir?: string;
  nodePath?: string;
  npmCliPath?: string;
  launchDetached?: (input: {
    execPath: string;
    helperPath: string;
    payload: string;
    env: NodeJS.ProcessEnv;
  }) => number;
};

const UPDATE_LOCK_FILE = "update.lock";

function resolveNoloHome(env: NodeJS.ProcessEnv, homeDir = homedir()): string {
  return env.NOLO_HOME?.trim() || join(homeDir, ".nolo");
}

function resolveTrustedWindowsToolPaths(
  env: NodeJS.ProcessEnv,
  execPath: string,
  overrides: Pick<
    WindowsUpdateLaunchOptions,
    "nodePath" | "npmCliPath"
  >,
): { nodePath: string; npmCliPath: string } {
  const nodePath = overrides.nodePath ?? execPath;
  const npmCliPath =
    overrides.npmCliPath ??
    join(dirname(nodePath), "node_modules", "npm", "bin", "npm-cli.js");
  // 不再解析 powershell.exe：helper 已不执行 PowerShell（进程扫描已删）。
  // 之前那层存在性校验会让"根本不需要 PowerShell"的更新被误拒。
  for (const [label, path] of Object.entries({
    nodePath,
    npmCliPath,
  })) {
    if (!path || !isAbsolute(path) || !existsSync(path)) {
      throw new Error(
        `Could not resolve trusted ${label}: ${path || "missing"}`,
      );
    }
  }
  return { nodePath, npmCliPath };
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

export type WindowsUpdateStatusReport = {
  installedVersion: string;
  lastLogPath?: string;
  text: string;
};

/**
 * 轻量诊断：`nolo update status`。
 *
 * 减法后只回答"当前版本 + 最近一次更新日志"。不再读取 pending/success/failed
 * 状态记录——那套状态机已删除：更新失败只写日志，不影响启动。
 */
export function getWindowsUpdateStatus(
  env: NodeJS.ProcessEnv = process.env,
  options: { homeDir?: string; currentVersion?: string } = {},
): WindowsUpdateStatusReport {
  const homeDir = options.homeDir ?? homedir();
  const installedVersion = options.currentVersion ?? "unknown";
  const logDir = join(resolveNoloHome(env, homeDir), "updates");
  let lastLogPath: string | undefined;
  try {
    const newest = readdirSync(logDir)
      .filter((name) => name.startsWith("update-") && name.endsWith(".log"))
      .sort()
      .at(-1);
    if (newest) lastLogPath = join(logDir, newest);
  } catch {
    // 目录不存在或不可读：只是没有历史更新，不是错误
  }
  const text = lastLogPath
    ? `Installed version: ${installedVersion}\nLast update log: ${lastLogPath}`
    : `Installed version: ${installedVersion}\nNo recorded update log.`;
  return { installedVersion, lastLogPath, text };
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
const log = (line) => appendFileSync(payload.logPath, "[" + new Date().toISOString() + "] " + line + "\n", "utf8");
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

let stagedDirReferenced = false;
let lockOwnershipLost = false;
let shimLeftUnrestored = false;

const assertLockOwnership = () => {
  try {
    if (!existsSync(payload.lockPath)) {
      throw new Error("Update lock was released or removed; aborting to avoid racing another process");
    }
    const raw = readFileSync(payload.lockPath, "utf8").trim();
    const owner = raw.startsWith("{") ? JSON.parse(raw).updateId : raw;
    if (owner !== payload.updateId) {
      throw new Error("Update lock was reclaimed by " + owner + "; aborting to avoid racing another updater");
    }
  } catch (e) {
    lockOwnershipLost = true;
    throw new Error("Lock ownership check failed: " + (e && e.message ? e.message : String(e)));
  }
};

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
  const attemptRollback = () => {
    let allRestored = true;
    for (const shim of [...activated].reverse()) {
      try { rmSync(shim.path, { force: true }); } catch (e) {
        log("CRITICAL: Failed to remove new shim " + shim.path + ": " + (e && e.message ? e.message : String(e)));
      }
      if (shim.existed) {
        try {
          renameSync(shim.backup, shim.path);
        } catch (e) {
          allRestored = false;
          log("CRITICAL: Failed to restore backup shim for " + shim.path + ": " + (e && e.message ? e.message : String(e)));
        }
      } else if (existsSync(shim.path)) {
        // The delete above did not remove this shim (locked file, ACL, ...).
        // It still points at the staged directory, so the rollback is NOT clean.
        allRestored = false;
        log("CRITICAL: New shim still present after rollback attempt: " + shim.path);
      }
    }
    for (const shim of prepared) try { rmSync(shim.temp, { force: true }); } catch {}
    stagedDirReferenced = !allRestored;
    return allRestored;
  };

  try {
    for (const shim of prepared) {
      if (shim.existed) renameSync(shim.path, shim.backup);
      try {
        renameSync(shim.temp, shim.path);
        stagedDirReferenced = true;
      } catch (error) {
        if (shim.existed) {
          try {
            renameSync(shim.backup, shim.path);
          } catch (restoreErr) {
            shimLeftUnrestored = true;
            log("CRITICAL: Failed to restore backup shim for " + shim.path + ": " + (restoreErr && restoreErr.message ? restoreErr.message : String(restoreErr)));
          }
        }
        throw error;
      }
      try { chmodSync(shim.path, 0o755); } catch {}
      activated.push(shim);
    }
  } catch (error) {
    if (!attemptRollback() || shimLeftUnrestored) {
      if (error && typeof error === "object") {
        error.message = (error.message ? error.message : String(error)) + "; rollback incomplete";
      }
      log("CRITICAL: Rollback incomplete while switching launch shims");
    }
    throw error;
  }
  return {
    rollback: () => {
      const restored = attemptRollback();
      if (!restored) {
        throw new Error("Rollback incomplete: one or more launch shims could not be restored or removed");
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
    // 2026-10-27 减法：不再等待父进程或其它 Nolo 窗口退出。
    // 新版本写入独立版本目录、最后只切换入口，因此其它进程继续运行旧版本是安全的；
    // 扫描 PID 也不构成真正的写入互斥（扫描结束后照样可以再启动一个进程）。
    log("phase: resolve-prefix");
    const prefixResult = runNpm(["prefix", "-g"]);
    if (prefixResult.code !== 0 || !prefixResult.stdout) throw new Error("Could not resolve npm global prefix");
    const prefix = prefixResult.stdout.split(/\r?\n/).at(-1).trim();
    const expectedRoot = normalize(join(prefix, "node_modules", "nolo-cli")).toLowerCase();
    const managedRoot = normalize(payload.managedRoot).toLowerCase();
    const oldEntrypoint = normalize(payload.entrypointPath).toLowerCase();
    if (!isWithin(expectedRoot, oldEntrypoint) && !isWithin(managedRoot, oldEntrypoint)) {
      throw new Error("Refusing to update a different npm prefix. Current entrypoint: " + payload.entrypointPath + "; npm prefix: " + prefix);
    }
    log("phase: resolve-target-version");
    const targetResult = runNpm(["view", "nolo-cli@" + payload.channel, "version"]);
    if (targetResult.code !== 0 || !parseVersion(targetResult.stdout)) {
      throw new Error("Could not resolve nolo-cli@" + payload.channel + " target version");
    }
    const targetVersion = targetResult.stdout.split(/\r?\n/).at(-1).trim();
    if (compare(targetVersion, payload.currentVersion) < 0) {
      throw new Error("Refusing to downgrade " + payload.currentVersion + " to " + targetVersion);
    }

    if (compare(targetVersion, payload.currentVersion) > 0) {
    log("phase: install-target");
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
      assertLockOwnership();
    log("phase: switch-shims");
      const switchedShims = switchWindowsShims(prefix, stagedEntrypoint);
      const verify = spawnSync(payload.nodePath, [stagedEntrypoint, "-v"], {
        encoding: "utf8",
        windowsHide: true,
        env: process.env,
        cwd: payload.updateDir,
        timeout: 30 * 1000,
      });
      if (verify.error || verify.status !== 0 || !String(verify.stdout || "").includes(targetVersion)) {
        let rollbackError = null;
        try {
          switchedShims.rollback();
        } catch (e) {
          rollbackError = e;
        }
        if (rollbackError) {
          throw new Error(
            "The staged CLI failed its post-switch version check; " +
              (rollbackError && rollbackError.message ? rollbackError.message : String(rollbackError)),
          );
        }
        throw new Error("The staged CLI failed its post-switch version check; the previous launch shims were restored");
      }
      // The lock could have been reclaimed (stale timeout / competing updater)
      // during the verify window. Re-check before committing so we never claim
      // success for an update we no longer own. We deliberately do not roll the
      // shims back here: a competing updater may be mid-switch, and nothing is
      // deleted, so leaving our shims in place is recoverable (last writer wins).
      assertLockOwnership();
      switchedShims.commit();
      uncommittedVersionPrefix = null;
      // Previous versions are intentionally retained (unbounded until a
      // reference-aware cleanup exists) because deleting them risks removing a
      // directory that a shim or a rolled-back update still references.
      log("Verified nolo-cli " + targetVersion + " at " + stagedEntrypoint);
    } else {
      log("Already current at " + targetVersion);
    }
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    log("ERROR: " + message);
    if (uncommittedVersionPrefix) {
      if (stagedDirReferenced) {
        log("PRESERVING staged directory " + uncommittedVersionPrefix + " because launch shims may still reference it; deleting it would cause MODULE_NOT_FOUND");
      } else {
        try { rmSync(uncommittedVersionPrefix, { recursive: true, force: true }); } catch {}
      }
    }
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
): { helperPid: number; logPath: string } {
  const env = options.env ?? process.env;
  const homeDir = options.homeDir ?? homedir();
  const updateDir = join(resolveNoloHome(env, homeDir), "updates");
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
      writeSync(lockFd, JSON.stringify({ updateId, startedAt }), undefined, "utf8");
    } finally {
      closeSync(lockFd);
    }
  } catch (error) {
    // 减法后没有"更新状态记录"可用于推断锁是否过期：锁存在即视为另一场更新在进行，
    // fail-closed 让人工确认后删除，而不是猜一个时间上限强行抢占。
    throw new Error(
      `Another Nolo update is already pending (${lockPath}): ${error instanceof Error ? error.message : String(error)}\n` +
        `锁文件里记录了持有者的 updateId 与开始时间；更新日志在 ${updateDir} 下，按时间排序取最新那个。` +
        `确认持有它的更新进程已结束后，删除上面的锁文件再重试。`,
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
  try {
    writeFileSync(helperPath, buildWindowsUpdateHelperSource(), "utf8");
    writeFileSync(logPath, `[${startedAt}] Windows update scheduled\n`, "utf8");
  } catch (error) {
    removeOwnedLock(lockPath, updateId);
    rmSync(helperPath, { force: true });
    throw error;
  }

  const payload = Buffer.from(
    JSON.stringify({
      currentVersion: options.currentVersion,
      channel: options.channel,
      entrypointPath: normalize(options.entrypointPath),
      startedAt,
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
    removeOwnedLock(lockPath, updateId);
    rmSync(helperPath, { force: true });
    throw error;
  }
  return { helperPid, logPath };
}
