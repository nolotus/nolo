export type StreamingReactArtifact = {
  language: "jsx" | "tsx";
  code: string;
  complete: boolean;
};

export type StreamingInlineReactArtifactParts = {
  visibleText: string;
  artifact: StreamingReactArtifact | null;
};

const REACT_FENCE_START_RE = /```(jsx|tsx)(?:[^\n`]*)?\n/gi;

// Trailing "```…" fragment (no newline yet) that may still resolve into a
// jsx/tsx fence opening.
const TRAILING_BACKTICK_RUN_RE = /`{3,}([^\n]*)$/;
const REACT_FENCE_LANGS = ["jsx", "tsx"];

/**
 * Whether a trailing fence fragment ("```" + streamed language/info chars so
 * far) could still grow into a react fence opening once more content arrives.
 * Empty info ("```"), react languages and their strict prefixes
 * ("j", "js", "t", "ts", "tx") stay ambiguous; anything already decided
 * ("```tsx preview" is ambiguous until its newline, but "```ts\ncode" or
 * "``` 表示代码块" are not) is shown normally.
 */
function couldStillBecomeReactFence(info: string): boolean {
  const lower = info.toLowerCase();
  if (!lower) return true;
  if (REACT_FENCE_LANGS.some((lang) => lower.startsWith(lang))) return true;
  return REACT_FENCE_LANGS.some((lang) => lang.startsWith(lower));
}

function isPreviewCandidate(code: string): boolean {
  return /function\s+Example\s*\(/.test(code);
}

function compactVisibleText(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractStreamingInlineReactArtifact(
  content: string
): StreamingInlineReactArtifactParts {
  let visibleText = "";
  let cursor = 0;
  let artifact: StreamingReactArtifact | null = null;

  REACT_FENCE_START_RE.lastIndex = 0;

  while (true) {
    const match = REACT_FENCE_START_RE.exec(content);
    if (!match) break;

    const language = match[1].toLowerCase() as "jsx" | "tsx";
    const fenceStart = match.index;
    const codeStart = REACT_FENCE_START_RE.lastIndex;
    const closingFenceIndex = content.indexOf("```", codeStart);
    const complete = closingFenceIndex >= 0;
    const codeEnd = complete ? closingFenceIndex : content.length;
    const code = content.slice(codeStart, codeEnd).trim();

    visibleText += content.slice(cursor, fenceStart);
    cursor = complete ? closingFenceIndex + 3 : content.length;

    if (code && isPreviewCandidate(code)) {
      artifact = { language, code, complete };
    }

    if (!complete) break;
    REACT_FENCE_START_RE.lastIndex = cursor;
  }

  visibleText += content.slice(cursor);

  // Withhold an ambiguous trailing fence fragment: the tail has not been shown
  // yet, so re-interpreting it as a fence later never deletes text the user
  // has already seen. Once the line resolves into something else (a non-react
  // fence, plain text), the fragment reappears with the rest of that line.
  const partialFence = TRAILING_BACKTICK_RUN_RE.exec(visibleText);
  if (partialFence && couldStillBecomeReactFence(partialFence[1])) {
    visibleText = visibleText.slice(0, partialFence.index);
  }

  return {
    visibleText: compactVisibleText(visibleText),
    artifact,
  };
}
