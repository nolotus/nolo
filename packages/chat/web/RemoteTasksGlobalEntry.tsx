import React, { memo, useCallback, useState } from "react";
import {
  applyRemoteTaskStopReceipt,
  formatAgentRunElapsed,
  formatRemoteTaskActivityLabel,
  formatRemoteTaskCost,
  formatRemoteTaskHeartbeat,
  formatRemoteTaskStopClock,
  getRemoteTaskStopRequest,
  getRemoteTaskStopView,
  remoteTaskCardUseSpinner,
  requestRemoteTaskStop,
  type AgentRunScope,
  type RemoteTaskCard,
  type RemoteTaskStopView,
} from "./agentRunStore";
import { CONTROL_AGENT_RUN_ENDPOINT, useRemoteTaskCards } from "./useAgentRuns";

/**
 * §10.1 跨对话全局入口（§6.2③ 逃生门）。
 *
 * attention-first（`docs/product-attention-principles.md`）：
 * - **零任务 ⇒ 零存在感**（`cards.length === 0` 直接不渲染）；
 * - 默认态只有**一行**（折叠、无 popover、无 `role="alert"`、不抢焦点、不遮挡输入）；
 * - 只有用户点开才列出跨对话任务卡片与停止入口。
 *
 * 反撒谎：行内文案一律取 store 的投影值（冻结的 elapsed、显式「费用 未知」、
 * 「最后心跳 N 前」，`live` 之外不出 spinner），本组件**不自行读取当前时间**。
 */

function shortId(id: string) {
  return id.length > 8 ? id.slice(0, 8) : id;
}

/* ── 停止请求传输缝（§6.2①：server 落 intent；best-effort 投递不作成功判据） ── */

export type RemoteTaskStopSender = (body: { action: "stop"; runId: string }) => Promise<unknown>;

export const defaultRemoteTaskStopSender: RemoteTaskStopSender = async (body) => {
  const response = await fetch(CONTROL_AGENT_RUN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`agent run stop failed: ${response.status}`);
  return response.json();
};

/** 回执归一化：非对象/缺字段 ⇒ 视为投递未回（不得伪装成功，§6.3）。 */
export function normalizeStopReceipt(
  payload: unknown,
): { accepted?: boolean; pending?: boolean; intentStored?: boolean; deliveryFailed?: boolean } {
  if (typeof payload !== "object" || payload === null) return { deliveryFailed: true };
  const record = payload as Record<string, unknown>;
  const receipt: { accepted?: boolean; pending?: boolean; intentStored?: boolean } = {};
  for (const key of ["accepted", "pending", "intentStored"] as const) {
    const value = record[key];
    if (typeof value === "boolean") receipt[key] = value;
  }
  return receipt;
}

/**
 * 发起 stop：**先落本地记录**（「停止请求已记录」不依赖网络），再 best-effort 投递。
 * 投递失败只标记 `deliveryFailedAt`，用户意图保留（§6.3）。
 */
export function sendRemoteTaskStop(
  runId: string,
  sender: RemoteTaskStopSender = defaultRemoteTaskStopSender,
): void {
  requestRemoteTaskStop(runId);
  let delivery: Promise<unknown>;
  try {
    delivery = sender({ action: "stop", runId });
  } catch {
    applyRemoteTaskStopReceipt(runId, { deliveryFailed: true });
    return;
  }
  void delivery.then(
    (payload) => applyRemoteTaskStopReceipt(runId, normalizeStopReceipt(payload)),
    () => applyRemoteTaskStopReceipt(runId, { deliveryFailed: true }),
  );
}

/* ── 行渲染 ── */

function RemoteTaskGlobalRow({ card }: { card: RemoteTaskCard }) {
  const elapsed = card.elapsedMs === undefined ? undefined : formatAgentRunElapsed(card.elapsedMs);
  return (
    <div className="remote-tasks-entry__row" data-activity={card.activity}>
      <span aria-hidden="true">{card.activity === "live" ? "⚙" : card.activity === "terminal" ? "✓" : "⚠"}</span>
      {remoteTaskCardUseSpinner(card.activity) && (
        <span className="remote-tasks-entry__spin" aria-hidden="true">⟳</span>
      )}
      <span className="remote-tasks-entry__name">{shortId(card.runId)}</span>
      <span aria-hidden="true"> · </span>
      <span className="remote-tasks-entry__detail">{formatRemoteTaskActivityLabel(card.activity)}</span>
      {card.activity !== "live" && (
        <>
          <span aria-hidden="true"> · </span>
          <span className="remote-tasks-entry__detail">{formatRemoteTaskHeartbeat(card.lastEvidenceAt)}</span>
        </>
      )}
      {elapsed !== undefined && (
        <>
          <span aria-hidden="true"> · </span>
          <span className="remote-tasks-entry__elapsed">
            {card.elapsedFrozen ? `用时 ${elapsed}（已冻结）` : `已运行 ${elapsed}`}
          </span>
        </>
      )}
      <span aria-hidden="true"> · </span>
      <span className="remote-tasks-entry__detail">{formatRemoteTaskCost(card.cost)}</span>
      {card.task.cleanup?.pending && (
        <>
          <span aria-hidden="true"> · </span>
          <span className="remote-tasks-entry__detail">清理中</span>
        </>
      )}
    </div>
  );
}

/**
 * §6.2③ + §6.1 D4 停止入口：
 * - unknown / 需处置任务**必须有** stop，owner 不明**不没收**停止权；
 * - owner 不明 ⇒ 二次确认（文案说明无法关联对话，仍将尝试停止其云资源）；
 * - 回执行严格用 store 的相位文案：`pending` 期间显示「停止请求已记录，等待执行者回归」+ TTL 到期时刻。
 */
function RemoteTaskStopLine({
  card,
  firstStopLabel,
  requestStop,
}: {
  card: RemoteTaskCard;
  firstStopLabel: string;
  requestStop: (runId: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const view: RemoteTaskStopView = getRemoteTaskStopView(card);
  const request = getRemoteTaskStopRequest(card.runId);
  return (
    <div className="remote-tasks-entry__stop" data-phase={view.phase} data-run-id={card.runId}>
      <span className="remote-tasks-entry__receipt" data-phase={view.phase}>
        {view.label}
      </span>
      {view.acknowledgedAt !== null && (
        <span className="remote-tasks-entry__detail">
          回执 {formatRemoteTaskStopClock(view.acknowledgedAt)}
        </span>
      )}
      {request?.intentStoredAt !== undefined && (
        <span className="remote-tasks-entry__detail">已落库等待执行者</span>
      )}
      {request?.deliveryFailedAt !== undefined && (
        <span className="remote-tasks-entry__detail">投递未回（重连后自动重投）</span>
      )}
      {view.canRequestStop && !confirming && (
        <button
          type="button"
          className="remote-tasks-entry__stop-btn"
          data-stop-run-id={card.runId}
          onClick={() => {
            if (view.requiresSecondConfirm) {
              setConfirming(true);
              return;
            }
            requestStop(card.runId);
          }}
        >
          {firstStopLabel}
        </button>
      )}
      {confirming && (
        <span className="remote-tasks-entry__confirm">
          <span className="remote-tasks-entry__detail">该任务无法关联到具体对话，仍将尝试停止其云资源</span>
          <button
            type="button"
            className="remote-tasks-entry__stop-btn remote-tasks-entry__stop-btn--confirm"
            data-stop-run-id={card.runId}
            onClick={() => {
              setConfirming(false);
              requestStop(card.runId);
            }}
          >
            确认停止
          </button>
          <button
            type="button"
            className="remote-tasks-entry__cancel"
            onClick={() => setConfirming(false)}
          >
            取消
          </button>
        </span>
      )}
    </div>
  );
}

export type RemoteTasksGlobalEntryProps = {
  /** **必须**是 user 级 scope（不带 dialogId），否则又退回「只在当前对话可见」。 */
  scope: AgentRunScope;
  /** §6.1：跨对话「打开对话」（宿主提供路由，组件不猜 URL） */
  dialogHref?: (dialogId: string) => string;
  /** 传输缝（默认 = 本地记录 + `controlAgentRun { action:"stop" }`） */
  requestStop?: (runId: string) => void;
  /** 仅测试注入用；默认 false = 默认态紧凑。 */
  defaultExpanded?: boolean;
  stopLabel?: string;
};

export const RemoteTasksGlobalEntry = memo(function RemoteTasksGlobalEntry({
  scope,
  dialogHref,
  requestStop,
  defaultExpanded = false,
  stopLabel = "停止",
}: RemoteTasksGlobalEntryProps) {
  const cards = useRemoteTaskCards(scope);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const stop = useCallback(
    (runId: string) => {
      if (requestStop) {
        requestStop(runId);
        return;
      }
      sendRemoteTaskStop(runId);
    },
    [requestStop],
  );

  // 零任务 ⇒ 零存在感（attention-first：不常驻、不占位、不打断）。
  if (cards.length === 0) return null;
  const attentionCount = cards.filter((card) => card.attention).length;

  return (
    <div
      className="remote-tasks-entry"
      data-attention={attentionCount > 0 ? "true" : "false"}
      data-task-count={cards.length}
      data-expanded={expanded ? "true" : "false"}
    >
      <button
        type="button"
        className="remote-tasks-entry__head"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="remote-tasks-entry__glyph" aria-hidden="true">⚙</span>
        <span className="remote-tasks-entry__title">跨对话任务</span>
        <span className="remote-tasks-entry__count">{cards.length}</span>
        {attentionCount > 0 && (
          <span className="remote-tasks-entry__attention">待处理 {attentionCount}</span>
        )}
      </button>
      {expanded && (
        <div className="remote-tasks-entry__list">
          {cards.map((card) => (
            <div className="remote-tasks-entry__item" key={card.runId} data-activity={card.activity}>
              <RemoteTaskGlobalRow card={card} />
              <div className="remote-tasks-entry__owner">
                {card.ownerDialogId === undefined ? (
                  <span className="remote-tasks-entry__detail">无法关联到具体对话</span>
                ) : dialogHref ? (
                  <a className="remote-tasks-entry__open" href={dialogHref(card.ownerDialogId)}>
                    打开对话 {shortId(card.ownerDialogId)}
                  </a>
                ) : (
                  <span className="remote-tasks-entry__detail">对话 {shortId(card.ownerDialogId)}</span>
                )}
              </div>
              <RemoteTaskStopLine card={card} firstStopLabel={stopLabel} requestStop={stop} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default RemoteTasksGlobalEntry;
