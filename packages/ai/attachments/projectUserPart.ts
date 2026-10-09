import { describeAttachmentForModel } from "./attachmentPart";

export type Part =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; [key: string]: unknown }; [key: string]: unknown };

const isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null;

/** Project legacy and current user parts into model-safe visible content. */
export const projectUserPartForModel = (part: unknown): Part[] => {
  if (!isRecord(part) || typeof part.type !== "string") return [];
  if (part.type === "text") {
    return typeof part.text === "string" && part.text.trim() ? [part as Part] : [];
  }
  if (part.type === "image_url") {
    return isRecord(part.image_url) && typeof part.image_url.url === "string" && part.image_url.url.trim()
      ? [part as Part]
      : [];
  }
  if (part.type === "attachment") return [{ type: "text", text: describeAttachmentForModel(part) }];
  if (part.type === "media_job") {
    const name = typeof part.name === "string" && part.name.trim() ? part.name.trim() : "未命名文件";
    const jobId = typeof part.jobId === "string" ? part.jobId : typeof part.id === "string" ? part.id : "";
    return [{ type: "text", text: `[媒体附件] 文件=${name}${jobId ? ` jobId=${jobId}` : ""}` }];
  }
  // Legacy page references are supplied separately via referenceKeys/context injection.
  if (typeof part.pageKey === "string" && ["page", "pdf", "docx"].includes(part.type)) return [];
  return [{ type: "text", text: `[未识别的附件类型: ${part.type}]` }];
};
