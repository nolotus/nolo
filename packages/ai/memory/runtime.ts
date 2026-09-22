import { touchMemoryItemsInDb } from "./storeShared";
import { buildMemoryOverlay, DEFAULT_MEMORY_OVERLAY_TOKEN_BUDGET } from "./overlay";
import { rankMemoryCandidates, type MemoryRankContext } from "./rank";
import { chooseMemoryOwners, loadMemoryCandidatesFromDb } from "./queryShared";
import { buildMemorySubjectsForAgent, resolveAgentMemoryPolicy } from "./policy";
import { EXPLICIT_REMEMBER_PREFIX_REGEX } from "./constants";
import type { MemoryRuntimeResolution } from "./types";
import {
  isMemoryVNextShadowReadEnabled,
  runMemoryVNextShadowRead,
  type MemoryVNextShadowProvider,
} from "./vnext/shadowRead";
import {
  isMemoryVNextLazyPromotionEnabled,
  runMemoryVNextLazyPromotion,
  type MemoryVNextLazyPromotionObservation,
} from "./vnext/lazyPromotion";

/** Below this confidence a memory is frozen out of retrieval entirely. */
export const COLD_STORAGE_CONFIDENCE = 0.3;

/**
 * Memory overlay 的软上限 token 预算（粗估）。
 * 防止记忆膨胀吃掉 context window；超出时按 kind 优先级截断。
 *
 * 真值定义在 overlay.ts（SSOT）——两处各自硬编码会漂移，且黑盒守护测试
 * 在两边同时调大到饱和区时会漏报，编译期引用才能真正杜绝。
 * 取值依据见 DEFAULT_MEMORY_OVERLAY_TOKEN_BUDGET 的注释。
 */
export const MEMORY_OVERLAY_TOKEN_BUDGET = DEFAULT_MEMORY_OVERLAY_TOKEN_BUDGET;

/**
 * Candidate window 契约（Candidate Recall Audit 2026-09-04 结论）：
 * - proactive runtime：cheap/shallow，每 (subject×kind) 只取最新 DEFAULT 条；
 * - queryMemory：deeper/bounded，显式用 QUERY_MEMORY_OWNER_LIMIT 找回窗口外记忆，
 *   仍走同一 rank/selection（deeper retrieval，不是 memory dump）；
 * - corroborated procedural：很小的长期 reserve，保护通过 recurrence gate 的
 *   runbook 不因 latest-N 掉出候选池（audit 实证：verified runbook 写入 1 天即出窗）。
 */
export const DEFAULT_MEMORY_RUNTIME_OWNER_LIMIT = 20;
export const QUERY_MEMORY_OWNER_LIMIT = 100;
/** 已 corroborated（recurrenceEvidence 非空）procedural 的额外候选席位上限。 */
export const CORROBORATED_PROCEDURAL_RESERVE = 5;
/**
 * resident（常驻偏好）无条件入选上限：resident 不参与话题排序、必进 overlay，
 * 用条数上限防止常驻区无限膨胀（写入侧另有 ≤240 字符硬门，见 remember.ts）。
 */
export const RESIDENT_MEMORY_RUNTIME_LIMIT = 10;

const normalizeSelectedContent = (text: string): string =>
  text
    .trim()
    .replace(EXPLICIT_REMEMBER_PREFIX_REGEX, "")
    .replace(/[。！？!?]+$/u, "")
    .trim();

const STACK_TERMS = [
  "typescript",
  "javascript",
  "python",
  "rust",
  "go",
  "golang",
  "java",
  "kotlin",
  "swift",
  "ruby",
  "php",
] as const;

const stackAliases: Record<string, string> = {
  golang: "go",
};

const normalizeStackTerm = (term: string): string => stackAliases[term] ?? term;

const stackTermsIn = (text: string): Set<string> => {
  const lower = text.toLowerCase();
  const terms = new Set<string>();
  for (const term of STACK_TERMS) {
    const pattern = term.length <= 2 ? new RegExp(`\\b${term}\\b`, "i") : new RegExp(term, "i");
    if (pattern.test(lower)) {
      terms.add(normalizeStackTerm(term));
    }
  }
  return terms;
};

const conflictsWithCurrentStack = (
  item: ReturnType<typeof rankMemoryCandidates>[number],
  userInput: string
): boolean => {
  const currentStacks = stackTermsIn(userInput);
  if (currentStacks.size === 0) return false;
  const memoryStacks = stackTermsIn(item.content);
  if (memoryStacks.size === 0) return false;
  for (const stack of memoryStacks) {
    if (!currentStacks.has(stack)) return true;
  }
  return false;
};

const INTERACTION_PREFERENCE_TERMS = [
  "回答偏好",
  "输出偏好",
  "回复偏好",
  "回答结构",
  "输出结构",
  "回复结构",
  "先给结论",
  "再列风险",
  "最后给证据",
  "语气",
  "风格",
  "称呼",
  "叫我",
] as const;

const isInteractionPreferenceMemory = (
  item: ReturnType<typeof rankMemoryCandidates>[number]
): boolean => {
  if (item.facet === "style") return true;
  const content = normalizeSelectedContent(item.content);
  return INTERACTION_PREFERENCE_TERMS.some((term) => content.includes(term));
};

const isOffCurrentPath = (item: ReturnType<typeof rankMemoryCandidates>[number], context?: MemoryRankContext): boolean => {
  const currentOwner = context?.currentOwner;
  const currentSubject = context?.currentSubject;
  if (
    currentSubject &&
    (item.subjectType === "project" || item.subjectType === "space") &&
    item.subjectType === currentSubject.subjectType &&
    item.subjectId !== currentSubject.subjectId
  ) {
    return true;
  }
  if (
    currentOwner?.ownerType === "space" &&
    item.ownerType === "user" &&
    (item.subjectType === "project" || item.subjectType === "space") &&
    item.subjectId !== currentOwner.ownerId
  ) {
    return true;
  }
  return false;
};

const selectRuntimeMemoryItems = (
  items: ReturnType<typeof rankMemoryCandidates>,
  context?: MemoryRankContext,
  userInput = ""
) => {
  const seen = new Set<string>();
  const unique = items.filter((item) => {
    // Cold storage: repeatedly corrected memories drop below the usage
    // threshold and stop being injected (record stays for the memory UI).
    if ((item.confidence ?? 0) < COLD_STORAGE_CONFIDENCE) return false;
    if (isOffCurrentPath(item, context)) return false;
    if (conflictsWithCurrentStack(item, userInput)) return false;
    const key = `${item.kind}:${normalizeSelectedContent(item.content).toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const selected: typeof unique = [];
  const selectedIds = new Set<string>();
  const add = (item: typeof unique[number] | undefined) => {
    if (!item || selectedIds.has(item.id) || selected.length >= 20) return;
    selected.push(item);
    selectedIds.add(item.id);
  };

  add(
    unique.find(
      (item) =>
        context?.currentSubject &&
        item.subjectType === context.currentSubject.subjectType &&
        item.subjectId === context.currentSubject.subjectId
    )
  );
  add(unique.find(isInteractionPreferenceMemory));
  add(
    unique.find(
      (item) =>
        context?.currentOwner &&
        item.ownerType === context.currentOwner.ownerType &&
        item.ownerId === context.currentOwner.ownerId
    )
  );
  add(unique.find((item) => item.ownerType === "user"));
  add(unique.find((item) => item.ownerType === "space"));
  // subject=user 的保底席位：长期偏好（"先看结论"、"别用黑话"）挂在 user subject 上，
  // 而工程类记忆多挂在 agent subject 上。实测 220 条里 agent:143 / user:77，
  // 若不保底，靠关键词打分的排序会让工程条目挤满 overlay，用户偏好一条都进不来。
  // 注意不能用 ownerType 代替：这些条目 ownerType 全是 user，上面那条席位区分不出。
  add(unique.find((item) => item.subjectType === "user"));
  add(unique.find((item) => item.kind === "procedural"));
  for (const item of unique) {
    add(item);
  }
  return selected;
};

export const resolveMemoryRuntime = async (input: {
  db: any;
  userId?: string | null;
  spaceId?: string | null;
  agentKey: string;
  memorySubjectId?: string | null;
  userInput: string;
  /**
   * candidate 窗口深度（per subject×kind / per owner）。
   * 缺省 = DEFAULT_MEMORY_RUNTIME_OWNER_LIMIT（proactive cheap/shallow）；
   * queryMemory 显式传 QUERY_MEMORY_OWNER_LIMIT（deeper/bounded）。
   */
  ownerLimit?: number;
  /**
   * corroborated procedural reserve 席位数。缺省 = CORROBORATED_PROCEDURAL_RESERVE。
   * 传 0 可关闭（测试用）。
   */
  corroboratedProceduralReserve?: number;
  /**
   * Slice 5 shadow read: when set AND `NOLO_MEMORY_VNEXT_SHADOW_READ` is on,
   * run a vNext recall alongside the legacy recall and emit one comparison
   * observation. Shadow output never enters `selectedItems` / `promptBlock`;
   * a shadow failure is recorded, not thrown. Omit to disable entirely.
   * Slice 6 reuses the same provider behind its own independent lazy-promotion
   * kill switch; no additional server/provider wiring is required.
   */
  vNextShadowProvider?: MemoryVNextShadowProvider;
  /**
   * Slice 6 lazy promotion: optional observation sink, forwarded to
   * `runMemoryVNextLazyPromotion`'s `emit`. Defaults to `console.info` inside
   * the helper. Promotion is detached best-effort work — it never enters
   * `selectedItems`/`promptBlock` and this callback must not throw.
   */
  lazyPromotionEmit?: (observation: MemoryVNextLazyPromotionObservation) => void;
}): Promise<MemoryRuntimeResolution> => {
  const owners = chooseMemoryOwners({
    userId: input.userId,
    spaceId: input.spaceId,
  });
  if (owners.length === 0) {
    return { selectedItems: [], promptBlock: null };
  }

  const policy = resolveAgentMemoryPolicy({ agentKey: input.agentKey });
  const legacyStartedAt = performance.now();
  const candidates = await loadMemoryCandidatesFromDb(input.db, {
    owners,
    subjects: buildMemorySubjectsForAgent({
      userId: input.userId,
      spaceId: input.spaceId,
      agentKey: input.agentKey,
      memorySubjectId: input.memorySubjectId,
      policy,
    }),
    kinds: ["episodic", "semantic", "procedural"],
    ownerLimit: input.ownerLimit ?? DEFAULT_MEMORY_RUNTIME_OWNER_LIMIT,
    ownerFallback: policy.ownerFallback,
    corroboratedProceduralReserve:
      input.corroboratedProceduralReserve ?? CORROBORATED_PROCEDURAL_RESERVE,
  });

  const rankContext: MemoryRankContext = {
    currentOwner: input.spaceId
      ? { ownerType: "space", ownerId: input.spaceId }
      : input.userId
        ? { ownerType: "user", ownerId: input.userId }
        : null,
    currentSubject: input.spaceId
      ? { subjectType: "space", subjectId: input.spaceId }
      : input.userId
        ? { subjectType: "user", subjectId: input.userId }
        : null,
  };
  // resident（常驻偏好）从排序候选中拆出：跨话题全程适用，不参与话题排序，
  // 也不占检索区 per-kind 名额（overlay 里独立成节，避免同一条注入两次）。
  // 写入侧硬门（remember.ts）保证只有用户明确指令的短偏好能带 resident；
  // 这里无条件入选：按 createdAt 新→旧，上限 RESIDENT_MEMORY_RUNTIME_LIMIT。
  const residentItems = candidates
    .filter((item) => item.resident === true)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, RESIDENT_MEMORY_RUNTIME_LIMIT);
  const retrievalCandidates = candidates.filter((item) => item.resident !== true);

  const ranked = selectRuntimeMemoryItems(
    rankMemoryCandidates(retrievalCandidates, input.userInput, rankContext),
    rankContext,
    input.userInput
  );
  const selected = [...residentItems, ...ranked];
  const legacyLatencyMs = Math.round((performance.now() - legacyStartedAt) * 10) / 10;
  const promptBlock =
    selected.length === 0
      ? null
      : buildMemoryOverlay(selected, { maxTokens: MEMORY_OVERLAY_TOKEN_BUDGET });

  // Slice 5 shadow read: parallel vNext recall, observation-only. The shadow
  // result never enters `selected`/`promptBlock`; a shadow failure is recorded
  // in telemetry, never thrown. Double gate: flag + injected provider.
  const shadowEnabled =
    input.vNextShadowProvider != null && isMemoryVNextShadowReadEnabled();
  if (shadowEnabled) {
    // Fire-and-forget relative to the return value: the caller must not wait
    // on the shadow before using the legacy resolution. We still await it
    // inside this promise so the observation is emitted on the same turn and
    // so a synchronous catalog error is captured — but `runMemoryVNextShadowRead`
    // itself never throws, so the await cannot reject.
    await runMemoryVNextShadowRead({
      ctx: {
        db: input.db,
        owners,
        query: input.userInput,
        provider: input.vNextShadowProvider!,
      },
      legacyItems: selected,
      legacyLatencyMs,
      legacyContextChars: promptBlock?.length ?? 0,
    });
  }

  // Slice 6 lazy promotion: promote at most one record per runtime turn, using
  // the already-ranked legacy selection as the usefulness signal. Detached
  // best-effort work never changes the current legacy-authority answer. A
  // separate flag lets operators stop writes without disabling Slice 5 shadow.
  const promotionCandidate = selected[0];
  const lazyPromotionEnabled =
    input.vNextShadowProvider != null && isMemoryVNextLazyPromotionEnabled();
  if (lazyPromotionEnabled && promotionCandidate) {
    // Defensive `.catch`: the helper is designed never to throw, but it is
    // detached via `void` — a stray rejection here must not surface as an
    // unhandled promise rejection in the host process.
    void runMemoryVNextLazyPromotion({
      db: input.db,
      item: promotionCandidate,
      provider: input.vNextShadowProvider!,
      ...(input.lazyPromotionEmit ? { emit: input.lazyPromotionEmit } : {}),
    }).catch(() => {});
  }

  if (selected.length === 0) {
    return { selectedItems: [], promptBlock: null };
  }

  // 标记 retrieval：只能证明这些记忆被注入 overlay，不代表模型使用了它们
  // （retrieved ≠ used ≠ useful）。resident 同样被注入，同样按 retrieval 记账。
  // 见 storeShared.ts 的字段语义说明。
  await touchMemoryItemsInDb(input.db, selected);
  return {
    selectedItems: selected,
    promptBlock,
  };
};
