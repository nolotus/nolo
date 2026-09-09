/**
 * Windows 下内嵌 server 以独立子进程运行（index.ts 的 NOLO_DESKTOP_SERVER_CHILD
 * 分支）。electrobun 的更新 helper 要等安装目录的文件锁全部释放才能换文件，
 * 而主进程退出时 Windows 不会级联杀掉子进程——server 子进程一旦被孤儿化，
 * 就永远占着安装目录里的运行时镜像，更新 helper 只能干等（黑终端闪烁光标）。
 *
 * 本模块提供三层保险：
 * 1. 父进程死亡探测：父持有 fd3 控制管道，死亡（含被 TerminateProcess）时 OS
 *    关闭写端，子进程读到 EOF 立即自我了断。
 * 2. 树杀：正常退出路径用 taskkill /T /F 带走 server 子进程及其后代
 *    （agent run 等孙进程）。
 * 3. 硬退出看门狗：quit 流程超过时限仍未完成时 process.exit 兜底，
 *    不让事件循环里的残留句柄拖住主进程。
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createReadStream } from "node:fs";

export const SERVER_CHILD_CONTROL_FD = 3;
export const QUIT_WATCHDOG_MS = 8_000;

/** taskkill 参数：/T 树杀（含孙进程），/F 强制。纯函数便于测试。 */
export const buildWindowsTreeKillArgs = (pid: number): string[] => [
  "/pid",
  String(pid),
  "/T",
  "/F",
];

/**
 * 树杀 server 子进程（Windows），其他平台退回普通 kill。
 * fire-and-forget：taskkill 只负责递送终止，退出确认由看门狗兜底。
 */
export const killServerChildTree = (serverChild: ChildProcess | undefined): void => {
  if (!serverChild?.pid) return;
  if (process.platform === "win32") {
    try {
      spawn("taskkill", buildWindowsTreeKillArgs(serverChild.pid), {
        stdio: "ignore",
        windowsHide: true,
      }).unref();
      return;
    } catch {
      // fall through to plain kill
    }
  }
  try {
    serverChild.kill();
  } catch {
    // 已退出：kill 抛错无意义
  }
};

type EndLike = {
  on(event: "end" | "error", listener: () => void): unknown;
  destroy(): void;
  resume?(): unknown;
};

/** 流 EOF/error 触发 onGone（至多一次）。返回停止函数。 */
export const watchControlStreamEnd = (
  stream: EndLike,
  onGone: () => void,
): (() => void) => {
  let fired = false;
  const fire = () => {
    if (fired) return;
    fired = true;
    onGone();
  };
  stream.on("end", fire);
  stream.on("error", fire);
  stream.resume?.();
  return () => stream.destroy();
};

/**
 * 子进程侧：监听控制管道 EOF（=父进程已死），触发 onParentDeath。
 * 返回停止函数供测试或主动清理。
 */
export const armParentDeathWatch = (
  onParentDeath: () => void,
  fd: number = SERVER_CHILD_CONTROL_FD,
): (() => void) => {
  try {
    const stream = createReadStream("", { fd, autoClose: true });
    return watchControlStreamEnd(stream, onParentDeath);
  } catch {
    // 控制管道不可用（如手动启动 child 调试）：不该自杀，保持静默。
    return () => {};
  }
};

/**
 * 硬退出看门狗：到时限无条件 exitFn()。返回取消函数，正常退出路径应取消
 * 并立即自行退出。
 */
export const armHardExitWatchdog = (
  exitFn: () => void,
  timeoutMs: number = QUIT_WATCHDOG_MS,
): (() => void) => {
  const timer = setTimeout(exitFn, timeoutMs);
  return () => clearTimeout(timer);
};
