import { buildMessageFileContentUrl } from "./fileUrl";
import { ENABLE_REMOTE_ATTACHMENT_PART_WRITES } from "./attachmentWriteRollout";

export type PendingAttachmentLike = {
  type?: string;
  /** media_job：即 jobId（见 useMessageInputFiles 的 addPendingFile）。 */
  id?: string;
  name?: string;
  pageKey?: string;
  dialogKey?: string;
  sourceDialogKey?: string;
  ocrText?: string;
  /** media_job：音视频任务时长（秒）；发送侧 hydrate，取不到则省略。 */
  durationSec?: number;
  fileKey?: string;
  mimeType?: string;
  size?: number;
};

export type PendingAttachmentMessagePart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "attachment"; v: 1; source: { kind: "remote-file"; fileKey: string }; name: string; mimeType: string; size: number }
  | { type: string; name: string; pageKey?: string; dialogKey?: string; id?: string };

export type PendingAttachmentImageUrlResolver = (
  imageUrl: string,
  file: PendingAttachmentLike
) => string | null | undefined | Promise<string | null | undefined>;

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const buildReferencePart = (
  file: PendingAttachmentLike
): PendingAttachmentMessagePart | null => {
  const pageKey = normalizeText(file.pageKey);
  if (!pageKey) return null;

  const type = normalizeText(file.type) || "page";
  return {
    type,
    name: normalizeText(file.name) || pageKey,
    pageKey,
    dialogKey: type === "dialog"
      ? normalizeText(file.sourceDialogKey) || normalizeText(file.dialogKey) || undefined
      : undefined,
  };
};

const buildImageContextText = (file: PendingAttachmentLike, pageKey: string): string => {
  const name = normalizeText(file.name) || pageKey;
  return [`[Image attachment: ${name}]`, `Source file: ${pageKey}`].join("\n");
};

export const isPendingVisualImage = (file: PendingAttachmentLike): boolean =>
  normalizeText(file.type) === "image";

export const isPendingMediaJob = (file: PendingAttachmentLike): boolean =>
  normalizeText(file.type) === "media_job";

/**
 * 音视频附件在模型上下文里的文本描述：`[媒体附件] jobId=<id> 文件=<name> 时长=<durationSec>s`。
 * 时长由发送侧 hydrate（getMediaJob），纯函数本身只读字段，取不到就省略该段。
 */
const buildMediaJobText = (file: PendingAttachmentLike): string => {
  const jobId = normalizeText(file.id);
  const fileKey = normalizeText(file.fileKey);
  const name = normalizeText(file.name);
  const durationSec = Number(file.durationSec);
  const tokens = ["[媒体附件]"];
  if (fileKey) tokens.push(`fileId=${fileKey}`);
  if (jobId) tokens.push(`jobId=${jobId}`);
  if (name) tokens.push(`文件=${name}`);
  if (Number.isFinite(durationSec) && durationSec > 0) {
    tokens.push(`时长=${Math.round(durationSec)}s`);
  }
  return tokens.join(" ");
};

/**
 * 写入 v1 `attachment` part 的注入位（**不是第二个开关**）：默认取唯一开关
 * `ENABLE_REMOTE_ATTACHMENT_PART_WRITES`（./attachmentWriteRollout.ts），
 * 生产代码不传，测试用它覆盖 off/on 两态。无 env、无第二个常量。
 */
export type PendingAttachmentWriteOptions = {
  enableRemoteAttachmentPartWrites?: boolean;
};

const attachmentPartWritesEnabled = (options?: PendingAttachmentWriteOptions): boolean =>
  options?.enableRemoteAttachmentPartWrites ?? ENABLE_REMOTE_ATTACHMENT_PART_WRITES;

const buildMediaAttachmentPart = (
  file: PendingAttachmentLike,
  options?: PendingAttachmentWriteOptions
): PendingAttachmentMessagePart | null => {
  // 唯一 writer gate 落在**最后产出 `attachment` 的这一步**（不是 upload 侧）：
  // 门关时，任何补元数据的路径——包括 prepare 从 media job 恢复出的 fileId → fileKey——
  // 都只能得到 legacy 媒体 text（带 jobId），绝不写出 attachment part。
  if (!attachmentPartWritesEnabled(options)) return null;
  const fileKey = normalizeText(file.fileKey);
  if (!fileKey) return null;
  const name = normalizeText(file.name);
  const size = Number(file.size);
  if (!name || !Number.isFinite(size) || size < 0) return null;
  return {
    type: "attachment",
    v: 1,
    source: { kind: "remote-file", fileKey },
    name,
    mimeType: normalizeText(file.mimeType),
    size,
  };
};

export const pendingAttachmentToMessageParts = (
  file: PendingAttachmentLike,
  args: { currentServer?: string | null },
  options?: PendingAttachmentWriteOptions
): PendingAttachmentMessagePart[] => {
  if (isPendingMediaJob(file)) {
    const attachment = buildMediaAttachmentPart(file, options);
    return [
      ...(attachment ? [attachment] : []),
      { type: "text", text: buildMediaJobText(file) },
    ];
  }

  if ((normalizeText(file.type) === "ocr_text" || normalizeText(file.type) === "ocr") && normalizeText(file.ocrText)) {
    return [
      {
        type: "text",
        text: normalizeText(file.type) === "ocr" ? normalizeText(file.ocrText) : `[图片 OCR：${normalizeText(file.name)}]\n${normalizeText(file.ocrText)}`,
      },
    ];
  }

  const pageKey = normalizeText(file.pageKey);
  if (isPendingVisualImage(file) && pageKey) {
    const imageUrl = buildMessageFileContentUrl(args.currentServer, pageKey);
    if (imageUrl) {
      return [
        { type: "text", text: buildImageContextText(file, pageKey) },
        { type: "image_url", image_url: { url: imageUrl } },
      ];
    }
  }

  const fallbackPart = buildReferencePart(file);
  return fallbackPart ? [fallbackPart] : [];
};

export const pendingAttachmentsToMessageParts = (
  files: PendingAttachmentLike[],
  args: { currentServer?: string | null }
): PendingAttachmentMessagePart[] =>
  deduplicatePendingAttachments(files).flatMap((file) =>
    pendingAttachmentToMessageParts(file, args)
  );

export const resolvePendingAttachmentToMessageParts = async (
  file: PendingAttachmentLike,
  args: {
    currentServer?: string | null;
    resolveImageUrl?: PendingAttachmentImageUrlResolver;
  },
  options?: PendingAttachmentWriteOptions
): Promise<PendingAttachmentMessagePart[]> => {
  const parts = pendingAttachmentToMessageParts(file, args, options);
  if (!args.resolveImageUrl) return parts;

  return Promise.all(
    parts.map(async (part) => {
      if (part.type !== "image_url") return part;
      const imagePart = part as { type: "image_url"; image_url: { url: string } };

      const resolvedUrl = await args.resolveImageUrl?.(imagePart.image_url.url, file);
      return {
        ...imagePart,
        image_url: {
          ...imagePart.image_url,
          url: normalizeText(resolvedUrl) || imagePart.image_url.url,
        },
      };
    })
  );
};

export const resolvePendingAttachmentsToMessageParts = async (
  files: PendingAttachmentLike[],
  args: {
    currentServer?: string | null;
    resolveImageUrl?: PendingAttachmentImageUrlResolver;
  },
  options?: PendingAttachmentWriteOptions
): Promise<PendingAttachmentMessagePart[]> => {
  const nested = await Promise.all(
    deduplicatePendingAttachments(files).map((file) =>
      resolvePendingAttachmentToMessageParts(file, args, options)
    )
  );
  return nested.flat();
};

const pendingAttachmentIdentity = (file: PendingAttachmentLike): string =>
  normalizeText(file.pageKey) ||
  normalizeText(file.sourceDialogKey) ||
  normalizeText(file.dialogKey);

export const deduplicatePendingAttachments = (
  files: PendingAttachmentLike[]
): PendingAttachmentLike[] => {
  const seen = new Set<string>();
  const result: PendingAttachmentLike[] = [];
  for (const file of files) {
    const identity = pendingAttachmentIdentity(file);
    if (identity && seen.has(identity)) continue;
    if (identity) seen.add(identity);
    result.push(file);
  }
  return result;
};
