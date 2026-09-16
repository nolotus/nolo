import { existsSync, mkdirSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { DESKTOP_WINDOW_STATE_FILE } from "./desktopWindowState";

/**
 * 背景：打包版 channel 曾解析失败为 ""（updater 元数据读取落在错误 cwd，见
 * electrobunInstallMetadata.ts），server DB 与窗口状态因此落在无 channel 的基目录
 * （`<base>/data`、`<base>/window-state.json`）。channel 修复后数据目录变为
 * `<base>/<channel>/`，本模块把既有安装一次性迁过去，否则升级后本地数据会看起来
 * 「消失」（实际只是换了目录）。
 *
 * 策略（一次性、fail-soft、绝不搬正在使用的数据）：
 * - 目标已存在或来源不存在 → 不动作（只记录）；
 * - 旧 lock（`desktop-instance.lock.json`）记录的 pid 仍存活 → 整体跳过；
 * - rename 失败只记录日志，不阻塞启动。
 *
 * 升级指引与手动恢复流程：
 * docs/incidents/2026-09-16-desktop-updater-metadata-and-legacy-data-transition.md
 */

const LEGACY_DESKTOP_DATA_ENTRIES = ["data", DESKTOP_WINDOW_STATE_FILE] as const;
const DESKTOP_INSTANCE_LOCK_FILE = "desktop-instance.lock.json";

type DesktopDataDirMigrationReason =
  | "same-dir"
  | "legacy-missing"
  | "legacy-instance-running";

type DesktopDataDirMigrationResult = {
  moved: string[];
  reason?: DesktopDataDirMigrationReason;
};

type MigrateLegacyDesktopChannelDataOptions = {
  /** channel 解析失败时代的无 channel 基目录（`resolveDesktopChannelDir("")`）。 */
  legacyDir: string;
  /** 当前 channel 目录（`resolveDesktopChannelDir(channel)`）。 */
  channelDir: string;
  pathExists?: (path: string) => boolean;
  rename?: (from: string, to: string) => void;
  makeDir?: (dir: string) => void;
  readFile?: (path: string) => string;
  isProcessAlive?: (pid: number) => boolean;
  log?: (message: string) => void;
};

/** 与 singleInstanceLock 相同语义：signal 0 只做存在性探测。 */
const defaultPidAlive = (pid: number) => {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const legacyInstanceRunning = (
  legacyDir: string,
  deps: {
    pathExists: (path: string) => boolean;
    readFile: (path: string) => string;
    isProcessAlive: (pid: number) => boolean;
  },
) => {
  const lockPath = join(legacyDir, DESKTOP_INSTANCE_LOCK_FILE);
  try {
    if (!deps.pathExists(lockPath)) return false;
    const parsed = JSON.parse(deps.readFile(lockPath)) as unknown;
    if (!parsed || typeof parsed !== "object") return false;
    const pid = Number((parsed as { pid?: unknown }).pid);
    if (!Number.isInteger(pid) || pid <= 0) return false;
    return deps.isProcessAlive(pid);
  } catch {
    return false;
  }
};

export const migrateLegacyDesktopChannelData = (
  options: MigrateLegacyDesktopChannelDataOptions,
): DesktopDataDirMigrationResult => {
  const {
    legacyDir,
    channelDir,
    pathExists = existsSync,
    rename = renameSync,
    makeDir = (dir: string) => mkdirSync(dir, { recursive: true }),
    readFile = (path: string) => readFileSync(path, "utf8"),
    isProcessAlive = defaultPidAlive,
    log = (message: string) => console.warn(message),
  } = options;

  if (legacyDir === channelDir) return { moved: [], reason: "same-dir" };
  if (!pathExists(legacyDir)) return { moved: [], reason: "legacy-missing" };

  // 先算候选：迁移完成后（或本来就没有 legacy 数据）直接返回，不读 lock、不记录，
  // 避免每次启动都做无意义的存活检查与日志。
  const candidates = LEGACY_DESKTOP_DATA_ENTRIES.filter((entry) =>
    pathExists(join(legacyDir, entry)),
  );
  if (candidates.length === 0) return { moved: [] };

  if (legacyInstanceRunning(legacyDir, { pathExists, readFile, isProcessAlive })) {
    log(
      `[desktop] legacy desktop instance still running; deferring legacy data dir migration (${legacyDir})`,
    );
    return { moved: [], reason: "legacy-instance-running" };
  }

  const moved: string[] = [];
  for (const entry of candidates) {
    const from = join(legacyDir, entry);
    const to = join(channelDir, entry);
    if (pathExists(to)) {
      log(
        `[desktop] legacy entry "${entry}" left in place: ${to} already exists; ` +
          `legacy copy retained at ${from} for manual recovery`,
      );
      continue;
    }
    try {
      makeDir(channelDir);
      rename(from, to);
      moved.push(entry);
    } catch (error) {
      log(
        `[desktop] failed to migrate legacy entry "${entry}" into ${channelDir}: ${String(error)}`,
      );
    }
  }
  return { moved };
};
