import React, { memo } from "react";
import { OrbActivityIndicator } from "./OrbActivityIndicator";

/**
 * Placeholder row shown while the agent loop is running but no visible
 * assistant message has arrived yet.
 */
export const AssistantReplyPending = memo(function AssistantReplyPending() {
  return (
    <div className="assistant-reply-pending" aria-live="polite" aria-busy="true">
      <div className="assistant-reply-pending__avatar" aria-hidden="true">
        <OrbActivityIndicator variant="s1-thinking" size={18} />
      </div>
      <div className="assistant-reply-pending__body">
        <div className="assistant-reply-pending__label">正在回复…</div>
        <div className="empty-content" aria-hidden="true">
          <span className="empty-content__line empty-content__line--short" />
          <span className="empty-content__line" />
        </div>
      </div>
    </div>
  );
});

export default AssistantReplyPending;
