import { memo } from "react";
import { useTranslation } from "react-i18next";
import { OrbActivityIndicator } from "./OrbActivityIndicator";
import type { ConversationActivity, ConversationActivityKind } from "../../runtime/conversationActivity";

export interface AssistantReplyPendingProps {
  /**
   * 单一主 working signal（chat/runtime/conversationActivity 的 projection）。
   * 本组件只在 pre-delta 工作阶段（starting / validating / compacting /
   * waiting-provider）渲染 —— thinking / tool / answering 阶段由各自的
   * 消息面（ThinkingSection / ToolMessageGroup / 正文+cursor）担任主角，
   * 这里必须让位，避免两个 working signal 同屏。
   */
  activity: ConversationActivity;
}

/**
 * Pre-delta working phases owned by this single working signal. thinking /
 * tool / answering are represented by their own message surfaces, so the
 * component stays null for every other kind (mutual-exclusion rule).
 */
const PENDING_KINDS: ReadonlySet<ConversationActivityKind> = new Set([
  "starting",
  "validating",
  "compacting",
  "waiting-provider",
]);

/**
 * "◌ 正在处理…" 轻量单行 —— pre-delta 阶段唯一的 working signal。
 * validating / compacting / waiting-provider 用可读标签反映真实阶段（locale
 * §5 key），其余 activity kind 一律返回 null（互斥规则收口在本组件内）。
 */
export const AssistantReplyPending = memo(function AssistantReplyPending({
  activity,
}: AssistantReplyPendingProps) {
  const { t } = useTranslation("chat");
  if (!PENDING_KINDS.has(activity.kind)) return null;

  const label =
    activity.kind === "compacting"
      ? t("contextCompacting", "This conversation is long. Compacting history…")
      : activity.kind === "waiting-provider"
        ? t("waitingForModel", "Context is ready. Waiting for the model…")
        : activity.kind === "validating"
          ? t("contextChecking", "Checking this model's context window…")
          : t("assistantReplyStarting", "Working…");

  return (
    <div
      className={`assistant-reply-pending assistant-reply-pending--${activity.kind}`}
      aria-live="polite"
    >
      <OrbActivityIndicator variant="s1-thinking" size={14} />
      <span className="assistant-reply-pending__label">{label}</span>
    </div>
  );
});

export default AssistantReplyPending;
