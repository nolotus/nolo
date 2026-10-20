import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { NavLink } from "app/routing";
import type { MyContentListItem } from "app/utils/myContentItems";
import { useWorkRunListCoverage } from "./useWorkRunListCoverage";
import { getAgentRuns, getAgentRunsVersion, getRemoteTasks, subscribeAgentRuns } from "./agentRunStore";
import { parseDialogKey } from "database/dialogKey";
import { useDialogStatuses, useDialogEventTimestamps } from "create/space/spaceDialogStore";
import { projectWorkDialogData } from "./workDialogDataProjection";
import { resolveWorkLiveness, type WorkStoreRun } from "./workRunLiveness";
import { buildRoutableContentPath } from "create/space/contentKeyUtils";
import type { WorkRunListCoverage, WorkRunListSnapshot } from "./workRunListCoverage";
import type { WorkRunSignal } from "app/navigation/workDialogProjection";

const WORK_GROUP_SECTIONS = [
  ["needs-you", "需要你"],
  ["working", "正在工作"],
  ["recent", "最近"],
] as const;

const WORK_GROUP_MAX_ROWS = 30;

export function WorkDialogGroupsPreview({
  items, userId,
}: { items: readonly MyContentListItem[]; userId: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!userId) return null;
  return (
    <section aria-label="工作视图预览" data-hook="work-dialog-groups-preview">
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        工作视图（预览）
      </button>
      {expanded && <WorkDialogGroupsExpanded items={items} userId={userId} />}
    </section>
  );
}

function WorkDialogGroupsExpanded({ items, userId }: { items: readonly MyContentListItem[]; userId: string }) {
  // This subscription hydrates run state on mount/focus; per-dialog lookup retains ownership scope.
  const { coverage, snapshot } = useWorkRunListCoverage(userId);
  const dialogStatuses = useDialogStatuses();
  const dialogEventTimestamps = useDialogEventTimestamps();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  // 直接订阅 store 版本：memo 依赖才是反应式的（裸读版本号会静默失效）。
  const storeVersion = useSyncExternalStore(subscribeAgentRuns, getAgentRunsVersion, getAgentRunsVersion);
  const tasks = useMemo(() => getRemoteTasks({ userId }, now), [userId, storeVersion, now]);
  const storeRuns = useMemo<WorkStoreRun[]>(() => {
    const out: WorkStoreRun[] = [];
    for (const item of items) {
      if (item.type !== "dialog") continue;
      const parsed = parseDialogKey(item.contentKey);
      if (!parsed || parsed.userId !== userId) continue;
      for (const run of getAgentRuns({ userId, dialogId: parsed.dialogId })) {
        if (run.status !== "running") continue;
        out.push({ runId: run.runId, dialogId: parsed.dialogId, startedAt: run.startedAt });
      }
    }
    return out;
  }, [items, userId, storeVersion]);
  const liveness = useMemo(
    () => resolveWorkLiveness({ now, snapshot, storeRuns }),
    [now, snapshot, storeRuns],
  );
  // V2-B 预览尚未接入「agent 正在等用户回答」的权威来源（waitingUserByDialogKey
  // 在生产侧不接线）：「需要你」当前由「需处置 / 状态未知」触发，不代表一定在等你。
  const groups = useMemo(() => projectWorkDialogData(items, tasks, {
    userId, dialogStatuses, dialogEventTimestamps, now,
    liveDialogIds: liveness.liveDialogIds,
    uncertainDialogIds: liveness.uncertainDialogIds,
  }), [items, tasks, userId, dialogStatuses, dialogEventTimestamps, now, liveness]);
  const titles = new Map(items.map((item) => [item.contentKey, item.title]));
  const total = WORK_GROUP_SECTIONS.reduce((sum, [key]) => sum + groups[key].length, 0);
  return (
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          <p>仅显示已加载的本人对话；不受侧边栏类型筛选影响。运行状态仅供预览，不能据此判定其他任务已结束。</p>
          <p>「需要你」当前由「需处置 / 状态未知」触发；「agent 正在等你回答」这条权威信号本批尚未接入。</p>
          <p role="status">{coverageText(coverage, snapshot)}</p>
          {total === 0 && <p>暂无已加载的对话。</p>}
          {WORK_GROUP_SECTIONS.map(([key, label]) => {
            const rows = groups[key];
            const hidden = Math.max(0, rows.length - WORK_GROUP_MAX_ROWS);
            return (
              <div key={key}>
                <h3>{label} ({rows.length})</h3>
                {rows.slice(0, WORK_GROUP_MAX_ROWS).map((dialog) => (
                  <div key={dialog.dialogKey} title={titles.get(dialog.dialogKey) ?? dialog.dialogKey}>
                    {/* All View 的既有约定：导航不带 spaceId，避免把布局切到 /space/... */}
                    <NavLink to={buildRoutableContentPath({
                      contentKey: dialog.dialogKey, type: "dialog", userId,
                    })}>
                      {titles.get(dialog.dialogKey) || dialog.dialogKey}
                    </NavLink>
                    <span> · {statusLabel(dialog.runs, dialog.needsUserAction)}</span>
                  </div>
                ))}
                {hidden > 0 && <p>还有 {hidden} 条未显示</p>}
              </div>
            );
          })}
        </div>
  );
}

function statusLabel(runs: readonly WorkRunSignal[] | undefined, needsUserAction?: boolean): string {
  if (needsUserAction) return "等你处置";
  if (!runs || runs.length === 0) return "无运行记录";
  if (runs.includes("requires-action")) return "需处置";
  if (runs.includes("unknown")) return "状态未知";
  if (runs.includes("waiting-user")) return "待你处理";
  if (runs.includes("live")) return "运行中";
  if (runs.includes("terminal")) return "已停止";
  return "无运行记录";
}

function coverageText(coverage: WorkRunListCoverage, snapshot?: WorkRunListSnapshot): string {
  if (coverage.status === "loading") return "正在检查运行列表范围…";
  if (coverage.status === "error") return "运行列表查询失败或响应无效；状态可能不完整";
  const attributable = snapshot ? snapshot.attributableRunIds.size : 0;
  if (coverage.status === "partial") {
    return `运行列表仅加载 ${coverage.count}/${coverage.total} 条，其中 ${attributable} 条可归属到对话；未覆盖对话的运行状态未知，不会据此判定已结束`;
  }
  return `运行列表查询返回 ${coverage.count}/${coverage.total} 条（本次查询范围完整），其中 ${attributable} 条可归属到对话`;
}
