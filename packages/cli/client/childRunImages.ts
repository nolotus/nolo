import { isAbsolute } from "node:path";
import { readLocalImage } from "../../agent-runtime/readImage";
import { MAX_TOOL_IMAGES_PER_REQUEST, MAX_TOOL_IMAGE_BASE64_BYTES_PER_REQUEST } from "../../agent-runtime/toolImages";

/** Paths stay in host argv only; image bytes never enter tool arguments or errors. */
export function validateChildImagePaths(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_TOOL_IMAGES_PER_REQUEST
    || value.some(path => typeof path !== "string" || !isAbsolute(path) || path.includes("\0"))) {
    throw new Error("image_input_invalid: expected 1–4 absolute local image paths");
  }
  return value;
}

export async function validateChildImages(paths: string[]): Promise<string[]> {
  let total = 0;
  const urls: string[] = [];
  for (let index = 0; index < paths.length; index++) {
    try {
      const result = await readLocalImage(paths[index]!);
      const image = result.images?.[0];
      if (!image) throw new Error();
      total += image.dataBase64.length;
      if (total > MAX_TOOL_IMAGE_BASE64_BYTES_PER_REQUEST) throw new Error();
      urls.push(`data:${image.mimeType};base64,${image.dataBase64}`);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      const reason = code === "ENOENT" ? "not found" : code === "EACCES" || code === "EPERM" ? "not accessible" : "invalid type/content or exceeds image budget";
      // Native decoder/ENOENT errors may include sensitive absolute paths.
      throw new Error(`image_input_invalid: image ${index + 1} unreadable (${reason})`);
    }
  }
  return urls;
}

/** Preserve the existing URL CLI contract; local files use the same bounded decoder as read_image. */
export async function normalizeCliRunImages(inputs: string[], normalizeRemote: (input: string) => string): Promise<string[]> {
  const local = inputs.filter(input => !/^(https?:|data:|file:)/i.test(input));
  if (local.length > MAX_TOOL_IMAGES_PER_REQUEST) throw new Error("image_input_invalid: expected at most 4 local images");
  const urls = await validateChildImages(local);
  let index = 0;
  return inputs.map(input => /^(https?:|data:|file:)/i.test(input) ? normalizeRemote(input) : urls[index++]!);
}
