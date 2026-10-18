// packages/database-engine/serverDbRoleViolation.ts
//
// 角色越权访问共享 LevelDB 的 tagged 错误。
//
// 为什么单独成文件：判定的**发生点**在 serverStoreFactory（构造 store 的地方），
// 而**呈现点**在 db.ts（调用方拿到的错误）。两者不能互相 import 错误类，否则
// db.ts ↔ factory 形成环。放这里，双方都依赖它，方向单一。
//
// 为什么需要 code：调用方要能区分「进程角色配错」与「锁竞争 / IO 失败」。后者
// 可以重试；前者重试一万次也不会好，只会让 core 一直等在锁上。2026-10-18 生产
// 502 就是后者形态掩盖了前者 —— 日志里全是「LevelDB 被其他进程占用」，
// 真因却是 chat-proxy 进程开了它不该开的主库。
export class ServerDbRoleViolationError extends Error {
    readonly code = "SERVER_DB_ROLE_VIOLATION";
    constructor(message: string) {
        super(message);
        this.name = "ServerDbRoleViolationError";
    }
}

/** chat-proxy 触碰共享 LevelDB 时的统一文案（构造期与调用期共用，避免两处措辞漂移）。 */
export const SERVER_DB_ROLE_VIOLATION_MESSAGE =
    "当前进程角色不拥有共享 LevelDB（只有 core 拥有）：拒绝打开/访问数据库。" +
    "chat-proxy 应通过 internal API 向 core 请求所需数据，而不是直接开库。";
