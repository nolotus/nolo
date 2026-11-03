import fs from "node:fs";
import path from "node:path";

export type LevelDbOwnershipLock = {
  lockPath: string;
  /** 幂等；重复调用不会抛错。 */
  release(): void;
};

const LOCKED_CODE = "LEVEL_LOCKED";
/** 锁文件刚被创建但内容还没写入时，别把它当成陈旧锁抢走。 */
const UNWRITTEN_LOCK_GRACE_MS = 5_000;

type LockFileHolder = {
  pid: number | undefined;
  mtimeMs: number;
};

function createLockError(lockPath: string, ownerPid?: number): Error {
  const detail = ownerPid === undefined
    ? `the lock file ${lockPath} exists but its owner process is unknown`
    : `it is held by process ${ownerPid}`;
  return Object.assign(
    new Error(
      `CLI authority database is already open by another process: ${detail} ` +
        `(${lockPath}). Wait for that process to exit, or stop it before starting Nolo again.`
    ),
    { code: LOCKED_CODE, lockPath, ownerPid }
  );
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM = 进程存在但不属于当前用户，同样是活着的持有者。
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function readLockHolder(lockPath: string): LockFileHolder | undefined {
  let raw: string;
  try {
    raw = fs.readFileSync(lockPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  let pid: number | undefined;
  try {
    const parsed = JSON.parse(raw) as { pid?: unknown };
    if (typeof parsed.pid === "number" && Number.isInteger(parsed.pid) && parsed.pid > 0) {
      pid = parsed.pid;
    }
  } catch {
    // 半截写入（创建后立刻崩溃）：没有 pid 时交给 mtime 宽限期判定。
  }
  let mtimeMs = Date.now();
  try {
    mtimeMs = fs.statSync(lockPath).mtimeMs;
  } catch {}
  return { pid, mtimeMs };
}

/**
 * 应用级单写者锁：`<dbPath>.owner`（db 目录的兄弟路径），内容是
 * `{ pid, startedAt }`。
 *
 * 为什么需要它：native LevelDB 的 POSIX 进程锁在「第二个 native open 失败」
 * 时会被释放（见 docs/incidents/2026-10-19-cli-leveldb-lock-corruption.md），
 * 进程内 Map 也拦不住另一个进程。这里在 native open 之前用 O_CREAT|O_EXCL
 * 抢一个独立的所有权文件，让两个 CLI 进程不可能同时进入 native open。
 *
 * 它只负责「谁可以尝试 open」；真正的 POSIX 锁仍由 Level 持有，两者叠加。
 */
export function acquireLevelDbOwnershipLock(dbPath: string): LevelDbOwnershipLock {
  const lockPath = `${dbPath}.owner`;
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  const content = `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let fd: number;
    try {
      fd = fs.openSync(lockPath, "wx", 0o644);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;

      const holder = readLockHolder(lockPath);
      if (!holder) continue; // 刚好被释放，下一轮直接创建。
      if (holder.pid !== undefined && isProcessAlive(holder.pid)) {
        throw createLockError(lockPath, holder.pid);
      }
      if (holder.pid === undefined && Date.now() - holder.mtimeMs < UNWRITTEN_LOCK_GRACE_MS) {
        throw createLockError(lockPath);
      }

      // 陈旧锁：先原子 rename 到独占名字再删除。并发两个进程都判定陈旧时，
      // 直接 unlink+create 会把对方刚创建的新锁删掉；rename 只有一个能成功。
      const quarantine = `${lockPath}.stale-${process.pid}-${Date.now()}`;
      try {
        fs.renameSync(lockPath, quarantine);
        fs.rmSync(quarantine, { force: true });
      } catch (renameError) {
        if ((renameError as NodeJS.ErrnoException).code !== "ENOENT") throw renameError;
      }
      continue;
    }

    try {
      fs.writeSync(fd, content);
    } catch (error) {
      // 内容没写全的锁文件不能被后续进程误认为有效持有者。
      try {
        fs.closeSync(fd);
      } catch {}
      try {
        fs.rmSync(lockPath, { force: true });
      } catch {}
      throw error;
    }

    let released = false;
    return {
      lockPath,
      release() {
        if (released) return;
        released = true;
        // 先关描述符再删文件；进程活着时不会有别的进程接管这个锁，删除是安全的。
        try {
          fs.closeSync(fd);
        } catch {}
        try {
          fs.rmSync(lockPath, { force: true });
        } catch {}
      },
    };
  }

  throw createLockError(lockPath);
}
