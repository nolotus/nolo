// packages/cli/tui/localAttachmentParts.ts
//
// TUI 附件薄适配（只活在 packages/cli，不改 ai/chat/app/server/RN 共同核心）。
//
// 职责：把 TUI 已经检测到的**本机文件路径**（图片 / 音视频）转成
// `ai/attachments/attachmentPart` 的契约形态（`local-file` source：path + 可信
// machineId + workspaceRoot?，name/mimeType/size），并产出**只给模型**的安全
// 附件卡（走共享 `describeAttachmentForModel`，永不含 path / machineId /
// workspaceRoot）。
//
// 落库现状（provider 边界投影已落地）：
//   `agent-runtime/providerMessageProjection.composeProviderMessages`（buildMessages
//   与轮内压缩重建共用）现在对 user content 数组里的 `attachment` / `media_job`
//   part 调 `projectUserPartForModel` → `describeAttachmentForModel`，投影为不含
//   path / machineId / workspaceRoot 的安全文本卡。因此 local-file part 可以安全
//   落进 durable 消息：跨轮 history 回放时 path/machineId 不会上行 provider。
//   TUI 的 durable 写入受唯一 rollout 门（`chat/messages/attachmentWriteRollout`
//   的 `ENABLE_REMOTE_ATTACHMENT_PART_WRITES`，默认关闭）控制；门关闭时 durable
//   形态逐字节保持旧行为（只带安全卡文本）。永不新造第二开关。
//
// 红线：不读文件内容（只 stat 取 size）、不上传、不建任务、不触发计费；
// 机器 id 复用已有 `detectCurrentMachineId` / `currentMachineIdResolver` 语义，
// 取不到时**不猜**（不产出 part、不编假 id），只记显式降级原因。

import { statSync } from "node:fs";
import path from "node:path";

import {
  ATTACHMENT_PART_TYPE,
  ATTACHMENT_PART_VERSION,
  describeAttachmentForModel,
  normalizeAttachmentPart,
  type AttachmentPart,
} from "../../ai/attachments/attachmentPart";

export type LocalAttachmentSkippedReason =
  /** 本机机器 id 取不到（未绑定）：不猜、不产出 part。 */
  | "machine-unbound"
  /** stat 失败 / 不是普通文件（TCC 沙盒、已删除）。 */
  | "unreadable"
  /** 归一化不通过（缺 name/size 等）：不产出坏 part。 */
  | "invalid-part";

export type LocalAttachmentSkipped = {
  path: string;
  reason: LocalAttachmentSkippedReason;
};

export type BuildLocalAttachmentsInput = {
  /** 本机文件绝对路径（顺序即消息顺序；重复与空值会被跳过）。 */
  paths: readonly (string | null | undefined)[];
  /** 可信本机机器 id（`detectCurrentMachineId` / `currentMachineIdResolver` 的产物）。 */
  machineId?: string | null;
  /** 沿用 `CapabilityExecutionContext.workspaceRoot` 语义；缺省不写。 */
  workspaceRoot?: string;
  /** 测试注入点：文件大小；返回 null = 不可读 / 不是普通文件。 */
  statSize?: (filePath: string) => number | null;
  /** 测试注入点：扩展名 → mimeType。 */
  mimeTypeOf?: (filePath: string) => string;
};

export type LocalAttachmentBundle = {
  /** 契约 part（`local-file` source）。可由端内适配器直接喂给 `sourceResolution`。 */
  parts: AttachmentPart[];
  /** 被跳过的路径与原因（调用方可据此输出可见降级行）。 */
  skipped: LocalAttachmentSkipped[];
  /** 给模型的附件卡（共享 `describeAttachmentForModel` 产出）；无 part 时为空串。 */
  cardText: string;
};

/**
 * 扩展名 → mimeType。只做**粗分类提示**（与 kind 同性质：不承诺可解析、
 * 不作为安全判定），认不出的一律 `application/octet-stream`，不猜内容。
 */
const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  heic: "image/heic",
  heif: "image/heif",
  svg: "image/svg+xml",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/opus",
  flac: "audio/flac",
  aac: "audio/aac",
  amr: "audio/amr",
  wma: "audio/x-ms-wma",
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  webm: "video/webm",
  avi: "video/x-msvideo",
  wmv: "video/x-ms-wmv",
  mpg: "video/mpeg",
  mpeg: "video/mpeg",
  "3gp": "video/3gpp",
  flv: "video/x-flv",
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  json: "application/json",
  csv: "text/csv",
  zip: "application/zip",
  apk: "application/vnd.android.package-archive",
};

export const mimeTypeForLocalPath = (filePath: string): string => {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return EXT_MIME[ext] ?? "application/octet-stream";
};

const defaultStatSize = (filePath: string): number | null => {
  try {
    const stat = statSync(filePath);
    return stat.isFile() ? stat.size : null;
  } catch {
    // ENOENT / EACCES(TCC 沙盒) / 目录 —— 一律「不可读」，不外抛。
    return null;
  }
};

/**
 * 本机路径 → 契约附件 part + 安全附件卡。
 * 不抛错：坏数据 / 不可读 / 机器未绑定都落到 `skipped`（调用方可见降级）。
 */
export const buildLocalAttachments = (
  input: BuildLocalAttachmentsInput,
): LocalAttachmentBundle => {
  const machineId = typeof input.machineId === "string" ? input.machineId.trim() : "";
  const workspaceRoot =
    typeof input.workspaceRoot === "string" ? input.workspaceRoot.trim() : "";
  const statSize = input.statSize ?? defaultStatSize;
  const mimeTypeOf = input.mimeTypeOf ?? mimeTypeForLocalPath;

  const parts: AttachmentPart[] = [];
  const skipped: LocalAttachmentSkipped[] = [];
  const seen = new Set<string>();

  for (const raw of input.paths) {
    const filePath = typeof raw === "string" ? raw.trim() : "";
    if (!filePath || seen.has(filePath)) continue;
    seen.add(filePath);

    // 机器定位缺失不能猜：没有可信本机 id 就不产出 part（换端无法判定）。
    if (!machineId) {
      skipped.push({ path: filePath, reason: "machine-unbound" });
      continue;
    }
    const size = statSize(filePath);
    if (size === null || !Number.isFinite(size) || size < 0) {
      skipped.push({ path: filePath, reason: "unreadable" });
      continue;
    }
    const normalized = normalizeAttachmentPart({
      type: ATTACHMENT_PART_TYPE,
      v: ATTACHMENT_PART_VERSION,
      source: {
        kind: "local-file",
        path: filePath,
        machineId,
        ...(workspaceRoot ? { workspaceRoot } : {}),
      },
      name: path.basename(filePath),
      mimeType: mimeTypeOf(filePath),
      size,
    });
    if (normalized.status !== "valid") {
      skipped.push({ path: filePath, reason: "invalid-part" });
      continue;
    }
    parts.push(normalized.attachment);
  }

  const cardText = parts.map((part) => describeAttachmentForModel(part)).join("\n");
  return { parts, skipped, cardText };
};

/**
 * 把附件卡拼进发给模型的消息。空卡返回原消息（无附件时行为逐字节不变，
 * 不干扰既有的 `message === "..."` 断言与粘贴展开/文本处理）。
 */
export const appendAttachmentCard = (message: string, cardText: string): string => {
  if (!cardText) return message;
  return message.trim() ? `${message}\n\n${cardText}` : cardText;
};
