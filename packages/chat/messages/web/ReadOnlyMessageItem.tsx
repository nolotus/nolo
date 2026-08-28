// Share 场景组合：MessageLayout + MessageContent，无 actions/confirmBar/交互事件
import React, { memo } from "react";
import { MessageLayout } from "./MessageLayout";
import { MessageContent } from "./MessageContent";

export const ReadOnlyMessageItem = memo(
  ({ message, isTouch = false }: { message: any; isTouch?: boolean }) => {
  const { content, thinkContent, role } = message || {};

  const isRobot = role !== "user";
  const type = isRobot ? "robot" : ("self" as const);

  return (
    <MessageLayout
      isRobot={isRobot}
      type={type}
      displayName={isRobot ? "AI Assistant" : "User"}
      isTouch={isTouch}
      isStreaming={false}
      content={
        <MessageContent
          content={content || ""}
          thinkContent={thinkContent || ""}
          role={isRobot ? "other" : "self"}
          isStreaming={false}
          messageId={message?.id}
        />
      }
    />
  );
});

export default ReadOnlyMessageItem;
