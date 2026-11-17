/**
 * Tier guidance with one narrow admission gate: domain suitability still precedes tier,
 * and this module never picks or downgrades a model. The only hard stop it owns is a
 * **known** tier mismatch that arrives without a free-text selectionReason — matched
 * tiers and unknown models stay non-blocking.
 */
export type DispatchDimension = "general" | "design_frontend" | "writing";
export type DispatchDifficulty = "easy" | "normal" | "complex" | "extreme";
export type ModelTier = DispatchDifficulty | "unknown";
export interface SelectionCheck {
  dimension: DispatchDimension;
  difficulty: DispatchDifficulty;
  modelTier: ModelTier;
  status: "matched" | "mismatch" | "unknown";
  message?: string;
  /** Free-text reason for a cross-tier choice; presence only, never an enum or an evidence record. */
  selectionReason?: string;
}

/** Admission inputs shared by Web and CLI callers. */
export interface DispatchSelectionInput {
  dimension?: unknown;
  difficulty?: unknown;
  model?: unknown;
  /** Free-text reason explaining a cross-tier choice; only presence is validated. */
  selectionReason?: unknown;
}

/**
 * Correctable error: the cross-tier choice needs a reason before the dispatch may start.
 * It only reports that the reason is missing; it does not verify user authorization,
 * credit/permission boundaries, model availability or any network fact.
 */
export interface DispatchSelectionAdmissionError {
  code: "selection_reason_required";
  message: string;
  hint: string;
}

export interface DispatchSelectionAdmission {
  ok: boolean;
  check: SelectionCheck;
  error?: DispatchSelectionAdmissionError;
}

/** Single manually maintained model-tier mapping; aliases are model IDs, never agent names. */
const MODEL_TIERS: ReadonlyArray<{ tier: DispatchDifficulty; models: readonly string[]; pattern: RegExp }> = [
  { tier: "extreme", models: ["GPT-6 Astra", "Claude Opus 5.5"], pattern: /^(?:gpt-6-astra|claude-opus-5[.-]5)(?:$|[-@])/ },
  { tier: "complex", models: ["GPT-6.1 Sol", "Gemini 4 Argon", "Claude Fable 5.1", "Claude Sonnet 5.5", "MiMo V2.6 Pro", "Kimi K3", "Gemini 2.5 Pro"], pattern: /^(?:gpt-6[.-]1-sol|gemini-4-argon|claude-fable-5[.-]1|claude-sonnet-5[.-]5|mimo-v2[.-]6-pro|kimi-k3|gemini-2[.-]5-pro)(?:$|[-@])/ },
  { tier: "normal", models: ["DeepSeek Flash（各代）", "LongCat 2.5", "Gemini 3.8 Flash", "GLM 5.3 Flash"], pattern: /^(?:deepseek-(?:[a-z0-9.-]+-)?flash(?:[-@].*)?|longcat-2[.-]5|gemini-3[.-]8-flash|glm-5[.-]3-flash)(?:$|[-@])/ },
  { tier: "easy", models: ["MiniMax M3.1 Flash", "GPT-6 Luna"], pattern: /^(?:(?:minimax-)?m3[.-]1-flash|gpt-6-luna)(?:$|[-@])/ },
];

export const MODEL_TIER_GUIDANCE = MODEL_TIERS.map(({ tier, models }) => `${tier}: ${models.join("、")}`).join("\n");

/**
 * 任务难度判档（短版单一真值）。
 *
 * 顺序是「先判子任务 difficulty，再按该档选模型」；升档只看任务本身，不看重要度、
 * 文件数、耗时、目录敏感度，也不因「更稳妥/更安全/独立 review」而升。
 * - ORDER：判档顺序与不升档边界；
 * - TIERS：四档判据与重新判档；两者都进 min / full 共用段（server 线永远只有 min）。
 * 工具侧准入不变：仍只校验「已知跨档是否给了理由」，不推断档位、不自动换人。
 */
export const DIFFICULTY_GRADING_ORDER = `- **先判档再选模型**（规划复杂≠执行复杂）：先定子任务 difficulty 再选该档胜任模型；重要度、文件数、耗时、发布安全目录不升档，「更稳妥/更安全/独立 review」不是升档理由，选足够胜任的最低档，不为降档拆碎。`;

export const DIFFICULTY_GRADING_TIERS = `    - 四档：easy＝根因与做法明确、局部可验；normal＝局部定位、有契约、无跨模块取舍；complex＝多根因或跨模块/跨状态，兼顾并发兼容；extreme＝架构未定或安全/完整性重大取舍。根因/接口定下后实现与复审重新判档，不继承规划档。`;


export function resolveModelTier(model: unknown): ModelTier {
  if (typeof model !== "string") return "unknown";
  const id = model.trim().toLowerCase().split("/").at(-1)!.replace(/\s+/g, "-");
  return MODEL_TIERS.find(({ pattern }) => pattern.test(id))?.tier ?? "unknown";
}

export function normalizeDispatchDifficulty(value: unknown): DispatchDifficulty {
  if (value === "easy" || value === "简单") return "easy";
  if (value === "complex" || value === "复杂") return "complex";
  if (value === "extreme" || value === "极端复杂" || value === "极其复杂") return "extreme";
  return "normal";
}

function normalizeSelectionReason(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function checkDispatchSelection(input: DispatchSelectionInput): SelectionCheck {
  const dimension: DispatchDimension = input.dimension === "design_frontend" || input.dimension === "writing" ? input.dimension : "general";
  const difficulty = normalizeDispatchDifficulty(input.difficulty);
  const modelTier = resolveModelTier(input.model);
  const status = modelTier === "unknown" ? "unknown" : modelTier === difficulty ? "matched" : "mismatch";
  const selectionReason = normalizeSelectionReason(input.selectionReason);
  const message = status === "matched" ? undefined
    : status === "unknown" ? "模型档位未知；按领域与可用性判断，不阻断，已启动勿自动重派。"
    : selectionReason ? "档位与难度不一致；已给出跨档理由，不阻断，已启动勿自动重派。"
    : "档位与难度不一致；跨档派发需在 selectionReason 说明理由。";
  return { dimension, difficulty, modelTier, status, ...(message ? { message } : {}), ...(selectionReason ? { selectionReason } : {}) };
}

/**
 * Shared admission gate for Web and CLI: a known tier mismatch may only start once a
 * non-empty selectionReason is supplied. Matched tiers and unknown models need no reason
 * (unknown model stays non-blocking). Only the presence of the reason is validated —
 * this says nothing about user authorization, credit/permission boundaries, model
 * availability or network reachability, and it never picks or downgrades a model itself.
 */
export function checkDispatchSelectionAdmission(input: DispatchSelectionInput): DispatchSelectionAdmission {
  const check = checkDispatchSelection(input);
  if (check.status !== "mismatch" || check.selectionReason) return { ok: true, check };
  const error: DispatchSelectionAdmissionError = {
    code: "selection_reason_required",
    message: `跨档选择缺少 selectionReason：档位 ${check.modelTier} 与难度 ${check.difficulty} 不一致，请补充本次跨档的具体理由后再启动。`,
    hint: "补一句本次为什么这样跨档（如领域优势、用户明确指定）即可；只校验理由是否存在，不代表已核实用户授权、额度/费用权限或网络可用性。",
  };
  return { ok: false, check, error };
}

/** Throwing variant of {@link checkDispatchSelectionAdmission}; callers must not start the dispatch when it throws. */
export function assertDispatchSelectionAdmission(input: DispatchSelectionInput): SelectionCheck {
  const admission = checkDispatchSelectionAdmission(input);
  // The hint travels with the message: the caller (model) must be able to
  // self-correct without guessing which field is missing.
  if (!admission.ok && admission.error) throw new Error(`${admission.error.message} ${admission.error.hint}`);
  return admission.check;
}
