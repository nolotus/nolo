/**
 * Stateful sanitizer for model-generated tool protocol text leaks in Codex/Responses SSE stream.
 *
 * Unified line-state and delimiter model:
 * 1. Accurately detects special delimiter markers + protocol headers outside of code fences:
 *    - Inline markers: `\u3011\u3010\u3002assistant to=functions.`, `\u3011\u3010\u3002functions.`,
 *      `<|im_start|>assistant to=functions.`, `<|im_start|>functions.`,
 *      `<|start_header_id|>assistant to=functions.`, `<|start_header_id|>functions.`
 *    - Line-start receipt marker: `\tDfunctions.` preceded by optional line-start indentation.
 * 2. Strictly preserves legitimate markdown code blocks (``` or ~~~, length >= 3, 0-3 leading spaces),
 *    inline backticks (`code`), plain JSON, and natural language discussions mentioning functions.
 * 3. Handles arbitrary streaming chunk boundaries, 1-char streaming, whitespace indentation holds,
 *    and partial prefix holds. Prevents mid-line tabs from being misclassified as line-start receipts.
 * 4. Appends a clear non-executable notice when intercepted, ensuring stream deltas and final content
 *    remain strictly identical, without executing pseudo tool calls.
 */

export const LEAKED_PROTOCOL_NOTICE = "\n\n[提示：已拦截模型生成的未执行工具协议片段]";

const INLINE_MARKER_REGEXES = [
  /\u3011\u3010\u3002\s*assistant\s+to\s*=\s*functions\./i,
  /\u3011\u3010\u3002\s*functions\./i,
  /<\|(?:im_start|start_header_id)\|>\s*assistant\s+to\s*=\s*functions\./i,
  /<\|(?:im_start|start_header_id)\|>\s*functions\./i,
];

const INLINE_MARKER_PREFIXES = [
  "\u3011\u3010\u3002assistant to=functions.",
  "\u3011\u3010\u3002functions.",
  "<|im_start|>assistant to=functions.",
  "<|im_start|>functions.",
  "<|start_header_id|>assistant to=functions.",
  "<|start_header_id|>functions.",
];

const TAB_D_PREFIX = "\tDfunctions.".toLowerCase();

function findLeakedMarker(
  text: string,
  wasAtLineStart: boolean,
): { index: number; length: number } | null {
  let earliestIndex = -1;
  let earliestLength = 0;

  for (const regex of INLINE_MARKER_REGEXES) {
    const match = regex.exec(text);
    if (match && match.index !== undefined) {
      if (earliestIndex === -1 || match.index < earliestIndex) {
        earliestIndex = match.index;
        earliestLength = match[0].length;
      }
    }
  }

  // Line-start marker: \tDfunctions. preceded by optional spaces/tabs at a genuine line start
  const lineMarkerRegex = /(?:^|[\r\n])[ \t]*\tDfunctions\./gi;
  let m: RegExpExecArray | null;
  while ((m = lineMarkerRegex.exec(text)) !== null) {
    const isNewline = m[0].startsWith("\n") || m[0].startsWith("\r");
    const actualIndex = m.index + (isNewline ? 1 : 0);
    if (actualIndex === 0 && !wasAtLineStart) {
      continue;
    }
    if (earliestIndex === -1 || actualIndex < earliestIndex) {
      earliestIndex = actualIndex;
      earliestLength = m[0].length - (isNewline ? 1 : 0);
    }
    break;
  }

  return earliestIndex >= 0 ? { index: earliestIndex, length: earliestLength } : null;
}

function calculateHoldLength(buffer: string, wasAtLineStart: boolean): number {
  let hold = 0;
  const lower = buffer.toLowerCase();

  for (const prefix of INLINE_MARKER_PREFIXES) {
    const pLower = prefix.toLowerCase();
    const limit = Math.min(lower.length, pLower.length);
    for (let len = limit; len > 0; len--) {
      if (pLower.startsWith(lower.slice(-len))) {
        if (len > hold) hold = len;
        break;
      }
    }
  }

  // Trailing line indentation: if buffer ends with \n followed by 0+ spaces/tabs (or entire buffer of spaces at line start)
  const trailingLineMatch = /(?:^|[\r\n])[ \t]*$/.exec(buffer);
  if (trailingLineMatch) {
    const isNewline = trailingLineMatch[0].startsWith("\n") || trailingLineMatch[0].startsWith("\r");
    const len = trailingLineMatch[0].length - (isNewline ? 1 : 0);
    if (len > 0 && (isNewline || wasAtLineStart)) {
      if (len > hold) hold = len;
    }
  }

  // Trailing tabD prefix: if after newline and optional spaces we have a prefix of \tDfunctions.
  const trailingTabMatch = /(?:^|[\r\n])[ \t]*(\t[a-zA-Z0-9_\.]*)$/i.exec(lower);
  if (trailingTabMatch) {
    const candidate = trailingTabMatch[1];
    if (TAB_D_PREFIX.startsWith(candidate)) {
      const isNewline = trailingTabMatch[0].startsWith("\n") || trailingTabMatch[0].startsWith("\r");
      const len = trailingTabMatch[0].length - (isNewline ? 1 : 0);
      if (isNewline || wasAtLineStart) {
        if (len > hold) hold = len;
      }
    }
  }

  // Trailing incomplete code fence opening: e.g. \n``` or \n`
  const trailingFenceMatch = /(?:^|[\r\n])[ ]{0,3}(?:`{1,2}|~{1,2})$/.exec(buffer);
  if (trailingFenceMatch) {
    const isNewline = trailingFenceMatch[0].startsWith("\n") || trailingFenceMatch[0].startsWith("\r");
    const len = trailingFenceMatch[0].length - (isNewline ? 1 : 0);
    if (isNewline || wasAtLineStart) {
      if (len > hold) hold = len;
    }
  }

  return hold;
}

export type ResponsesProtocolLeakSanitizer = {
  push: (chunk: string) => void;
  finalize: () => { content: string; intercepted: boolean };
};

export function createResponsesProtocolLeakSanitizer(
  onTextDelta?: (chunk: string) => void,
): ResponsesProtocolLeakSanitizer {
  let safeContent = "";
  let buffer = "";
  let inCodeFence = false;
  let fenceChar = "";
  let fenceLength = 0;
  let intercepted = false;
  let wasAtLineStart = true;

  const emit = (text: string) => {
    safeContent += text;
    onTextDelta?.(text);
    if (text.length > 0) {
      const last = text[text.length - 1];
      wasAtLineStart = last === "\n" || last === "\r";
    }
  };

  const processBuffer = (isFinal: boolean) => {
    if (intercepted) return;

    while (buffer.length > 0) {
      if (!inCodeFence) {
        // Look for code fence opening at line start (0-3 spaces, 3+ backticks or tildes)
        let fenceIndex = -1;
        let fenceMarkerStr = "";
        let lineStartOffset = 0;

        const fenceRegex = /(?:^|[\r\n])[ ]{0,3}(`{3,}|~{3,})[^\r\n]*(?:\r?\n|$)/g;
        let m: RegExpExecArray | null;
        while ((m = fenceRegex.exec(buffer)) !== null) {
          const isNewlinePreceded = m[0].startsWith("\n") || m[0].startsWith("\r");
          const actualStart = m.index + (isNewlinePreceded ? 1 : 0);
          if (actualStart === 0 && !wasAtLineStart) {
            continue;
          }
          fenceIndex = actualStart;
          fenceMarkerStr = m[1];
          lineStartOffset = m[0].length - (isNewlinePreceded ? 1 : 0);
          break;
        }

        const markerMatch = findLeakedMarker(buffer, wasAtLineStart);
        const markerIndex = markerMatch ? markerMatch.index : -1;

        if (markerIndex >= 0 && (fenceIndex === -1 || markerIndex < fenceIndex)) {
          const normalPart = buffer.slice(0, markerIndex);
          emit(normalPart);
          emit(LEAKED_PROTOCOL_NOTICE);
          intercepted = true;
          buffer = "";
          return;
        }

        if (fenceIndex >= 0) {
          // If the fence opening line is incomplete at buffer end and not isFinal, wait for newline
          if (!isFinal && !buffer.slice(fenceIndex).includes("\n") && !buffer.slice(fenceIndex).includes("\r")) {
            const beforeFence = buffer.slice(0, fenceIndex);
            emit(beforeFence);
            buffer = buffer.slice(fenceIndex);
            return;
          }
          const beforeFence = buffer.slice(0, fenceIndex);
          emit(beforeFence);

          inCodeFence = true;
          fenceChar = fenceMarkerStr[0];
          fenceLength = fenceMarkerStr.length;

          emit(buffer.slice(fenceIndex, fenceIndex + lineStartOffset));
          buffer = buffer.slice(fenceIndex + lineStartOffset);
          continue;
        }

        if (isFinal) {
          emit(buffer);
          buffer = "";
          return;
        }

        const hold = calculateHoldLength(buffer, wasAtLineStart);

        if (hold === 0) {
          emit(buffer);
          buffer = "";
        } else if (hold < buffer.length) {
          emit(buffer.slice(0, buffer.length - hold));
          buffer = buffer.slice(buffer.length - hold);
        }
        return;
      } else {
        // Inside code fence -> look for closing line
        const closeRegex = new RegExp(`(?:^|[\\r\\n])[ ]{0,3}${fenceChar}{${fenceLength},}[ ]*(?:\\r?\\n|$)`, "g");
        const closeMatch = closeRegex.exec(buffer);

        if (closeMatch) {
          const isNewlinePreceded = closeMatch[0].startsWith("\n") || closeMatch[0].startsWith("\r");
          const actualStart = closeMatch.index + (isNewlinePreceded ? 1 : 0);
          if (actualStart === 0 && !wasAtLineStart) {
            emit(buffer.slice(0, closeMatch.index + 1));
            buffer = buffer.slice(closeMatch.index + 1);
            continue;
          }
          const closeEnd = closeMatch.index + closeMatch[0].length;
          emit(buffer.slice(0, closeEnd));
          buffer = buffer.slice(closeEnd);
          inCodeFence = false;
          fenceChar = "";
          fenceLength = 0;
          continue;
        }

        if (isFinal) {
          emit(buffer);
          buffer = "";
          return;
        }

        const trailingCloseMatch = new RegExp(`(?:^|[\\r\\n])[ ]{0,3}${fenceChar}{1,${fenceLength}}$`).exec(buffer);
        const hold = trailingCloseMatch ? trailingCloseMatch[0].length : 0;

        if (hold === 0) {
          emit(buffer);
          buffer = "";
        } else if (hold < buffer.length) {
          emit(buffer.slice(0, buffer.length - hold));
          buffer = buffer.slice(buffer.length - hold);
        }
        return;
      }
    }
  };

  return {
    push(chunk: string) {
      if (intercepted) return;
      if (chunk.length === 0) {
        emit("");
        return;
      }
      buffer += chunk;
      processBuffer(false);
    },
    finalize() {
      processBuffer(true);
      return {
        content: safeContent,
        intercepted,
      };
    },
  };
}

export function sanitizeResponsesProtocolLeakText(text: string): {
  content: string;
  intercepted: boolean;
} {
  const sanitizer = createResponsesProtocolLeakSanitizer();
  sanitizer.push(text);
  return sanitizer.finalize();
}
