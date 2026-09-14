import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DesktopUpdaterStatusEntry } from "./desktopUpdaterState";

/**
 * 「更新退出交接失败」的持久化用户可见状态。
 *
 * 主进程退出路径若无法在预算内确认旧进程树终止（见
 * desktop/src/bun/serverChildLifecycle.ts 的 stopServerChildTree），更新 helper
 * 会因文件锁未释放而干等。electrobun 的 close/before-quit 无法取消（仓库内无
 * 可用 API 证据，见主进程 index.ts 注释），因此把失败事实写成本文件：
 * - 下次启动后 updater 快照（desktopUpdaterCoordinator）把它并进 statusHistory，
 *   设置页对用户可见；
 * - 用户重新发起 download/apply 时由 coordinator 清除。
 * 所有函数都以 channelDir 为参（调用方用 runtimePaths.resolveDesktopChannelDir
 * 计算），本模块不做路径推断。
 */

export const DESKTOP_UPDATE_SHUTDOWN_STATUS_CODE = "quit-handoff-failed";
export const DESKTOP_UPDATE_SHUTDOWN_STATUS_FILENAME =
  "desktop-update-shutdown-status.json";

export const buildDesktopUpdateShutdownStatusEntry = (input: {
  reason: string;
  detail?: string;
  timestamp?: number;
}): DesktopUpdaterStatusEntry => ({
  status: DESKTOP_UPDATE_SHUTDOWN_STATUS_CODE,
  message:
    `Last update could not be applied: the app did not fully exit ` +
    `(${input.reason}${input.detail ? `: ${input.detail}` : ""}). ` +
    `You can retry the update.`,
  timestamp: input.timestamp ?? Date.now(),
});

const isValidEntry = (value: unknown): value is DesktopUpdaterStatusEntry => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<DesktopUpdaterStatusEntry>;
  return (
    typeof candidate.status === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.timestamp === "number" &&
    Number.isFinite(candidate.timestamp)
  );
};

export const readDesktopUpdateShutdownStatus = (
  channelDir: string,
): DesktopUpdaterStatusEntry | null => {
  const filePath = join(channelDir, DESKTOP_UPDATE_SHUTDOWN_STATUS_FILENAME);
  if (!existsSync(filePath)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));
    return isValidEntry(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const writeDesktopUpdateShutdownStatus = (
  channelDir: string,
  entry: DesktopUpdaterStatusEntry,
): void => {
  mkdirSync(channelDir, { recursive: true });
  writeFileSync(
    join(channelDir, DESKTOP_UPDATE_SHUTDOWN_STATUS_FILENAME),
    `${JSON.stringify(entry)}\n`,
    "utf8",
  );
};

export const clearDesktopUpdateShutdownStatus = (channelDir: string): void => {
  rmSync(join(channelDir, DESKTOP_UPDATE_SHUTDOWN_STATUS_FILENAME), { force: true });
};
