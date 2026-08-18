import { chooseMemoryOwners, loadMemoryCandidatesFromDb } from "./queryShared";
import { adjustMemoryConfidenceInDb } from "./storeShared";
import type { MemoryItem } from "./types";

/**
 * 纠正驱动的置信度降级（ECC 式 "contradiction → confidence decay"）。
 *
 * 运行时注入记忆前会 touch（更新 lastActivatedAt）。当用户在紧随其后的
 * 回合里明确否定（"记错了""别再提这个"…），最近激活的那批记忆就是被
 * 否定对象的高概率集合：对它们统一降 confidence，低于使用阈值后会被
 * 冷藏（不再进入检索），不删除原始记录。
 */

export const MEMORY_CORRECTION_PENALTY = -0.2;

/** 注入发生在同一回合内，窗口只需覆盖一次 LLM 往返。 */
const RECENT_ACTIVATION_WINDOW_MS = 15 * 60 * 1000;

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

const isRecentlyActivated = (item: MemoryItem, nowMs: number): boolean => {
  if ((item.activationCount ?? 0) <= 0) return false;
  const activatedMs = Date.parse(item.lastActivatedAt || "");
  if (!Number.isFinite(activatedMs)) return false;
  return nowMs - activatedMs <= RECENT_ACTIVATION_WINDOW_MS;
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
  const targets = candidates.filter((item) => isRecentlyActivated(item, nowMs));
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
