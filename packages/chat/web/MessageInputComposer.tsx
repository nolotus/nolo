// packages/chat/web/MessageInputComposer.tsx
// Textarea + IME hooks + unified suggestion surface. Memoized so sibling
// chrome can skip re-render when only unrelated parent state changes (and
// vice versa when suggestion props stay stable while other panels update).

import React, { memo, useId } from "react";
import { TextField, TextArea } from "react-aria-components";
import ComposerSuggestionMenu from "./ComposerSuggestionMenu";
import {
  clampSuggestionHighlightIndex,
  type ComposerSuggestionItem,
} from "./composerSuggestions";

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
  suggestionMenuVisible: boolean;
  suggestionItems: ComposerSuggestionItem[];
  suggestionHighlightIndex: number;
  suggestionHeaderText: string;
  onSelectSuggestion: (index: number) => void;
  onHoverSuggestion: (index: number) => void;
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
  suggestionMenuVisible,
  suggestionItems,
  suggestionHighlightIndex,
  suggestionHeaderText,
  onSelectSuggestion,
  onHoverSuggestion,
}: MessageInputComposerProps) {
  // Stable per-instance prefix so the textarea combobox wiring and the
  // listbox/option ids always refer to the same suggestion surface.
  const suggestionIdPrefix = useId();
  const suggestionListboxId = `${suggestionIdPrefix}-composer-suggestion-listbox`;

  // Dynamic combobox semantics: only an actively open surface turns the
  // textarea into an aria combobox pointing at the highlighted option.
  const hasSuggestionOptions =
    suggestionMenuVisible && suggestionItems.length > 0;
  const effectiveHighlightIndex = hasSuggestionOptions
    ? clampSuggestionHighlightIndex(
        suggestionHighlightIndex,
        suggestionItems.length
      )
    : -1;
  const comboboxAriaProps = hasSuggestionOptions
    ? ({
        role: "combobox",
        "aria-expanded": true,
        "aria-controls": suggestionListboxId,
        "aria-activedescendant":
          effectiveHighlightIndex >= 0
            ? `${suggestionListboxId}-opt-${effectiveHighlightIndex}`
            : undefined,
        "aria-autocomplete": "list",
      } as React.AriaAttributes & { role: string })
    : {};

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
          {...comboboxAriaProps}
        />
      </TextField>

      <ComposerSuggestionMenu
        visible={suggestionMenuVisible}
        items={suggestionItems}
        highlightIndex={effectiveHighlightIndex}
        headerText={suggestionHeaderText}
        listboxId={suggestionListboxId}
        onSelect={onSelectSuggestion}
        onHover={onHoverSuggestion}
      />
    </div>
  );
});
