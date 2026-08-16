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

  return {
    visibleText: compactVisibleText(visibleText),
    artifact,
  };
}
