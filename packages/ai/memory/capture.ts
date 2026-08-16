import { maybeConsolidateExplicitRemember } from "./consolidate";
import { resolveUserOrSpaceMemoryTarget } from "./scope";
import { createMemoryItem, writeMemoryItemWithIndexesToDb } from "./store";

/**
 * 用户明确下达的「记住这个」指令——确定性兜底层。
 *
 * 这里刻意只保留少数几个高精度模式，不追求覆盖中文的各种说法：广度由
 * rememberMemory 工具和 understandingLlm 的语义抽取负责，这一层只保证最直白的
 * 祈使句 100% 不漏。两层的失效方式不同（正则漏在措辞、模型漏在判断），叠起来
 * 才有底。要新增模式，标准是「这句话除了要求记住不可能是别的意思」。
 */
const EXPLICIT_REMEMBER_PATTERNS = [
  "记住",
  "你要记住",
  "请记住",
  "以后记住",
  "记得",
  "别忘了",
  "别忘记",
];

export const shouldCaptureExplicitMemory = (userInput: string): boolean => {
  const text = userInput.trim();
  if (!text) return false;
  return EXPLICIT_REMEMBER_PATTERNS.some((pattern) => {
    const index = text.indexOf(pattern);
    if (index < 0) return false;

    const prefix = text.slice(0, index).trim();
    const suffix = text.slice(index + pattern.length).trim();
    if (!suffix) return false;
    if (!prefix) return true;

    return /^(这个|这件事|这一点|这点|请你|你)?$/u.test(prefix);
  });
};

const buildExplicitMemoryTarget = resolveUserOrSpaceMemoryTarget;

export const captureExplicitMemoryEpisode = async (input: {
  db?: any;
  userId?: string | null;
  spaceId?: string | null;
  agentKey: string;
  dialogId: string;
  userInput: string;
}): Promise<import("./types").MemoryItem | null> => {
  if (!shouldCaptureExplicitMemory(input.userInput)) return null;
  const getDefaultDb = async () => (await import("database-engine/db")).default;
  const db = input.db ?? await getDefaultDb();
  const target = buildExplicitMemoryTarget(input);
  if (!target) return null;
  const tags =
    target.ownerType === "space"
      ? ["explicit-memory", "space-context"]
      : ["explicit-memory"];

  const item = createMemoryItem({
    ownerType: target.ownerType,
    ownerId: target.ownerId,
    visibility: target.visibility,
    subjectType: target.subjectType,
    subjectId: target.subjectId,
    kind: "episodic",
    content: input.userInput.trim(),
    importance: target.ownerType === "user" ? 0.95 : 0.85,
    confidence: target.ownerType === "user" ? 0.95 : 0.9,
    tags,
    patternKey: "explicit-remember",
    sourceDialogId: input.dialogId,
  });
  await writeMemoryItemWithIndexesToDb(db, item);
  return item;
};

export const consolidateExplicitMemoryAfterDialog = async (input: {
  db?: any;
  userId?: string | null;
  spaceId?: string | null;
  agentKey: string;
  dialogId: string;
  userInput: string;
}): Promise<void> => {
  if (!shouldCaptureExplicitMemory(input.userInput)) return;
  const getDefaultDb = async () => (await import("database-engine/db")).default;
  const db = input.db ?? await getDefaultDb();
  const target = buildExplicitMemoryTarget(input);
  if (!target) return;

  await maybeConsolidateExplicitRemember({
    db,
    owner: { ownerType: target.ownerType, ownerId: target.ownerId },
    subjectType: target.subjectType,
    subjectId: target.subjectId,
    visibility: target.visibility,
    content: input.userInput.trim(),
  });
};

export const scheduleExplicitMemoryConsolidation = (input: {
  db?: any;
  userId?: string | null;
  spaceId?: string | null;
  agentKey: string;
  dialogId: string;
  userInput: string;
}): void => {
  queueMicrotask(() => {
    void consolidateExplicitMemoryAfterDialog(input).catch((error) => {
      console.warn("[memory] explicit post-dialog consolidation failed", {
        dialogId: input.dialogId,
        userId: input.userId ?? null,
        spaceId: input.spaceId ?? null,
        error,
      });
    });
  });
};
