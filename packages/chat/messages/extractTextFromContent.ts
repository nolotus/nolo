/**
 * Shared pure text extractor for OpenAI-style message content.
 *
 * Title previews, desktop notifications, and similar UI surfaces need the
 * plain text of a message without image/tool payloads. Keep one definition
 * so string vs multimodal-array (and single text-part object) handling cannot
 * drift across app hooks.
 *
 * Only depends on core pure seams so unit tests do not pull React/store modules.
 */

import { isRecord } from "core/isRecord";

type TextPartLike = { type: "text"; text: string };

const isTextPart = (part: unknown): part is TextPartLike =>
  isRecord(part) &&
  part.type === "text" &&
  typeof part.text === "string";

export function extractTextFromContent(content: unknown): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .flatMap((part) => (isTextPart(part) ? [part.text] : []))
      .join("");
  }

  // Single multimodal text part object (some readers pass one part, not an array).
  if (isTextPart(content)) return content.text;

  return "";
}

/**
 * Extract plain text then clip to `maxLen` with an ellipsis for UI previews.
 */
export function buildMessageTextPreview(
  content: unknown,
  maxLen: number
): string {
  const text = extractTextFromContent(content);
  if (!text) return "";
  if (!Number.isFinite(maxLen) || maxLen <= 0) return text;
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
}
