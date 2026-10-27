import type { AgentRuntimeChatMessage } from "./types";
import type { AgentRuntimeToolResult } from "./hostAdapter";

/** Shape-stable fallback for a tool_result with no text (must match from the first send). */
export const EMPTY_TOOL_RESULT_TEXT = "[Tool completed without output]";

/** Persisted boolean only; never contains image bytes or adds model-visible text. */
export const TOOL_HAD_IMAGES = "toolHadImages";
export function hadToolImages(message: object): boolean {
  return (message as AgentRuntimeChatMessage).tool_result_metadata?.[TOOL_HAD_IMAGES] === true || toolImages(message).length > 0;
}

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
  return (_images?.length ? {
    ...textOnly,
    tool_result_metadata: {
      ...(message as AgentRuntimeChatMessage).tool_result_metadata,
      [TOOL_HAD_IMAGES]: true,
    },
  } : textOnly) as T;
}
// Runtime-only notices survive history spreads/stripping, never persistence.
export const TOOL_IMAGE_NOTICES: unique symbol = Symbol("runtime-only-tool-image-notices");
export function createToolImageNotices() {
  return { text: [] as string[], seen: new WeakSet<ToolImage>() };
}
export function toolImageNotices(message: object) {
  const holder = message as { [TOOL_IMAGE_NOTICES]?: ReturnType<typeof createToolImageNotices> };
  return holder[TOOL_IMAGE_NOTICES] ??= createToolImageNotices();
}
// Wire builders record decisions out-of-band; payload Symbols and persisted history stay unchanged.
const delivery = new WeakMap<ToolImage, "delivered" | "impossible">();
export function resetToolImageDelivery(images: ToolImage[]) {
  for (const image of images) delivery.delete(image);
}
export function toolImageDelivery(image: ToolImage) { return delivery.get(image); }
export function createToolImageBudget() {
  let count = 0;
  let bytes = 0;
  const seen = new Set<string>();
  return (image: ToolImage): "delivered" | "pending" | "impossible" | "duplicate" => {
    const key = `${image.mimeType}\u0000${image.dataBase64}`;
    if (seen.has(key)) return "duplicate";
    seen.add(key);
    const size = Buffer.byteLength(image.dataBase64, "utf8");
    // A single oversized image cannot fit in ANY later request: terminal on first attempt (N=1).
    if (size > 8 * 1024 * 1024) {
      delivery.set(image, "impossible");
      return "impossible";
    }
    if (count >= 4 || bytes + size > 8 * 1024 * 1024) return "pending";
    count += 1;
    bytes += size;
    delivery.set(image, "delivered");
    return "delivered";
  };
}
export function toolImageSource(message: AgentRuntimeChatMessage): string {
  const path = typeof message.content === "string"
    ? message.content.match(/→ ([^\s\x00-\x1f\x7f]+)/u)?.[1]?.replace(/\]$/, "") : undefined;
  return `${(message.tool_call_id ?? "unknown").replace(/[\x00-\x1f\x7f]/g, "")}${path ? ` (${path})` : ""}`;
}
export function toolImageOmission(source: string, impossible: boolean): string {
  return impossible
    ? `Tool image permanently downgraded to text: ${source}. Impossible to deliver: single image exceeds 8 MiB base64; will not retry. Do not guess its content.`
    : `Tool image deferred to a later round in this turn: ${source}. Request budget is 4 images / 8 MiB base64.`;
}
/** One ledger per turn, never process-global or shared across dialogs. */
export function createToolImageLedger() {
  const committed = new Set<string>();
  const impossible = new Set<string>();
  // Pending = images accepted for the CURRENT request batch but not yet sent.
  // Dedupe must cover committed ∪ pending, otherwise two tools returning the
  // same image in one round both pass and Anthropic (no request-level dedupe)
  // emits the same image block twice.
  let pending = new Set<string>();
  // No node:crypto here: this module is reachable from the web bundle. Exact string
  // equality is enough for dedupe and the payload is already in memory.
  const keyOf = (image: ToolImage) => `${image.mimeType}\u0000${image.dataBase64}`;
  const candidates = (images: ToolImage[] | undefined): ToolImage[] => (images ?? []).filter((image) => {
    const key = keyOf(image);
    if (committed.has(key) || impossible.has(key) || pending.has(key)) return false;
    pending.add(key);
    return true;
  });
  return Object.assign(candidates, {
    /** Only after the provider call succeeded: failed sends must stay replayable. */
    commit(images: ToolImage[], retained: ToolImage[] = []) {
      for (const image of images) committed.add(keyOf(image));
      pending = new Set(retained.map(keyOf));
    },
    /** Terminal downgrade is distinct from successful delivery. */
    discard(images: ToolImage[]) {
      for (const image of images) impossible.add(keyOf(image));
    },
    /** 当前生命周期不依赖 reset，仅供未来中途放弃批次时使用。 */
    reset() { pending = new Set(); },
  });
}

/**
 * Strip the in-memory image payload WITHOUT touching content.
 *
 * Never rewrite `content` here: the same history message is re-serialized on every
 * later round, so appending a marker (e.g. "already sent this turn") would diverge
 * the prompt prefix at that message and invalidate all downstream prompt cache
 * (OpenAI / Anthropic / DeepSeek). Tool results already carry their own text
 * summary (`[image WxH N bytes → path]`), which is enough for the model.
 */
export function stripToolImages<T extends AgentRuntimeChatMessage>(message: T): T {
  if (!toolImages(message).length) return message;
  return withoutToolImages(message);
}
