import { useEffect, useRef, useState } from "react";

const STREAMING_REVEAL_DELAY_MS = 12;

/** Timer handle used by the streaming reveal animation. */
export type RevealTimerHandle = ReturnType<typeof setTimeout>;

export function splitVisibleCharacters(content: string): string[] {
  const Segmenter = Intl.Segmenter;
  if (typeof Segmenter === "function") {
    const segmenter = new Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(content), (part) => part.segment);
  }
  return Array.from(content);
}

export function useStreamingReveal(content: string): string {
  const [visibleContent, setVisibleContent] = useState("");
  const visibleContentRef = useRef("");
  const revealTimerRef = useRef<RevealTimerHandle | null>(null);

  useEffect(() => {
    visibleContentRef.current = visibleContent;
  }, [visibleContent]);

  useEffect(() => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }

    const currentVisible = visibleContentRef.current;
    if (currentVisible === content) return;

    if (currentVisible && !content.startsWith(currentVisible)) {
      visibleContentRef.current = content;
      setVisibleContent(content);
      return;
    }

    const revealNext = () => {
      const targetCharacters = splitVisibleCharacters(content);
      const visibleCharacters = splitVisibleCharacters(visibleContentRef.current);
      const nextCount = visibleCharacters.length + 1;
      const partialContent = targetCharacters.slice(0, nextCount).join("");
      visibleContentRef.current = partialContent;
      setVisibleContent(partialContent);
      if (nextCount >= targetCharacters.length) return;

      revealTimerRef.current = setTimeout(revealNext, STREAMING_REVEAL_DELAY_MS);
    };

    revealTimerRef.current = setTimeout(() => {
      revealTimerRef.current = null;
      revealNext();
    }, STREAMING_REVEAL_DELAY_MS);

    return () => {
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
    };
  }, [content]);

  return visibleContent;
}
