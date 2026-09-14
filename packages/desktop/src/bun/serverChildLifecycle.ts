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
 *    （agent run 等孙进程），且必须有界等待并拿到子树 exit 证据才允许交接；
 *    超时/失败返回结构化结论，绝不 fire-and-forget。
 * 3. 硬退出看门狗：quit 流程超过时限仍未完成时 process.exit 兜底，
 *    不让事件循环里的残留句柄拖住主进程。
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createReadStream } from "node:fs";

export const SERVER_CHILD_CONTROL_FD = 3;
export const QUIT_WATCHDOG_MS = 8_000;
/**
 * 树杀总预算（递送 + 证据 + 兜底 kill 共享一个 deadline）。必须小于
 * QUIT_WATCHDOG_MS：交接证据要在看门狗强杀之前拿得到。
 */
export const SERVER_CHILD_STOP_TIMEOUT_MS = 5_000;

/** taskkill 参数：/T 树杀（含孙进程），/F 强制。纯函数便于测试。 */
export const buildWindowsTreeKillArgs = (pid: number): string[] => [
  "/pid",
  String(pid),
  "/T",
  "/F",
];

type ExitEvidence = { exited: boolean; code: number | null; signal: NodeJS.Signals | null };

/** 等到 child 的 exit 事件（或发现已退出）为止，deadline 内拿不到返回 exited:false。 */
const waitForExit = (child: ChildProcess, deadlineMs: number): Promise<ExitEvidence> =>
  new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve({ exited: true, code: child.exitCode, signal: child.signalCode });
      return;
    }
    const remaining = deadlineMs - Date.now();
    if (remaining <= 0) {
      resolve({ exited: false, code: null, signal: null });
      return;
    }
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      clearTimeout(timer);
      resolve({ exited: true, code, signal });
    };
    const timer = setTimeout(() => {
      child.removeListener("exit", onExit);
      resolve({ exited: false, code: null, signal: null });
    }, remaining);
    child.once("exit", onExit);
  });

export type ServerChildStopOutcome =
  | { ok: true; reason: "already-exited" | "stopped" }
  | { ok: false; reason: "timeout"; detail: string };

type StopServerChildTreeOptions = {
  /** 总预算（ms），默认 SERVER_CHILD_STOP_TIMEOUT_MS。测试可注入小值。 */
  timeoutMs?: number;
  /** 默认 process.platform；测试用它在本机驱动 windows 分支。 */
  platform?: NodeJS.Platform;
  /** 默认 node:child_process.spawn；测试注入假 taskkill。 */
  spawnFn?: typeof spawn;
};

/**
 * 有界停止 server 子进程树，并要求退出证据：
 * - Windows：taskkill /pid <pid> /T /F（按 pid 定向，绝不做进程名/命令行通配），
 *   等它退出确认递送；递送失败（非零/超时/spawn 抛错）回退直达 kill。
 * - 其他平台：直达 kill。
 * 最终必须在预算内拿到子进程 exit 事件，否则返回 ok:false —— 调用方
 * （index.ts 退出交接）据此判定「旧子树已终止」是否成立，不得盲目前进。
 */
export const stopServerChildTree = async (
  serverChild: ChildProcess | undefined,
  options: StopServerChildTreeOptions = {},
): Promise<ServerChildStopOutcome> => {
  const timeoutMs = options.timeoutMs ?? SERVER_CHILD_STOP_TIMEOUT_MS;
  const platform = options.platform ?? process.platform;
  const deadline = Date.now() + timeoutMs;

  if (!serverChild?.pid) return { ok: true, reason: "already-exited" };
  if (serverChild.exitCode !== null || serverChild.signalCode !== null) {
    return { ok: true, reason: "already-exited" };
  }

  if (platform === "win32") {
    let delivery: ExitEvidence = { exited: false, code: null, signal: null };
    try {
      const taskkill = (options.spawnFn ?? spawn)(
        "taskkill",
        buildWindowsTreeKillArgs(serverChild.pid),
        { stdio: "ignore", windowsHide: true },
      );
      taskkill.unref?.();
      delivery = await waitForExit(taskkill, deadline);
    } catch (error) {
      console.warn("[desktop] taskkill spawn failed; falling back to direct kill", error);
    }
    if (delivery.exited && delivery.code === 0) {
      const evidence = await waitForExit(serverChild, deadline);
      if (evidence.exited) return { ok: true, reason: "stopped" };
    }
    // taskkill 非零/超时/不可用：兜底直达 kill，吃掉剩余预算
  }

  try {
    serverChild.kill();
  } catch (error) {
    console.warn("[desktop] server child direct kill failed during stop", error);
  }
  const fallbackEvidence = await waitForExit(serverChild, deadline);
  if (fallbackEvidence.exited) return { ok: true, reason: "stopped" };

  return {
    ok: false,
    reason: "timeout",
    detail: `server child pid=${serverChild.pid} still alive ${timeoutMs}ms after tree kill`,
  };
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

/**
 * 看门狗兜底里留给「是否有待应用更新」探测的确认窗口。必须远小于
 * QUIT_WATCHDOG_MS，保证看门狗在触发后仍能及时给出确定退出码。
 */
export const QUIT_HANDOFF_CONFIRM_TIMEOUT_MS = 1_500;

export type QuitWatchdogExitPlan = {
  exitCode: 0 | 1;
  /** 旧子树终止证据是否已确认（stop.ok === true）。 */
  handoffConfirmed: boolean;
  /** true=有待应用更新；false=确认没有；null=确认窗口内无法判定。 */
  updateReady: boolean | null;
  /** 是否需要持久化 quit-handoff-failed 用户可见状态。 */
  persistHandoffFailure: boolean;
};

/** 有界竞速：promise 在 timeoutMs 内未 settle 时用 onTimeout() 兜底，不留悬挂定时器。 */
const raceWithTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => T,
): Promise<T> =>
  new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(onTimeout());
    }, timeoutMs);
    const settle = (value: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    promise.then(
      (value) => settle(value),
      () => settle(onTimeout()),
    );
  });

/**
 * 看门狗强制退出时的退出码决策（纯逻辑，供 index.ts 看门狗回调与单测复用）：
 * - 旧子树终止证据已确认（stop.ok）→ 0：更新 helper 能拿到已释放的文件锁。
 * - 证据缺失/失败时，在有限窗口内问一次「是否有待应用更新」：
 *   - 有（true）或窗口内无法判定（null）→ 持久化 quit-handoff-failed + 非零退出。
 *     绝不带未确认的更新交接静默 exit(0)——那会把更新无声丢弃；无法判定按
 *     fail-loud 处理。
 *   - 确认没有（false）→ 0，与正常退出路径一致。
 */
export const resolveQuitWatchdogExitPlan = async (input: {
  stop: ServerChildStopOutcome | null;
  /** 三态：true=有待应用更新；false=确认没有；null=出错/不可用（unknown，按未确认处理）。 */
  resolveUpdateReady: () => Promise<boolean | null>;
  confirmTimeoutMs?: number;
}): Promise<QuitWatchdogExitPlan> => {
  const stop = input.stop;
  if (stop?.ok) {
    return {
      exitCode: 0,
      handoffConfirmed: true,
      updateReady: null,
      persistHandoffFailure: false,
    };
  }
  const confirmTimeoutMs =
    input.confirmTimeoutMs ?? QUIT_HANDOFF_CONFIRM_TIMEOUT_MS;
  const updateReady = await raceWithTimeout<boolean | null>(
    input.resolveUpdateReady().catch(() => null),
    confirmTimeoutMs,
    () => null,
  );
  if (updateReady === false) {
    return {
      exitCode: 0,
      handoffConfirmed: false,
      updateReady: false,
      persistHandoffFailure: false,
    };
  }
  return {
    exitCode: 1,
    handoffConfirmed: false,
    updateReady,
    persistHandoffFailure: true,
  };
};
