export type DialogAttentionTransition = {
  previousStreaming: boolean;
  nextStreaming: boolean;
  hasAssistantMessage: boolean;
  // success = 正常完成；failure = metadata.error（流/工具错误）；
  // aborted = 用户主动中止（session store 的 lastAbortTimestamp 信号）。
  completionOutcome: "success" | "failure" | "aborted";
  isDocumentVisible: boolean;
};

export function shouldNotifyDialogCompletion(
  transition: DialogAttentionTransition,
): boolean {
  return (
    transition.previousStreaming &&
    !transition.nextStreaming &&
    transition.hasAssistantMessage &&
    transition.completionOutcome === "success" &&
    !transition.isDocumentVisible
  );
}

export function getDialogAttentionTitle(
  baseTitle: string,
  isAttentionPending: boolean,
): string {
  return isAttentionPending ? `✦ ${baseTitle}` : baseTitle;
}

/**
 * Map a finished assistant message to the completion outcome used by
 * shouldNotifyDialogCompletion. error wins over aborted: an aborted turn can
 * still carry an error, and both must stay silent for the attention decision.
 */
export function resolveDialogCompletionOutcome(
  metadata: Record<string, unknown> | undefined,
  wasAborted: boolean,
): "success" | "failure" | "aborted" {
  if (metadata?.error) return "failure";
  if (wasAborted) return "aborted";
  return "success";
}
