// hooks/useThinkingVisibility.ts
//
// AICSS thinking-reasoning 交互（aicss.dev/components/thinking-reasoning）：
// - 思考中（isStreaming 且已有 think 内容、正文未开始）默认展开，内容实时流出
// - 思考结束（正文到达或流终止）延迟折叠为「思考了 Ns」摘要
// - 用户手动 toggle 永远优先，之后不再被自动展开/折叠覆盖

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 思考开始时间戳按 messageId 记录：流式过程中组件可能因虚拟化 remount，
 * ref 会丢起点，模块级 Map 跨 remount 存活；思考结束即删除，量级极小。
 */
const thinkingStartAt = new Map<string, number>();

export const useThinkingVisibility = (
  isStreaming: boolean,
  content: any,
  thinkContent: string,
  messageId?: string
) => {
  const hasThink = thinkContent.trim().length > 0;
  const thinkingLive = isStreaming && hasThink && !content;

  const [manual, setManual] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const localStartRef = useRef<number | null>(null);

  const toggle = useCallback(() => {
    setManual(true);
    setIsExpanded((v) => !v);
  }, []);

  // 自动展开 / 自动折叠（手动操作优先）
  useEffect(() => {
    if (manual) return;
    if (thinkingLive) {
      setIsExpanded(true);
      return;
    }
    if (hasThink && isExpanded) {
      const t = setTimeout(() => setIsExpanded(false), 400);
      return () => clearTimeout(t);
    }
  }, [thinkingLive, hasThink, isExpanded, manual]);

  // 计时：起点按 messageId 持久化（remount 恢复），结束时刻结算 elapsed
  useEffect(() => {
    if (thinkingLive) {
      const persisted = messageId ? thinkingStartAt.get(messageId) : undefined;
      const start = persisted ?? Date.now();
      if (persisted == null && messageId) thinkingStartAt.set(messageId, start);
      localStartRef.current = start;
      return;
    }
    const start =
      localStartRef.current ??
      (messageId ? thinkingStartAt.get(messageId) : undefined) ??
      null;
    if (start != null) {
      setElapsed(Math.max(1, Math.round((Date.now() - start) / 1000)));
      localStartRef.current = null;
      if (messageId) thinkingStartAt.delete(messageId);
    }
  }, [thinkingLive, messageId]);

  return [isExpanded, toggle, elapsed] as const;
};
