import type { AgentRuntimeChatMessage } from "../types";

/**
 * Convert OpenAI chat.completions `messages` into Cursor runtime messages.
 *
 * CRITICAL: content arrays must preserve `image_url` parts (not flatten to
 * text). `cursorProvider.extractImages` packs those into the protobuf
 * UserMessage.selectedContext.selectedImages — flattening silently drops
 * all user images for cursor agents.
 */
export function mapOpenAiMessagesToCursorRuntimeMessages(
  messages: unknown,
): AgentRuntimeChatMessage[] {
  if (!Array.isArray(messages)) return [];

  return messages.map((raw) => {
    const m = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const role = typeof m.role === "string" && m.role ? m.role : "user";
    const content = m.content;

    if (typeof content === "string") {
      return { role, content };
    }

    if (Array.isArray(content)) {
      const parts = content
        .map((part) => {
          if (!part || typeof part !== "object") return null;
          const c = part as Record<string, unknown>;

          if (c.type === "text" && typeof c.text === "string") {
            return { type: "text" as const, text: c.text };
          }

          if (
            c.type === "image_url" &&
            c.image_url &&
            typeof c.image_url === "object" &&
            typeof (c.image_url as { url?: unknown }).url === "string"
          ) {
            return {
              type: "image_url" as const,
              image_url: { url: (c.image_url as { url: string }).url },
            };
          }

          // OpenAI Responses API image part: { type: "input_image", image_url: "data:..." }
          if (c.type === "input_image" && typeof c.image_url === "string") {
            return {
              type: "image_url" as const,
              image_url: { url: c.image_url },
            };
          }

          // Degrade non-standard but text-bearing parts.
          if (typeof c.text === "string" && c.text) {
            return { type: "text" as const, text: c.text };
          }
          return null;
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      return {
        role,
        content: parts.length > 0 ? parts : "",
      };
    }

    return { role, content: "" };
  });
}
