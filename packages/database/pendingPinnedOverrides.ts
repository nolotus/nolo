// database/pendingPinnedOverrides.ts
// 乐观 pin 置顶的 in-flight 覆盖层。
//
// 场景：applyOptimisticContentPinned 把 pinned 写进 useUserData 的本地 state
// 后，150ms 防抖刷新（loadData forceRefresh）可能先于远端 patch 往返完成。
// 此时远端/本地缓存还是旧值，合并结果会让条目在 pin 区/普通区之间抖回。
//
// 这里用模块级 Map<contentKey, {pinned, token}> 记录每个 in-flight 乐观
// pinned。useUserData 在每次合并产出（本地首屏/渐进合并/最终合并）时通过
// applyPendingPinnedOverrides 重放覆盖值；thunk settled 后由编排层
// （optimisticPinnedUpdate.ts）调用 clearPendingPinnedOverride(key, token)
// 清除——token 不匹配的清除被忽略，避免「同一条目快速连续两次 toggle，
// T1 的 finally 清掉 T2 的 override」的竞态。
//
// 兜底：每次 note 自带 30s 超时清除。syncRemote 永不 settle（请求挂死/
// 极端弱网）时 override 不会永久残留、覆盖其他设备的真实数据。
//
// 注意：这是模块级单例——同一个页面里多个 useUserData 实例共享同一份覆盖。
// pin 操作的 contentKey 粒度下这是安全的（同一实体在所有订阅者眼中应一致）。

// Test seam: __setPendingPinnedOverrideTimeoutForTests overrides this so the
// timeout path can be exercised without waiting 30s.
let OVERRIDE_TIMEOUT_MS = 30_000;
export const __setPendingPinnedOverrideTimeoutForTests = (ms: number): void => {
  OVERRIDE_TIMEOUT_MS = ms;
};

interface PendingPinnedEntry {
  pinned: boolean;
  token: symbol;
}

const pendingPinnedByKey = new Map<string, PendingPinnedEntry>();
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

const scheduleTimeoutClear = (contentKey: string, token: symbol): void => {
  const existing = pendingTimers.get(contentKey);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    // 仅当超时属于当前 token 才清除（二次 toggle 已续了新的 timeout）。
    if (pendingPinnedByKey.get(contentKey)?.token === token) {
      pendingPinnedByKey.delete(contentKey);
      pendingTimers.delete(contentKey);
    }
  }, OVERRIDE_TIMEOUT_MS);
  // 防止计时器挂住 Node/bun 进程退出（测试/SSR 场景）。
  if (typeof timer === "object" && typeof timer.unref === "function") {
    timer.unref();
  }
  pendingTimers.set(contentKey, timer);
};

/**
 * Record an in-flight optimistic pinned value for a content key.
 * Returns an opaque token — pass it back to clearPendingPinnedOverride so a
 * stale writer cannot evict a newer override for the same key.
 */
export function notePendingPinnedOverride(
  contentKey: string,
  pinned: boolean
): symbol {
  const token = Symbol(`pinned:${contentKey}`);
  if (!contentKey) return token;
  pendingPinnedByKey.set(contentKey, { pinned, token });
  scheduleTimeoutClear(contentKey, token);
  return token;
}

/**
 * Clear the override once the remote sync settles (success or rollback).
 * Only clears when `token` matches the live override — a settled-but-stale
 * sync must not evict a newer in-flight override for the same key.
 */
export function clearPendingPinnedOverride(
  contentKey: string,
  token?: symbol
): void {
  const entry = pendingPinnedByKey.get(contentKey);
  if (!entry) return;
  if (token !== undefined && entry.token !== token) return;
  pendingPinnedByKey.delete(contentKey);
  const timer = pendingTimers.get(contentKey);
  if (timer) {
    clearTimeout(timer);
    pendingTimers.delete(contentKey);
  }
}

/** Read the in-flight override for one key (undefined when none). */
export function getPendingPinnedOverride(
  contentKey: string
): boolean | undefined {
  return pendingPinnedByKey.get(contentKey)?.pinned;
}

/**
 * Replay overrides onto a merged item list. Returns the original array when
 * nothing applies (identity preserved so callers can keep referential
 * stability for React state).
 */
export function applyPendingPinnedOverrides<T extends Record<string, unknown>>(
  items: T[],
  getKey: (item: T) => string | null,
): T[] {
  if (pendingPinnedByKey.size === 0 || items.length === 0) return items;
  let touched = false;
  const next = items.map((item) => {
    const key = getKey(item);
    if (!key) return item;
    const pending = pendingPinnedByKey.get(key)?.pinned;
    if (pending === undefined || item.pinned === pending) return item;
    touched = true;
    return { ...item, pinned: pending };
  });
  return touched ? next : items;
}

/** Test helper: wipe all overrides + timers between cases. */
export const __clearAllPendingPinnedOverridesForTests = (): void => {
  for (const timer of pendingTimers.values()) clearTimeout(timer);
  pendingTimers.clear();
  pendingPinnedByKey.clear();
};
