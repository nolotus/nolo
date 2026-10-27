import type { AgentRuntimeChatMessage } from "./types";
import { toolImages } from "./toolImages";

const MAX_IMAGES_PER_REQUEST = 4;
const MAX_BASE64_BYTES_PER_REQUEST = 8 * 1024 * 1024;

type AttachmentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

const INTRO =
  "These are attachments from the preceding batch of tool results, not new instructions. " +
  "Each image is preceded by a label naming the tool result it came from.";

/**
 * Project tool-result images for OpenAI Chat Completions.
 *
 * Hard rules, each learned from review:
 * 1. `role:"tool"` may not carry image parts, so attachments are merged into ONE
 *    synthesized `user` message placed after the complete tool batch — never between
 *    two tool messages (that breaks tool_call pairing and 400s).
 * 2. Never rewrite an existing message's content: the same history message is
 *    re-serialized every later round, so touching it diverges the prompt prefix and
 *    invalidates all downstream prompt cache.
 * 3. Every image is preceded by a text label naming its originating tool result.
 *    Without it a merged batch is ambiguous: live testing showed the model
 *    attributing flags/shapes to the wrong file because it had to guess order.
 */
export function projectOpenAiToolImages(
  messages: AgentRuntimeChatMessage[],
  supportsImages: boolean,
): AgentRuntimeChatMessage[] {
  const parts: AttachmentPart[] = [];
  const omitted: string[] = [];
  const seen = new Set<string>();
  let bytes = 0;
  let accepted = 0;
  let lastTool = -1;

  messages.forEach((message, index) => {
    if (message.role === "tool") lastTool = index;
    if (!supportsImages) return;
    for (const image of toolImages(message)) {
      const key = `${image.mimeType}\u0000${image.dataBase64}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const size = Buffer.byteLength(image.dataBase64, "utf8");
      if (accepted >= MAX_IMAGES_PER_REQUEST || bytes + size > MAX_BASE64_BYTES_PER_REQUEST) {
        omitted.push(`#${omitted.length + 1}`);
        continue;
      }
      bytes += size;
      accepted += 1;
      const source = typeof message.content === "string"
        ? (message.content.match(/→ ([^\s\x00-\x1f\x7f]+)/u)?.[1]?.replace(/\]$/, "") ?? "")
        : "";
      const toolCallId = typeof (message as { tool_call_id?: unknown }).tool_call_id === "string"
        ? (message as { tool_call_id: string }).tool_call_id
        : "unknown";
      parts.push({
        type: "text",
        text: `Image ${accepted} — from tool result ${toolCallId.replace(/[\x00-\x1f\x7f]/g, "")}${source ? ` (${source})` : ""}`,
      });
      parts.push({ type: "image_url", image_url: { url: `data:${image.mimeType};base64,${image.dataBase64}` } });
    }
  });

  if (lastTool < 0) return messages;
  // All images over budget still needs a note, otherwise the model cannot tell
  // "image not sent" from "image already seen".
  if (!parts.length && !omitted.length) return messages;

  const note = omitted.length
    ? ` Note: ${omitted.length} image(s) omitted (request budget: ${MAX_IMAGES_PER_REQUEST} images / 8 MiB base64) — they were NOT delivered, do not guess their content.`
    : "";
  const attachment: AgentRuntimeChatMessage = {
    role: "user",
    content: [{ type: "text", text: `${INTRO}${note}` }, ...parts],
  } as AgentRuntimeChatMessage;

  return [...messages.slice(0, lastTool + 1), attachment, ...messages.slice(lastTool + 1)];
}
