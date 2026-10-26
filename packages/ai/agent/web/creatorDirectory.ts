// packages/ai/agent/web/creatorDirectory.ts
//
// Explore「用户」栏目的纯聚合层：把公开 agent 列表按创作者（agent.userId）归并成
// 创作者目录条目。刻意不引网络请求、不引 React、无副作用——组件只负责渲染结果。

import { asOptionalTrimmedString } from "core/optionalString";
import { isRecord } from "core/isRecord";
import { toTimestampMs } from "core/timestamp";

export interface CreatorDirectoryEntry {
  userId: string;
  displayName: string;
  agentCount: number;
  totalUse: number;
  latestPublishedAtMs: number;
}

export interface CreatorDirectoryOptions {
  /** 最多返回多少个创作者条目；缺省/非法值表示不截断。 */
  limit?: number;
}

/**
 * 平台内置目录 agent 的占位 owner（见 agent-runtime/publicAgentSynthesis.ts：合成的
 * 公开 agent 一律 `userId: "system"`）。它没有真实创作者主页，必须排除，否则会冒出
 * 一个假的「system 创作者」卡片。
 */
const NON_CREATOR_USER_IDS = new Set(["system"]);

/** displayName 兜底时截取的 userId 前缀长度。 */
const CREATOR_ID_NAME_LENGTH = 8;

/** 名字来源优先级：数值越大越可信，用于同名创作者多条记录之间的择名与升级。 */
const NAME_PRIORITY = {
  /** 无名字，只有 userId 短码。 */
  placeholder: 0,
  /** 记录里的兼容性名字字段（userName/creatorName/creator.name）——多数记录没有。 */
  legacy: 1,
  /** 发布时写入的作者名快照（authorName）：唯一由发布端主动落库的真名。 */
  snapshot: 2,
} as const;

interface ResolvedRecordName {
  name: string;
  priority: number;
}

const resolveCreatorUserId = (record: Record<string, unknown>): string | undefined => {
  const userId = asOptionalTrimmedString(record.userId);
  if (!userId) return undefined;
  if (NON_CREATOR_USER_IDS.has(userId.toLowerCase())) return undefined;
  return userId;
};

/**
 * 解析单条记录上的创作者名字。
 *
 * 顺序（硬约束，改动需同步 creatorDirectory.test.ts）：
 *   authorName 快照 → userName / creatorName / creator.name → 无（调用方回退 userId 短码）
 */
const resolveRecordName = (
  record: Record<string, unknown>,
): ResolvedRecordName | undefined => {
  const snapshot = asOptionalTrimmedString(record.authorName);
  if (snapshot) return { name: snapshot, priority: NAME_PRIORITY.snapshot };

  const legacy =
    asOptionalTrimmedString(record.userName) ??
    asOptionalTrimmedString(record.creatorName);
  if (legacy) return { name: legacy, priority: NAME_PRIORITY.legacy };

  const creator = record.creator;
  if (isRecord(creator)) {
    const creatorName = asOptionalTrimmedString(creator.name);
    if (creatorName) return { name: creatorName, priority: NAME_PRIORITY.legacy };
  }
  return undefined;
};

const creatorIdPlaceholder = (userId: string) => userId.slice(0, CREATOR_ID_NAME_LENGTH);

/** 作品被使用量：agent.metrics.useCount（只统计有限非负数）。 */
const resolveUseCount = (record: Record<string, unknown>): number => {
  const metrics = record.metrics;
  if (!isRecord(metrics)) return 0;
  const useCount = metrics.useCount;
  if (typeof useCount !== "number" || !Number.isFinite(useCount) || useCount < 0) return 0;
  return useCount;
};

/** 最近发布时间：publishedAt 优先，缺失时退到 updatedAt / createdAt。 */
const resolvePublishedAtMs = (record: Record<string, unknown>): number =>
  toTimestampMs(record.publishedAt) ||
  toTimestampMs(record.updatedAt) ||
  toTimestampMs(record.createdAt);

const compareEntries = (a: CreatorDirectoryEntry, b: CreatorDirectoryEntry): number => {
  if (b.totalUse !== a.totalUse) return b.totalUse - a.totalUse;
  if (b.agentCount !== a.agentCount) return b.agentCount - a.agentCount;
  // 按码位比较而不是 localeCompare：排序结果不随运行环境的 ICU 数据漂移。
  if (a.displayName === b.displayName) return a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0;
  return a.displayName < b.displayName ? -1 : 1;
};

/**
 * 按创作者归并公开 agent 列表。
 *
 * displayName：authorName 快照 → 既有名字字段 → userId 前 8 位。
 * 排序：totalUse 降序 → agentCount 降序 → displayName 升序。
 * 排除：userId 为空/空白，以及平台内置的 "system" owner。
 */
export function buildCreatorDirectory(
  agents: readonly unknown[],
  { limit }: CreatorDirectoryOptions = {},
): CreatorDirectoryEntry[] {
  const byUserId = new Map<string, CreatorDirectoryEntry>();
  /** 已采用的 displayName 来自哪一级来源，决定后续记录能否覆盖它。 */
  const namePriorityByUserId = new Map<string, number>();

  for (const item of agents) {
    if (!isRecord(item)) continue;
    const userId = resolveCreatorUserId(item);
    if (!userId) continue;

    const useCount = resolveUseCount(item);
    const publishedAtMs = resolvePublishedAtMs(item);
    const existing = byUserId.get(userId);
    const resolvedName = resolveRecordName(item);
    const candidatePriority = resolvedName?.priority ?? NAME_PRIORITY.placeholder;
    const candidateName = resolvedName?.name ?? creatorIdPlaceholder(userId);

    if (!existing) {
      byUserId.set(userId, {
        userId,
        displayName: candidateName,
        agentCount: 1,
        totalUse: useCount,
        latestPublishedAtMs: publishedAtMs,
      });
      namePriorityByUserId.set(userId, candidatePriority);
      continue;
    }

    existing.agentCount += 1;
    existing.totalUse += useCount;
    if (publishedAtMs > existing.latestPublishedAtMs) {
      existing.latestPublishedAtMs = publishedAtMs;
    }
    // 先遇到的记录没名字（或只有兼容字段的名字）时，后面更可信的来源覆盖它：
    // 快照名 > 兼容名字字段 > userId 短码。
    const currentPriority = namePriorityByUserId.get(userId) ?? NAME_PRIORITY.placeholder;
    if (candidatePriority > currentPriority) {
      existing.displayName = candidateName;
      namePriorityByUserId.set(userId, candidatePriority);
    }
  }

  const entries = [...byUserId.values()].sort(compareEntries);
  if (typeof limit !== "number" || !Number.isFinite(limit)) return entries;
  return entries.slice(0, Math.max(0, Math.trunc(limit)));
}
