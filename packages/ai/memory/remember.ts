import { buildAgentSubjectTarget, resolveScopedMemoryTargets, type MemoryScope } from "./scope";
import { createMemoryItem, writeMemoryItemWithIndexesToDb } from "./store";
import { loadMemoryCandidatesFromDb } from "./query";
import { tokenize } from "./rank";
import type {
  MemoryItem,
  MemoryKind,
  MemoryOwnerType,
  MemorySubjectType,
  MemoryVisibility,
} from "./types";

export type RememberMemoryScope = MemoryScope;

export type RememberMemorySource = "user-directive" | "agent-inferred";

export interface RememberMemoryInput {
  db?: any;
  userId?: string | null;
  spaceId?: string | null;
  dialogId?: string | null;
  content: string;
  scope?: RememberMemoryScope;
  kind?: MemoryKind;
  /**
   * 记忆来源——决定初始置信度。
   * - "user-directive"：用户明确要求记住（如"请记住 X"）→ 高置信
   * - "agent-inferred"：agent 推测值得记（如 rememberMemory tool 调用）→ 中低置信
   * 默认 "agent-inferred"（向后兼容：现有调用方不传 source 时保持旧行为）。
   */
  source?: RememberMemorySource;
  /**
   * procedural 的复现证据：这个流程/排障步骤此前在什么时候遇到过。
   *
   * 长期记忆里 procedural 的定义是「重复出现的可执行流程」，但 kind 由模型自行
   * 传入，仅靠 schema 描述约束无效——实测 220 条存量里 92 条（42%）是被误标成
   * procedural 的一次性排障实录，它们挤占 overlay 里 procedural 的固定配额，
   * 导致真正的 runbook 召不回来。
   *
   * 因此 procedural 需要显式给出复现证据；给不出的一律降级为 episodic
   * （降级而非报错：记忆写入不该因为分类不准就丢内容）。
   */
  recurrenceEvidence?: string | null;
  /**
   * Optional agent subject key. When provided, the resolved owner target's
   * subject is rewritten to { subjectType: "agent", subjectId: agentKey } so
   * the memory shows up in that agent's "这个 Agent 记得你什么" tab.
   */
  agentKey?: string | null;
  /** Explicit relationship subject; overrides agentKey for storage ownership only. */
  memorySubjectId?: string | null;
}

export interface RememberMemoryResult {
  success: true;
  content: string;
  requestedScope: RememberMemoryScope;
  /**
   * 请求的 kind 与实际落库的 kind——procedural 缺复现证据被降级时两者不同。
   * 调用方（工具层）据此告知模型「这条按 episodic 存了」，避免它以为写进了 runbook。
   */
  requestedKind: MemoryKind;
  savedKind: MemoryKind;
  kindDowngradeReason?: string;
  savedItems: MemoryItem[];
  /**
   * 语义近邻旧条（软查重提示）：本条非精确命中时，同 owner/kind/subject 下
   * token 重叠 ≥ SIMILAR_OVERLAP_THRESHOLD 的既有记忆（最多 3 条，按重叠度降序）。
   * 只提示不自动合并——调用方据此决定是否用 deleteMemory 归档被取代的旧条。
   */
  similarMemories: Array<{
    id: string;
    content: string;
    kind: MemoryKind;
    createdAt: string;
  }>;
  resolvedScopes: Array<{
    ownerType: MemoryOwnerType;
    ownerId: string;
    subjectType: MemorySubjectType;
    subjectId: string;
    visibility: MemoryVisibility;
  }>;
}

const MEMORY_KINDS = new Set<MemoryKind>(["episodic", "semantic", "procedural"]);

/**
 * procedural 硬门：没有复现证据就降级 episodic。
 * 只认非空字符串——空串/纯空白/非字符串都算没给。
 * 返回生效 kind、是否降级与规整后的证据，供落库与返回值共用。
 */
const resolveEffectiveKind = (input: {
  kind?: MemoryKind;
  recurrenceEvidence?: string | null;
}): { kind: MemoryKind; requestedKind: MemoryKind; downgraded: boolean; recurrenceEvidence: string } => {
  const requestedKind = input.kind ?? "episodic";
  if (!MEMORY_KINDS.has(requestedKind)) {
    throw new Error("rememberMemory: kind must be episodic, semantic, or procedural");
  }
  const recurrenceEvidence =
    typeof input.recurrenceEvidence === "string" ? input.recurrenceEvidence.trim() : "";
  const downgraded = requestedKind === "procedural" && !recurrenceEvidence;
  return {
    requestedKind,
    kind: downgraded ? "episodic" : requestedKind,
    downgraded,
    recurrenceEvidence,
  };
};

/**
 * 初始置信度按来源区分（§3.2 判别标准）：
 * user-directive（用户明确要求记住）→ 高置信，可直接影响行为
 * agent-inferred（agent 推测）→ 中低置信，只在恰好相关时轻提
 * 注意：COLD_STORAGE_CONFIDENCE=0.3，纠正惩罚=-0.2。
 * agent-inferred episodic 设 0.6 → 一次纠正降到 0.4（仍可用），两次纠正降到 0.2（冷藏）。
 * 不设 0.5 是因为一次纠正就会到 0.3 边缘——太脆弱。
 */
const resolveBaseConfidence = (source: RememberMemorySource, kind: MemoryKind): number =>
  source === "user-directive"
    ? kind === "procedural" ? 0.88 : 0.85
    : kind === "procedural" ? 0.68 : 0.6;

const buildMemoryTags = (ownerType: MemoryOwnerType, kind: MemoryKind): string[] => {
  const tags = ["agent-remembered"];
  if (ownerType !== "user") tags.push("space-context");
  if (kind === "procedural") tags.push("procedural-memory");
  return tags;
};

export const rememberMemory = async (
  input: RememberMemoryInput
): Promise<RememberMemoryResult> => {
  const content = input.content.trim();
  if (!content) {
    throw new Error("rememberMemory: content is required");
  }

  const scope = input.scope ?? "auto";
  let targets: ReturnType<typeof resolveScopedMemoryTargets>;
  try {
    targets = resolveScopedMemoryTargets({
      userId: input.userId,
      spaceId: input.spaceId,
      scope,
      fallbackToUserForMissingSpace: true,
    });
  } catch (error) {
    if (scope === "user") {
      throw new Error("rememberMemory: user scope requires userId");
    }
    if (scope === "space") {
      throw new Error("rememberMemory: space scope requires spaceId");
    }
    throw error;
  }
  if (targets.length === 0) {
    throw new Error("rememberMemory: no valid owner scope found");
  }

  const getDefaultDb = async () => (await import("database-engine/db")).default;
  const db = input.db ?? await getDefaultDb();
  const { kind, requestedKind, downgraded, recurrenceEvidence } = resolveEffectiveKind({
    kind: input.kind,
    recurrenceEvidence: input.recurrenceEvidence,
  });
  const agentKey = input.agentKey?.trim() || null;
  const memorySubjectId = input.memorySubjectId?.trim() || agentKey;
  const source = input.source ?? "agent-inferred";

  const baseConfidence = resolveBaseConfidence(source, kind);

  const savedWithSimilar = await Promise.all(
    targets.map(async (target) => {
      const useAgentSubject = (input.scope ?? "auto") === "auto" && !!memorySubjectId;
      const subject = useAgentSubject
        ? buildAgentSubjectTarget(target, memorySubjectId)
        : target;
      // 查重与写入必须用同一个 effective subject：scope=auto 且 memorySubjectId 存在时
      // 写入 agent subject，查重若仍按 owner subject 匹配会静默失效（review BLOCK 项）。
      const agentSubjectId = useAgentSubject ? memorySubjectId : null;

      // 精确查重 + 语义近邻软查重：单次 DB 加载（subject/kind 在 DB 层过滤，
      // 避免按 owner 截断 200 条后旧条漏报）+ 单次遍历，避免重复读取与 tokenize。
      const { existing, similarItems } = await findExistingAndSimilarMemories({
        db,
        target,
        content,
        kind,
        agentSubjectId,
      });
      if (existing) {
        const updated: MemoryItem = {
          ...existing,
          // 保留检索字段原值：去重命中只是"我们记住了同一件事"，
          // 并不是这条记忆被重新检索进 overlay。touchMemoryItemsInDb
          // 是唯一的 retrieval 记账路径。
          confidence: Math.max(existing.confidence ?? 0, baseConfidence),
          sourceDialogId: input.dialogId ?? existing.sourceDialogId,
        };
        await writeMemoryItemWithIndexesToDb(db, updated);
        return { item: updated, similarItems: [] as MemoryItem[] };
      }

      const item = createMemoryItem({
        ownerType: target.ownerType,
        ownerId: target.ownerId,
        visibility: target.visibility,
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
        kind,
        content,
        importance: kind === "procedural" ? 0.88 : target.ownerType === "user" ? 0.82 : 0.76,
        confidence: baseConfidence,
        tags: buildMemoryTags(target.ownerType, kind),
        // 复现证据随 item 落库：procedural 的「凭什么算 runbook」必须可追溯，
        // 否则通过硬门的条目日后同样无法复核。
        ...(kind === "procedural" && recurrenceEvidence
          ? { recurrenceEvidence }
          : {}),
        patternKey: kind === "procedural" ? "procedural-runbook" : "agent-remember",
        // sourceKind 显式落库：此前全靠 getMemorySourceKind 从 patternKey 反推，
        // 导致全库 220 条 sourceKind 均为 undefined，overlay 无从区分
        // 「用户明确说的」与「agent 自己猜的」。派生函数保留给历史条目兜底。
        sourceKind:
          source === "user-directive" ? "explicit-user-directive" : "agent-tool",
        sourceDialogId: input.dialogId ?? undefined,
      });
      await writeMemoryItemWithIndexesToDb(db, item);
      return { item, similarItems };
    }),
  );

  const savedItems = savedWithSimilar.map((entry) => entry.item);
  const similarById = new Map<string, MemoryItem>();
  for (const entry of savedWithSimilar) {
    for (const similar of entry.similarItems) similarById.set(similar.id, similar);
  }
  const similarMemories = [...similarById.values()]
    .slice(0, SIMILAR_CANDIDATES_LIMIT)
    .map((item) => ({
      id: item.id,
      content: item.content,
      kind: item.kind,
      createdAt: item.createdAt,
    }));

  return {
    success: true,
    content,
    requestedScope: scope,
    requestedKind,
    savedKind: kind,
    ...(downgraded
      ? {
          kindDowngradeReason:
            "procedural 需要 recurrenceEvidence（说明此前在什么时候遇到过同一问题）；" +
            "未提供，已按 episodic 存储。若确实是重复出现的流程，请补充复现证据后重新记录。",
        }
      : {}),
    savedItems,
    similarMemories,
    resolvedScopes: targets.map((target) => ({
      ownerType: target.ownerType,
      ownerId: target.ownerId,
      subjectType: target.subjectType,
      subjectId: target.subjectId,
      visibility: target.visibility,
    })),
  };
};

/** 精确查重/软查重的加载上限：DB 层已按 effective subject + kind 过滤后再截断。 */
const DEDUPE_LOAD_LIMIT = 200;
/** 软查重阈值：overlap coefficient（交集 / 较小集合的 token 数）。 */
const SIMILAR_OVERLAP_THRESHOLD = 0.6;
/** 最小 query token 数：短中文内容的 CJK 2-gram 复用率高（如"部署状态"），
 * overlap 极易过阈值造成误报——低于门槛只做精确查重，不做近邻提示。 */
const SIMILAR_MIN_QUERY_TOKENS = 10;
const SIMILAR_CANDIDATES_LIMIT = 3;

/**
 * 精确查重 + 语义近邻（软查重）一次完成：单次 DB 加载 + 单次遍历。
 *
 * subject 判定与写入端 effective subject 严格一致（agentSubjectId 存在 → 匹配
 * agent subject，否则匹配 owner subject）——避免"写入 agent subject、查重按
 * owner 找"的静默失效（review BLOCK 项）。加载走 loadMemoryCandidatesFromDb，
 * DB 层先按 subject/kind 过滤再取 200 条：owner 下条目超过上限时按最新截断，
 * 更旧条目不参与查重（best-effort：近期演进条目按激活/创建排序天然靠前）。
 *
 * 软查重只提示、不自动合并（与精确去重的"防误合并"哲学一致）。匹配判据为
 * token overlap coefficient ≥ SIMILAR_OVERLAP_THRESHOLD——演进快照（同一事实
 * 的状态更新版）通常新版覆盖/包含旧版，overlap 比 Jaccard 更贴合（Jaccard 的
 * union 会放大长文本的偶发差异导致漏报）。
 */
async function findExistingAndSimilarMemories(input: {
  db: any;
  target: { ownerType: MemoryOwnerType; ownerId: string };
  content: string;
  kind: MemoryKind;
  /** effective agent subject id：scope=auto 且 memorySubjectId 存在时非空。 */
  agentSubjectId: string | null;
}): Promise<{ existing: MemoryItem | null; similarItems: MemoryItem[] }> {
  const subjectRefs = input.agentSubjectId
    ? [{ subjectType: "agent" as const, subjectId: input.agentSubjectId }]
    : [
        {
          subjectType: input.target.ownerType,
          subjectId: input.target.ownerId,
        },
      ];
  const items = await loadMemoryCandidatesFromDb(input.db, {
    owners: [input.target],
    subjects: subjectRefs,
    kinds: [input.kind],
    ownerLimit: DEDUPE_LOAD_LIMIT,
  });

  const subjectMatches = (item: MemoryItem): boolean =>
    input.agentSubjectId
      ? item.subjectType === "agent" && item.subjectId === input.agentSubjectId
      : item.subjectType === input.target.ownerType &&
        item.subjectId === input.target.ownerId;

  const queryTokens = new Set(tokenize(input.content));
  const canScoreSimilar = queryTokens.size >= SIMILAR_MIN_QUERY_TOKENS;
  const scored: Array<{ item: MemoryItem; overlap: number }> = [];

  for (const item of items) {
    if (!subjectMatches(item)) continue;
    // 精确命中：同一条已存在，走 bump 分支，无需近邻提示
    if (item.content === input.content) {
      return { existing: item, similarItems: [] };
    }
    if (!canScoreSimilar) continue;
    const itemTokens = new Set(tokenize(item.content));
    if (itemTokens.size === 0) continue;
    let intersection = 0;
    for (const token of queryTokens) {
      if (itemTokens.has(token)) intersection += 1;
    }
    const overlap = intersection / Math.min(queryTokens.size, itemTokens.size);
    if (overlap >= SIMILAR_OVERLAP_THRESHOLD) {
      scored.push({ item, overlap });
    }
  }

  scored.sort((a, b) => b.overlap - a.overlap);
  return {
    existing: null,
    similarItems: scored.slice(0, SIMILAR_CANDIDATES_LIMIT).map((entry) => entry.item),
  };
}
