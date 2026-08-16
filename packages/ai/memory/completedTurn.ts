import {
  captureExplicitMemoryEpisode,
  scheduleExplicitMemoryConsolidation,
} from "./capture";
import { penalizeCorrectedMemories } from "./correction";
import { rememberMemory, type RememberMemoryScope } from "./remember";
import { captureUnderstandingMemoryFromDialog } from "./understanding";
import { captureDialogLearnings, type DialogLearningLlmCall } from "./dialogLearning";
import { getMemorySourceKind } from "./source";
import type {
  MemoryKind,
  MemoryOwnerType,
  MemorySourceKind,
  MemoryVisibility,
} from "./types";

export interface BestEffortMemoryRequest {
  content: string;
  scope?: RememberMemoryScope;
  kind?: MemoryKind;
  warningLabel?: string;
}

export interface SavedMemorySummary {
  id: string;
  content: string;
  sourceKind: MemorySourceKind;
  ownerType: MemoryOwnerType;
  ownerId: string;
  visibility: MemoryVisibility;
  kind: MemoryKind;
}

export interface CaptureCompletedMemoryTurnResult {
  savedMemories: SavedMemorySummary[];
}

export const captureCompletedMemoryTurn = async (input: {
  db?: any;
  userId?: string | null;
  spaceId?: string | null;
  agentKey: string;
  memorySubjectId?: string | null;
  dialogId: string;
  userInput: string;
  trace?: any[];
  bestEffortMemories?: BestEffortMemoryRequest[];
  /** LLM 调用函数——用于 dialog-end 学习提取。由调用方注入。 */
  llmCall?: DialogLearningLlmCall;
}): Promise<CaptureCompletedMemoryTurnResult> => {
  const getDefaultDb = async () => (await import("database-engine/db")).default;
  const db = input.db ?? await getDefaultDb();
  const savedMemories: SavedMemorySummary[] = [];

  // 0. Correction-driven confidence decay: if the user pushed back on what
  // the agent "remembered", penalize the recently activated (i.e. just
  // injected) memory items instead of reinforcing them.
  let correctionDetected = false;
  try {
    const correction = await penalizeCorrectedMemories({
      db,
      userId: input.userId,
      spaceId: input.spaceId,
      agentKey: input.agentKey,
      memorySubjectId: input.memorySubjectId,
      userInput: input.userInput,
    });
    correctionDetected = correction.detected;
  } catch (err) {
    console.warn("[memory] correction penalty failed", {
      dialogId: input.dialogId,
      error: err,
    });
  }

  // 1. Explicit user directive memory
  const explicitItem = await captureExplicitMemoryEpisode({
    db,
    userId: input.userId,
    spaceId: input.spaceId,
    agentKey: input.agentKey,
    dialogId: input.dialogId,
    userInput: input.userInput,
  });
  if (explicitItem) {
    savedMemories.push({
      id: explicitItem.id,
      content: explicitItem.content,
      sourceKind: getMemorySourceKind(explicitItem),
      ownerType: explicitItem.ownerType,
      ownerId: explicitItem.ownerId,
      visibility: explicitItem.visibility,
      kind: explicitItem.kind,
    });
  }

  // 2. Understanding memory (inferred - not emitted as visible event).
  // A pushback turn is meta-conversation about the memory itself, not a new
  // preference signal — do not mine it for fresh understanding.
  // Extraction is an LLM call now, so it shares the injected llmCall with
  // dialog learning below; without one, understanding capture simply no-ops.
  if (!correctionDetected) await captureUnderstandingMemoryFromDialog({
    db,
    userId: input.userId,
    spaceId: input.spaceId,
    agentKey: input.agentKey,
    memorySubjectId: input.memorySubjectId,
    dialogId: input.dialogId,
    userInput: input.userInput,
    trace: input.trace,
    llmCall: input.llmCall,
  });

  // 3. Post-dialog consolidation (fire-and-forget)
  scheduleExplicitMemoryConsolidation({
    db,
    userId: input.userId,
    spaceId: input.spaceId,
    agentKey: input.agentKey,
    dialogId: input.dialogId,
    userInput: input.userInput,
  });

  // 4. Best-effort agent tool memories (await but catch errors silently)
  const bestEffortResults = await Promise.allSettled(
    (input.bestEffortMemories ?? []).map(async (memory) => {
      const result = await rememberMemory({
        db,
        userId: input.userId,
        spaceId: input.spaceId,
        dialogId: input.dialogId,
        content: memory.content,
        scope: memory.scope,
        kind: memory.kind,
        // best-effort memories 是 agent tool 主动写的，属于 agent-inferred
        source: "agent-inferred",
        agentKey: input.agentKey,
        memorySubjectId: input.memorySubjectId,
      });
      return { memory, result };
    })
  );
  for (const settled of bestEffortResults) {
    if (settled.status === "fulfilled") {
      const { result } = settled.value;
      for (const item of result.savedItems) {
        savedMemories.push({
          id: item.id,
          content: item.content,
          sourceKind: getMemorySourceKind(item),
          ownerType: item.ownerType,
          ownerId: item.ownerId,
          visibility: item.visibility,
          kind: item.kind,
        });
      }
    } else {
      console.warn("[memory] best-effort memory capture failed", {
        dialogId: input.dialogId,
        userId: input.userId ?? null,
        spaceId: input.spaceId ?? null,
        error: settled.reason,
      });
    }
  }

  // 5. Dialog-end learning: LLM 提取可复用的过程性知识（error_resolution / workaround 等）
  //    确定性触发（#5），LLM 提取（#4），写入 procedural memory。
  //    ECC continuous-learning-v2 核心洞察：hook 100% 可靠 vs skill 50-80%。
  if (input.llmCall && input.trace && input.trace.length > 0) {
    try {
      const learnedItems = await captureDialogLearnings({
        db,
        userId: input.userId,
        spaceId: input.spaceId,
        agentKey: input.agentKey,
        dialogId: input.dialogId,
        trace: input.trace,
        llmCall: input.llmCall,
      });
      for (const item of learnedItems) {
        savedMemories.push({
          id: item.id,
          content: item.content,
          sourceKind: getMemorySourceKind(item),
          ownerType: item.ownerType,
          ownerId: item.ownerId,
          visibility: item.visibility,
          kind: item.kind,
        });
      }
    } catch (err) {
      console.warn("[memory] dialog learning capture failed", {
        dialogId: input.dialogId,
        error: err,
      });
    }
  }

  return { savedMemories };
};
