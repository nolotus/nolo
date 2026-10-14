import type { PendingFile } from "chat/dialog/dialogSlice";
import { resolvePendingAttachmentsToMessageParts, type PendingAttachmentMessagePart, type PendingAttachmentLike, type PendingAttachmentWriteOptions } from "./pendingAttachmentParts";
import { fileKey as makeFileKey } from "database/keys";
import { getMediaJob } from "chat/web/mediaJobs";

/** Recover authoritative job metadata for legacy pending entries; never treat a job id as a file key. */
export const preparePendingAttachmentParts = async (
  files: PendingFile[],
  args: { currentServer?: string | null; currentUserId?: string | null; resolveImageUrl?: (url: string, file: PendingAttachmentLike) => string | null | undefined | Promise<string | null | undefined> },
  /** 同上唯一 writer gate 的注入位（生产不传）；prepare 只补元数据，不产出 attachment part。 */
  options?: PendingAttachmentWriteOptions,
): Promise<PendingAttachmentMessagePart[]> => {
  const prepared = await Promise.all(files.map(async (file) => {
    if (file.type !== "media_job") return file;
    if (file.fileKey) return file;
    try {
      const { job } = await getMediaJob(file.id);
      const owner = args.currentUserId?.trim();
      const isBareId = !job.fileId.includes(":") && !job.fileId.startsWith("file-");
      const fullFileKey = job.fileId.startsWith("file-")
        ? job.fileId
        : owner && isBareId ? makeFileKey.single(owner, job.fileId) : undefined;
      return {
        ...file,
        ...(fullFileKey ? { fileKey: fullFileKey } : {}),
        name: file.name || job.fileName,
        mimeType: file.mimeType || job.mimeType,
        durationSec: file.durationSec ?? job.durationSec,
      };
    } catch {
      return { ...file, name: `[媒体附件不可用：${file.name}]`, ocrText: undefined };
    }
  }));
  const parts = await resolvePendingAttachmentsToMessageParts(prepared, args, options);
  for (const file of prepared) {
    if (file.type === "media_job" && !file.fileKey) {
      parts.push({ type: "text", text: `[媒体附件不可用] jobId=${file.id} 文件=${file.name}；无法安全定位原件` });
    }
  }
  return parts;
};
