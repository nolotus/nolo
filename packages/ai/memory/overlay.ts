import type { MemoryItem, MemoryFacet } from "./types";
import { EXPLICIT_REMEMBER_PREFIX_REGEX } from "./constants";
import { getMemorySourceKind } from "./source";

const KIND_TITLES: Record<MemoryItem["kind"], string> = {
  episodic: "Episodic",
  semantic: "Semantic",
  procedural: "Procedural",
};

/**
 * 粗估 token 数。CJK 字符按 1.5 token 估算，ASCII 按 4 字符/token 估算。
 * 不追求精确——只需在预算截断时给出合理的相对度量。
 */
const estimateTokens = (text: string): number => {
  let cjk = 0;
  let ascii = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x3400 && code <= 0x9fff) cjk += 1;
    else ascii += 1;
  }
  return Math.ceil(cjk * 1.5 + ascii / 4);
};

/** overlay 头部固定开销。压缩为一行——省 ~60 tokens 给记忆内容。 */
const OVERLAY_HEADER_LINES = [
  "--- Memory (相关时参考，用户输入优先) ---",
  "",
];
const OVERLAY_HEADER_TOKENS = estimateTokens(OVERLAY_HEADER_LINES.join("\n"));

/**
 * 按 kind 优先级排序，用于预算截断时决定谁先留。
 * semantic > procedural > episodic——稳定事实优先于过程性知识，过程性优先于具体事件。
 */
const KIND_PRIORITY: Record<MemoryItem["kind"], number> = {
  semantic: 0,
  procedural: 1,
  episodic: 2,
};

export interface BuildMemoryOverlayOptions {
  /**
   * 软上限 token 预算（粗估）。默认 DEFAULT_MEMORY_OVERLAY_TOKEN_BUDGET
   * （取值依据见该常量注释）。超出时按 kind 优先级 + 传入顺序截断。
   */
  maxTokens?: number;
  /** 每个 kind 最多显示几条。默认 3。 */
  perKindLimit?: number;
}

/**
 * facet → 显示文本的映射表。semantic 和 episodic 共用同一张表。
 * semantic 不加前缀（稳定事实，内容本身已说明）；episodic 加 "上次: " 前缀。
 *
 * `strip` 是 content 里可能带的前缀词，显示时去掉避免重复（如 "在权衡：在权衡 X" → "在权衡 X"）。
 */
const FACET_DISPLAY: Record<MemoryFacet, { label: string; strip: string }> = {
  unfinished: { label: "还没定下", strip: "还没决定" },
  tension:    { label: "在权衡",   strip: "在权衡" },
  preference: { label: "更在意",   strip: "更在意" },
  style:      { label: "更偏好",   strip: "更喜欢" },
  goal:       { label: "想推进",   strip: "想推进" },
};

/**
 * 推断来源的行内标记。
 *
 * 系统提示词要求「不要把 inferred 的记忆说成用户明确告诉过我」，但 overlay 此前
 * 只输出裸内容，模型无从分辨哪条是用户亲口说的、哪条是 agent 自己猜的——这条纪律
 * 在数据上无法遵守。这里对推断类来源加显式标记，让存疑可见。
 *
 * 只标推断类（inferred-understanding / dialog-learning）：agent-tool 是 agent 主动
 * 判断要记的，explicit-user-directive 是用户亲口说的，都不需要打扰阅读。
 */
const INFERRED_SOURCE_KINDS = new Set(["inferred-understanding", "dialog-learning"]);

const isInferredMemory = (item: MemoryItem): boolean =>
  INFERRED_SOURCE_KINDS.has(getMemorySourceKind(item));

const formatFacetContent = (
  facet: MemoryFacet,
  normalized: string,
  prefix: string,
): string => {
  const { label, strip } = FACET_DISPLAY[facet];
  const stripped = normalized.startsWith(strip) ? normalized.slice(strip.length).trim() : normalized;
  return `${prefix}${label} ${stripped}`;
};

const normalizeDisplayContent = (item: MemoryItem): string => {
  const normalized = item.content
    .trim()
    .replace(EXPLICIT_REMEMBER_PREFIX_REGEX, "")
    .replace(/[。！？!?]+$/u, "")
    .trim();

  if (item.kind === "semantic") {
    if (item.tags?.includes("understanding-memory") && item.facet) {
      return formatFacetContent(item.facet, normalized, "");
    }
    return normalized;
  }

  if (
    item.kind === "episodic" &&
    (item.patternKey === "explicit-remember" || item.patternKey === "agent-remember")
  ) {
    return normalized;
  }

  if (item.kind === "episodic" && item.tags?.includes("understanding-memory") && item.facet) {
    return formatFacetContent(item.facet, normalized, "上次: ");
  }

  return normalized;
};

/**
 * kind 内的取舍：在 perKindLimit 名额内，保证至少有一条 subject=user 的记忆。
 *
 * 背景同 runtime.ts 的 user-subject 保底席位——上游选出的候选里 agent subject 的
 * 工程记忆数量占优（实测 143:77），若这里仍按纯 rank 顺序截前 N 条，用户长期偏好
 * 会在渲染层被二次挤掉，等于白保底。
 *
 * 名额未满或本就含 user subject 时，行为与原来的 slice 完全一致。
 */
const pickWithinKind = (list: MemoryItem[], perKindLimit: number): MemoryItem[] => {
  // perKindLimit <= 0 时直接返回空：否则下面的 slice(0, perKindLimit - 1) 会变成
  // 负数索引，静默丢条目而不是老实返回"一条都不要"。
  if (perKindLimit <= 0) return [];
  const head = list.slice(0, perKindLimit);
  if (head.length < perKindLimit) return head;
  if (head.some((item) => item.subjectType === "user")) return head;

  const firstUserSubject = list.find((item) => item.subjectType === "user");
  if (!firstUserSubject) return head;

  // 挤掉名额内排最后的一条，把 user subject 记忆放进来（保持相对顺序）
  return [...head.slice(0, perKindLimit - 1), firstUserSubject];
};

/**
 * Memory overlay 默认 token 预算——本模块是唯一真值点（SSOT）。
 * runtime.ts 的 MEMORY_OVERLAY_TOKEN_BUDGET 直接引用这里，避免两处硬编码漂移。
 *
 * 取 3200 的依据（基于 215 条真实记忆实测，2026-09-02）：
 * 单条内容中位数 334 字符、p90 606 字符，overlay 最多注入 9 条（3 kind × 3）。
 * 用库里最长的 9 条构造最坏场景（总计 5326 字符）实测装载情况：
 *   2000 → 9 条装入但 3 条被截断
 *   2600 → 仍有 1 条被截断
 *   3200 → 9 条全部完整装入（拐点）
 *   4000/5000 → 与 3200 完全相同，输出已饱和
 * 因此 3200 是"最坏场景零截断"的最小值，再往上只是白占 context window。
 */
export const DEFAULT_MEMORY_OVERLAY_TOKEN_BUDGET = 3200;

/**
 * 最小可用片段：低于这个 token 数的截断片段没有信息价值，不如让位给下一条。
 */
const MIN_TRUNCATED_TOKENS = 20;

/**
 * 把一行截断到目标 token 预算内，尾部加省略标记。
 * 预算不足以留下有意义片段时返回 null（调用方据此真丢弃）。
 */
const truncateLineToTokens = (lineText: string, budgetTokens: number): string | null => {
  if (budgetTokens < MIN_TRUNCATED_TOKENS) return null;
  const suffix = "…（本条已截断）";
  const suffixTokens = estimateTokens(suffix);
  const bodyBudget = budgetTokens - suffixTokens;
  if (bodyBudget < MIN_TRUNCATED_TOKENS / 2) return null;

  // 逐字符累加估算，保证不超预算（CJK 与 ASCII 的 token 密度不同，不能按字符数线性折算）
  let used = 0;
  let cut = 0;
  for (const ch of lineText) {
    const chTokens = estimateTokens(ch);
    if (used + chTokens > bodyBudget) break;
    used += chTokens;
    cut += ch.length;
  }
  if (cut <= 2) return null;
  return `${lineText.slice(0, cut).trimEnd()}${suffix}`;
};

export const buildMemoryOverlay = (
  items: MemoryItem[],
  options?: BuildMemoryOverlayOptions
): string | null => {
  if (items.length === 0) return null;

  const maxTokens = options?.maxTokens ?? DEFAULT_MEMORY_OVERLAY_TOKEN_BUDGET;
  const perKindLimit = options?.perKindLimit ?? 3;

  const byKind: Record<string, MemoryItem[]> = {
    episodic: [],
    semantic: [],
    procedural: [],
  };
  for (const item of items) {
    byKind[item.kind].push(item);
  }

  // 按预算截断：先固定开销，再按 kind 优先级 + 传入顺序逐条加入
  const remainingBudget = maxTokens - OVERLAY_HEADER_TOKENS;
  if (remainingBudget <= 0) {
    return OVERLAY_HEADER_LINES.join("\n");
  }

  // 把所有候选行展开，按 kind 优先级排序（semantic 先），同 kind 保持原 rank 顺序
  const allLines = (Object.entries(byKind) as [MemoryItem["kind"], MemoryItem[]][])
    .filter(([, list]) => list.length > 0)
    .flatMap(([kind, list]) =>
      pickWithinKind(list, perKindLimit).map((item) => {
        const lineText = `- ${isInferredMemory(item) ? "（推断）" : ""}${normalizeDisplayContent(item)}`;
        return { kind, lineText, lineTokens: estimateTokens(lineText) };
      })
    )
    .sort((a, b) => (KIND_PRIORITY[a.kind] ?? 99) - (KIND_PRIORITY[b.kind] ?? 99));

  // 预算内逐条加入。超预算的不再整条丢弃，而是截断保留开头——
  // 实测记忆体量中位数 334 字符、p90 606 字符，一条 1000+ 字的工程记忆能吃掉
  // 大半预算并把后面几条短的用户偏好全挤掉（9 条长记忆实测丢 3 条），
  // 而这类长记忆的开头通常已包含结论。截断保留胜过整条消失。
  let usedTokens = 0;
  const keptByKind: Record<string, string[]> = {};
  let truncatedCount = 0;
  let droppedCount = 0;
  for (const candidate of allLines) {
    const remaining = remainingBudget - usedTokens;
    if (remaining <= 0) {
      droppedCount += 1;
      continue;
    }
    if (candidate.lineTokens <= remaining) {
      usedTokens += candidate.lineTokens;
      if (!keptByKind[candidate.kind]) keptByKind[candidate.kind] = [];
      keptByKind[candidate.kind].push(candidate.lineText);
      continue;
    }
    // 放不下：若剩余预算够放一个有意义的片段就截断保留，否则真丢弃
    const truncated = truncateLineToTokens(candidate.lineText, remaining);
    if (!truncated) {
      droppedCount += 1;
      continue;
    }
    usedTokens += estimateTokens(truncated);
    if (!keptByKind[candidate.kind]) keptByKind[candidate.kind] = [];
    keptByKind[candidate.kind].push(truncated);
    truncatedCount += 1;
  }

  // 按 kind 标题顺序组装 sections（semantic → procedural → episodic）
  const kindOrder: MemoryItem["kind"][] = ["semantic", "procedural", "episodic"];
  const sections = kindOrder
    .filter((kind) => keptByKind[kind] && keptByKind[kind].length > 0)
    .map((kind) => {
      return [`[${KIND_TITLES[kind]}]`, ...keptByKind[kind]].join("\n");
    });

  if (sections.length === 0) {
    // 所有行都被预算截掉了——只返回头部
    return OVERLAY_HEADER_LINES.join("\n");
  }

  // 预算不足导致的信息缺失必须可见：此前截断与丢弃都是静默的，模型以为
  // 眼前这几条就是全部记忆，不会想到还能用 queryMemory 补查。
  const notices: string[] = [];
  if (truncatedCount > 0) {
    notices.push(`${truncatedCount} 条因预算被截断`);
  }
  if (droppedCount > 0) {
    notices.push(`${droppedCount} 条未显示`);
  }
  const footer =
    notices.length > 0
      ? [`（${notices.join("、")}；需要完整内容或更多相关记忆时用 queryMemory 检索）`]
      : [];

  return [...OVERLAY_HEADER_LINES, ...sections, ...footer].join("\n");
};
