/**
 * Tier guidance with one narrow admission gate: domain suitability still precedes tier,
 * and this module never picks or downgrades a model. The only hard stop it owns is a
 * known model at least two tiers above the task without a free-text selectionReason.
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
 * Correctable error: the upward jump needs a reason before the dispatch may start.
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

export const DISPATCH_TIER_RANK = { easy: 0, normal: 1, complex: 2, extreme: 3 } as const;

/** AA 2026-11-21 calibration. Aliases are model IDs, never agent names. */
const MODEL_TIERS: ReadonlyArray<{
  tier: DispatchDifficulty;
  models: readonly string[];
  pattern: RegExp;
}> = [
  {
    tier: "extreme",
    models: ["Claude Fable 5.1/5.2、Opus 5.5", "GPT-6/6.2 Astra", "Gemini 4 Neon/Carbon"],
    pattern: /^(?:gpt-6(?:[.-]2)?-astra|claude-(?:fable-5[.-][12]|opus-5[.-]5)|gemini-4-(?:neon|carbon))(?:$|[-@])/,
  },
  {
    tier: "complex",
    models: [
      "GPT-5.6/6/6.1/6.2 Sol、5.6/6.1 Terra",
      "Claude Sonnet 5.5",
      "Gemini 4 Hydrogen/Argon、2.5 Pro",
      "Kimi K3/K3.1 Pro",
      "DeepSeek V4 Pro",
    ],
    pattern:
      /^(?:gpt-(?:(?:5[.-]6|6(?:[.-][12])?)-sol|(?:5[.-]6|6[.-]1)-terra)|gemini-(?:4-(?:hydrogen|argon)|2[.-]5-pro)|claude-sonnet-5[.-]5|kimi-k3(?:[.-]1-pro)?|k3(?:-256k)?|deepseek-v4-pro)(?:$|[-@])/,
  },
  {
    tier: "normal",
    models: [
      "Claude Haiku 4.5/5.5",
      "DeepSeek Flash（各代）",
      "GLM 5.3/Flash",
      "MiMo V2.6 Pro",
      "Grok 4.6/4.7",
      "Gemini 3.6-3.8 Flash",
      "LongCat 2.5",
    ],
    pattern:
      /^(?:claude-haiku-[45][.-]5|deepseek-(?:[a-z0-9.-]+-)?flash|glm-5[.-]3|mimo-v2[.-]6-pro|grok-4[.-][67]|gemini-3[.-][678]-flash|longcat-2[.-]5)(?:$|[-@])/,
  },
  {
    tier: "easy",
    models: ["MiniMax M3.1 Flash", "GPT-5.6/6 Luna"],
    pattern: /^(?:minimax-m3[.-]1-flash|gpt-(?:5[.-]6|6)-luna)(?:$|[-@])/,
  },
];

export const MODEL_TIER_GUIDANCE = MODEL_TIERS.map(
  ({ tier, models }) => `${tier}: ${models.join("、")}`,
).join("\n");

/**
 * 任务难度判档（短版单一真值）。
 *
 * 顺序是「先判子任务 difficulty，再按该档选模型」；升档只看任务本身，不看重要度、
 * 文件数、耗时、目录敏感度，也不因「更稳妥/更安全/独立 review」而升。
 * - ORDER：判档顺序与不升档边界；
 * - TIERS：四档判据与重新判档；两者都进 min / full 共用段（server 线永远只有 min）。
 * 工具侧准入不变：只校验「已知模型高出至少两档时是否给了理由」，不推断档位、不自动换人。
 */
export const DIFFICULTY_GRADING_ORDER = `- **先判档再选模型**（规划复杂≠执行复杂）：先定子任务 difficulty 再选该档胜任模型；重要度、文件数、耗时、发布安全目录不升档，「更稳妥/更安全/独立 review」不是升档理由，选足够胜任的最低档，不为降档拆碎。`;

export const DIFFICULTY_GRADING_TIERS = `    - 四档：easy＝根因与做法明确、局部可验；normal＝按既定契约实现/验证或局部定位；complex＝多根因、跨状态或并发兼容取舍；extreme＝架构未定或安全/完整性重大取舍。升档须指出本块未决点，不按项目整体定档。实现与复审重判，不继承规划档。`;

export function resolveModelTier(model: unknown): ModelTier {
  if (typeof model !== "string") return "unknown";
  const id = model.trim().toLowerCase().split("/").at(-1)!.replace(/\s+/g, "-");
  if (id.includes("-image") || id.startsWith("nano-banana")) return "unknown";
  return MODEL_TIERS.find(({ pattern }) => pattern.test(id))?.tier ?? "unknown";
}

export function normalizeDispatchDifficulty(
  value: unknown,
): DispatchDifficulty {
  if (value === "easy" || value === "简单") return "easy";
  if (value === "complex" || value === "复杂") return "complex";
  if (value === "extreme" || value === "极端复杂" || value === "极其复杂")
    return "extreme";
  return "normal";
}

function normalizeSelectionReason(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requiresSelectionReason(difficulty: DispatchDifficulty, modelTier: ModelTier): boolean {
  return modelTier !== "unknown" && DISPATCH_TIER_RANK[modelTier] - DISPATCH_TIER_RANK[difficulty] >= 2;
}

export function checkDispatchSelection(
  input: DispatchSelectionInput,
): SelectionCheck {
  const dimension: DispatchDimension =
    input.dimension === "design_frontend" || input.dimension === "writing"
      ? input.dimension
      : "general";
  const difficulty = normalizeDispatchDifficulty(input.difficulty);
  const modelTier = resolveModelTier(input.model);
  const status =
    modelTier === "unknown"
      ? "unknown"
      : modelTier === difficulty
        ? "matched"
        : "mismatch";
  const selectionReason = normalizeSelectionReason(input.selectionReason);
  const message =
    status === "matched"
      ? undefined
      : status === "unknown"
        ? "模型档位未知；按领域与可用性判断，不阻断，已启动勿自动重派。"
        : selectionReason
          ? "档位与难度不一致；已给出跨档理由，不阻断，已启动勿自动重派。"
          : requiresSelectionReason(difficulty, modelTier)
            ? "模型高出任务难度至少两档；启动前需在 selectionReason 说明理由。"
            : "档位与难度不一致；不阻断，已启动勿自动重派。";
  return {
    dimension,
    difficulty,
    modelTier,
    status,
    ...(message ? { message } : {}),
    ...(selectionReason ? { selectionReason } : {}),
  };
}

/**
 * Shared admission gate for Web and CLI: only a known model two or more tiers above the task
 * needs a non-empty selectionReason. Only the presence of the reason is validated —
 * this says nothing about user authorization, credit/permission boundaries, model
 * availability or network reachability, and it never picks or downgrades a model itself.
 */
export function checkDispatchSelectionAdmission(
  input: DispatchSelectionInput,
): DispatchSelectionAdmission {
  const check = checkDispatchSelection(input);
  if (!requiresSelectionReason(check.difficulty, check.modelTier) || check.selectionReason)
    return { ok: true, check };
  const error: DispatchSelectionAdmissionError = {
    code: "selection_reason_required",
    message: `跨档选择缺少 selectionReason：模型档位 ${check.modelTier} 高出任务难度 ${check.difficulty} 至少两档，请补充本次跨档的具体理由后再启动。`,
    hint: "补一句本次为什么这样跨档（如领域优势、用户明确指定）即可；只校验理由是否存在，不代表已核实用户授权、额度/费用权限或网络可用性。",
  };
  return { ok: false, check, error };
}

/** Throwing variant of {@link checkDispatchSelectionAdmission}; callers must not start the dispatch when it throws. */
export function assertDispatchSelectionAdmission(
  input: DispatchSelectionInput,
): SelectionCheck {
  const admission = checkDispatchSelectionAdmission(input);
  // The hint travels with the message: the caller (model) must be able to
  // self-correct without guessing which field is missing.
  if (!admission.ok && admission.error)
    throw new Error(`${admission.error.message} ${admission.error.hint}`);
  return admission.check;
}
