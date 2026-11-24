// create/space/epub/epubProgress.ts
//
// 阅读进度（v1：章级精度）：每个用户 × 每本书一条 `user-pref-<userId>-epub_progress_<fileId>` 记录，
// 沿用仓库既有的「用户级寄存器」key 命名空间（owner 由 key 推出，服务端写权限同口径）。
// 只存章节序号：宿主 CSP 没有 unsafe-inline，章节 iframe 里跑不了桥接脚本，
// 拿不到章内滚动位置，也不放宽整站 CSP。
// 纯函数部分（key / 记录构造 / 解析）与 React、Redux 解耦，便于单测。
import { DataType } from "create/types";
import { createUserPreferenceKey } from "database/keys";

export const EPUB_PROGRESS_PREFERENCE_PREFIX = "epub_progress_";

export interface EpubProgress {
  /** spine 下标 */
  chapterIndex: number;
}

/** contentKey 形如 file-<userId>-<ULID>；取最后一段（ULID 不含连字符）作为书的稳定 id。 */
export const epubBookId = (contentKey: string): string => {
  const trimmed = contentKey.trim();
  const last = trimmed.slice(trimmed.lastIndexOf("-") + 1);
  return last || trimmed;
};

export const buildEpubProgressKey = (userId: string, contentKey: string): string =>
  createUserPreferenceKey.single(
    userId,
    `${EPUB_PROGRESS_PREFERENCE_PREFIX}${epubBookId(contentKey)}`
  );

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const normalizeEpubProgress = (
  progress: EpubProgress,
  spineLength: number
): EpubProgress => ({
  chapterIndex: clamp(Math.trunc(progress.chapterIndex) || 0, 0, Math.max(0, spineLength - 1)),
});

export const buildEpubProgressRecord = ({
  userId,
  contentKey,
  progress,
  previousRecord,
  now = Date.now(),
}: {
  userId: string;
  contentKey: string;
  progress: EpubProgress;
  previousRecord?: { createdAt?: unknown } | null;
  now?: number;
}) => {
  const previousCreatedAt = Number(previousRecord?.createdAt);
  return {
    type: DataType.SETTING,
    registerType: "user_preference" as const,
    preferenceName: `${EPUB_PROGRESS_PREFERENCE_PREFIX}${epubBookId(contentKey)}`,
    schemaVersion: 1 as const,
    userId,
    value: { chapterIndex: progress.chapterIndex },
    createdAt: Number.isFinite(previousCreatedAt) && previousCreatedAt > 0 ? previousCreatedAt : now,
    updatedAt: now,
  };
};

export interface LoadedEpubProgress {
  progress: EpubProgress;
  /** 已有记录的 createdAt；保存时回传给 buildEpubProgressRecord，避免首次保存覆盖它。 */
  previousRecord: { createdAt: number } | null;
}

/**
 * 读回记录：位置按书的章节数收敛，同时带回 createdAt。
 * 记录缺失 / 形状不对返回 null（从头读）。
 */
export const loadEpubProgressRecord = (
  record: unknown,
  spineLength: number
): LoadedEpubProgress | null => {
  if (!record || typeof record !== "object") return null;
  const { value, createdAt } = record as { value?: unknown; createdAt?: unknown };
  if (!value || typeof value !== "object") return null;
  const { chapterIndex } = value as Record<string, unknown>;
  if (typeof chapterIndex !== "number" || !Number.isFinite(chapterIndex)) return null;
  const created = Number(createdAt);
  return {
    progress: normalizeEpubProgress({ chapterIndex }, spineLength),
    previousRecord: Number.isFinite(created) && created > 0 ? { createdAt: created } : null,
  };
};
