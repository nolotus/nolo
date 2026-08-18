// packages/chat/messages/web/useLoopStopReason.ts
import { useEffect, useRef, useState } from "react";

export type LoopStopReason =
  | "done"
  | "handoff"
  | "pending"
  | "timeout"
  | "aborted"
  | "error"
  | null;

const w = typeof window !== "undefined" ? (window as any) : null;

/**
 * 轮询 window.__LOOP_STOP_REASON__，在 loop 结束后展示原因。
 * isRunning=true 时清空上一次原因；isRunning=false 时读取最终值。
 * 只有真正运行过（hasRun）之后停止，才去读取 reason。
 */
export const useLoopStopReason = (isRunning: boolean): LoopStopReason => {
  const [reason, setReason] = useState<LoopStopReason>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (isRunning) {
      hasRun.current = true;
      setReason(null);
      if (w) w.__LOOP_STOP_REASON__ = null;
      return;
    }
    // 从未运行过（新对话），不触发任何提示
    if (!hasRun.current) return;

    // loop 刚结束，读取原因；若仍为 null 则不展示额外提示
    const timer = setTimeout(() => {
      const raw = w?.__LOOP_STOP_REASON__ ?? null;
      setReason(raw);
    }, 200);
    return () => clearTimeout(timer);
  }, [isRunning]);

  return reason;
};
