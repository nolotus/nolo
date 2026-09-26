// create/space/content/optimisticPinnedUpdate.ts
// 同步乐观落地 pin 置顶标志，供 view-transition/FLIP 在同一帧看到新旧差异。
//
// 问题背景：pin 排序由 useMyContentItems → useUserData 的本地 React state 驱动。
// updateContentPinned 是 createAsyncThunk，内部 await 远端 read/patch，返回时
// store/state 尚未变化 —— 把它放进 runSidebarViewTransition(update) 里，
// flushSync(update) 结束新旧快照一致，FLIP 无内容可动。
//
// 这里改为：先在 nolo-user-data-updated 事件里携带 patchedRecord（同步
// setState 合并 pinned 字段，命中 getItemKey===contentKey 的记录），这一步放进
// view-transition update 回调即可被 flushSync 同步提交；随后异步 thunk 在转场
// 外做服务端同步，失败时再发一次携带旧值的事件回滚本地标志。

export interface OptimisticPinnedInput {
  /** contentKey / dbKey，getItemKey 命中的实体键。 */
  contentKey: string;
  /** 目标 pinned 值。 */
  pinned: boolean;
}

/**
 * 同步派发乐观 pinned 更新。返回一个幂等的回滚函数：异步服务端同步失败时调用，
 * 把本地 pinned 恢复成 `!pinned`（即调用前的值）。
 *
 * 必须在 view-transition 的 update 回调内调用（或直接同步调用），才能在
 * flushSync 提交时让新旧快照产生 pinned 差异。
 */
export function applyOptimisticContentPinned(input: OptimisticPinnedInput): () => void {
  const { contentKey, pinned } = input;
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function" ||
    typeof window.CustomEvent !== "function" ||
    !contentKey ||
    typeof contentKey !== "string"
  ) {
    return () => undefined;
  }

  const dispatchPatch = (nextPinned: boolean) => {
    window.dispatchEvent(
      new window.CustomEvent("nolo-user-data-updated", {
        detail: { patchedRecord: { dbKey: contentKey, changes: { pinned: nextPinned } } },
      })
    );
  };

  dispatchPatch(pinned);

  let rolledBack = false;
  return () => {
    if (rolledBack) return;
    rolledBack = true;
    dispatchPatch(!pinned);
  };
}

export interface PinnedToggleTransitionInput {
  /** 目标 pinned 值（即 !current）。 */
  pinned: boolean;
  contentKey: string;
  /**
   * 包裹同步更新的转场函数（如 runSidebarViewTransition）。它必须在内部用
   * flushSync 提交 update 回调，乐观 pinned 才会进入新快照。缺省时直接同步执行。
   */
  runTransition?: (update: () => void) => void;
  /**
   * 异步服务端同步，返回 thenable（通常 dispatch(updateContentPinned(...))）。
   * 在转场 update 之外调用，失败时触发 rollback 恢复本地 pinned。
   */
  syncRemote: () => Promise<unknown> | { unwrap: () => Promise<unknown> } | unknown;
}

/**
 * pin 置顶的完整时序：
 *  1. runTransition(() => applyOptimisticContentPinned) —— 同步乐观落地，
 *     让 FLIP 新旧快照产生 pinned 差异。
 *  2. 转场返回后调用 syncRemote() 做服务端同步（不在快照内）。
 *  3. syncRemote 失败 → rollback() 把本地 pinned 恢复成原值。
 */
export function runPinnedToggleWithTransition(input: PinnedToggleTransitionInput): void {
  const { pinned, contentKey, runTransition, syncRemote } = input;

  let rollback: () => void = () => undefined;
  const applyOptimistic = () => {
    rollback = applyOptimisticContentPinned({ contentKey, pinned });
  };

  if (typeof runTransition === "function") {
    runTransition(applyOptimistic);
  } else {
    applyOptimistic();
  }

  // 服务端同步挪到转场 update 之外，保证 flushSync 提交时本地乐观值已落地。
  Promise.resolve()
    .then(() => syncRemote())
    .then((result: any) =>
      result && typeof result.unwrap === "function" ? result.unwrap() : result
    )
    .catch(() => rollback());
}
