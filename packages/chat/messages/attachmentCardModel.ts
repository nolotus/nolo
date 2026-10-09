/**
 * 附件卡的展示模型 —— 纯函数，零 UI / RN 依赖（Web 与 RN 共用同一份文案口径）。
 *
 * 目的：`attachment`（新契约）与旧 `media_job` part 在消息里**不能静默消失**
 * （旧实现里未知 part 直接 return null）。这里只把公共契约
 * （packages/ai/attachments/attachmentPart.ts）归一化结果翻成一张卡片的文案，
 * **绝不输出 fileKey / 本地路径 / machineId**
 * （隐私口径见 docs/plans/2026-10-10-attachment-architecture.md §7）。
 *
 * 跨端复用边界：本文件不许 import React / react-native。
 * - RN 组件经 `./rn/attachmentCardModel.ts` 的 `Rn*` 别名转出；
 * - Web 组件（`./web/AttachmentChip.tsx`）直接 import 本文件。
 *
 * 旧数据只读适配：`media_job`（±jobId）按架构稿 §6/§12 渲染成附件卡，不迁移、不回填。
 */
import {
  attachmentKind,
  normalizeAttachmentPart,
  type AttachmentKind,
} from "ai/attachments/attachmentPart";

export type AttachmentCardState =
  | "ready"
  | "unreadable"
  | "degraded"
  | "unavailable"
  | "needs-upgrade";

export interface AttachmentCardModel {
  name: string;
  /** 人读副标题：`类型 · 大小`。 */
  meta: string;
  state: AttachmentCardState;
  /** 一句话状态；`ready` 时为 null。 */
  hint: string | null;
}

/** 旧媒体任务的 part 判别符（只读兼容；新任务不再写它）。 */
export const MEDIA_JOB_PART_TYPE = "media_job";

/** 媒体任务笔记的路由前缀（见 packages/app/web/routes.tsx 的 `media-jobs/:id`）。 */
export const MEDIA_JOB_ROUTE_PREFIX = "/media-jobs/";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const KIND_LABEL: Record<AttachmentKind, string> = {
  image: "图片",
  audio: "音频",
  video: "视频",
  document: "文档",
  text: "文本",
  archive: "压缩包",
  binary: "未知类型",
};

const formatSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
};

const displayNameOf = (part: unknown): string => {
  const name = isRecord(part) ? part.name : undefined;
  return typeof name === "string" && name.trim() ? name.trim() : "未命名文件";
};

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** 是不是旧 `media_job` part。 */
export const isMediaJobPart = (part: unknown): boolean =>
  isRecord(part) && part.type === MEDIA_JOB_PART_TYPE;

/**
 * 旧 `media_job` part 的任务 id（`jobId` 优先，兼容历史 `id`）。
 * 拿不到就是 null —— 调用方**不得**因此拼假链接。
 */
export const resolveLegacyMediaJobId = (part: unknown): string | null => {
  if (!isMediaJobPart(part)) return null;
  const record = part as Record<string, unknown>;
  return text(record.jobId) || text(record.id) || null;
};

/** 媒体任务笔记地址；jobId 为空 → null（不造链接）。 */
export const attachmentJobHref = (jobId: unknown): string | null => {
  const id = text(jobId);
  return id ? `${MEDIA_JOB_ROUTE_PREFIX}${id}` : null;
};

/**
 * 卡片可点击去处的 href：
 * - 旧 `media_job` 带任务 id → `/media-jobs/<id>`（复用既有路由）；
 * - 旧 `media_job` 无 id → null（只展示，不创建假链接）；
 * - `attachment` part → 目前无站内去处（下载/预览属后续阶段），null。
 */
export const resolveAttachmentCardHref = (part: unknown): string | null =>
  attachmentJobHref(resolveLegacyMediaJobId(part));

/** 按 kind 的固定口径提示（archive 明确「不解压」）。 */
const statementHintForKind = (kind: AttachmentKind): string | null => {
  if (kind === "archive") return "已保留原件，不会自动解压";
  return null;
};

const describeLegacyMediaJobCard = (part: unknown): AttachmentCardModel => {
  const record = part as Record<string, unknown>;
  const size = Number(record.size);
  return {
    name: displayNameOf(part),
    meta: ["媒体任务", formatSize(size)].filter(Boolean).join(" · "),
    state: "ready",
    hint: null,
  };
};

export const describeAttachmentCard = (part: unknown): AttachmentCardModel => {
  if (isMediaJobPart(part)) return describeLegacyMediaJobCard(part);

  const name = displayNameOf(part);
  const normalized = normalizeAttachmentPart(part);

  if (normalized.status === "unsupported-version") {
    return {
      name,
      meta: "未知版本附件",
      state: "needs-upgrade",
      hint: "此附件格式需要更新客户端",
    };
  }
  if (normalized.status !== "valid") {
    return { name, meta: "原件引用缺失", state: "unavailable", hint: "附件不可用" };
  }

  const attachment = normalized.attachment;
  const kind = attachmentKind(attachment);
  const meta = [KIND_LABEL[kind], formatSize(attachment.size)].filter(Boolean).join(" · ");
  const local = attachment.source.kind === "local-file";

  if (kind === "binary") {
    return {
      name: attachment.name,
      meta,
      state: "unreadable",
      hint: local ? "本机文件，无法读取内容" : "无法读取内容",
    };
  }
  if (local) {
    return {
      name: attachment.name,
      meta,
      state: "degraded",
      hint: "本机文件，仅在授权同机可读",
    };
  }
  const hint = statementHintForKind(kind);
  return { name: attachment.name, meta, state: hint ? "degraded" : "ready", hint };
};

/** 卡片是否代表「原件引用保留正常」；供测试与后续 UI 分支使用。 */
export const isAttachmentCardAddressable = (model: AttachmentCardModel): boolean =>
  model.state === "ready" || model.state === "degraded" || model.state === "unreadable";
