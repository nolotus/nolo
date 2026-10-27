import { createHash } from "node:crypto";
import type { AgentRuntimeChatMessage } from "./types";
import type { AgentRuntimeToolResult } from "./hostAdapter";

export type ToolImage = NonNullable<AgentRuntimeToolResult["images"]>[number];
// Symbol keys survive object spreads but never JSON serialization, logs or storage.
export const TOOL_IMAGES: unique symbol = Symbol("runtime-only-tool-images");
export type ToolImageMessage = AgentRuntimeChatMessage & { [TOOL_IMAGES]?: ToolImage[] };
export function toolImages(message: object): ToolImage[] {
  return (message as ToolImageMessage)[TOOL_IMAGES] ?? [];
}
export function withoutToolImages<T extends object>(message: T): T {
  if (!(TOOL_IMAGES in message)) return message;
  const { [TOOL_IMAGES]: _images, ...textOnly } = message as T & { [TOOL_IMAGES]?: ToolImage[] };
  return textOnly as T;
}
/** One ledger per turn, never process-global or shared across dialogs. */
export function createToolImageLedger() {
  const seen = new Set<string>();
  return (images: ToolImage[] | undefined): ToolImage[] => (images ?? []).filter((image) => {
    const hash = createHash("sha256").update(Buffer.from(image.dataBase64, "base64")).digest("hex");
    if (seen.has(hash)) return false;
    seen.add(hash);
    return true;
  });
}
export function omitToolImages<T extends AgentRuntimeChatMessage>(message: T, reason: string, placeholder = `[image omitted: ${reason}]`): T {
  if (!toolImages(message).length) return message;
  return { ...withoutToolImages(message), content: `${message.content ?? ""}\n${placeholder}` };
}
