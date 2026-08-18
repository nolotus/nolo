// database/client/db.ts
// Web 版数据库 - 使用 level 包 (基于 IndexedDB)

import { Level } from "level";

// 数据库单例
let dbInstance: Level<string, any> | null = null;

/**
 * 获取或创建数据库实例
 */
export function getDb(): Level<string, any> {
    if (!dbInstance) {
        dbInstance = new Level("nolo", { valueEncoding: "json" });
    }
    return dbInstance;
}

/**
 * 创建数据库实例（用于 store 初始化）
 */
export function createDb(): Level<string, any> {
    return getDb();
}

/**
 * 关闭数据库
 */
export async function closeDb(): Promise<void> {
    if (dbInstance) {
        await dbInstance.close();
        dbInstance = null;
    }
}

/**
 * 关闭所有数据库（Web 版只有一个实例）
 */
export async function closeAllDatabases(): Promise<void> {
    await closeDb();
}

/**
 * 检查是否为 React Native 环境
 */
export const isNative = false;

// 导出数据库实例（兼容旧代码）
export const browserDb = getDb();

export default Level;
