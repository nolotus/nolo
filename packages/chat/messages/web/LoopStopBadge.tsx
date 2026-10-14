// packages/chat/messages/web/LoopStopBadge.tsx
import React from "react";
import { LuRefreshCw, LuClock, LuArrowRight, LuTimer, } from "react-icons/lu";
import type { LoopStopReason } from "./useLoopStopReason";

const CONFIG: Record<
  NonNullable<LoopStopReason>,
  { icon: React.ReactNode; label: string; sub?: string; color: string; canRetry?: boolean }
> = {
  done: { icon: <LuArrowRight size={13} aria-hidden="true" />, label: "回答完成", color: "#4ade80" },
  handoff: { icon: <LuArrowRight size={13} aria-hidden="true" />, label: "已移交子 Agent", color: "#60a5fa" },
  pending: { icon: <LuTimer size={13} aria-hidden="true" />, label: "等待你确认", color: "#facc15" },
  aborted: { icon: <LuTimer size={13} aria-hidden="true" />, label: "已停止生成", color: "#94a3b8" },
  timeout: {
    icon: <LuClock size={13} aria-hidden="true" />,
    label: "执行超时",
    sub: "单次工具调用耗时过长被中断",
    color: "#f97316",
    canRetry: true,
  },
  error: { icon: <LuRefreshCw size={13} aria-hidden="true" />, label: "执行出错", color: "#f87171", canRetry: true },
};

interface Props {
  reason: LoopStopReason;
  onRetry?: () => void;
}

export const LoopStopBadge: React.FC<Props> = ({ reason, onRetry }) => {
  if (!reason || reason === "done") return null;
  const cfg = CONFIG[reason];

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      margin: "8px 16px",
      padding: "6px 12px",
      borderRadius: "var(--radius-md)",
      fontSize: "var(--fontSize-sm)",
      color: cfg.color,
      border: `1px solid ${cfg.color}44`,
      background: `${cfg.color}11`,
    }}>
      {cfg.icon}
      <span style={{ fontWeight: 500 }}>{cfg.label}</span>
      {cfg.sub && (
        <span style={{ opacity: 0.65, fontSize: "var(--fontSize-xs)" }}>— {cfg.sub}</span>
      )}
      {cfg.canRetry && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginLeft: 6,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 8px",
            borderRadius: "var(--radius-sm)",
            border: `1px solid ${cfg.color}88`,
            background: `${cfg.color}22`,
            color: cfg.color,
            fontSize: "var(--fontSize-xs)",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          <LuRefreshCw size={11} aria-hidden="true" />
          重试
        </button>
      )}
    </div>
  );
};
