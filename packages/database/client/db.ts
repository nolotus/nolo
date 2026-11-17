// database/client/db.ts
// Web 版数据库 - 使用 level 包 (基于 IndexedDB)

import { Level } from "level";

// 数据库单例
let dbInstance: Level<string, any> | null = null;

/**
 * 数据库位置。
 *
 * 浏览器里 `"nolo"` 只是 IndexedDB 里的库名（无路径语义）；但**这个模块也会被
 * Bun/Node 测试与 CLI 路径导入**，那时 level 会在文件系统上真的建一个目录，相对名
 * `"nolo"` 就落在 `<cwd>/nolo`。后果（2026-11-17 实测）：
 *   1. 跑测试会在仓库工作区里留下 `nolo/` LevelDB（污染工作区）；
 *   2. 同一个 cwd 下的多个测试文件并发打开**同一个库** → 「Database failed to open」
 *      与 authority broker 抢端点，表现为 3 条假红 + 耗时翻 4 倍（26.7s vs 5.75s/4.6s）。
 *
 * 所以允许用 `NOLO_LOCAL_DB_PATH` 显式指定位置（测试 preload 会给每个进程钉一个独占
 * 临时目录）。**默认值保持不变**——真实 CLI 用户的数据还在 `<cwd>/nolo`，改默认就是
 * 静默搬库。
 */
const resolveLocalDbLocation = (): string => {
    // ⚠️ 浏览器构建里没有 `process`（esbuild platform:browser 不注入 shim），而
    // `browserDb = getDb()` 在**模块加载时**就会跑。所以必须先判 `process` 存在性：
    // 只看 `process.env.X?.trim()` 会在浏览器里直接 `ReferenceError: process is not defined`，
    // 把 IndexedDB 初始化链路整个打断（2026-11-17 独立 review HIGH：esbuild 浏览器
    // 转换 + 无 process 的 VM 上下文实测复现）。
    if (typeof process === "undefined" || !process.env) return "nolo";
    return process.env.NOLO_LOCAL_DB_PATH?.trim() || "nolo";
};

/**
 * 获取或创建数据库实例
 */
export function getDb(): Level<string, any> {
    if (!dbInstance) {
        dbInstance = new Level(resolveLocalDbLocation(), { valueEncoding: "json" });
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
