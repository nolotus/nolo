import React, { memo, useMemo } from "react";
import { StreamingStructuredMarkdown } from "./StreamingStructuredMarkdown";
import { buildStreamingMarkdownModel } from "./streamingMarkdownModel";
import { splitVisibleCharacters, useStreamingReveal } from "./useStreamingReveal";

const FADE_CHAR_COUNT = 20;

const StreamingTextSpan = memo(({ content }: { content: string }) => {
  // Cut on grapheme boundaries so astral characters (emoji, ZWJ sequences)
  // are never split across the stable prefix and the fade tail. Using
  // content.length (UTF-16 code units) could leave a lone surrogate on each
  // side and render a replacement char during streaming. The grapheme array is
  // memoized per content so streaming tokens only re-run the segmenter once.
  const characters = useMemo(() => splitVisibleCharacters(content), [content]);
  const fadeStartIndex = Math.max(0, characters.length - FADE_CHAR_COUNT);
  const stablePrefix = characters.slice(0, fadeStartIndex).join("");
  const fadingCharacters = characters.slice(fadeStartIndex);

  return (
    <span className="streaming-message-text">
      {stablePrefix}
      {fadingCharacters.map((char, index) => (
        <span
          key={fadeStartIndex + index}
          className="streaming-message-text__char"
        >
          {char}
        </span>
      ))}
    </span>
  );
});

export const StreamingMessageText = memo(
  ({ content, isStreaming = true }: { content: string; isStreaming?: boolean }) => {
    const visibleContent = useStreamingReveal(content);
    const model = useMemo(
      () => buildStreamingMarkdownModel(visibleContent),
      [visibleContent]
    );
    // Hide blinking cursor as soon as all text content has finished revealing
    const isActivelyRevealing = visibleContent.length < content.length;
    const cursorElement = isStreaming && isActivelyRevealing ? (
      <span className="streaming-message-text__cursor" aria-hidden="true" />
    ) : null;

  if (model.kind === "plain-text") {
    return (
      <span className="streaming-message-text-wrapper">
        <StreamingTextSpan content={model.content} />
        {cursorElement}
      </span>
    );
  }

  return (
    <StreamingStructuredMarkdown
      nodes={model.nodes}
      renderText={(text) => <StreamingTextSpan content={text} />}
      cursor={cursorElement}
    />
  );
});

export default StreamingMessageText;
