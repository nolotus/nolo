import { createHash } from "node:crypto";
import { KITTY_MAX_PIXELS, KITTY_MAX_PNG_BYTES, readPngSize } from "./terminalGraphics";
import { sanitizeImageLabel, type TurnImage } from "./tuiImageLayout";
import type { AttachedImage } from "./pasteImage";

export const IMAGE_CACHE_MAX_BYTES = 32 * 1024 * 1024;
export const IMAGE_CACHE_MAX_COUNT = 64;
const MAX_DATA_URL_CHARS = Math.ceil(KITTY_MAX_PNG_BYTES / 3) * 4 + 64;

export type AttachmentPreview = { images: TurnImage[]; textFallbacks: string[] };
export type ImageAttachmentCache = {
  preview(turnIdentity: string, attachments: readonly AttachedImage[]): AttachmentPreview;
  getPng(key: string): Uint8Array | undefined;
  clear(): void;
};

function boundedBudget(value: number | undefined, fallback: number): number {
  if (value === undefined || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value)));
}

function decodePng(attachment: AttachedImage): Uint8Array | undefined {
  if (attachment.mime !== "image/png" || typeof attachment.dataUrl !== "string" || attachment.dataUrl.length > MAX_DATA_URL_CHARS) return;
  const match = /^data:image\/png;base64,([A-Za-z0-9+/]*={0,2})$/.exec(attachment.dataUrl);
  if (!match || match[1].length % 4 !== 0 || match[1].length === 0) return;
  const encoded = match[1];
  const estimated = (encoded.length / 4) * 3 - (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
  if (estimated > KITTY_MAX_PNG_BYTES) return;
  let binary: string;
  try { binary = atob(encoded); } catch { return; }
  if (binary.length > KITTY_MAX_PNG_BYTES) return;
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const size = readPngSize(bytes);
  if (!size.ok || size.width * size.height > KITTY_MAX_PIXELS) return;
  return bytes;
}

export function createImageAttachmentCache(options: { maxBytes?: number; maxCount?: number } = {}): ImageAttachmentCache {
  const maxBytes = boundedBudget(options.maxBytes, IMAGE_CACHE_MAX_BYTES);
  const maxCount = boundedBudget(options.maxCount, IMAGE_CACHE_MAX_COUNT);
  const entries = new Map<string, Uint8Array>();
  const contentKeys = new Map<string, string>();
  const keyFingerprints = new Map<string, string>();
  let totalBytes = 0;
  function remove(key: string): void {
    const data = entries.get(key);
    if (data) {
      entries.delete(key);
      const fingerprint = keyFingerprints.get(key);
      keyFingerprints.delete(key);
      if (fingerprint !== undefined && contentKeys.get(fingerprint) === key) contentKeys.delete(fingerprint);
      totalBytes -= data.byteLength;
    }
  }
  return {
    preview(turnIdentity, attachments) {
      const images: TurnImage[] = [], textFallbacks: string[] = [];
      attachments.forEach((attachment, index) => {
        const label = sanitizeImageLabel(attachment.filename);
        const png = decodePng(attachment);
        if (!png || png.byteLength > maxBytes || maxCount === 0) { textFallbacks.push(label); return; }
        const fingerprint = createHash("sha256").update(png).digest("hex");
        let key = contentKeys.get(fingerprint);
        if (!key || !entries.has(key)) {
          key = `attachment:${encodeURIComponent(turnIdentity)}:${index}:${fingerprint}`;
          while (entries.size > 0 && (entries.size >= maxCount || totalBytes + png.byteLength > maxBytes)) {
            const oldest = entries.keys().next().value as string | undefined;
            if (oldest === undefined) break;
            remove(oldest);
          }
          entries.set(key, png); contentKeys.set(fingerprint, key); keyFingerprints.set(key, fingerprint); totalBytes += png.byteLength;
        } else {
          const cached = entries.get(key)!; entries.delete(key); entries.set(key, cached);
        }
        const size = readPngSize(png);
        if (size.ok) images.push({ key, label, width: size.width, height: size.height });
      });
      return { images, textFallbacks };
    },
    getPng(key) { const data = entries.get(key); if (!data) return; entries.delete(key); entries.set(key, data); return data; },
    clear() { entries.clear(); contentKeys.clear(); keyFingerprints.clear(); totalBytes = 0; },
  };
}
