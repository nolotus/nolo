// packages/chat/web/MessageInputComposer.tsx
// Textarea + IME hooks + mention menu. Memoized so sibling chrome can skip
// re-render when only unrelated parent state changes (and vice versa when
// mention props stay stable while other panels update).

import React, { memo } from "react";
import { TextField, TextArea } from "react-aria-components";
import AgentMentionMenu from "./AgentMentionMenu";
import type { FavoriteAgentSummary } from "./messageInputAgentUi";

export type MessageInputComposerProps = {
  areaRef: React.RefObject<HTMLTextAreaElement | null>;
  text: string;
  placeholder: string;
  ariaLabel: string;
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement>;
  onPaste: React.ClipboardEventHandler<HTMLTextAreaElement>;
  mentionMenuVisible: boolean;
  filteredFavoriteAgents: FavoriteAgentSummary[];
  mentionHighlightIndex: number;
  mentionHeaderText: string;
  onSelectMention: (agent: FavoriteAgentSummary) => void;
  onHoverMention: (index: number) => void;
};

export const MessageInputComposer = memo(function MessageInputComposer({
  areaRef,
  text,
  placeholder,
  ariaLabel,
  onChange,
  onCompositionStart,
  onCompositionEnd,
  onFocus,
  onBlur,
  onKeyDown,
  onPaste,
  mentionMenuVisible,
  filteredFavoriteAgents,
  mentionHighlightIndex,
  mentionHeaderText,
  onSelectMention,
  onHoverMention,
}: MessageInputComposerProps) {
  return (
    <div className="message-input__textarea-wrap">
      <TextField
        style={{ flex: 1, display: "flex", width: "100%" }}
        aria-label={ariaLabel}
      >
        <TextArea
          ref={areaRef as React.RefObject<HTMLTextAreaElement>}
          className="message-input__textarea"
          value={text}
          rows={1}
          placeholder={placeholder}
          onChange={onChange}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          onPaste={onPaste}
        />
      </TextField>

      <AgentMentionMenu
        visible={mentionMenuVisible}
        agents={filteredFavoriteAgents}
        highlightIndex={mentionHighlightIndex}
        headerText={mentionHeaderText}
        onSelect={onSelectMention}
        onHover={onHoverMention}
      />
    </div>
  );
});
