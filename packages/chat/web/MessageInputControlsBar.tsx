import * as stylex from "@stylexjs/stylex";
import React, { memo } from "react";
import FileUploadButton from "./FileUploadButton";
import VoiceInputButton from "./VoiceInputButton";
import SendButton from "./SendButton";
import {
  AgentPickerControl,
  type AgentPickerControlProps,
} from "./AgentPickerControl";
import { messageInputStyles } from "./messageInputStyles";

export type MessageInputControlsBarProps = {
  fileUploadDisabled: boolean;
  onFilesSelected: (input: FileList | File[] | null) => Promise<void> | void;
  showVoiceInput: boolean;
  onTranscribed: (transcript: string) => void;
  onVoiceSend: (transcript: string) => void;
  onSendClick: () => void;
  sendDisabled: boolean;
  /** 可选：对象助手面板的 composer agent 切换器；不传则不渲染。 */
  agentPicker?: AgentPickerControlProps;
  /** 可选：上下文用量入口插槽（DialogUsageTrigger），渲染在 controlsRight 内、Send/Voice 按钮左侧 */
  usageSlot?: React.ReactNode;
};


/**
 * 对话页胶囊输入框最左侧的圆形「+」按钮（附件选择逻辑与 FileUploadButton 完全一致）。
 */
export const MessageInputAttachButton = memo(function MessageInputAttachButton({
  fileUploadDisabled,
  onFilesSelected,
}: {
  fileUploadDisabled?: boolean;
  onFilesSelected: (files: FileList | null) => void;
}) {
  return (
    <FileUploadButton
      variant="round"
      disabled={fileUploadDisabled}
      onFilesSelected={onFilesSelected}
    />
  );
});

export const MessageInputControlsBar = memo(function MessageInputControlsBar({
  fileUploadDisabled,
  onFilesSelected,
  showVoiceInput,
  onTranscribed,
  onVoiceSend,
  onSendClick,
  sendDisabled,
  agentPicker,
  usageSlot,
}: MessageInputControlsBarProps) {
  return (
    <div
      className={[
        stylex.props(messageInputStyles.controls).className,
        "message-input__controls",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={[
          stylex.props(messageInputStyles.controlsLeft).className,
          "message-input__controls-left",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {agentPicker && (
          <AgentPickerControl
            {...agentPicker}
            panelExtra={usageSlot}
          />
        )}
      </div>

      <div
        className={[
          stylex.props(messageInputStyles.controlsRight).className,
          "message-input__controls-right",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {showVoiceInput ? (
          <VoiceInputButton
            onTranscribed={onTranscribed}
            onSend={onVoiceSend}
            className="voice-btn-in-send"
            iconSize={20}
          />
        ) : (
          <SendButton onClick={onSendClick} disabled={sendDisabled} />
        )}
      </div>
    </div>
  );
});
