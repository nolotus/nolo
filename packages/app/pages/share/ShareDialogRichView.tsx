import React, { useEffect, useMemo, useState } from "react";

import { ReadOnlyMessageItem } from "chat/messages/web/ReadOnlyMessageItem";
import { ReadOnlyToolMessageItem } from "chat/messages/web/ReadOnlyToolMessageItem";
import { groupConsecutiveToolMessages } from "chat/messages/web/groupToolMessages";
import { ToolMessageGroup } from "chat/messages/web/ToolMessageGroup";
import { isAssistantToolStub } from "chat/messages/web/assistantReplyPendingState";
import { isTouchDevice } from "chat/hooks/useMessageInteraction";

const ShareDialogRichView: React.FC<{ messages: any[]; conversationTodoEnabled?: boolean }> = ({ messages, conversationTodoEnabled = true }) => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(isTouchDevice());
  }, []);

  const groupedMessages = useMemo(() => {
    const visible = messages.filter((message: any) => {
      if (message?.role === "system") return false;
      return !isAssistantToolStub(message);
    });
    return groupConsecutiveToolMessages(visible);
  }, [messages]);

  if (groupedMessages.length === 0) {
    return <p className="ShareImportPage-emptyMsg">此对话暂无可显示的消息。</p>;
  }

  return (
    <div className="ShareImportPage-dialog" data-renderer="rich">
      {groupedMessages.map((entry, index) => {
        if (entry.type === "tool-group") {
          return (
            <div key={entry.key} className="ShareImportPage-msgWrapper">
              <ToolMessageGroup messages={entry.messages} readOnly conversationTodoEnabled={conversationTodoEnabled} />
            </div>
          );
        }

        const message = entry.message;
        return (
          <div
            key={message.id ?? index}
            className="ShareImportPage-msgWrapper"
          >
            {message.role === "tool" ? (
              <ReadOnlyToolMessageItem message={message} conversationTodoEnabled={conversationTodoEnabled} />
            ) : (
              <ReadOnlyMessageItem message={message} isTouch={isTouch} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ShareDialogRichView;
