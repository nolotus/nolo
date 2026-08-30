// packages/chat/web/MessageInputControlsBar.tsx
// Left tools + right send/voice strip. Memoized to skip re-render when only
// textarea text changes but derived control props stay equal.

import * as stylex from "@stylexjs/stylex";
import React, { memo } from "react";
import FileUploadButton from "./FileUploadButton";
import VoiceInputButton from "./VoiceInputButton";
import SendButton from "./SendButton";
import { DialogUsageTrigger } from "./DialogUsageTrigger";
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
};

export const MessageInputControlsBar = memo(function MessageInputControlsBar({
  fileUploadDisabled,
  onFilesSelected,
  showVoiceInput,
  onTranscribed,
  onVoiceSend,
  onSendClick,
  sendDisabled,
  agentPicker,
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
        <FileUploadButton
          disabled={fileUploadDisabled}
          onFilesSelected={onFilesSelected}
        />

        {agentPicker && <AgentPickerControl {...agentPicker} />}
      </div>

      <div
        className={[
          stylex.props(messageInputStyles.controlsRight).className,
          "message-input__controls-right",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <DialogUsageTrigger />
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
