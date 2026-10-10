import { isNoloHostedProvider } from "ai/llm/kimi";

type ImageFetchResult = { ok: boolean; mimeType?: string; bytes?: Uint8Array; error?: string; skippedSize?: number };
export const INLINE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
// Raw bytes: a 20 MiB budget is approximately 26.7 MiB after base64 encoding.
export const INLINE_IMAGE_TOTAL_MAX_BYTES = 20 * 1024 * 1024;

type InlineOptions = {
  shouldInline: boolean;
  fetchImage?: (url: string, signal?: AbortSignal, maxBytes?: number) => Promise<ImageFetchResult>;
  isAllowedImageUrl?: (url: string) => boolean;
  maxBytes?: number;
  maxTotalBytes?: number;
  signal?: AbortSignal;
  onSkipTooLarge?: (url: string, size: number | undefined, reason: "per-image" | "total-budget") => void;
};

const FILE_CONTENT_PATH = "/api/v1/db/file/content/";

/**
 * Providers that reject remote image URLs and require base64 data URIs.
 * Shared contract for client chat + server chat-proxy/agent-run (same as custom
 * OpenAI-compatible hosts / Ollama Cloud).
 */
export const shouldInlineImageUrlsForAgent = (
  agentConfig:
    | { apiSource?: string | null; model?: string | null; provider?: string | null }
    | null
    | undefined,
) => {
  const apiSource = agentConfig?.apiSource?.toLowerCase();
  const provider = agentConfig?.provider?.toLowerCase();
  const model = agentConfig?.model?.toLowerCase();
  if (apiSource === "custom" || provider === "custom") return true;
  // Platform nolo → Ollama: "image URLs are not currently supported, please use base64"
  if (isNoloHostedProvider(provider)) return true;
  return provider === "openrouter" && model === "minimax/minimax-m3";
};

const isInlineCandidate = (url: string) =>
  /^https?:\/\//i.test(url) && url.includes(FILE_CONTENT_PATH);

const bytesToBase64 = (bytes: Uint8Array) => {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    chunks.push(String.fromCharCode.apply(null, Array.from(bytes.subarray(offset, offset + 0x8000))));
  }
  return btoa(chunks.join(""));
};

const defaultFetchImage = async (url: string, signal?: AbortSignal, _maxBytes?: number): Promise<ImageFetchResult> => {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    return {
      ok: false,
      error: `HTTP ${response.status}`,
    };
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    ok: true,
    mimeType: response.headers.get("content-type") ?? "application/octet-stream",
    bytes,
  };
};

const cloneImagePartWithDataUrl = async (
  part: any,
  fetchImage: NonNullable<InlineOptions["fetchImage"]>,
  options: InlineOptions,
  usedBytes: { value: number },
) => {
  const url = part?.image_url?.url;
  if (typeof url !== "string" || !isInlineCandidate(url) || (options.isAllowedImageUrl && !options.isAllowedImageUrl(url))) return part;
  if (options.signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
  const remaining = options.maxTotalBytes === undefined ? undefined : options.maxTotalBytes - usedBytes.value;
  const fetchLimit = options.maxBytes === undefined ? remaining : remaining === undefined ? options.maxBytes : Math.min(options.maxBytes, remaining);
  const result = await fetchImage(url, options.signal, fetchLimit);
  if (options.signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
  if (result.skippedSize !== undefined) {
    const reason = options.maxBytes !== undefined && result.skippedSize > options.maxBytes ? "per-image" : "total-budget";
    options.onSkipTooLarge?.(url, result.skippedSize, reason);
    return part;
  }
  if (!result.ok || !result.bytes) return part;
  if (options.maxBytes !== undefined && result.bytes.byteLength > options.maxBytes) {
    options.onSkipTooLarge?.(url, result.bytes.byteLength, "per-image"); return part;
  }
  if (options.maxTotalBytes !== undefined && usedBytes.value + result.bytes.byteLength > options.maxTotalBytes) {
    options.onSkipTooLarge?.(url, result.bytes.byteLength, "total-budget"); return part;
  }
  usedBytes.value += result.bytes.byteLength;
  const mimeType = (result.mimeType || "application/octet-stream").split(";")[0].trim() || "application/octet-stream";
  return { ...part, image_url: { ...part.image_url, url: `data:${mimeType};base64,${bytesToBase64(result.bytes)}` } };
};

export const inlineImageUrlsForCustomProvider = async <T>(bodyData: T, options: InlineOptions): Promise<T> => {
  if (!options.shouldInline) return bodyData;
  const body: any = bodyData;
  if (!Array.isArray(body?.messages)) return bodyData;
  const fetchImage = options.fetchImage ?? defaultFetchImage;
  const fetched = new Map<string, Promise<ImageFetchResult>>();
  const fetchOnce = (url: string, signal?: AbortSignal, maxBytes?: number) => {
    let result = fetched.get(url);
    if (!result) { result = fetchImage(url, signal, maxBytes); fetched.set(url, result); }
    return result;
  };
  const usedBytes = { value: 0 };
  let changed = false;
  const messages = [...body.messages];
  for (let mi = messages.length - 1; mi >= 0; mi--) {
    const message = messages[mi];
    if (!Array.isArray(message?.content)) continue;
    const content = [...message.content];
    for (let pi = content.length - 1; pi >= 0; pi--) {
      const part = content[pi];
      if (part?.type !== "image_url") continue;
      if (options.maxTotalBytes !== undefined && usedBytes.value >= options.maxTotalBytes) {
        if (typeof part?.image_url?.url === "string" && isInlineCandidate(part.image_url.url)) options.onSkipTooLarge?.(part.image_url.url, undefined, "total-budget");
        continue;
      }
      const cloned = await cloneImagePartWithDataUrl(part, fetchOnce, options, usedBytes);
      if (cloned !== part) { content[pi] = cloned; changed = true; }
    }
    if (content.some((part: any, index: number) => part !== message.content[index])) messages[mi] = { ...message, content };
  }
  return changed ? { ...body, messages } : bodyData;
};
