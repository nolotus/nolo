import { memo } from "react";
import { useTranslation } from "react-i18next";
import { OrbActivityIndicator } from "./OrbActivityIndicator";
import type { ConversationActivity } from "../../runtime/conversationActivity";

export interface AssistantReplyPendingProps {
  /**
   * 单一主 working signal（chat/runtime/conversationActivity 的 projection）。
   * 本组件只在 activity.kind === "starting"（请求已发、尚无 reasoning /
   * tool / answer）时渲染 —— thinking / tool / answering 阶段由各自的
   * 消息面（ThinkingSection / ToolMessageGroup / 正文+cursor）担任主角，
   * 这里必须让位，避免两个 working signal 同屏。
   */
  activity: ConversationActivity;
}

/**
 * "◌ 正在处理…" 轻量单行 —— starting 阶段唯一的 working signal。
 * 其余 activity kind 一律返回 null（互斥规则收口在本组件内，消费方无需自判）。
 */
export const AssistantReplyPending = memo(function AssistantReplyPending({
  activity,
}: AssistantReplyPendingProps) {
  const { t } = useTranslation("chat");
  if (activity.kind !== "starting") return null;

  return (
    <div className="assistant-reply-pending assistant-reply-pending--starting" aria-live="polite">
      <OrbActivityIndicator variant="s1-thinking" size={14} />
      <span className="assistant-reply-pending__label">{t("assistantReplyStarting", "Working…")}</span>
    </div>
  );
});

export default AssistantReplyPending;
