import { isNoloHostedProvider } from "ai/llm/kimi";

import { API_ENDPOINTS, NOLO_CLUSTER_SERVERS } from "database/config";
import { INLINE_IMAGE_MAX_BYTES, INLINE_IMAGE_TOTAL_MAX_BYTES } from "database/fileUrl";
export { INLINE_IMAGE_MAX_BYTES, INLINE_IMAGE_TOTAL_MAX_BYTES } from "database/fileUrl";

export type ImageFetchResult = { ok: boolean; mimeType?: string; bytes?: Uint8Array; error?: string; skippedSize?: number };
type InlineOptions = {
  shouldInline: boolean;
  fetchImage?: (url: string, signal?: AbortSignal, maxBytes?: number) => Promise<ImageFetchResult>;
  serverUrl?: string;
  request?: (url: string, init: RequestInit) => Promise<Response>;
  maxBytes?: number;
  maxTotalBytes?: number;
  signal?: AbortSignal;
  onSkipTooLarge?: (url: string, size: number | undefined, reason: "per-image" | "total-budget") => void;
};

const FILE_CONTENT_PATH = `${API_ENDPOINTS.DATABASE}/file/content/`;

export function trustedInlineFile(url: string, serverUrl?: string, pageOrigin?: string) {
  try {
    const source = new URL(url, pageOrigin ?? serverUrl);
    const originOf = (base?: string) => base ? new URL(base).origin : undefined;
    if (!/^https?:$/.test(source.protocol) || source.username || source.password ||
      !(source.origin === originOf(serverUrl) || source.origin === originOf(pageOrigin) ||
        NOLO_CLUSTER_SERVERS.some(origin => origin === source.origin))) return null;
    const id = source.pathname.startsWith(FILE_CONTENT_PATH) ? source.pathname.slice(FILE_CONTENT_PATH.length) : "";
    if (!/^[A-Za-z0-9._~-]{1,256}$/.test(id) || id === "." || id === "..") return null;
    return { origin: source.origin, id, spaceId: source.searchParams.get("spaceId") };
  } catch {
    return null;
  }
}

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

// Also recognize malformed and untrusted lookalikes, so they are stripped
// rather than falling through as ordinary third-party images.
const isInlineCandidate = (url: string) => {
  if (/^data:/i.test(url)) return false;
  if (url.includes(FILE_CONTENT_PATH)) return true;
  try { return new URL(url, "https://relative.invalid").pathname.startsWith(FILE_CONTENT_PATH); }
  catch { return false; }
};

const bytesToBase64 = (bytes: Uint8Array) => {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    chunks.push(String.fromCharCode.apply(null, Array.from(bytes.subarray(offset, offset + 0x8000))));
  }
  return btoa(chunks.join(""));
};

export async function readBoundedInlineImage(response: Response, maxBytes: number): Promise<ImageFetchResult> {
  const declaredSize = Number(response.headers.get("content-length"));
  if (!response.ok || !response.body || declaredSize > maxBytes) {
    await response.body?.cancel();
    return declaredSize > maxBytes ? { ok: false, skippedSize: declaredSize } : { ok: false };
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return { ok: false, skippedSize: size };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes, mimeType: response.headers.get("content-type") ?? undefined };
}

function publicImageFetcher(options: InlineOptions): NonNullable<InlineOptions["fetchImage"]> {
  const timeout = AbortSignal.timeout(5000);
  const request = options.request ?? fetch;
  const pageOrigin = typeof window === "undefined" ? undefined : window.location?.origin;
  return async (url, signal, maxBytes = INLINE_IMAGE_MAX_BYTES) => {
    try {
      const file = trustedInlineFile(url, options.serverUrl, pageOrigin);
      if (!file) return { ok: false };
      const init = { credentials: "omit", redirect: "error", cache: "no-store",
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout } as const;
      const base = `${file.origin}${API_ENDPOINTS.DATABASE}/file`;
      const proof = await request(`${base}/public/${file.id}`, init);
      if (!proof.ok || (await proof.json())?.public !== true) {
        if (!proof.bodyUsed) await proof.body?.cancel();
        return { ok: false };
      }
      // This endpoint rechecks accessPolicy on the very snapshot it serves.
      // A positive probe alone cannot authorize a later read of a mutable ID.
      return await readBoundedInlineImage(await request(`${base}/public-content/${file.id}?maxBytes=${maxBytes}`, init), maxBytes);
    } catch {
      signal?.throwIfAborted();
      return { ok: false };
    }
  };
}

const cloneImagePartWithDataUrl = async (
  part: any,
  fetchImage: NonNullable<InlineOptions["fetchImage"]>,
  options: InlineOptions,
  usedBytes: { value: number },
) => {
  const native = part?.type === "input_image";
  const url = native && typeof part.image_url === "string" ? part.image_url : part?.image_url?.url;
  const unavailable = { type: native ? "input_text" : "text", text: "[Image unavailable]" };
  if (typeof url !== "string" || !isInlineCandidate(url)) return part;
  if (options.signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
  const remaining = options.maxTotalBytes === undefined ? undefined : options.maxTotalBytes - usedBytes.value;
  if (remaining !== undefined && remaining <= 0) {
    options.onSkipTooLarge?.(url, undefined, "total-budget");
    return unavailable;
  }
  const fetchLimit = options.maxBytes === undefined ? remaining : remaining === undefined ? options.maxBytes : Math.min(options.maxBytes, remaining);
  const result = await fetchImage(url, options.signal, fetchLimit).catch((): ImageFetchResult => {
    options.signal?.throwIfAborted();
    return { ok: false };
  });
  if (options.signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
  if (result.skippedSize !== undefined) {
    const reason = options.maxBytes !== undefined && result.skippedSize > options.maxBytes ? "per-image" : "total-budget";
    options.onSkipTooLarge?.(url, result.skippedSize, reason);
    return unavailable;
  }
  if (!result.ok || !result.bytes) return unavailable;
  if (options.maxBytes !== undefined && result.bytes.byteLength > options.maxBytes) {
    options.onSkipTooLarge?.(url, result.bytes.byteLength, "per-image"); return unavailable;
  }
  if (options.maxTotalBytes !== undefined && usedBytes.value + result.bytes.byteLength > options.maxTotalBytes) {
    options.onSkipTooLarge?.(url, result.bytes.byteLength, "total-budget"); return unavailable;
  }
  usedBytes.value += result.bytes.byteLength;
  const mimeType = (result.mimeType || "application/octet-stream").split(";")[0].trim() || "application/octet-stream";
  const dataUrl = `data:${mimeType};base64,${bytesToBase64(result.bytes)}`;
  return { ...part, image_url: native ? dataUrl : { ...part.image_url, url: dataUrl } };
};

export const inlineImageUrlsForCustomProvider = async <T>(bodyData: T, options: InlineOptions): Promise<T> => {
  if (!options.shouldInline) return bodyData;
  const body: any = bodyData;
  if (!Array.isArray(body?.messages) && !Array.isArray(body?.input)) return bodyData;
  options = { ...options,
    maxBytes: Math.min(options.maxBytes ?? INLINE_IMAGE_MAX_BYTES, INLINE_IMAGE_MAX_BYTES),
    maxTotalBytes: Math.min(options.maxTotalBytes ?? INLINE_IMAGE_TOTAL_MAX_BYTES, INLINE_IMAGE_TOTAL_MAX_BYTES),
  };
  const fetchImage = options.fetchImage ?? publicImageFetcher(options);
  const fetched = new Map<string, Promise<ImageFetchResult>>();
  const fetchOnce = (url: string, signal?: AbortSignal, maxBytes?: number) => {
    let result = fetched.get(url);
    if (!result) { result = fetchImage(url, signal, maxBytes); fetched.set(url, result); }
    return result;
  };
  const usedBytes = { value: 0 };
  // Both wire formats consume the same raw-byte budget and fetch cache.
  const rewrite = async (items: any[], imageType: string): Promise<any[]> => {
    let output = items;
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      let next = item;
      if (item?.type === imageType) next = await cloneImagePartWithDataUrl(item, fetchOnce, options, usedBytes);
      else if (Array.isArray(item?.content)) {
        const content = await rewrite(item.content, imageType);
        if (content !== item.content) next = { ...item, content };
      }
      if (imageType === "input_image" && item?.type === "function_call_output" && Array.isArray(item.output)) {
        const outputItems = await rewrite(item.output, imageType);
        if (outputItems !== item.output) next = { ...next, output: outputItems };
      }
      if (next !== item) {
        if (output === items) output = [...items];
        output[i] = next;
      }
    }
    return output;
  };
  let result = body;
  for (const [key, imageType] of [["messages", "image_url"], ["input", "input_image"]]) {
    if (!Array.isArray(body[key])) continue;
    const items = await rewrite(body[key], imageType);
    if (items !== body[key]) result = { ...result, [key]: items };
  }
  return result;
};
