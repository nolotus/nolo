import React, { memo } from "react";
import type { ImageGenerationState } from "../types";
import { MessageContent } from "./MessageContent";

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

  // Non-streaming empty narration would otherwise render the
  // empty-assistant-fallback (role="status") placeholder — noise for a
  // lightweight row. Drop it instead.
  if (!isStreaming && isEmptyNarrationBody(content, thinkContent)) {
    return null;
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
    </div>
  );
});

export default IntermediateNarrationRow;
