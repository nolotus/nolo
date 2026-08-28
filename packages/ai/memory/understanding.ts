/**
 * Understanding memory：从对话里沉淀「这个用户是谁、想要什么」。
 *
 * 抽取本身已移到 `understandingLlm.ts`（LLM 语义判断）。本模块只负责写入侧的
 * 决策：归属谁、是否重复、episodic 何时升级为 semantic。
 *
 * 历史：抽取原本是一大块中文正则（`[你我](?:更)?喜欢(.+)` 之类），召回率完全
 * 取决于模式表覆盖了哪些措辞——「请记得」漏掉、英文归零，而且漏掉时没有任何
 * 信号。判据放错了层，所以整块换掉，产出结构保持不变。
 */

import { createMemoryItem, writeMemoryItemWithIndexesToDb } from "./storeShared";
import { loadMemoryCandidatesFromDb } from "./queryShared";
import { buildAgentSubjectTarget, resolveUserOrSpaceMemoryTarget } from "./scope";
import {
  UNDERSTANDING_TAG,
  extractUnderstandingMemoryCandidates,
  type UnderstandingLlmCall,
  type UnderstandingMemoryCandidate,
} from "./understandingLlm";
import type { MemoryItem, MemoryOwnerRef, MemoryVisibility } from "./types";

export { UNDERSTANDING_TAG };
export type { UnderstandingMemoryCandidate };

/**
 * 极短输入不值得花一次 LLM 调用：「好的」「继续」「谢谢」这类回合不可能携带
 * 稳定偏好信号。按长度过滤是语言无关的，不像语义关键词表那样需要穷举——这是
 * 保留字符级判断的唯一一处，因为它判断的是「有没有内容」而不是「内容是什么」。
 */
const MIN_EXTRACTABLE_INPUT_CHARS = 8;

const buildUnderstandingTarget = (input: {
  userId?: string | null;
  spaceId?: string | null;
  agentKey: string;
  memorySubjectId?: string | null;
}): {
  owner: MemoryOwnerRef;
  visibility: MemoryVisibility;
  subjectType: "agent";
  subjectId: string;
} | null => {
  const target = resolveUserOrSpaceMemoryTarget(input);
  return target
    ? buildAgentSubjectTarget(
        target,
        input.memorySubjectId?.trim() || input.agentKey,
      )
    : null;
};

const sameUnderstanding = (
  item: MemoryItem,
  candidate: UnderstandingMemoryCandidate,
  agentKey: string
) =>
  item.subjectType === "agent" &&
  item.subjectId === agentKey &&
  item.patternKey === candidate.patternKey;

export const captureUnderstandingMemoryFromDialog = async (input: {
  db: any;
  userId?: string | null;
  spaceId?: string | null;
  agentKey: string;
  memorySubjectId?: string | null;
  dialogId: string;
  userInput: string;
  trace?: Array<{ role?: string; content?: unknown }>;
  /** 抽取用的 LLM 调用；缺失则跳过（没有正则兜底了）。 */
  llmCall?: UnderstandingLlmCall;
}): Promise<void> => {
  if (!input.llmCall) return;
  if ((input.userInput ?? "").trim().length < MIN_EXTRACTABLE_INPUT_CHARS) return;

  const target = buildUnderstandingTarget(input);
  if (!target) return;

  const candidates = await extractUnderstandingMemoryCandidates({
    userInput: input.userInput,
    trace: input.trace,
    llmCall: input.llmCall,
  });
  if (candidates.length === 0) return;

  const existing = await loadMemoryCandidatesFromDb(input.db, {
    owners: [target.owner],
    subjects: [{ subjectType: target.subjectType, subjectId: target.subjectId }],
    kinds: ["episodic", "semantic"],
    ownerLimit: 100,
  });

  for (const candidate of candidates) {
    const sameItems = existing.filter((item) =>
      sameUnderstanding(
        item,
        candidate,
        input.memorySubjectId?.trim() || input.agentKey,
      ),
    );
    const existingSemantic = sameItems.find((item) => item.kind === "semantic");
    if (existingSemantic) continue;

    const existingEpisode = sameItems.find((item) => item.kind === "episodic");
    // 同一信号在另一个 dialog 里再次出现 → 从「那次这么说过」升级为「这个人就是这样」。
    if (
      existingEpisode &&
      existingEpisode.sourceDialogId &&
      existingEpisode.sourceDialogId !== input.dialogId
    ) {
      const semantic = createMemoryItem({
        ownerType: target.owner.ownerType,
        ownerId: target.owner.ownerId,
        visibility: target.visibility,
        subjectType: target.subjectType,
        subjectId: target.subjectId,
        kind: "semantic",
        content: candidate.content,
        facet: candidate.facet,
        importance: Math.min(0.95, candidate.importance + 0.03),
        confidence: Math.min(0.86, candidate.confidence + 0.06),
        tags: [...candidate.tags, "consolidated-understanding"],
        patternKey: candidate.patternKey,
        sourceDialogId: input.dialogId,
      });
      await writeMemoryItemWithIndexesToDb(input.db, semantic);
      existing.push(semantic);
      continue;
    }

    if (existingEpisode && existingEpisode.sourceDialogId === input.dialogId) {
      continue;
    }

    const episodic = createMemoryItem({
      ownerType: target.owner.ownerType,
      ownerId: target.owner.ownerId,
      visibility: target.visibility,
      subjectType: target.subjectType,
      subjectId: target.subjectId,
      kind: "episodic",
      content: candidate.content,
      facet: candidate.facet,
      importance: candidate.importance,
      confidence: candidate.confidence,
      tags: candidate.tags,
      patternKey: candidate.patternKey,
      sourceDialogId: input.dialogId,
    });
    await writeMemoryItemWithIndexesToDb(input.db, episodic);
    existing.push(episodic);
  }
};
