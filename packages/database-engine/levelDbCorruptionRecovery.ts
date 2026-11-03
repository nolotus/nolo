import fs from "node:fs";
import path from "node:path";
import { toErrorMessage } from "core/errorMessage";
import { Level } from "level";

export type LevelDbCorruptionRecoveryOptions = {
  dbPath: string;
  /** 测试可注入的时钟，决定备份目录名里的 UTC 时间戳。 */
  now?: () => number;
  /** 面向用户的单行日志出口；默认 console.warn。 */
  log?: (message: string) => void;
  /**
   * 测试可注入的修复实现。默认走 Level.repair（即 classic-level 的
   * ClassicLevel.repair）——见 repairLevelDatabase 的说明。
   */
  repair?: (dbPath: string) => Promise<void>;
};

export type LevelDbCorruptionRecoveryResult = {
  backupPath: string;
};

const CORRUPTION_CODE = "LEVEL_CORRUPTION";
const CORRUPTION_MESSAGE = /Corruption:|missing files/i;

/**
 * level 包只是把 classic-level 的 ClassicLevel 原样再导出
 * （`exports.Level = require('classic-level').ClassicLevel`），所以 repair 就在
 * 已有的 `Level` 构造器上。这里刻意不从 "classic-level" 直接 import：
 *
 * - database-engine 的依赖只有 `level`，直接 import 会引入未声明的依赖；
 * - CLI 发布产物把 "classic-level" 标成 external，但发布 manifest 只 pin
 *   `level`；出现新的 external import 会让 buildPublish 的依赖校验直接失败；
 * - 仓库还用 packages/cli/levelLazyShim.mjs 把 `level` 换成懒加载 shim，
 *   直接 import native 包会让 `nolo --help` 也加载 .node binding。
 *
 * 静态方法在 `level` 的类型声明里没有，用最小结构类型收口。
 */
const levelClassWithRepair = Level as unknown as {
  repair(location: string): Promise<void>;
};

/**
 * 沿 error.cause 链判断是否为 LevelDB 数据损坏。与
 * packages/cli/localRuntimeAuthority.ts 的 findCliAuthorityCorruption 同口径，
 * 但这里不导出内部对象，避免损坏被误当成锁竞争重试。
 */
export function isLevelCorruptionError(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && !seen.has(current)) {
    seen.add(current);
    if ((current as { code?: unknown }).code === CORRUPTION_CODE) return true;
    if (CORRUPTION_MESSAGE.test(toErrorMessage(current))) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

function formatUtcStamp(now: number): string {
  // 2026-11-01T09:08:07.123Z -> 20261101-090807
  return new Date(now)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "")
    .replace("T", "-");
}

function resolveBackupPath(dbPath: string, now: number): string {
  const base = `${dbPath}.corrupt-${formatUtcStamp(now)}`;
  // 同一秒内可能连续损坏；renameSync 不能覆盖非空目录，先找一个空位。
  let candidate = base;
  for (let index = 2; fs.existsSync(candidate); index += 1) {
    candidate = `${base}-${index}`;
  }
  return candidate;
}

async function repairLevelDatabase(dbPath: string): Promise<void> {
  await levelClassWithRepair.repair(dbPath);
}

/**
 * 修复一个被 LEVEL_CORRUPTION（典型是 MANIFEST 引用了已删除的 .ldb）打坏的
 * LevelDB 目录。
 *
 * 顺序不可调换：先把原库整体 rename 成同目录备份（rename 原子且立刻保留原始
 * 证据），再把它复制回原路径，只对副本执行 repair。repair 会改写 CURRENT、
 * MANIFEST 并生成新表，因此绝不能就地跑——原库必须在修改发生前就留档。
 *
 * 本函数只做文件操作和 repair，不打开数据库：调用方已经有一次失败的 native
 * open，多构造一个 Level 只会扩大锁/描述符的出错面。
 */
export async function recoverCorruptedLevelDb(
  options: LevelDbCorruptionRecoveryOptions
): Promise<LevelDbCorruptionRecoveryResult> {
  const { dbPath } = options;
  const log = options.log ?? ((message: string) => console.warn(message));
  const repair = options.repair ?? repairLevelDatabase;
  const backupPath = resolveBackupPath(dbPath, (options.now ?? Date.now)());

  // rename 之前的失败不能走回滚：此时 dbPath 还是原始数据，删掉它就是数据丢失。
  fs.renameSync(dbPath, backupPath);

  try {
    // 修复在副本上做，留档保持损坏时的原样（含缺失的文件记录）。
    fs.cpSync(backupPath, dbPath, { recursive: true, preserveTimestamps: true });
    await repair(dbPath);
  } catch (error) {
    try {
      fs.rmSync(dbPath, { recursive: true, force: true });
      fs.renameSync(backupPath, dbPath);
    } catch (rollbackError) {
      throw Object.assign(
        new Error(
          `Failed to repair the local database at ${dbPath} and could not restore the original. ` +
            `The untouched copy is at ${backupPath}; stop every Nolo process before retrying. ` +
            `Do not delete ${path.join(dbPath, "LOCK")} and do not reinstall Nolo: ` +
            `${toErrorMessage(error)}`,
          { cause: new AggregateError([error, rollbackError], "LevelDB repair and rollback both failed") }
        ),
        { code: CORRUPTION_CODE, backupPath }
      );
    }
    throw Object.assign(
      new Error(
        `Failed to repair the local database at ${dbPath}; the original database was restored unchanged. ` +
          `Stop every Nolo process and run the CLI again. Do not delete ${path.join(dbPath, "LOCK")} ` +
          `and do not reinstall Nolo: ${toErrorMessage(error)}`,
        { cause: error }
      ),
      { code: CORRUPTION_CODE, backupPath }
    );
  }

  log(
    `[nolo] local database corruption detected; preserved original at ${backupPath} and repaired a copy.`
  );
  return { backupPath };
}
