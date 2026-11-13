import React, { memo, useEffect, useMemo } from "react";
import { useToken } from "identity";
import { useAppSelector } from "app/store";
import { selectCurrentServer } from "app/settings/settingSlice";
import { useAgentRunEventStream, useAgentRuns, useRemoteTaskCards } from "./useAgentRuns";
import {
  formatAgentRunElapsed,
  formatRemoteTaskActivityLabel,
  formatRemoteTaskCost,
  formatRemoteTaskHeartbeat,
  remoteTaskCardUseSpinner,
  type AgentRunScope,
  type RemoteTaskCard,
} from "./agentRunStore";
import {
  AGENT_RUN_FIXED_AREA_VISIBLE_ROWS,
  registerAgentRunFixedArea,
} from "./agentRunFixedArea";
// 机器人身份图标复用自有品牌标记，与侧边栏类型切换（./sidebar/SidebarTypeFilter.tsx）同源
import NoloHeadMark from "render/web/ui/NoloHeadMark";
import "./chatStylexEscapeHatch.css";

function shortId(id: string) { return id.length > 8 ? id.slice(0, 8) : id; }
// 机器人图标容器：仅做垂直对齐，不引入新样式规则
const AGENT_ICON_STYLE = { display: "inline-flex", alignItems: "center" } as const;
function terminalLabel(status: string) {
  if (status === "done") return "✓ 完成";
  if (status === "failed") return "✗ 失败";
  return "⊘ 已取消";
}
function terminalIcon(status: string) {
  if (status === "done") return "✓";
  if (status === "failed") return "✗";
  return "⊘";
}
function remoteTaskIcon(activity: RemoteTaskCard["activity"]) {
  if (activity === "live") return "⚙";
  if (activity === "terminal") return "✓";
  return "⚠";
}

/**
 * §8.2 反撒谎渲染：
 * - `elapsed` 取 store 的**冻结值**（`elapsedFrozen` 时以 `lastEvidenceAt` 为基准），
 *   不得用「当前时间 − startedAt」重算，否则 unknown 卡片会继续走秒；
 * - 活跃 spinner 只在 `live` 出现（`remoteTaskCardUseSpinner`），unknown / 需处置
 *   一律静态「未知（失联）」标识；
 * - `cost` 未知时显示「未知」，不显示 0。
 */
export const RemoteTaskRow = memo(function RemoteTaskRow({ card }: { card: RemoteTaskCard }) {
  const elapsed = card.elapsedMs === undefined ? undefined : formatAgentRunElapsed(card.elapsedMs);
  return (
    <div className="agent-runs-panel__row" data-activity={card.activity} key={card.runId}>
      <span aria-hidden="true">{remoteTaskIcon(card.activity)}</span>
      {remoteTaskCardUseSpinner(card.activity) && (
        <span className="agent-runs-panel__spin" aria-hidden="true">⟳</span>
      )}
      <span aria-hidden="true" style={AGENT_ICON_STYLE}>
        <NoloHeadMark size={12} />
      </span>
      <span className="agent-runs-panel__name">{shortId(card.runId)}</span>
      <span aria-hidden="true"> · </span>
      <span className="agent-runs-panel__detail">{formatRemoteTaskActivityLabel(card.activity)}</span>
      {card.activity !== "live" && (
        <><span aria-hidden="true"> · </span><span className="agent-runs-panel__detail">{formatRemoteTaskHeartbeat(card.lastEvidenceAt)}</span></>
      )}
      {elapsed !== undefined && (
        <>
          <span aria-hidden="true"> · </span>
          <span className="agent-runs-panel__elapsed">
            {card.elapsedFrozen ? `用时 ${elapsed}（已冻结）` : `已运行 ${elapsed}`}
          </span>
        </>
      )}
      <span aria-hidden="true"> · </span>
      <span className="agent-runs-panel__detail">{formatRemoteTaskCost(card.cost)}</span>
      {card.task.cleanup?.pending && (
        <><span aria-hidden="true"> · </span><span className="agent-runs-panel__detail">清理中</span></>
      )}
    </div>
  );
});

export const AgentRunsPanel = memo(function AgentRunsPanel({ scope }: { scope: AgentRunScope }) {
  const runs = useAgentRuns(scope);
  const remoteTasks = useRemoteTaskCards(scope);
  // §7.2/§7.3 消费侧：订阅 `dialog-{scope.dialogId}`，把 `remote_task` / `agent_run`
  // 帧**就地**灌进 store（卡片原地更新，不必刷新或回前台）。scope 与卡片过滤同源，
  // 切对话即重装订阅，旧对话的帧进不来。
  const streamToken = useToken();
  const streamServer = useAppSelector(selectCurrentServer);
  useAgentRunEventStream({
    userId: scope.userId,
    dialogId: scope.dialogId ?? null,
    server: streamServer ? String(streamServer) : null,
    token: streamToken ?? null,
  });
  // 登记「本 scope 有固定运行区」：消息流据此判定 startAgentRun 回执是否与
  // 此处重复（见 ./agentRunFixedArea）。卸载即注销，未挂载时读侧拿不到覆盖。
  useEffect(() => {
    if (!scope.userId) return undefined;
    return registerAgentRunFixedArea(scope);
  }, [scope.userId, scope.dialogId, scope.workspaceId]);
  const visibleRuns = useMemo(
    () => runs.slice(0, AGENT_RUN_FIXED_AREA_VISIBLE_ROWS),
    [runs],
  );
  const visibleRemoteTasks = useMemo(
    () => remoteTasks.slice(0, AGENT_RUN_FIXED_AREA_VISIBLE_ROWS),
    [remoteTasks],
  );
  if (runs.length === 0 && remoteTasks.length === 0) return null;
  return (
    <div className="agent-runs-panel" aria-label="正在运行的子任务">
      {visibleRemoteTasks.map((card) => <RemoteTaskRow card={card} key={card.runId} />)}
      {visibleRuns.map((run) => {
        const name = run.title || run.agentName || shortId(run.runId);
        const terminal = run.status !== "running";
        return (
          <div className="agent-runs-panel__row" key={run.runId}>
            <span aria-hidden="true">{terminal ? terminalIcon(run.status) : "⚙"}</span>
            <span aria-hidden="true" style={AGENT_ICON_STYLE}>
              <NoloHeadMark size={12} />
            </span>
            <span className="agent-runs-panel__name">{name}</span>
            {(run.agentName && run.title) && <><span aria-hidden="true"> · </span><span className="agent-runs-panel__detail">{run.agentName}</span></>}
            <span aria-hidden="true"> · </span><span className="agent-runs-panel__elapsed">{terminal ? `${terminalLabel(run.status)} · 用时 ${formatAgentRunElapsed(run.elapsedMs)}` : `已运行 ${formatAgentRunElapsed(run.elapsedMs)}`}</span>
            {run.toolCallCount !== undefined && <><span aria-hidden="true"> · </span><span className="agent-runs-panel__detail">{run.toolCallCount} tools</span></>}
          </div>
        );
      })}
      {runs.length > AGENT_RUN_FIXED_AREA_VISIBLE_ROWS && (
        <div className="agent-runs-panel__more">
          +{runs.length - AGENT_RUN_FIXED_AREA_VISIBLE_ROWS}
        </div>
      )}
      {remoteTasks.length > AGENT_RUN_FIXED_AREA_VISIBLE_ROWS && (
        <div className="agent-runs-panel__more">
          +{remoteTasks.length - AGENT_RUN_FIXED_AREA_VISIBLE_ROWS}
        </div>
      )}
    </div>
  );
});

export default AgentRunsPanel;
