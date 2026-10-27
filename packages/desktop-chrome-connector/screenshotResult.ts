import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentRuntimeToolResult } from "../agent-runtime/hostAdapter";
import { readLocalImage } from "../agent-runtime/readImage";
import { toErrorMessage } from "core/errorMessage";

/** Host-only screenshot projection; browser capture errors remain owned by the connector. */
export async function screenshotResult(result: unknown): Promise<AgentRuntimeToolResult> {
  const source = result as { savedTo?: unknown; dataUrl?: unknown } | null;
  // Firefox can return a failed verdict (e.g. TAB_NOT_VISIBLE), not an image.
  // Preserve that envelope verbatim instead of treating capture failure as delivery failure.
  if (!source?.savedTo && !source?.dataUrl) {
    return { content: JSON.stringify({ ok: true, result }) };
  }
  let path = typeof source?.savedTo === "string" ? source.savedTo : undefined;
  // Never put the unbounded original data URL in model-visible text or persistence.
  const { dataUrl: _dataUrl, ...summary } = source && typeof source === "object" ? source : {};
  try {
    if (!path && typeof source?.dataUrl === "string") {
      const match = /^data:image\/(png|jpeg|webp|gif);base64,([\s\S]+)$/.exec(source.dataUrl);
      if (!match) throw new Error("unsupported screenshot data URL");
      const directory = await mkdtemp(join(tmpdir(), "nolo-screenshot-"));
      path = join(directory, `screenshot.${match[1] === "jpeg" ? "jpg" : match[1]}`);
      await writeFile(path, Buffer.from(match[2]!, "base64"));
    }
    if (!path) throw new Error("screenshot result has no savedTo or image data URL");
    const image = await readLocalImage(path);
    return {
      content: `${JSON.stringify({ ok: true, result: { ...summary, savedTo: path } })}\n${image.content.replace(/^\[image /, "[screenshot ")}`,
      images: image.images,
    };
  } catch (error) {
    return {
      content: `${JSON.stringify({ ok: true, result: { ...summary, ...(path ? { savedTo: path } : {}) } })}\n${path ? `screenshot saved to ${path}\n` : ""}Screenshot image not delivered (未投递): ${toErrorMessage(error)}`,
    };
  }
}
