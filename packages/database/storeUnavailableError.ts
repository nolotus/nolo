import { isLevelLifecycleError } from "./levelLifecycleError";
import { isLevelLockError } from "./levelLockError";

/**
 * 「存储此刻不可用」的统一判定（部署交接期的**瞬态**状态），区别于
 * 「这条数据/这个账号无效」的**业务**结论。
 *
 * 蓝绿部署交接窗口内，一次 `serverDb.get()` 可能以三种形态失败：
 * - canary 还没抢到 LevelDB 锁 → `LEVEL_DATABASE_NOT_OPEN`（deferred open 失败后 status=closed）
 * - 正在抢锁 → `LEVEL_LOCKED` / `Resource temporarily unavailable`
 * - 旧进程 phase-2 drain → `ServerDbShuttingDownError`（code `SERVER_DB_SHUTTING_DOWN`）
 *
 * 三者都是 retryable 的基础设施状态。调用方**不得**把它们折叠进业务失败分支
 * （例如「查不到用户 → 账号无效 → 401」），否则部署窗口会把正常用户判成非法账号，
 * 而 401 对客户端是终态语义：不重试、不降级。
 *
 * 走 cause / AggregateError 链，因为 store 层常把底层错误包一层再抛。
 * 保持 dependency-free，供 auth / handler / scheduler 共用同一份定义。
 */
export function isStoreUnavailableError(error: unknown): boolean {
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);

    if (isLevelLifecycleError(current)) return true;
    if (isLevelLockError(current)) return true;
    if ((current as { code?: unknown }).code === "SERVER_DB_SHUTTING_DOWN") {
      return true;
    }

    if ((current as any).cause) queue.push((current as any).cause);
    if (Array.isArray((current as any).errors)) {
      queue.push(...(current as any).errors);
    }
  }

  return false;
}
