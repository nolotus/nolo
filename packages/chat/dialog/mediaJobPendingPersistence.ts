// File: chat/dialog/mediaJobPendingPersistence.ts
// localStorage 镜像层：把 `PendingFile.type === "media_job"` 的附件引用按
// dialog 分组持久化，使 dialogRuntimeStore（纯内存模块 store，Wave9/13 起无
// 任何持久化）在页面刷新 / 重新进入对话后能恢复媒体任务卡片——报价、进度、
// 「打开笔记」、续跑按钮都靠卡片自身轮询 `/api/media-jobs/<id>` 实时取数，
// 本地只需保存「渲染哪张卡」的引用（jobId + 文件名 + 所属 dialog）。
// 只存引用，不存任务状态；任务真相在后端。
//
// 【账号隔离】同一浏览器可能被多个账号先后登录（共享浏览器 / 切换账号）。存储
// 按 actor（当前 userId）顶层分桶：每个 actor 一份私有命名空间，读写只触碰
// 「当前 actor」那一份，从根上杜绝恢复/显示出他人的课程文件名或任务引用。

import {
  readStorageJSON,
  writeStorageJSON,
} from "app/utils/localStorageState";
import { GLOBAL_DIALOG_RUNTIME_KEY } from "./dialogRuntimeTypes";

/**
 * 存储键（localStorage）。值形如
 * `{ [actorKey]: { [dialogKey]: MediaJobPendingEntry[] } }`——外层按 actor
 * 隔离，内层沿用 dialog 分桶。
 */
export const MEDIA_JOB_PENDING_STORAGE_KEY = "nolo:chat:media-job-pending:v1";

/**
 * 每个 dialog 最多保留的媒体任务卡片引用数。
 * 收敛策略：终态（done/failed/cancelled）卡片只是「回访入口」，10 条足够覆盖
 * 近期任务；更旧的直接淘汰，避免刷新后附件栏被历史卡片埋掉。恢复/新增都按
 * savedAt 做 LRU（恢复即刷新 savedAt）。
 */
export const MEDIA_JOB_PENDING_KEEP_PER_DIALOG = 10;

export interface MediaJobPendingEntry {
  /** jobId，同时用作 PendingFile.id。 */
  id: string;
  name: string;
  fileKey?: string;
  mimeType?: string;
  size?: number;
  durationSec?: number;
  /** 上传时所在 dialog 的 runtime key（undefined 归一成 GLOBAL_DIALOG_RUNTIME_KEY）。 */
  dialogKey?: string;
  /** LRU 时间戳（毫秒）。 */
  savedAt: number;
}

interface MediaJobPendingMap {
  [dialogKey: string]: MediaJobPendingEntry[];
}
interface MediaJobPendingStore {
  [actorKey: string]: MediaJobPendingMap;
}

// ---- actor（当前 userId）隔离 ----
// 由 dialogRuntimeStore.setMediaJobRuntimeActor 在登录态 / 账号切换时更新；
// 未设置（首次加载、匿名）时归入 "anon" 桶。测试可经 setMediaJobPendingActor
// 直接注入以验证隔离。
let currentActorId: string | null = null;
export function setMediaJobPendingActor(actorId: string | null): void {
  currentActorId = actorId && actorId.length > 0 ? actorId : null;
}
export function getMediaJobPendingActor(): string | null {
  return currentActorId;
}
/** actor 私有前缀。anon 兜底桶只在未登录/未设置时存在。 */
const actorKey = (): string => `@${currentActorId ?? "anon"}`;

const bucketKeyOf = (dialogKey?: string | null): string =>
  dialogKey ?? GLOBAL_DIALOG_RUNTIME_KEY;

const isEntry = (value: unknown): value is MediaJobPendingEntry => {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<MediaJobPendingEntry>;
  return (
    typeof entry.id === "string" &&
    entry.id.length > 0 &&
    typeof entry.name === "string"
  );
};

/** 读取整个 localStorage 存储（所有 actor 分桶）。损坏/非对象 → {}。 */
const readAllActors = (): MediaJobPendingStore => {
  const raw = readStorageJSON<unknown>(MEDIA_JOB_PENDING_STORAGE_KEY);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as MediaJobPendingStore;
};

/** 把当前 actor 的分桶写回，其它 actor 的分桶原样保留。 */
const writeActorMap = (map: MediaJobPendingMap): void => {
  const all = readAllActors();
  all[actorKey()] = map;
  writeStorageJSON(MEDIA_JOB_PENDING_STORAGE_KEY, all);
};

/**
 * 读取并校验「当前 actor」的本地镜像；损坏/越界的数据静默忽略。只读当前
 * actor 一份，绝不返回他人的数据。
 */
export function readMediaJobPendingMap(): MediaJobPendingMap {
  const scoped = readAllActors()[actorKey()];
  if (!scoped || typeof scoped !== "object" || Array.isArray(scoped)) return {};
  const map: MediaJobPendingMap = {};
  for (const [dialogKey, entries] of Object.entries(scoped)) {
    if (!Array.isArray(entries)) continue;
    const valid = entries.filter(isEntry).map((entry) => ({
      id: entry.id,
      name: entry.name,
      fileKey: typeof entry.fileKey === "string" ? entry.fileKey : undefined,
      mimeType: typeof entry.mimeType === "string" ? entry.mimeType : undefined,
      size: typeof entry.size === "number" ? entry.size : undefined,
      durationSec: typeof entry.durationSec === "number" ? entry.durationSec : undefined,
      savedAt:
        typeof entry.savedAt === "number" && Number.isFinite(entry.savedAt)
          ? entry.savedAt
          : 0,
    }));
    if (valid.length) map[dialogKey] = valid;
  }
  return map;
}

/**
 * 新增/刷新当前 actor 的一个媒体任务引用（同 id 去重并顺移到 LRU 末端），随后把
 * 该 dialog 的条目收敛到最近 MEDIA_JOB_PENDING_KEEP_PER_DIALOG 条。
 */
export function upsertMediaJobPendingEntry(
  entry: Omit<MediaJobPendingEntry, "savedAt">,
): void {
  const map = readMediaJobPendingMap();
  const dialogKey = bucketKeyOf(entry.dialogKey);
  const kept = (map[dialogKey] ?? []).filter((item) => item.id !== entry.id);
  kept.push({ ...entry, savedAt: Date.now() });
  map[dialogKey] = kept.slice(-MEDIA_JOB_PENDING_KEEP_PER_DIALOG);
  writeActorMap(map);
}

/** 按 jobId 从当前 actor 的所有 dialog 分组中移除（删除卡片 / 取消无产物 / 后端 404/403）。 */
export function removeMediaJobPendingEntryById(id: string): void {
  const map = readMediaJobPendingMap();
  let changed = false;
  for (const [dialogKey, entries] of Object.entries(map)) {
    const kept = entries.filter((entry) => entry.id !== id);
    if (kept.length !== entries.length) {
      changed = true;
      if (kept.length) map[dialogKey] = kept;
      else delete map[dialogKey];
    }
  }
  if (changed) writeActorMap(map);
}

/** 清空当前 actor 的某 dialog（或 all：抹掉所有 actor 分桶）——与 clearPendingAttachments 对齐。 */
export function clearMediaJobPendingEntries(payload?: {
  dialogKey?: string | null;
  all?: boolean;
}): void {
  if (payload?.all) {
    // 全清：抹掉所有 actor 的分桶（登出/测试 reset 用）。
    writeStorageJSON(MEDIA_JOB_PENDING_STORAGE_KEY, {});
    return;
  }
  const dialogKey = bucketKeyOf(payload?.dialogKey);
  const map = readMediaJobPendingMap();
  if (!(dialogKey in map)) return;
  delete map[dialogKey];
  writeActorMap(map);
}

/** 把当前 actor 某 dialog 的引用收敛到最近 N 条（按 savedAt 升序保留末端）。 */
export function pruneMediaJobPendingEntries(
  dialogKey?: string | null,
  keep: number = MEDIA_JOB_PENDING_KEEP_PER_DIALOG,
): void {
  const key = bucketKeyOf(dialogKey);
  const map = readMediaJobPendingMap();
  const entries = map[key];
  if (!entries || entries.length <= keep) return;
  map[key] = entries.slice(-keep);
  writeActorMap(map);
}
