import * as stylex from "@stylexjs/stylex";
import React from "react";
import { messageLayoutStyles as layoutStyles } from "chat/messages/web/messageLayoutStyles";
import "chat/messages/web/messagesStylexEscapeHatch.css";

const isAssistantToolStub = (message: any): boolean =>
  message?.role === "assistant" &&
  (message.content == null ||
    message.content === "" ||
    (Array.isArray(message.content) && message.content.length === 0)) &&
  Array.isArray(message.tool_calls) &&
  message.tool_calls.length > 0;

const getTextContent = (content: any): string => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part?.type === "text" && typeof part.text === "string") return part.text;
      if (part?.image_url?.url) return "[图片]";
      if (part?.name) return `[文件] ${part.name}`;
      return "";
    })
    .filter(Boolean)
    .join("\n");
};

const ShareDialogPreview: React.FC<{ messages: any[] }> = ({ messages }) => {
  const visibleMessages = messages.filter((message) => {
    if (!message || message.role === "system" || message.role === "tool") return false;
    return !isAssistantToolStub(message);
  });

  if (visibleMessages.length === 0) {
    return <p className="ShareImportPage-emptyMsg">此对话暂无可显示的消息。</p>;
  }

  return (
    <div className="ShareImportPage-dialog" data-renderer="preview">
      {visibleMessages.map((message, index) => {
        const isAssistant = message.role !== "user";
        const text = getTextContent(message.content);
        return (
          <div
            key={message.id ?? index}
            className="ShareImportPage-msgWrapper"
          >
            <div
              className={`msg ${isAssistant ? "robot" : "self"}`}
              {...stylex.props(
                layoutStyles.msg,
                !isAssistant && layoutStyles.msgSelf
              )}
            >
              <div
                className="msg-inner desktop"
                {...stylex.props(layoutStyles.msgInnerDesktop)}
              >
                <div
                  className="content-area"
                  {...stylex.props(
                    layoutStyles.contentArea,
                    isAssistant ? layoutStyles.contentAreaRobot : layoutStyles.contentAreaSelf
                  )}
                >
                  {isAssistant && (
                    <div className="robot-name" {...stylex.props(layoutStyles.robotName)}>
                      AI Assistant
                    </div>
                  )}
                  <div
                    className={`msg-body ${isAssistant ? "robot" : "self"}`}
                    data-hook="messages-esc-msg-body"
                    {...stylex.props(
                      layoutStyles.msgBody,
                      isAssistant ? layoutStyles.msgBodyRobot : layoutStyles.msgBodySelf
                    )}
                  >
                    <div className="msg-content" {...stylex.props(layoutStyles.msgContent)}>
                      <div className="message-text" {...stylex.props(layoutStyles.messageText)}>
                        <div className="simple-text" {...stylex.props(layoutStyles.simpleText)}>
                          {text}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ShareDialogPreview;
