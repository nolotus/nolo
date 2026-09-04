import { chooseMemoryOwners, loadMemoryCandidatesFromDb } from "./queryShared";
import { adjustMemoryConfidenceInDb } from "./storeShared";
import { tokenize } from "./rank";
import type { MemoryItem } from "./types";

/**
 * 纠正驱动的置信度降级（ECC 式 "contradiction → confidence decay"）。
 *
 * 运行时注入记忆前会 touch（更新 lastActivatedAt = 检索时间戳）。当用户在
 * 紧随其后的回合里明确否定（"记错了""别再提这个"…），最近被检索进 overlay
 * 的记忆是被否定对象的候选集合。retrieval ≠ use——"最近被召回"只是曝光。
 *
 * 但「最近被召回」≠「被纠正」：一次回合可能检索多条记忆，真正被否定的
 * 通常只有其中一条。因此 penalty 前必须做保守 attribution（见
 * pickCorrectionTargets）：只有 identifier 强命中或内容高度相关的记忆
 * 才会降权；无法可靠归因时宁可漏掉这次纠正，也不错误惩罚无辜的长期记忆
 * （false negative ≫ false attribution——错误的 -0.2 连击 3~4 次就会把
 * 正确记忆打进 cold storage）。
 */

export const MEMORY_CORRECTION_PENALTY = -0.2;

/** 注入（retrieval）发生在同一回合内，窗口只需覆盖一次 LLM 往返。 */
const RECENT_RETRIEVAL_WINDOW_MS = 15 * 60 * 1000;

const CORRECTION_PATTERNS: RegExp[] = [
  /记错了?/u,
  /记反了?/u,
  /你记的?不对/u,
  /不是这样/u,
  /我没有?这?么?说过/u,
  /别再提/u,
  /不要再提/u,
  /别提这个/u,
  /不要提这个/u,
  /忘掉这/u,
  /忘了这/u,
  /那是以前/u,
  /已经不.{0,4}(了|再)/u,
  /don'?t bring (that|this) up/i,
  /you('| a)?re remembering (it |this |that )?wrong/i,
  /that'?s not what i said/i,
];

export const detectMemoryCorrection = (userInput: string): boolean => {
  const text = (userInput ?? "").trim();
  if (!text) return false;
  return CORRECTION_PATTERNS.some((pattern) => pattern.test(text));
};

const isRecentlyRetrieved = (item: MemoryItem, nowMs: number): boolean => {
  if ((item.activationCount ?? 0) <= 0) return false; // legacy 字段名 = 检索次数
  const retrievedMs = Date.parse(item.lastActivatedAt || ""); // legacy 字段名 = 检索时间
  if (!Number.isFinite(retrievedMs)) return false;
  return nowMs - retrievedMs <= RECENT_RETRIEVAL_WINDOW_MS;
};

/**
 * 用户输入里直接点名的标识（agent key / memory-noise id 等）。
 * 复用 rank.ts 的 tokenize；标识要求同时含字母和数字且长度 ≥4，
 * 避免纯数字或普通单词误命中。
 */
const extractMentionedIdentifiers = (userInput: string): string[] => {
  return tokenize(userInput).filter(
    (token) => token.length >= 4 && /[a-z]/.test(token) && /[0-9]/.test(token)
  );
};

const IDENTIFIER_CHARS = "[a-z0-9-]";

const itemMentionsIdentifier = (item: MemoryItem, identifier: string): boolean => {
  // 只在 content 上匹配 identifier——tags 是系统侧标签
  // （dialog-learning:pattern 之类），不属于用户可能"点名"的内容。
  // 用非捕获字符边界避免子串误命中（如 agent-x123 命中 agent-x1234）。
  const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `(?<!${IDENTIFIER_CHARS})${escaped}(?!${IDENTIFIER_CHARS})`,
    "i"
  );
  return regex.test(item.content.toLowerCase());
};

const itemText = (item: MemoryItem): string =>
  `${item.content} ${(item.tags ?? []).join(" ")}`;

/** 纠正输入里的通用套话 token，不应计入内容覆盖度。 */
const CORRECTION_NOISE_TOKENS = new Set([
  "你记错了", "记错了", "记反了", "错了", "不是这样", "根本没有", "忘了", "以前",
  "不是", "我用的是", "那条是以前的",
]);

/**
 * 内容覆盖度：记忆自身的 distinctive token 里，有多少比例出现在纠正输入里
 * （用户复述/点名了这条记忆的内容）。以记忆侧 token 数为分母——纠正输入通常
 * 很短且带有"你记错了"等通用噪声，用输入侧 token 数当分母会被严重稀释。
 * 复用 rank.ts 的 tokenize（含 CJK bigram），不再维护第二套规则。
 * 输入侧先剔除纠正套话 token，避免所有记忆都因为"错""以前"等字面上榜。
 */
const contentOverlap = (userInput: string, item: MemoryItem): number => {
  const itemTokens = new Set(
    tokenize(itemText(item)).filter((token) => token.length >= 2)
  );
  if (itemTokens.size === 0) return 0;
  const userTokens = new Set(
    tokenize(userInput).filter((token) => !CORRECTION_NOISE_TOKENS.has(token))
  );
  let matches = 0;
  for (const token of itemTokens) {
    if (userTokens.has(token)) matches += 1;
  }
  return matches / itemTokens.size;
};

/**
 * 保守 attribution gate：从"最近被召回"集合里挑出真正可能被纠正的目标。
 *
 * 规则（严格收窄，宁缺毋滥）：
 * 1. identifier 命中：用户点名的标识出现在候选内容里 → 只罚这些。
 *    identifier 是强信号；点了名却没有任何候选提到它 → 无法归因，不罚。
 * 2. 无 identifier：内容覆盖度足够高且明显领先第二名 → 只罚第一名。
 *    （避免"多条都沾边"时连坐。）
 * 3. 以上都不满足 → 空集合：detected=true 但没人受罚。
 */
const MIN_ATTRIBUTION_OVERLAP = 0.09;
const ATTRIBUTION_MARGIN = 0.05;

export const pickCorrectionTargets = (
  recentlyRetrieved: MemoryItem[],
  userInput: string
): MemoryItem[] => {
  if (recentlyRetrieved.length === 0) return [];

  const identifiers = extractMentionedIdentifiers(userInput);
  if (identifiers.length > 0) {
    const matched = recentlyRetrieved.filter((item) =>
      identifiers.some((id) => itemMentionsIdentifier(item, id))
    );
    if (matched.length > 0) return matched;
    // 输入里点了 identifier 但没有任何候选提到它——无法归因，不罚。
    return [];
  }

  const scored = recentlyRetrieved
    .map((item) => ({ item, overlap: contentOverlap(userInput, item) }))
    .sort((a, b) => b.overlap - a.overlap);

  const top = scored[0];
  const second = scored[1];
  if (
    top &&
    top.overlap >= MIN_ATTRIBUTION_OVERLAP &&
    (!second || top.overlap - second.overlap >= ATTRIBUTION_MARGIN)
  ) {
    return [top.item];
  }
  return [];
};

export interface PenalizeCorrectedMemoriesResult {
  detected: boolean;
  penalizedItems: MemoryItem[];
}

export const penalizeCorrectedMemories = async (input: {
  db: any;
  userId?: string | null;
  spaceId?: string | null;
  agentKey: string;
  memorySubjectId?: string | null;
  userInput: string;
  now?: number;
}): Promise<PenalizeCorrectedMemoriesResult> => {
  if (!detectMemoryCorrection(input.userInput)) {
    return { detected: false, penalizedItems: [] };
  }

  const owners = chooseMemoryOwners({
    userId: input.userId,
    spaceId: input.spaceId,
  });
  if (owners.length === 0) {
    return { detected: true, penalizedItems: [] };
  }

  const candidates = await loadMemoryCandidatesFromDb(input.db, {
    owners,
    subjects: [
      {
        subjectType: "agent",
        subjectId: input.memorySubjectId?.trim() || input.agentKey,
      },
    ],
    kinds: ["episodic", "semantic", "procedural"],
    ownerLimit: 40,
    ownerFallback: "always",
  });

  const nowMs = input.now ?? Date.now();
  const recentlyRetrieved = candidates.filter((item) =>
    isRecentlyRetrieved(item, nowMs)
  );
  if (recentlyRetrieved.length === 0) {
    return { detected: true, penalizedItems: [] };
  }

  // 关键：只惩罚能高置信归因的目标；无法定位时宁可不罚。
  const targets = pickCorrectionTargets(recentlyRetrieved, input.userInput);
  if (targets.length === 0) {
    return { detected: true, penalizedItems: [] };
  }

  const penalizedItems = await adjustMemoryConfidenceInDb(
    input.db,
    targets,
    MEMORY_CORRECTION_PENALTY
  );
  return { detected: true, penalizedItems };
};
