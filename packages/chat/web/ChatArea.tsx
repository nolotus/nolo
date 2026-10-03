// 文件路径: chat/web/ChatArea.tsx
// 共享聊天区域组件：MessagesList + StopGenerationButton + MessageInputContainer
// 同时被 DialogPage 和 PageAssistantPanel 使用

import React, { memo, useRef } from "react";
import { useFileDropZone } from "app/hooks/useFileDropZone";
import MessagesList from "chat/messages/web/MessageList";
import MessageInputContainer, {
  type MessageInputHandle,
} from "chat/web/MessageInputContainer";
import ChatErrorBoundary from "chat/web/ChatErrorBoundary";
import type { AgentRuntimeOptions } from "ai/agent/types";
import type { AgentPickerControlProps } from "chat/web/AgentPickerControl";
import * as stylex from "@stylexjs/stylex";
import { chatAreaStyles } from "./ChatAreaStyles";

interface ChatAreaProps {
  dialogId: string;
  scrollContainerSelector?: string;
  runtimeOptions?: AgentRuntimeOptions;
  messagesClassName?: string;
  /** 可选：对象助手面板的 composer agent 切换器；不传则 composer 无变化。 */
  agentPicker?: AgentPickerControlProps;
}

const ChatAreaComponent: React.FC<ChatAreaProps> = ({
  dialogId,
  scrollContainerSelector,
  runtimeOptions,
  messagesClassName,
  agentPicker,
}) => {
  const messageInputRef = useRef<MessageInputHandle>(null);
  const { isDragOver, handleDragOver, handleDragLeave, handleDrop } =
    useFileDropZone<HTMLDivElement>((files) => {
      messageInputRef.current?.processFiles(files);
    });

  return (
    <div
      {...stylex.props(chatAreaStyles.area)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={messagesClassName}
        style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        <ChatErrorBoundary fallbackMessage="消息列表加载出错">
          <MessagesList
            dialogId={dialogId}
            scrollContainerSelector={scrollContainerSelector}
          />
        </ChatErrorBoundary>
      </div>

      <ChatErrorBoundary fallbackMessage="输入框加载出错">
        <MessageInputContainer
          ref={messageInputRef}
          runtimeOptions={runtimeOptions}
          agentPicker={agentPicker}
        />
      </ChatErrorBoundary>

      {isDragOver && (
        <div {...stylex.props(chatAreaStyles.dropOverlay)}>
          <span>拖入图片或文件以添加附件</span>
        </div>
      )}
    </div>
  );
};

export const ChatArea = memo(ChatAreaComponent);
