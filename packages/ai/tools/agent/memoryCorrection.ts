/**
 * 记忆置信度降权与召回档案（跨端共享纯逻辑）
 *
 * 解决的实测问题：一条**编造的 agentKey 记忆**（inferred，凭印象拼出的 ID）
 * 导致同一错误被犯两次——第一次派发 404（agent-not-found），第二次**又**用它
 * 派发（已写入 memory 但无机制阻止重复犯错）。
 *
 * 本模块补齐两个缺口：
 * 1. **自动降权负反馈闭环**：操作以「记忆相关失败」结束时（如按记忆 agentKey
 *    派发 → 404），自动扣该记忆置信度；跌到阈值以下从活跃检索排除，标记「曾导致
 *    失败」；再次失败继续扣；用户显式纠正优先级高于自动降权。
 * 2. **召回档案**：召回时不只给记忆内容，而是给**完整档案**（内容、来源、置信度
 *    及其变迁历史、相关事件），供 LLM 直接读取，**禁止 LLM 自行推理填补**。
 *
 * 硬性约束（review 重点检查，与 batchAggregation.ts / runtimeTodo.ts 一致）：
 * - 零 I/O：禁止任何 Node 专有 API（fs / path / child_process / 环境变量 /
 *   进程控制），禁止 CommonJS 动态加载；
 * - 禁止读取系统时钟：当前时间由入参 `now`（epoch ms）传入；
 * - 必须能在浏览器里直接 import 而不报错（判定规则全端只有这一份）。
 *
 * 复用约定（双实现漂移必须收敛，见 docs/workflow.md）：
 * - 失败分类复用 quotaCircuitBreaker 的 `RunFailureInfo`（已含 agent-not-found /
 *   quota / auth / network 区分），不平行定义第二套失败分类；
 * - 记忆条目形状复用 packages/ai/memory/types 的 `MemoryItem`（type import，
 *   零运行时耦合）。
 *
 * 分层：本模块只做判定/推导与档案构建，不实现任何存储 I/O。
 * 落盘（扣置信度、写历史记录）归各端适配层（CLI 落本地、server 落 DB、web 走 API）。
 */
import type { MemoryItem } from "../../memory/types";
import type { RunFailureInfo } from "./quotaCircuitBreaker";

// ─────────────────────────── 来源维度 ───────────────────────────

/**
 * 置信度来源三档（confidence provenance）。
 *
 * 与 packages/ai/memory/types 的 `MemorySourceKind`（谁写的：用户/agent/理解层）
 * 是不同维度——本维度回答「这条记忆被验证过没有」：
 * - `verified`：工具/命令实测验证过（如 readAgent 通过、命令执行成功）；
 * - `stated`：用户明确陈述（用户亲口说的，无需验证即中等可信）；
 * - `inferred`：模型推断/凭印象，未验证（最不可信，一次失败即应排除）。
 */
export type ConfidenceProvenance = "verified" | "stated" | "inferred";

/** 来源对应的默认置信度（写入时按来源取初值）。 */
export const PROVENANCE_DEFAULT_CONFIDENCE: Record<ConfidenceProvenance, number> =
  {
    verified: 0.9,
    stated: 0.75,
    inferred: 0.4,
  };

/** 降权阈值：置信度低于此值的记忆从活跃检索排除（记录保留以供审计）。 */
export const DEFAULT_DEMOTE_THRESHOLD = 0.3;

/** 自动降权单次扣分（agent-not-found 命中时）。 */
export const FAILURE_PENALTY_DELTA = -0.25;

/** inferred 来源的置信度若异常高于此值，标记存疑（数据不一致预警）。 */
export const SUSPECT_INFERRED_HIGH_CONFIDENCE = 0.6;

/** 调用方在用记忆驱动操作前应记录的最小使用契约。 */
export interface MemoryUsageRecord {
  memoryId: string;
  /** 从该记忆提取并用于操作的值（如 agentKey = "agent-pub-01KYW7..."）。 */
  extractedValue: string;
  /** 进行的操作类型。 */
  operation: "dispatch-agent" | "read-agent" | "other";
}

/**
 * 记忆置信度变更历史记录（每条记忆可累积多条，构成解释链）。
 *
 * 日常维护优先通过降权/归档保留解释链（系统可追溯"为什么变了"、
 * "曾经信什么"、"什么时候转变的"）；物理删除仅限用户强制要求且在用户权限范围内。
 */
export interface MemoryCorrectionHistory {
  /** ISO 时间字符串，由调用方提供（模块内禁止取时钟）。 */
  at: string;
  /** 变更类型。 */
  kind: "create" | "verify" | "demote" | "user-correct" | "reinforce";
  /** 变更前的置信度（首次创建时缺省）。 */
  from?: number;
  /** 变更后的置信度。 */
  to: number;
  /** 一句话理由（如"导致 agent-not-found 失败"、"用户明确纠正"）。 */
  reason: string;
  /** 来源（创建/验证时标注）。 */
  provenance?: ConfidenceProvenance;
}

// ─────────────────────────── 来源推导 ───────────────────────────

/**
 * 从 MemoryItem 推导置信度来源（迁移友好：旧记录无显式标记时保守归 inferred）。
 *
 * 判定优先级：
 * 1. tags 含 "verified" → verified（调用方在工具验证后打此 tag）；
 * 2. sourceKind === "explicit-user-directive" → stated（用户明确陈述）；
 * 3. 其余 → inferred（保守，未验证）。
 */
export function inferProvenance(
  item: Pick<MemoryItem, "tags" | "sourceKind">,
): ConfidenceProvenance {
  if (item.tags?.includes("verified")) return "verified";
  if (item.sourceKind === "explicit-user-directive") return "stated";
  return "inferred";
}

/**
 * 来源迁移：对无来源标记的旧记忆补标（保守策略——无法判断的一律 inferred）。
 * 返回建议的来源；调用方据此回写 tag/sourceKind，不在此模块内落盘。
 */
export function migrateProvenance(
  item: Pick<MemoryItem, "tags" | "sourceKind">,
): ConfidenceProvenance {
  return inferProvenance(item);
}

// ─────────────────────────── 自动降权（负反馈闭环） ───────────────────────────

export interface FailureFeedbackInput {
  /** 这次失败的已分类信息（复用 classifyRunFailure 的输出）。 */
  failure: RunFailureInfo;
  /** 本次操作使用的记忆记录（调用方在派发前记录"我用了哪条记忆的什么值"）。 */
  usages: MemoryUsageRecord[];
  /** 当前时间（epoch ms，由调用方传入，禁止模块内取时钟）。 */
  now: number;
  /** 当前时间 ISO 字符串（用于写入历史记录的 at 字段）。 */
  nowIso: string;
  /** 参与判定的记忆条目（用于读取当前置信度）。 */
  memories: MemoryItem[];
  /** 降权阈值，缺省 DEFAULT_DEMOTE_THRESHOLD。 */
  threshold?: number;
  /** 单次扣分，缺省 FAILURE_PENALTY_DELTA。 */
  penaltyDelta?: number;
}

/** 对单条记忆的降权指令（调用方据此落盘：扣置信度 + 写历史记录）。 */
export interface ConfidencePenalty {
  memoryId: string;
  /** 置信度变化量（负数）。 */
  delta: number;
  /** 变更后的置信度（已 clamp 到 [0,1]）。 */
  newConfidence: number;
  /** 一句话理由（写入历史记录）。 */
  reason: string;
  /** 是否跌到阈值以下（应从活跃检索排除，标记「曾导致失败」）。 */
  belowThreshold: boolean;
  /** 应写入的历史记录。 */
  history: MemoryCorrectionHistory;
}

/**
 * 判断一条记忆使用记录是否命中失败原因（即该记忆是否应对此次失败负责）。
 *
 * 只有 `agent-not-found` 失败 + 派发操作 + 提取的值出现在失败消息里时，
 * 才认定该记忆是被质疑对象。quota/auth/network/other 失败与记忆无关，不误罚。
 */
function usageHitsFailure(
  usage: MemoryUsageRecord,
  failure: RunFailureInfo,
): boolean {
  if (failure.reason !== "agent-not-found") return false;
  if (usage.operation !== "dispatch-agent") return false;
  const message = failure.message ?? "";
  const value = usage.extractedValue.trim();
  if (!value || !message) return false;
  return message.includes(value);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * 自动降权判定（纯函数）：给定失败信息 + 记忆使用记录 → 输出应扣分的记忆列表。
 *
 * 规则（自动降权规则表）：
 * - agent-not-found + usage 命中失败消息 → 命中的记忆扣 FAILURE_PENALTY_DELTA；
 * - quota / auth / network / other → 不扣任何记忆（与记忆无关，不误罚）；
 * - 扣后置信度 < 阈值 → belowThreshold=true（从活跃检索排除）；
 * - 同一记忆的多个 usage 命中同一次失败时只扣一次（一次失败=一次扣分）。
 *
 * 用户显式纠正优先级高于自动降权：调用方应先处理用户纠正
 * （见 `applyUserCorrection`），再调用本函数；本函数不覆盖用户已设定的值。
 */
export function applyFailureFeedback(input: FailureFeedbackInput): ConfidencePenalty[] {
  const threshold = input.threshold ?? DEFAULT_DEMOTE_THRESHOLD;
  const penaltyDelta = input.penaltyDelta ?? FAILURE_PENALTY_DELTA;

  // 非 agent-not-found 失败不归因到记忆。
  if (input.failure.reason !== "agent-not-found") return [];

  const memoryById = new Map(input.memories.map((m) => [m.id, m]));
  const hitMemoryIds = new Set<string>();

  for (const usage of input.usages) {
    if (!usageHitsFailure(usage, input.failure)) continue;
    hitMemoryIds.add(usage.memoryId);
  }

  const penalties: ConfidencePenalty[] = [];
  for (const memoryId of hitMemoryIds) {
    const memory = memoryById.get(memoryId);
    if (!memory) continue;
    const currentConfidence = memory.confidence ?? 0;
    const newConfidence = clamp01(currentConfidence + penaltyDelta);
    penalties.push({
      memoryId,
      delta: penaltyDelta,
      newConfidence,
      reason: `导致 agent-not-found 失败：${input.failure.message ?? "agent not found"}`,
      belowThreshold: newConfidence < threshold,
      history: {
        at: input.nowIso,
        kind: "demote",
        from: currentConfidence,
        to: newConfidence,
        reason: `自动降权：导致 agent-not-found 失败`,
      },
    });
  }

  return penalties;
}

// ─────────────────────────── 用户显式纠正（优先级高于自动降权） ───────────────────────────

export interface UserCorrectionInput {
  /** 被纠正的记忆 id。 */
  memoryId: string;
  /** 用户指定的新置信度（可低于阈值直接排除；用户说了算）。 */
  targetConfidence: number;
  /** 当前时间 ISO 字符串。 */
  nowIso: string;
  /** 纠正理由（写入历史记录）；缺省时用「用户明确纠正」。 */
  reason?: string;
  /** 记忆当前置信度（用于历史记录的 from）。 */
  currentConfidence: number;
}

/**
 * 用户显式纠正：直接设定置信度，优先级高于自动降权的累加。
 *
 * 与 `applyFailureFeedback` 的区别：自动降权是「失败 → 扣固定 delta」；
 * 用户纠正是「用户说这条错/对 → 直接设到目标值」。用户纠正后，
 * 后续自动降权在用户设定值基础上继续累加（用户纠正不锁死，只是重置基线）。
 */
export function applyUserCorrection(input: UserCorrectionInput): MemoryCorrectionHistory {
  const target = clamp01(input.targetConfidence);
  return {
    at: input.nowIso,
    kind: "user-correct",
    from: input.currentConfidence,
    to: target,
    reason: input.reason || "用户明确纠正",
  };
}

// ─────────────────────────── 召回过滤 ───────────────────────────

export interface RecallFilterInput {
  memories: MemoryItem[];
  /** 降权阈值，缺省 DEFAULT_DEMOTE_THRESHOLD。 */
  threshold?: number;
}

export interface RecallFilterResult {
  /** 进入活跃检索的记忆（置信度 >= 阈值）。 */
  active: MemoryItem[];
  /** 被降权排除的记忆（置信度 < 阈值，记录保留以供审计/档案）。 */
  demoted: MemoryItem[];
}

/**
 * 按置信度阈值过滤召回集：低于阈值的从活跃检索排除，但保留记录。
 *
 * 注意：本函数只做过滤，不做删除——demoted 的记录仍在档案中可见，
 * 供 LLM 在召回档案里看到「这条曾被降权，原因是 X」。
 */
export function filterRecallableMemories(input: RecallFilterInput): RecallFilterResult {
  const threshold = input.threshold ?? DEFAULT_DEMOTE_THRESHOLD;
  const active: MemoryItem[] = [];
  const demoted: MemoryItem[] = [];
  for (const item of input.memories) {
    if ((item.confidence ?? 0) >= threshold) active.push(item);
    else demoted.push(item);
  }
  return { active, demoted };
}

// ─────────────────────────── 召回档案（禁止 LLM 自行推理） ───────────────────────────

export interface MemoryDossierInput {
  memory: MemoryItem;
  /** 该记忆的置信度变更历史（调用方从存储读取后传入）。 */
  history: MemoryCorrectionHistory[];
  /** 相关事件摘要（如"配额熔断模块由该 agent 实现"），调用方按需传入。 */
  relatedEvents?: string[];
  /** 降权阈值，用于判定 active 状态。 */
  threshold?: number;
}

export interface MemoryDossier {
  memoryId: string;
  content: string;
  provenance: ConfidenceProvenance;
  confidence: number;
  history: MemoryCorrectionHistory[];
  relatedEvents: string[];
  /** 是否在活跃检索中（置信度 >= 阈值）。 */
  active: boolean;
  /** inferred 高置信度异常标记（数据不一致预警）。 */
  suspect: boolean;
  /** 完整档案文本（无色纯文本，供 LLM 直接读取，禁止自行推理）。 */
  dossierText: string;
}

/**
 * 构建单条记忆的完整召回档案。
 *
 * 这是本模块的核心——不是只给模型记忆内容，而是给**完整档案**：
 * 内容、来源、置信度及其变迁历史、相关事件。模型看到这个，不需要"推理"，
 * 直接读取事实。尤其降权后的记忆：档案会明确标注「曾被降权，原因是 X」，
 * 避免模型凭内容自行推断它仍可信。
 */
export function buildMemoryDossier(input: MemoryDossierInput): MemoryDossier {
  const threshold = input.threshold ?? DEFAULT_DEMOTE_THRESHOLD;
  const provenance = inferProvenance(input.memory);
  const confidence = input.memory.confidence ?? 0;
  const active = confidence >= threshold;
  const suspect =
    provenance === "inferred" && confidence > SUSPECT_INFERRED_HIGH_CONFIDENCE;

  const dossierText = formatDossierText({
    content: input.memory.content,
    provenance,
    confidence,
    active,
    suspect,
    history: input.history,
    relatedEvents: input.relatedEvents ?? [],
  });

  return {
    memoryId: input.memory.id,
    content: input.memory.content,
    provenance,
    confidence,
    history: input.history,
    relatedEvents: input.relatedEvents ?? [],
    active,
    suspect,
    dossierText,
  };
}

/**
 * 批量构建召回档案（召回时对每条候选记忆生成档案）。
 *
 * 典型用法：召回流程先 filterRecallableMemories 分出 active/demoted，
 * 再对本应展示给 LLM 的记忆（active 全部 + demoted 中需审计的）调用本函数，
 * 把 dossierText 拼进 prompt block。
 */
export function buildMemoryDossiers(
  memories: MemoryItem[],
  historiesByMemoryId: Map<string, MemoryCorrectionHistory[]>,
  relatedEventsByMemoryId?: Map<string, string[]>,
  threshold?: number,
): MemoryDossier[] {
  return memories.map((memory) =>
    buildMemoryDossier({
      memory,
      history: historiesByMemoryId.get(memory.id) ?? [],
      relatedEvents: relatedEventsByMemoryId?.get(memory.id),
      threshold,
    }),
  );
}

function formatDossierText(args: {
  content: string;
  provenance: ConfidenceProvenance;
  confidence: number;
  active: boolean;
  suspect: boolean;
  history: MemoryCorrectionHistory[];
  relatedEvents: string[];
}): string {
  const { content, provenance, confidence, active, suspect, history, relatedEvents } =
    args;

  const lines: string[] = [];
  lines.push(`记忆：${content}`);
  lines.push(`来源：${provenanceLabel(provenance)}`);
  lines.push(
    `置信度：${confidence.toFixed(2)}${active ? "" : "（已降权，不在活跃检索中）"}`,
  );
  if (suspect) {
    lines.push(`⚠ 存疑：inferred 来源但置信度异常高（数据不一致）`);
  }

  if (history.length > 0) {
    lines.push("历史：");
    for (const record of history) {
      const fromStr =
        typeof record.from === "number" ? record.from.toFixed(2) : "—";
      lines.push(
        `  [${recordKindLabel(record.kind)}] ${record.at} ` +
          `${fromStr} → ${record.to.toFixed(2)} · ${record.reason}`,
      );
    }
  }

  if (relatedEvents.length > 0) {
    lines.push(`相关事件：${relatedEvents.join("；")}`);
  }

  return lines.join("\n");
}

function provenanceLabel(provenance: ConfidenceProvenance): string {
  switch (provenance) {
    case "verified":
      return "verified（工具/命令实测验证过）";
    case "stated":
      return "stated（用户明确陈述）";
    case "inferred":
      return "inferred（模型推断，未验证）";
  }
}

function recordKindLabel(kind: MemoryCorrectionHistory["kind"]): string {
  switch (kind) {
    case "create":
      return "初始";
    case "verify":
      return "验证";
    case "demote":
      return "降权";
    case "user-correct":
      return "用户纠正";
    case "reinforce":
      return "强化";
  }
}

// ─────────────────────────── 历史记录追加 ───────────────────────────

/**
 * 向已有历史追加一条记录（纯函数，返回新数组，不修改原数组）。
 *
 * 调用方在 applyFailureFeedback / applyUserCorrection 产出记录后，
 * 用本函数把记录追加进该记忆的历史链。落盘归适配层。
 */
export function appendCorrectionHistory(
  existing: MemoryCorrectionHistory[],
  record: MemoryCorrectionHistory,
): MemoryCorrectionHistory[] {
  return [...existing, record];
}
