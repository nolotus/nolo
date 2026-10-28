import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { formatImageSummary, type ImageSummary } from "./imageSummary";
import type { AgentRuntimeToolResult } from "./hostAdapter";

export const MAX_IMAGE_BASE64_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGE_EDGE = 1568;
const MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif",
};
function detectMime(bytes: Buffer): string | undefined {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6))) return "image/gif";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
}

/**
 * Input is one resolved path; callers retain the workspace/external-file permission gate.
 *
 * `maxBase64Bytes` exists so the downscale loop is testable: with the production
 * 2 MiB cap, a JPEG q80 render of a 1568px image lands just under the limit, which
 * would make the loop unreachable from a test fixture. Production callers must not
 * override it.
 */
export async function readLocalImage(
  path: string,
  options?: { maxBase64Bytes?: number },
): Promise<AgentRuntimeToolResult & { imageSummary: ImageSummary }> {
  const limit = options?.maxBase64Bytes ?? MAX_IMAGE_BASE64_BYTES;
  const expected = MIME_BY_EXTENSION[extname(path).toLowerCase()];
  if (!expected) throw new Error("read_image: unsupported image extension (PNG/JPEG/WebP/GIF only)");
  const bytes = await readFile(path);
  if (detectMime(bytes) !== expected) throw new Error("read_image: image extension and magic bytes do not match");
  const { default: sharp } = await import("sharp");
  // Decode bomb guard; animated inputs use only the first frame.
  const image = sharp(bytes, { limitInputPixels: 40_000_000, animated: false });
  const meta = await image.metadata();
  if (!meta.width || !meta.height) throw new Error("read_image: invalid image dimensions");
  const encoded = (length: number) => 4 * Math.ceil(length / 3);
  let output = bytes;
  let mimeType = expected;
  let width = meta.width;
  let height = meta.height;
  if (Math.max(width, height) > MAX_IMAGE_EDGE || encoded(output.length) > limit) {
    const resized = await image.rotate()
      .resize({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 }).toBuffer({ resolveWithObject: true });
    output = resized.data;
    width = resized.info.width;
    height = resized.info.height;
    mimeType = "image/jpeg";
  }
  // Keep q80 and reduce dimensions proportionally until the encoded payload fits.
  while (encoded(output.length) > limit) {
    const current = encoded(output.length);
    if (width === 1 && height === 1) {
      throw new Error(
        `read_image: compressed image ${width}x${height}, ${output.length} bytes (${current} base64 bytes) still exceeds ${limit} base64 bytes`,
      );
    }
    const scale = Math.min(0.9, Math.sqrt(limit / current) * 0.95);
    const resized = await image.clone().rotate().resize({
      width: Math.max(1, Math.floor(width * scale)),
      height: Math.max(1, Math.floor(height * scale)),
      fit: "inside", withoutEnlargement: true,
    }).jpeg({ quality: 80 }).toBuffer({ resolveWithObject: true });
    output = resized.data;
    width = resized.info.width;
    height = resized.info.height;
    mimeType = "image/jpeg";
  }
  const imageSummary = { width, height, bytes: output.length, path };
  return {
    imageSummary,
    content: formatImageSummary({ kind: "image", ...imageSummary }),
    images: [{ mimeType, dataBase64: output.toString("base64") }],
  };
}
