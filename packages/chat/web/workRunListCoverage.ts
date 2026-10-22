/** A bounded control-plane list is not a reconciliation snapshot. */
export type WorkRunListCoverage =
  | { status: "loading" }
  | { status: "error" }
  | { status: "partial"; count: number; total: number }
  | { status: "complete"; count: number; total: number };

/**
 * 最新一次 list 响应的时间锚定视图（服务端真值，不是客户端缓存）。
 * 只有它能支撑「这个 run 仍在运行」的断言。
 */
export type WorkRunListSnapshot = {
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
  /** 快照里能归属到某个对话的 run（其余为无归属的全局任务）。 */
  attributableRunIds: ReadonlySet<string>;
};

/**
 * 服务端在途状态白名单：**只认 "running"**。
 * - "pending" 被刻意排除：服务端只对 "running" 做 stale reconcile（orphaned），
 *   卡住的 pending 会一直以 pending 形态留在列表里，算作存活就是永久谎称。
 *   pending 的存活由客户端侧兜底（startedAt 锚点 + 20min 上限）承担。
 * - 未知/拼写异常的状态一律不算存活：宁可报「状态不确定」。
 */
export function isLiveServerRunStatus(status: unknown): boolean {
  return status === "running";
}

export function readWorkRunListCoverage(payload: unknown): WorkRunListCoverage {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { status: "error" };
  const root = payload as Record<string, unknown>;
  const data = root.data;
  if (root.ok !== true || !data || typeof data !== "object" || Array.isArray(data)) return { status: "error" };
  const body = data as Record<string, unknown>;
  if (body.action !== "list" || !Array.isArray(body.runs) ||
      typeof body.hasMore !== "boolean" || typeof body.total !== "number" ||
      !Number.isSafeInteger(body.total) || body.total < body.runs.length ||
      (body.hasMore && body.total <= body.runs.length) ||
      (body.count !== undefined && body.count !== body.runs.length)) return { status: "error" };
  return body.hasMore || body.total > body.runs.length
    ? { status: "partial", count: body.runs.length, total: body.total }
    : { status: "complete", count: body.runs.length, total: body.total };
}

/**
 * 从同一次 list 响应里抽出「谁还在跑」的真值视图。
 * 响应不合法时返回 undefined（没有真值就没有断言）。
 */
export function readWorkRunListSnapshot(
  payload: unknown,
  receivedAt: number,
  isRunning: (status: unknown) => boolean,
): WorkRunListSnapshot | undefined {
  const coverage = readWorkRunListCoverage(payload);
  if (coverage.status !== "complete" && coverage.status !== "partial") return undefined;
  const body = (payload as { data: { runs: unknown[] } }).data;
  const knownRunIds = new Set<string>();
  const runningRunIds = new Set<string>();
  const runningDialogIds = new Set<string>();
  const attributableRunIds = new Set<string>();
  for (const raw of body.runs) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const record = raw as Record<string, unknown>;
    const runId = typeof record.runId === "string" ? record.runId : "";
    if (!runId) continue;
    knownRunIds.add(runId);
    const dialogId = typeof record.dialogId === "string" ? record.dialogId : "";
    if (dialogId) attributableRunIds.add(runId);
    if (!isRunning(record.status)) continue;
    runningRunIds.add(runId);
    if (dialogId) runningDialogIds.add(dialogId);
  }
  return {
    receivedAt,
    complete: coverage.status === "complete",
    knownRunIds,
    runningRunIds,
    runningDialogIds,
    attributableRunIds,
  };
}
