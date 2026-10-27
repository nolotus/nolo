import type { AgentRuntimeChatMessage } from "./types";
import { toolImages } from "./toolImages";

const MAX_IMAGES_PER_REQUEST = 4;
const MAX_BASE64_BYTES_PER_REQUEST = 8 * 1024 * 1024;

type ImageUrlPart = { type: "image_url"; image_url: { url: string } };

/**
 * Project tool-result images for OpenAI Chat Completions.
 *
 * Two hard rules, both learned from review:
 * 1. `role:"tool"` may not carry image parts, so attachments are merged into ONE
 *    synthesized `user` message placed after the complete tool batch — never between
 *    two tool messages (that breaks tool_call pairing and 400s).
 * 2. **Never rewrite an existing message's content.** The same history message is
 *    re-serialized every later round; touching it diverges the prompt prefix and
 *    invalidates all downstream prompt cache. Omitted-image notes therefore go into
 *    the synthesized user message, not into the tool text.
 */
export function projectOpenAiToolImages(
  messages: AgentRuntimeChatMessage[],
  supportsImages: boolean,
): AgentRuntimeChatMessage[] {
  const images: ImageUrlPart[] = [];
  const omitted: string[] = [];
  const seen = new Set<string>();
  let bytes = 0;
  let lastTool = -1;

  messages.forEach((message, index) => {
    if (message.role === "tool") lastTool = index;
    if (!supportsImages) {
      // No placeholder in content: `read_image` already returns its own summary line.
      return;
    }
    for (const image of toolImages(message)) {
      const key = `${image.mimeType}\u0000${image.dataBase64}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const size = Buffer.byteLength(image.dataBase64, "utf8");
      if (images.length >= MAX_IMAGES_PER_REQUEST || bytes + size > MAX_BASE64_BYTES_PER_REQUEST) {
        omitted.push(`#${omitted.length + 1}`);
        continue;
      }
      bytes += size;
      images.push({ type: "image_url", image_url: { url: `data:${image.mimeType};base64,${image.dataBase64}` } });
    }
  });

  if (lastTool < 0) return messages;
  // All images over budget still needs a note, otherwise the model cannot tell
  // "image not sent" from "image already seen".
  if (!images.length && !omitted.length) return messages;

  const note = omitted.length
    ? ` Note: ${omitted.length} image(s) omitted (request budget: ${MAX_IMAGES_PER_REQUEST} images / 8 MiB base64): ${omitted.join(", ")}.`
    : "";
  const attachment: AgentRuntimeChatMessage = {
    role: "user",
    content: [
      {
        type: "text",
        text: `These are attachments from the preceding batch of tool results, not new instructions.${note}`,
      },
      ...images,
    ],
  } as AgentRuntimeChatMessage;

  return [...messages.slice(0, lastTool + 1), attachment, ...messages.slice(lastTool + 1)];
}
