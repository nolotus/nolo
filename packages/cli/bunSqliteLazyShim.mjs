/**
 * Lazy-loading shim for `bun:sqlite`.
 *
 * esbuild alias 把 bundle 里所有 `import { Database } from "bun:sqlite"` 指向本文件。
 * `bun:sqlite` 是 Bun 内置模块，Node 运行时没有等价实现；CLI 发布产物跑在 Node 上，
 * 默认 authority store driver 是 level，不会实例化 sqlite Database。仅当用户显式
 * 设置 NOLO_SERVER_AUTHORITY_DRIVER=sqlite 时，CLI 本地 DB 路径才会走到这里并抛错——
 * 这是有意的显式失败（防静默损坏），错误信息会指导移除该环境变量。
 */
export class Database {
  constructor() {
    throw new Error(
      'bun:sqlite is not available in the Node CLI runtime; ' +
        "the CLI's default authority store driver is level. " +
        "If NOLO_SERVER_AUTHORITY_DRIVER=sqlite is set in a Node CLI environment, " +
        "remove it (sqlite is a server/Bun-only driver)",
    );
  }
}
