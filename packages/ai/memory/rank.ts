import type { MemoryItem, MemoryOwnerRef, MemorySubjectRef } from "./types";

const CJK_SEQUENCE_REGEX = /[\u3400-\u4dbf\u4e00-\u9fff]+/g;
const MEMORY_IDENTIFIER_REGEX = /\b(?:memory|noise)-[a-z0-9][a-z0-9-]*/gi;

const buildCjkTokens = (text: string): string[] => {
  const sequences = text.match(CJK_SEQUENCE_REGEX) ?? [];
  const tokens: string[] = [];

  for (const sequence of sequences) {
    if (sequence.length >= 2) {
      tokens.push(sequence);
    }
    for (let index = 0; index < sequence.length - 1; index += 1) {
      tokens.push(sequence.slice(index, index + 2));
    }
  }

  return tokens;
};

export const tokenize = (text: string): string[] => {
  const normalized = text.toLowerCase();
  const wordTokens = normalized
    .split(/[\s,.;:!?()[\]{}"'`，。！？：；、]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  return [...wordTokens, ...buildCjkTokens(normalized)];
};

const keywordScore = (query: string, item: MemoryItem): number => {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return 0;
  const haystack = new Set([
    ...tokenize(item.content),
    ...(item.tags ?? []).map((tag) => tag.toLowerCase()),
    item.patternKey?.toLowerCase() ?? "",
  ]);
  let matches = 0;
  for (const token of queryTokens) {
    if (haystack.has(token)) matches += 1;
  }
  return Math.min(1, matches / Math.max(2, queryTokens.size));
};

const identifierScore = (query: string, item: MemoryItem): number => {
  const identifiers = query.match(MEMORY_IDENTIFIER_REGEX) ?? [];
  if (identifiers.length === 0) return 0;
  const content = item.content.toLowerCase();
  const matches = identifiers.filter((identifier) =>
    content.includes(identifier.toLowerCase())
  ).length;
  return matches / identifiers.length;
};

/**
 * 写入后一直没被真正召回过的记忆，超过这个天数开始降权。
 * 新写入的记忆 lastActivatedAt === createdAt，recency 满分，会靠"新鲜"挤掉
 * 真正长期有用的旧偏好；但它到底有没有用，要看它后来有没有被激活。
 * 实测：库里 34 条 activationCount=0 的僵尸记忆全是工程类一次性条目。
 */
const UNPROVEN_MEMORY_GRACE_DAYS = 3;

const activationScore = (item: MemoryItem, nowMs: number): number => {
  const lastActivatedMs = Date.parse(item.lastActivatedAt || item.createdAt);
  const ageDays = Math.max(0, (nowMs - lastActivatedMs) / 86_400_000);
  const recency = 1 / (1 + ageDays / 7);
  const reinforcement = Math.min(1, Math.log1p(item.activationCount ?? 0) / 3);
  const base = 0.7 * recency + 0.3 * reinforcement;

  // 过了宽限期仍零激活 = 写进来就没人用过，逐步让位给被反复用到的记忆。
  // 用创建时间判断（lastActivatedAt 对未激活条目恒等于 createdAt，无法区分）。
  if ((item.activationCount ?? 0) === 0) {
    const createdAgeDays = Math.max(
      0,
      (nowMs - Date.parse(item.createdAt)) / 86_400_000
    );
    if (createdAgeDays > UNPROVEN_MEMORY_GRACE_DAYS) {
      const overdue = createdAgeDays - UNPROVEN_MEMORY_GRACE_DAYS;
      // 半衰期 7 天，最低压到 30%——降权而非封杀，仍可被强关键词命中救回
      return base * Math.max(0.3, 1 / (1 + overdue / 7));
    }
  }
  return base;
};

const creationRecencyScore = (item: MemoryItem, nowMs: number): number => {
  const createdMs = Date.parse(item.createdAt);
  const ageDays = Math.max(0, (nowMs - createdMs) / 86_400_000);
  return 1 / (1 + ageDays / 7);
};

const typeFitScore = (item: MemoryItem): number => {
  if (item.kind === "episodic") return 0.75;
  if (item.kind === "semantic") return 0.9;
  return 0.85;
};

const understandingScore = (item: MemoryItem): number => {
  if (!item.tags?.includes("understanding-memory")) return 0;
  if (item.facet === "unfinished") return 1;
  if (item.facet === "tension") return 0.95;
  if (item.facet === "preference") return 0.85;
  if (item.facet === "style") return 0.75;
  return 0.8;
};

export interface MemoryRankContext {
  currentOwner?: MemoryOwnerRef | null;
  currentSubject?: MemorySubjectRef | null;
}

const pathScore = (item: MemoryItem, context?: MemoryRankContext): number => {
  let score = 0;
  if (
    context?.currentOwner &&
    item.ownerType === context.currentOwner.ownerType &&
    item.ownerId === context.currentOwner.ownerId
  ) {
    score += 0.65;
  }
  if (
    context?.currentSubject &&
    item.subjectType === context.currentSubject.subjectType &&
    item.subjectId === context.currentSubject.subjectId
  ) {
    score += 0.85;
  }
  return Math.min(1, score);
};

export const scoreMemoryItem = (
  item: MemoryItem,
  query: string,
  nowMs = Date.now(),
  context?: MemoryRankContext
): number => {
  const queryMatch = keywordScore(query, item);
  const identifierMatch = identifierScore(query, item);
  const activation = activationScore(item, nowMs);
  const createdRecency = creationRecencyScore(item, nowMs);
  const importance = item.importance ?? 0;
  const confidence = item.confidence ?? 0;
  const typeFit = typeFitScore(item);
  const understanding = understandingScore(item);
  const path = pathScore(item, context);
  return (
    0.25 * queryMatch +
    0.2 * identifierMatch +
    0.2 * path +
    0.09 * activation +
    0.16 * createdRecency +
    0.06 * importance +
    0.03 * confidence +
    0.02 * typeFit +
    0.01 * understanding
  );
};

export const rankMemoryCandidates = (
  items: MemoryItem[],
  query: string,
  context?: MemoryRankContext
): MemoryItem[] => {
  const nowMs = Date.now();
  return [...items].sort((a, b) => {
    const aExplicit = a.sourceKind === "explicit-user-directive";
    const bExplicit = b.sourceKind === "explicit-user-directive";
    if (aExplicit !== bExplicit) return bExplicit ? 1 : -1;

    if (aExplicit) {
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    }

    return (
      scoreMemoryItem(b, query, nowMs, context) -
      scoreMemoryItem(a, query, nowMs, context)
    );
  });
};
