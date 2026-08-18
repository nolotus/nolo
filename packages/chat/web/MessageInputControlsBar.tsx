// packages/chat/web/MessageInputControlsBar.tsx
// Left tools + right send/voice strip. Memoized to skip re-render when only
// textarea text changes but derived control props stay equal.

import React, { memo } from "react";
import FileUploadButton from "./FileUploadButton";
import VoiceInputButton from "./VoiceInputButton";
import SendButton from "./SendButton";
import { DialogUsageTrigger } from "./DialogUsageTrigger";
import {
  AgentPickerControl,
  type AgentPickerControlProps,
} from "./AgentPickerControl";

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
    <div className="message-input__controls">
      <div className="message-input__controls-left">
        <FileUploadButton
          disabled={fileUploadDisabled}
          onFilesSelected={onFilesSelected}
        />

        {agentPicker && <AgentPickerControl {...agentPicker} />}
      </div>

      <div className="message-input__controls-right">
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
