// 文件路径: packages/database/sqliteDb.ts
import { Database } from "bun:sqlite";
import { getDbFilePath } from "./utils/dbPath";

const userDatabases = new Map<string, Database>();

/**
 * 获取指定用户的 SQLite 数据库实例。
 * 如果该用户的数据库实例尚未打开，则会创建并打开它。
 * @param userId 用户的唯一 ID。
 * @returns 对应用户的 SQLite 数据库实例。
 */
export function getSqliteDb(userId: string): Database {
  let dbInstance = userDatabases.get(userId);

  if (!dbInstance) {
    const dbPath = getDbFilePath(userId);

    dbInstance = new Database(dbPath, { create: true });

    // WAL 模式：更适合高并发读写
    dbInstance.exec("PRAGMA journal_mode = WAL;");

    userDatabases.set(userId, dbInstance);

    console.log(`SQLite Database connected for user ${userId}: ${dbPath}`);
  }

  return dbInstance;
}

/**
 * 关闭所有已打开的用户 SQLite 数据库连接。
 * 由应用入口在优雅关机时统一调用。
 */
export function closeAllUserSqliteDbs() {
  console.log("Closing all user-specific SQLite database connections...");
  for (const [userId, db] of userDatabases.entries()) {
    try {
      db.close(false);
      console.log(`Closed DB for user ${userId}.`);
    } catch (e) {
      console.error(`Error closing DB for user ${userId}:`, e);
    }
  }
  // 清空 Map：蓝绿两阶段 drain 期间（phase 2），在途流可能再次调用 getSqliteDb，
  // 如果不清 Map，会拿到已关闭的 handle → "Database has closed" 错误。
  // 清空后 getSqliteDb 会重新打开——但 SQLite 是 per-user 文件锁，不阻塞 canary。
  userDatabases.clear();
}