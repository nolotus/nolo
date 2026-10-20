/**
 * Work 预览的「是否仍在运行」判定。
 *
 * 契约：只有**有时间锚点**的来源才能支撑「仍在运行」这个断言。
 * - 服务端 list 快照：带 fetch 时刻，TTL 过期即不再作数（服务端自己会把
 *   长时间无更新的 running 记录 reconcile 成 orphaned）。
 * - 客户端 run 缓存：只有 startedAt 兜底，没有心跳；服务端快照能反驳时以快照为准。
 * 两者都说不清时输出「状态不确定」（uncertain），不得谎称仍运行，也不得谎称已结束。
 */

/** list 快照超过该时长后不再能代表「此刻仍在运行」。 */
export const WORK_SNAPSHOT_TTL_MS = 120_000;
/** 无服务端答案时，客户端缓存 run 的兜底存活上限（与服务端 stale 阈值同量级）。 */
export const WORK_STORE_RUN_TTL_MS = 20 * 60_000;
/** 「服务端不知道这个 run」要算作反驳，需要先给持久化留出的宽限。 */
export const WORK_SNAPSHOT_DISPROOF_GRACE_MS = 30_000;

export type WorkRunSnapshot = {
  /** 响应到达时刻（epoch ms）。 */
  receivedAt: number;
  /** 快照覆盖了该用户的全部 run（未被 limit 截断）。 */
  complete: boolean;
  /** 快照中出现过的全部 run id。 */
  knownRunIds: ReadonlySet<string>;
  /** 服务端仍报告为 running 的 run id。 */
  runningRunIds: ReadonlySet<string>;
  /** 仍在运行的 run 所归属的对话 id。 */
  runningDialogIds: ReadonlySet<string>;
};

export type WorkStoreRun = {
  runId: string;
  dialogId?: string;
  startedAt: number;
};

export type WorkLiveness = {
  /** 有时间锚点支撑「仍在运行」的对话。 */
  liveDialogIds: Set<string>;
  /** 无法可靠判定的对话（状态不确定，不得当作已结束或仍运行）。 */
  uncertainDialogIds: Set<string>;
};

export function resolveWorkLiveness(input: {
  now: number;
  snapshot?: WorkRunSnapshot | undefined;
  storeRuns: readonly WorkStoreRun[];
}): WorkLiveness {
  const liveDialogIds = new Set<string>();
  const uncertainDialogIds = new Set<string>();
  const snapshot = input.snapshot;
  const snapshotFresh = !!snapshot && input.now - snapshot.receivedAt <= WORK_SNAPSHOT_TTL_MS;
  if (snapshot && snapshotFresh) {
    for (const dialogId of snapshot.runningDialogIds) liveDialogIds.add(dialogId);
  }
  for (const run of input.storeRuns) {
    const dialogId = run.dialogId;
    if (!dialogId) continue;
    if (liveDialogIds.has(dialogId)) continue;
    if (snapshot && snapshotFresh && snapshot.complete) {
      if (snapshot.runningRunIds.has(run.runId)) {
        liveDialogIds.add(dialogId);
        continue;
      }
      // 服务端快照里有它、且已不是 running → 服务端权威：该 run 已结束。
      if (snapshot.knownRunIds.has(run.runId)) continue;
      // 服务端快照里根本没有它（且早已过持久化宽限）→ 不能说它还在跑，
      // 也不能说它已结束：状态不确定。
      if (run.startedAt <= snapshot.receivedAt - WORK_SNAPSHOT_DISPROOF_GRACE_MS) {
        uncertainDialogIds.add(dialogId);
        continue;
      }
    }
    if (input.now - run.startedAt <= WORK_STORE_RUN_TTL_MS) {
      liveDialogIds.add(dialogId);
      continue;
    }
    uncertainDialogIds.add(dialogId);
  }
  return { liveDialogIds, uncertainDialogIds };
}
