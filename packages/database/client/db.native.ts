// database/client/db.native.ts
// React Native 版数据库 - 使用 @nolo/leveldb (monorepo 内部包)

import Level from "@nolo/leveldb";

// 扩展全局对象类型
declare global {
    var noloDbInstance: Level | null;
}

/**
 * 获取或创建数据库实例
 * 使用全局变量存储实例，防止 Fast Refresh 导致模块重载时丢失引用而重复打开数据库
 */
export function getDb(): Level {
    if (!global.noloDbInstance) {
        console.log('[DB Native] Creating new LevelDB instance');
        try {
            global.noloDbInstance = new Level("nolo", { valueEncoding: "json" });
        } catch (e: any) {
            console.error('[DB Native] Failed to open database:', e?.message ?? e);
            throw new Error(
                `[DB Native] 数据库启动失败，请尝试重启应用。原因: ${e?.message ?? '未知错误'}`
            );
        }
    }
    return global.noloDbInstance;
}

/**
 * 创建数据库实例（用于 store 初始化）
 */
export function createDb(): Level {
    return getDb();
}

/**
 * 关闭当前数据库实例
 */
export async function closeDb(): Promise<void> {
    if (global.noloDbInstance) {
        try {
            await global.noloDbInstance.close();
            console.log('[DB Native] Database closed');
        } catch (e) {
            console.warn('[DB Native] Error closing database:', e);
        }
        global.noloDbInstance = null;
    }
}

/**
 * 关闭所有数据库（用于热重载清理）
 */
export async function closeAllDatabases(): Promise<void> {
    try {
        global.noloDbInstance = null;
        await Level.closeAll();
        console.log('[DB Native] All databases closed');
    } catch (e) {
        console.warn('[DB Native] Failed to close all databases:', e);
    }
}

/**
 * 检查是否为 React Native 环境
 */
export const isNative = true;

// 导出数据库实例（兼容旧代码）
export const browserDb = getDb();

export default Level;
