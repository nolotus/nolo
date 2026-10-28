// 单实例互斥 + 存活信号（2026-10-27 connector 静默卡死 + 双实例互踢事故）。
//
// 事故根因（见 docs/incidents/2026-10-27-connector-silent-hang-and-duplicate-instances.md）：
// 同一台机器可以同时跑两个 connector，两者互相把对方的 WS 连接踢下线；连接死掉
// 之后又没有外部观察者，卡死会一直静默。这两个模块把「互斥」变成结构而不是运维：
//   - 单实例锁：同一 machineId 同时只允许一个 connector 进程；
//   - 存活信号：心跳成功后落一个 epoch 时间戳，给外部观察者（supervisor）一个
//     「这个进程还活着」的判据。
//
// 路径约定：
//   - 默认 `<homeDir>/.nolo/connector/<machineId>.lock` 与 `<...>.alive`；
//   - 若设置了 NOLO_HOME（仓库里其它 nolo 路径都认这个变量），状态目录落在
//     `$NOLO_HOME/connector/`，测试进程因此不会写开发者真实 home。
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type ConnectorInstanceLockKind = "ws" | "daemon";

export type ConnectorInstanceLockHandle = {
  ok: true;
  release: () => void;
  /**
   * 接管标记：仅当「读不出有效 pid（文件为空 / JSON 损坏 / pid 非法）且该文件已超过
   * {@link CONNECTOR_LOCK_CORRUPT_RECLAIM_SECONDS} 年龄」时才会出现，值为 "corrupt"。
   * 调用方可以据此打日志——说明锁文件损坏（通常来自进程崩溃在半路），本次接管是
   * 有界兜底，而不是一次正常的「陈旧锁（pid 已死）」接管。
   */
  reclaimed?: "corrupt";
};

export type ConnectorInstanceLockConflict = {
  ok: false;
  /**
   * 占用者 pid。读不出有效 pid 时为 0，含义是「占用者未知」——此时锁文件可能正处在
   * 创建者写内容之前的窗口里，也可能是内容损坏。
   */
  pid: number;
};

export type ConnectorInstanceLockResult =
  | ConnectorInstanceLockHandle
  | ConnectorInstanceLockConflict;

export type ConnectorStateDirArgs = {
  /** 用户 home 目录（默认 homedir()）。显式给出时状态目录为 `<homeDir>/.nolo/connector`。 */
  homeDir?: string;
  /** nolo home 目录（默认 `$NOLO_HOME` 或 `~/.nolo`）。状态目录为 `<noloHome>/connector`。 */
  noloHome?: string;
};

export type ConnectorInstanceLockArgs = ConnectorStateDirArgs & {
  machineId: string;
  kind?: ConnectorInstanceLockKind;
};

/**
 * 状态目录：`<homeDir>/.nolo/connector`（契约路径）。
 * 未显式给 homeDir 时退回 nolo home（`$NOLO_HOME` 或 `~/.nolo`）+ `connector`，
 * 两者在默认情况下是同一个路径。
 */
export function resolveConnectorStateDir(args: ConnectorStateDirArgs = {}): string {
  const homeDir = args.homeDir?.trim();
  if (homeDir) return join(homeDir, ".nolo", "connector");
  const noloHome = args.noloHome?.trim() || process.env.NOLO_HOME?.trim();
  if (noloHome) return join(noloHome, "connector");
  return join(homedir(), ".nolo", "connector");
}

/** machineId 会直接进文件名：去掉路径分隔符等危险字符。 */
function sanitizeMachineId(machineId: string): string {
  const safe = String(machineId ?? "").replace(/[^A-Za-z0-9._-]/g, "_");
  return safe || "unknown";
}

export function connectorInstanceLockPath(args: ConnectorInstanceLockArgs): string {
  return join(resolveConnectorStateDir(args), `${sanitizeMachineId(args.machineId)}.lock`);
}

export function connectorAliveSignalPath(args: ConnectorStateDirArgs & { machineId: string }): string {
  return join(resolveConnectorStateDir(args), `${sanitizeMachineId(args.machineId)}.alive`);
}

/**
 * 判活：signal 0 不发送任何信号，只做「这个 pid 存在吗」的权限/存在性检查。
 *
 * 为什么用 `process.kill(pid, 0)` 而不是别的判据：
 *   - 时间戳（startedAt / mtime）无法区分「进程死了」和「进程卡死」——而卡死恰恰是
 *     本次事故最需要被锁挡住的情况（活着但不可用）。pid 存在性把两者都算「占用」。
 *   - 读 /proc/<pid> 只在 Linux 可用；signal 0 是 POSIX 语义，跨平台一致。
 *   - EPERM 表示进程存在但当前用户无权发信号 → 仍然算存活（否则会误判成陈旧锁并
 *     抢走别人的锁，那正好会重新引入「两个实例互踢」）。
 */
export function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException)?.code === "EPERM";
  }
}

function readLockPid(lockPath: string): number | null {
  let raw: string;
  try {
    raw = readFileSync(lockPath, "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as { pid?: unknown };
    const pid = Number(parsed?.pid);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function isEexist(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === "EEXIST";
}

/**
 * 损坏锁的接管阈值（秒）。
 *
 * 为什么需要它：fail-closed 之后，「读不出有效 pid」的锁一律按「已被占用」处理，
 * 一个崩溃在写锁内容途中（或内容被外部截断）的残留锁会永久挡住新实例。有界兜底
 * 让这种坏锁最终能被清理，同时不依赖「写锁只花几微秒」这种时间竞争。
 *
 * 为什么是 300s：远大于任何一次正常锁写入 + 观察者读取的耗时（毫秒级），所以不会
 * 误伤「创建者正在写」的真实并发；同时又足够小，崩溃残留不会让机器长时间不可用。
 */
export const CONNECTOR_LOCK_CORRUPT_RECLAIM_SECONDS = 300;

/** 读不出有效 pid 的锁的三种状态。 */
type CorruptLockState =
  /** 读不出有效 pid，但文件还「新鲜」→ 可能是创建者正在写 → 视为已占用。 */
  | "fresh"
  /** 读不出有效 pid，且文件已超过阈值年龄 → 判定为崩溃残留的坏锁 → 可接管。 */
  | "expired"
  /** 锁文件已经不在了（在我们读它的时候被别人删了）→ 直接重试即可。 */
  | "gone";

/**
 * 检查一个「读不出有效 pid」的锁文件。
 *
 * 注意 `statSync` 失败时返回 "fresh"（fail-closed）：无法确定年龄就不接管。
 */
function inspectCorruptLock(lockPath: string, now: number = Date.now()): CorruptLockState {
  try {
    const stat = statSync(lockPath);
    const ageMs = now - stat.mtimeMs;
    return ageMs > CONNECTOR_LOCK_CORRUPT_RECLAIM_SECONDS * 1000 ? "expired" : "fresh";
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return "gone";
    return "fresh";
  }
}

/**
 * 获取单实例锁。原子语义：`openSync(path, "wx")`（O_CREAT|O_EXCL）——不存在
 * 「先 exists 再写」的窗口，两进程同时起只有一个能拿到锁。
 *
 * 锁已存在时读 pid 判活：活着 → 冲突（ok:false + pid）。
 *
 * ## 0 字节窗口（为什么读不出 pid 就必须 fail-closed）
 *
 * `openSync(lockPath, "wx")` 是原子的，但**创建和写入内容是两个步骤**：文件一旦被
 * 创建出来，它在 `writeFileSync` 落盘之前就是 0 字节。这个窗口真实存在——不是理论
 * 上的极端情况：两个 connector 并发启动，一个刚 open 完还没 write，另一个就会撞上。
 *
 * 如果此时按「读不出 pid ⇒ 陈旧锁 ⇒ 删掉重试」处理，就会出现击穿：
 *   A: open(成功) → 0 字节 → （还没写）
 *   B: open(EEXIST) → 读内容 = "" → JSON.parse 抛错 → 判为「无 pid」→ 当成陈旧锁
 *      → unlink 掉 A 正在持有的锁 → 重试 open 成功 → B 拿到锁
 *   A: writeFileSync 完成 → A 也认为自己拿到了锁
 * 结果：两个进程同时「持有」同一个锁 → 互斥失效 → 回到本事故最初的双实例互踢。
 *
 * 所以这里的规则是 **fail-closed**：
 *   1. 读不出有效 pid（文件为空 / JSON 损坏 / pid 非正整数）→ 一律视为「已被占用」，
 *      绝不 unlink。宁可让第二个进程暂时起不来，也不能让互斥失效。
 *   2. 只有「读得出有效 pid 且该 pid 已死」→ 才允许删除并接管（正常的陈旧锁）。
 *   3. 崩溃残留的坏锁（读不出 pid 且文件已超过
 *      {@link CONNECTOR_LOCK_CORRUPT_RECLAIM_SECONDS}）→ 有界兜底接管，并返回
 *      `reclaimed: "corrupt"` 供调用方记日志。
 *
 * 也就是说：不靠「窗口太窄、抢时间赢了也没事」这种运气论，而是靠「读不出就当占用」
 * 把窗口本身变成无害的。
 */
export function acquireConnectorInstanceLock(
  args: ConnectorInstanceLockArgs,
): ConnectorInstanceLockResult {
  const lockPath = connectorInstanceLockPath(args);
  mkdirSync(resolveConnectorStateDir(args), { recursive: true });

  /** 本次是否接管了一个「读不出有效 pid 的坏锁」（给调用方一个可记录的标记）。 */
  let reclaimed: "corrupt" | undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let fd: number | null = null;
    try {
      fd = openSync(lockPath, "wx");
    } catch (error) {
      if (!isEexist(error)) throw error;
      const ownerPid = readLockPid(lockPath);
      if (ownerPid !== null) {
        if (isProcessAlive(ownerPid)) {
          return { ok: false, pid: ownerPid };
        }
        // 正常的陈旧锁：pid 存在但进程已死（被 kill -9 的旧实例）→ 删掉后重试一次。
        try {
          unlinkSync(lockPath);
        } catch {
          // 已经被别人删了 → 下一轮直接重试。
        }
        continue;
      }

      // 读不出有效 pid：文件为空 / JSON 损坏 / pid 非法。
      const state = inspectCorruptLock(lockPath);
      if (state === "gone") {
        // 锁在我们读它的时候被别的进程删了 → 直接重试打开。
        continue;
      }
      if (state === "fresh") {
        // fail-closed：无法证明它陈旧，就当它被占着，绝不 unlink。
        return { ok: false, pid: 0 };
      }
      // 有界兜底：坏锁且已超过阈值年龄 → 接管（崩溃残留不该永久挡住机器）。
      try {
        unlinkSync(lockPath);
      } catch {
        // 已经被别人删了 → 下一轮直接重试。
      }
      reclaimed = "corrupt";
      continue;
    }
    try {
      writeFileSync(fd, JSON.stringify({ pid: process.pid, startedAt: Date.now() }), "utf8");
    } finally {
      closeSync(fd);
    }
    return {
      ok: true,
      release: () => releaseConnectorInstanceLock(lockPath),
      ...(reclaimed ? { reclaimed } : {}),
    };
  }

  // 重试后依然被占用（有人在我们删陈旧锁的间隙抢到了）：报告当前占用者。
  const ownerPid = readLockPid(lockPath);
  return { ok: false, pid: ownerPid ?? 0 };
}

/** 只释放自己持有的锁：文件里的 pid 必须等于本进程，否则不删（可能是别人接管了）。 */
export function releaseConnectorInstanceLock(lockPath: string): void {
  const ownerPid = readLockPid(lockPath);
  if (ownerPid !== process.pid) return;
  try {
    unlinkSync(lockPath);
  } catch {
    // 已经不在了 → 无事可做。
  }
}

/**
 * 写存活信号（epoch ms，十进制）。写失败必须吞掉：存活信号只是给外部观察者的
 * 额外判据，它坏掉不应该反过来把连接搞崩。
 */
export function markConnectorAlive(args: ConnectorStateDirArgs & { machineId: string }): void {
  const path = connectorAliveSignalPath(args);
  try {
    mkdirSync(resolveConnectorStateDir(args), { recursive: true });
    // 临时文件 + rename：观察者不会读到写了一半的内容。
    const tmpPath = `${path}.${process.pid}.tmp`;
    writeFileSync(tmpPath, String(Date.now()), "utf8");
    try {
      renameSync(tmpPath, path);
    } catch (error) {
      try {
        unlinkSync(tmpPath);
      } catch {
        // ignore
      }
      throw error;
    }
  } catch {
    // 存活信号是 best-effort。
  }
}

/** 正常退出 / abort 时清掉存活信号（best-effort）。 */
export function clearConnectorAlive(args: ConnectorStateDirArgs & { machineId: string }): void {
  try {
    unlinkSync(connectorAliveSignalPath(args));
  } catch {
    // 忽略。
  }
}

/**
 * 心跳包装层：心跳成功之后才更新存活信号，失败时原样抛出（不写信号）。
 * 全仓只在这一处写 `.alive`——避免出现两个互相覆盖的写入点。
 */
export function withConnectorAliveSignal<T>(
  sendHeartbeat: () => Promise<T>,
  args: ConnectorStateDirArgs & { machineId: string },
): () => Promise<T> {
  return async () => {
    const result = await sendHeartbeat();
    markConnectorAlive(args);
    return result;
  };
}
