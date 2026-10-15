/**
 * 空间文件版本语义（纯函数，便于测试）。
 *
 * 模型：同一空间内同名（originalName）文件 = 一个逻辑文件。
 * - 空间条目的 map key === entry.contentKey === 当前版本的 file-* 记录 key
 *   （保持 contents[contentKey] 不变式，现有 move/pin/delete/title 动作无需改）。
 * - entry.versions[]：全部版本（含当前），每项 {fileKey, sha256, size, uploadedAt}。
 * - 新版本 / 恢复旧版 = 在同一个 patch 里把旧 map key 置 null、写入新 key（原子 re-key）。
 * - 旧版本的 file 记录与 blob 从不删除，因此恢复无需重新上传。
 */
import type { SpaceContent } from "app/types";

export interface SpaceFileVersion {
  fileKey: string;
  sha256: string;
  size: number;
  uploadedAt: number;
  restoredFrom?: string;
}

export type VersionedSpaceContent = SpaceContent & {
  versions?: SpaceFileVersion[];
  currentVersionKey?: string;
};

export const normalizeFileName = (name: unknown): string =>
  typeof name === "string" ? name.trim().normalize("NFC") : "";

export const versionsOf = (
  entryKey: string,
  entry: VersionedSpaceContent,
): SpaceFileVersion[] => {
  if (Array.isArray(entry.versions) && entry.versions.length > 0) {
    return entry.versions.filter((v) => v && typeof v.fileKey === "string");
  }
  // 旧条目（无版本信息）：自身视为唯一版本。sha256 未知时为空串。
  return [
    {
      fileKey: entry.contentKey || entryKey,
      sha256: (entry as any).sha256 || "",
      size: typeof entry.fileSize === "number" ? entry.fileSize : 0,
      uploadedAt: typeof entry.createdAt === "number" ? entry.createdAt : 0,
    },
  ];
};

/** 找出同空间同名的文件条目（可能因并发上传出现多个）。 */
export const findSameNameFileEntries = (
  contents: Record<string, SpaceContent | null> | undefined,
  originalName: string,
): Array<{ entryKey: string; entry: VersionedSpaceContent }> => {
  const target = normalizeFileName(originalName);
  if (!target || !contents) return [];
  return Object.entries(contents)
    .filter(([, value]) => Boolean(value))
    .map(([entryKey, value]) => ({ entryKey, entry: value as VersionedSpaceContent }))
    .filter(
      ({ entry }) =>
        entry.type === "file" &&
        normalizeFileName(entry.originalName ?? entry.title) === target,
    );
};

const sortVersions = (versions: SpaceFileVersion[]) =>
  [...versions].sort(
    (a, b) => a.uploadedAt - b.uploadedAt || a.fileKey.localeCompare(b.fileKey),
  );

/**
 * 合并同名条目的版本（并集，按 fileKey 去重，按上传时间 + key 确定性排序）。
 * 确定性很重要：两个并发客户端各自 reconcile 会写出同一个结果。
 */
export const mergeVersions = (
  groups: Array<{ entryKey: string; entry: VersionedSpaceContent }>,
): SpaceFileVersion[] => {
  const byKey = new Map<string, SpaceFileVersion>();
  for (const { entryKey, entry } of groups) {
    for (const v of versionsOf(entryKey, entry)) {
      const prev = byKey.get(v.fileKey);
      if (!prev || (!prev.sha256 && v.sha256)) byKey.set(v.fileKey, v);
    }
  }
  return sortVersions([...byKey.values()]);
};

export type UploadPlan =
  | { kind: "new_file" }
  | { kind: "unchanged"; entryKey: string; currentKey: string }
  | { kind: "restore_existing"; entryKey: string; versionKey: string }
  | { kind: "new_version"; entryKey: string };

/** 决定一次同名上传如何处理；sha256 相同即不新增版本、不上传。 */
export const planSpaceFileUpload = (
  contents: Record<string, SpaceContent | null> | undefined,
  originalName: string,
  sha256: string,
): UploadPlan => {
  const same = findSameNameFileEntries(contents, originalName);
  if (same.length === 0) return { kind: "new_file" };
  const primary = pickPrimary(same);
  const current = primary.entry.contentKey || primary.entryKey;
  const versions = mergeVersions(same);
  const currentVersion = versions.find((v) => v.fileKey === current);
  if (currentVersion?.sha256 && currentVersion.sha256 === sha256) {
    return { kind: "unchanged", entryKey: primary.entryKey, currentKey: current };
  }
  const older = versions.find((v) => v.sha256 && v.sha256 === sha256);
  if (older) {
    return { kind: "restore_existing", entryKey: primary.entryKey, versionKey: older.fileKey };
  }
  return { kind: "new_version", entryKey: primary.entryKey };
};

/** 多个同名条目时取当前版本最新的那个作为主条目。 */
export const pickPrimary = (
  same: Array<{ entryKey: string; entry: VersionedSpaceContent }>,
) =>
  [...same].sort((a, b) => {
    const at = Math.max(...versionsOf(a.entryKey, a.entry).map((v) => v.uploadedAt));
    const bt = Math.max(...versionsOf(b.entryKey, b.entry).map((v) => v.uploadedAt));
    return bt - at || b.entryKey.localeCompare(a.entryKey);
  })[0];

/**
 * 生成「把同名条目收敛为一个、以 currentKey 为当前版本」的 contents patch。
 * 其余同名 map key 置 null（deepMerge 语义：null 删除键），版本全部保留。
 */
export const buildVersionedEntryPatch = (input: {
  same: Array<{ entryKey: string; entry: VersionedSpaceContent }>;
  extraVersion?: SpaceFileVersion;
  currentKey?: string;
  now: number;
  restoredFrom?: string;
}): Record<string, VersionedSpaceContent | null> => {
  const { same, extraVersion, now } = input;
  const versions = mergeVersions(
    extraVersion
      ? [...same, { entryKey: extraVersion.fileKey, entry: { versions: [extraVersion] } as any }]
      : same,
  );
  const currentKey = input.currentKey ?? versions[versions.length - 1].fileKey;
  const current = versions.find((v) => v.fileKey === currentKey);
  if (!current) throw new Error(`Version ${currentKey} not found for this file.`);
  const template = same.length > 0 ? pickPrimary(same).entry : ({} as VersionedSpaceContent);
  const patch: Record<string, VersionedSpaceContent | null> = {};
  for (const { entryKey } of same) {
    if (entryKey !== currentKey) patch[entryKey] = null;
  }
  patch[currentKey] = {
    ...template,
    contentKey: currentKey,
    currentVersionKey: currentKey,
    fileSize: current.size,
    versions,
    updatedAt: now,
    ...(input.restoredFrom ? { restoredFromVersionKey: input.restoredFrom } : {}),
  } as VersionedSpaceContent;
  return patch;
};

export const sha256Hex = async (file: Blob): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};
