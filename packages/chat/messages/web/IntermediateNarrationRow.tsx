import React, { memo } from "react";
import type { ImageGenerationState } from "../types";
import { MessageContent } from "./MessageContent";
import { MessageToolConfirmBar } from "./MessageToolConfirmBar";

export type IntermediateNarrationRowProps = {
  message: {
    id?: string;
    content?: string;
    thinkContent?: string;
    isStreaming?: boolean;
    imageGenerationState?: ImageGenerationState;
  };
};

function isEmptyNarrationBody(content: any, thinkContent: any): boolean {
  const isEmpty = (v: any): boolean =>
    v == null ||
    (typeof v === "string" && v.trim().length === 0) ||
    (Array.isArray(v) && v.length === 0);
  return isEmpty(content) && isEmpty(thinkContent);
}

/**
 * Lightweight tool-loop narration: no avatar, indented to align with the main
 * assistant content column. It remains in the settled transcript so tool and
 * assistant activity preserve their original chronological order.
 */
export const IntermediateNarrationRow = memo(function IntermediateNarrationRow({
  message,
}: IntermediateNarrationRowProps) {
  const { content, thinkContent, isStreaming = false, id, imageGenerationState } =
    message || {};

  // Agent-initiated confirm tools always land here: any assistant message with
  // tool_calls is classified as intermediate tool-loop progress
  // (assistantReplyPendingState.ts), so it renders as this row instead of
  // MessageItem — which is the only place the generic confirm bar used to
  // mount. Without this, email_send / deleteDialogs invoked by an agent could
  // never be confirmed. The bar itself returns null unless a pending confirm
  // run exists for this message id, so mounting it unconditionally is safe.
  const confirmBar = id ? (
    <MessageToolConfirmBar messageId={id} isRobot />
  ) : null;

  // Non-streaming empty narration would otherwise render the
  // empty-assistant-fallback (role="status") placeholder — noise for a
  // lightweight row. Drop it instead.
  if (!isStreaming && isEmptyNarrationBody(content, thinkContent)) {
    return confirmBar ? <>{confirmBar}</> : null;
  }

  return (
    <div
      className="intermediate-narration"
      data-message-id={id}
      aria-live={isStreaming ? "polite" : undefined}
    >
      <MessageContent
        content={content || ""}
        thinkContent={thinkContent || ""}
        role="other"
        isStreaming={isStreaming}
        messageId={id}
        imageGenerationState={imageGenerationState}
      />
      {confirmBar}
    </div>
  );
});

export default IntermediateNarrationRow;
