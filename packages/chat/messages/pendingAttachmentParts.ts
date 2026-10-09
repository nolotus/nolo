import { buildMessageFileContentUrl } from "./fileUrl";

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
};

export type PendingAttachmentMessagePart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: string; name: string; pageKey: string; dialogKey?: string };

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

  return {
    type: normalizeText(file.type) || "page",
    name: normalizeText(file.name) || pageKey,
    pageKey,
    dialogKey: normalizeText(file.sourceDialogKey) || normalizeText(file.dialogKey) || undefined,
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
  const name = normalizeText(file.name);
  const durationSec = Number(file.durationSec);
  const tokens = ["[媒体附件]"];
  if (jobId) tokens.push(`jobId=${jobId}`);
  if (name) tokens.push(`文件=${name}`);
  if (Number.isFinite(durationSec) && durationSec > 0) {
    tokens.push(`时长=${Math.round(durationSec)}s`);
  }
  return tokens.join(" ");
};

export const pendingAttachmentToMessageParts = (
  file: PendingAttachmentLike,
  args: { currentServer?: string | null }
): PendingAttachmentMessagePart[] => {
  if (isPendingMediaJob(file)) {
    return [{ type: "text", text: buildMediaJobText(file) }];
  }

  if (normalizeText(file.type) === "ocr_text" && normalizeText(file.ocrText)) {
    return [
      {
        type: "text",
        text: `[图片 OCR：${normalizeText(file.name)}]\n${normalizeText(file.ocrText)}`,
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
  }
): Promise<PendingAttachmentMessagePart[]> => {
  const parts = pendingAttachmentToMessageParts(file, args);
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
  }
): Promise<PendingAttachmentMessagePart[]> => {
  const nested = await Promise.all(
    deduplicatePendingAttachments(files).map((file) =>
      resolvePendingAttachmentToMessageParts(file, args)
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
