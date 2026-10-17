import React, { memo, useMemo } from "react";
import { useAgentRuns } from "./useAgentRuns";
import { formatAgentRunElapsed } from "./agentRunStore";
import type { AgentRunScope } from "./agentRunStore";
import "./chatStylexEscapeHatch.css";

function shortId(id: string) { return id.length > 8 ? id.slice(0, 8) : id; }
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

export const AgentRunsPanel = memo(function AgentRunsPanel({ scope }: { scope: AgentRunScope }) {
  const runs = useAgentRuns(scope);
  const visible = useMemo(() => runs.slice(0, 3), [runs]);
  if (runs.length === 0) return null;
  return (
    <div className="agent-runs-panel" aria-label="正在运行的子任务">
      {visible.map((run) => {
        const name = run.title || run.agentName || shortId(run.runId);
        const terminal = run.status !== "running";
        return (
          <div className="agent-runs-panel__row" key={run.runId}>
            <span aria-hidden="true">{terminal ? terminalIcon(run.status) : "⚙"}</span>
            <span className="agent-runs-panel__name">{name}</span>
            {(run.agentName && run.title) && <><span aria-hidden="true"> · </span><span className="agent-runs-panel__detail">{run.agentName}</span></>}
            <span aria-hidden="true"> · </span><span className="agent-runs-panel__elapsed">{terminal ? `${terminalLabel(run.status)} · 用时 ${formatAgentRunElapsed(run.elapsedMs)}` : `已运行 ${formatAgentRunElapsed(run.elapsedMs)}`}</span>
            {run.toolCallCount !== undefined && <><span aria-hidden="true"> · </span><span className="agent-runs-panel__detail">{run.toolCallCount} tools</span></>}
          </div>
        );
      })}
      {runs.length > 3 && <div className="agent-runs-panel__more">+{runs.length - 3}</div>}
    </div>
  );
});

export default AgentRunsPanel;
