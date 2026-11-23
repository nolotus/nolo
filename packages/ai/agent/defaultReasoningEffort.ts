import type { ReasoningEffort } from "./createAgentSchema";
import { REASONING_EFFORT_OPTIONS } from "./createAgentSchema";
import { REASONING_EFFORT_SUFFIXES } from "./candidateSpeedContext";
import { resolveModelReasoningCapability } from "./modelReasoningCapability";

// API quality, cost and latency comparisons, 2026-11-15: https://artificialanalysis.ai/models
// These are deliberately explicit IDs: model-name effort suffixes are not parameters.
const defaults: Record<string, "medium" | "high"> = {
  "gpt-6.2-sol": "medium", "gpt-6.2-astra": "high",
  "gpt-6.1-sol": "medium", "gpt-6.1-terra": "medium",
  "gpt-6-luna": "medium", "gpt-6-astra": "high",
  "claude-opus-5-5": "medium", "claude-sonnet-5-5": "high",
  "deepseek-flash": "high", "deepseek-v4-flash": "high", "deepseek-v4.1-flash": "high",
};
const deepseekChannels = new Set(["opendesign", "ollama-cloud", "lithosai"]);
const providers = new Set(["nolo", "openai", "openrouter", "anthropic", "deepseek", "commandcode", "opencode-go", "stepfun"]);

export function resolveDefaultReasoningEffort<T extends ReasoningEffort>(input: {
  provider?: string | null; model?: string | null; fallback: T;
}): T | "medium" | "high" {
  const provider = (input.provider ?? "").toLowerCase();
  const model = (input.model ?? "").toLowerCase().split("/").pop() ?? "";
  const isDeepseekFlash = ["deepseek-flash", "deepseek-v4-flash", "deepseek-v4.1-flash"].includes(model);
  const effort = providers.has(provider) || (deepseekChannels.has(provider) && isDeepseekFlash) ? defaults[model] : undefined;
  if (!effort) return input.fallback;
  // Native and hosted Claude adapters send output_config.effort.
  if (provider === "nolo" && model.startsWith("claude-") && input.model?.startsWith("anthropic/")) return effort;
  // Native Claude adaptive thinking sends output_config.effort.
  if (provider === "anthropic" && model.startsWith("claude-")) return effort;
  return resolveModelReasoningCapability(provider, input.model).efforts.includes(effort)
    ? effort : input.fallback;
}

/**
 * 只采信**已确认**的推理能力：模型级 override、provider 级映射（`provider-map`、
 * 未登记 provider 用的乐观默认（low/medium/high），拿它加 `--reasoning-effort`
 * 就是「给不支持推理档的通道硬塞参数」。所以 fallback 与空谱系一律不采信。
 */
function confirmedReasoningEfforts(
  provider: string | null | undefined,
  model: string | null | undefined,
): ReasoningEffort[] | undefined {
  const capability = resolveModelReasoningCapability(provider, model);
  if (capability.source === "provider-fallback") return undefined;
  if (capability.efforts.length === 0) return undefined;
  return capability.efforts;
}

/** 派发难度 → 目标推理档（优先项在前，逐项按模型能力钳制）。 */export type DispatchReasoningDifficulty = "easy" | "normal" | "complex" | "extreme";

const DISPATCH_EFFORT_PREFERENCES: Record<
  DispatchReasoningDifficulty,
  readonly ReasoningEffort[]
> = {
  easy: ["low", "minimal", "medium"],
  normal: ["medium", "low", "high"],
  complex: ["high", "medium"],
  extreme: ["xhigh", "max", "high"],
};

const DISPATCH_DIFFICULTIES = new Set<string>(["easy", "normal", "complex", "extreme"]);

function normalizeDifficulty(
  difficulty: DispatchReasoningDifficulty | string | null | undefined,
): DispatchReasoningDifficulty {
  const normalized = (difficulty ?? "").trim().toLowerCase();
  // 未知/缺失难度按 normal 处理：这是「不改变用户既有观感」的中位档，
  // 不会把简单任务硬拉高推理成本，也不会把复杂任务降档。
  return DISPATCH_DIFFICULTIES.has(normalized)
    ? (normalized as DispatchReasoningDifficulty)
    : "normal";
}

function asValidAgentEffort(
  raw: string | null | undefined,
): ReasoningEffort | undefined {
  const normalized = (raw ?? "").trim().toLowerCase();
  return (REASONING_EFFORT_OPTIONS as readonly string[]).includes(normalized)
    ? (normalized as ReasoningEffort)
    : undefined;
}

/**
 * 模型名是否自带推理档后缀（`-low` / `-medium` / `-high` / `-xhigh` / `-minimal`）。
 * 后缀是模型身份的一部分，不是可覆盖参数：这类模型已经由名字固定档位，
 * 再追加一个 `reasoning_effort` 只会制造两处互相矛盾的真值。
 */
export function hasReasoningEffortSuffix(model: string | null | undefined): boolean {
  const normalized = (model ?? "").trim().toLowerCase().split("/").pop() ?? "";
  return REASONING_EFFORT_SUFFIXES.some((suffix) => normalized.endsWith(`-${suffix}`));
}

/**
 * 按任务难度给出本次派发的推理档。
 *
 * 只在「用户没有显式定档」且「模型确实支持 reasoning_effort」时返回一个值；
 * 其余情况一律返回 `undefined`（= 不追加 `--reasoning-effort`，沿用 agent 记录里的
 * 既有生效值）：
 * - agent 配置里已有有效 `reasoning_effort`（显式固定）→ 尊重，不越权覆盖；
 * - 模型名自带档位后缀 → 尊重，不越权覆盖；
 * - 模型不走 reasoning_effort（`efforts` 为空，如 Anthropic/Google thinking 机制）→ 不传。
 */
export function resolveDispatchReasoningEffort(input: {
  difficulty?: DispatchReasoningDifficulty | string;
  provider?: string | null;
  model?: string | null;
  agentReasoningEffort?: string | null;
}): ReasoningEffort | undefined {
  if (asValidAgentEffort(input.agentReasoningEffort)) return undefined;
  if (hasReasoningEffortSuffix(input.model)) return undefined;
  // 未能确认 provider 或 model 时，`resolveModelReasoningCapability` 给出的只是
  // provider-fallback 的乐观默认谱系（low/medium/high），不是**已确认能力**。
  // 拿它去加参数正是「给不支持 reasoning_effort 的模型硬塞参数」的成因，所以
  // 这里 fail-closed：确认不了就不采信。
  if (!(input.provider ?? "").trim() || !(input.model ?? "").trim()) return undefined;
  const efforts = confirmedReasoningEfforts(input.provider, input.model);
  if (!efforts) return undefined;
  const preferences = DISPATCH_EFFORT_PREFERENCES[normalizeDifficulty(input.difficulty)];
  return preferences.find((effort) => efforts.includes(effort));
}

/**
 * 子进程侧双保险：本次 run 收到的 `--reasoning-effort` 是否应该真的覆盖已加载配置。
 *
 * 派发方只在「记录没有显式档位 + 模型支持该档位」时才追加该参数，但派发与子进程
 * 启动之间配置可能已变（用户改了档位、换了模型）。所以真正生效前再核对一次：
 * - 记录里已有有效 `reasoning_effort`（用户显式固定）→ 不覆盖；
 * - 模型名自带档位后缀 → 不覆盖；
 * - provider / model 未知 → 不覆盖（确认不了能力就不动）；
 * - 该 provider+model 的能力未经确认（未登记 provider 的 fallback 谱系）或不含该档位
 *   → 不覆盖（不盲目硬覆盖）。
 *
 * 返回 `undefined` 表示「本次不覆盖」，调用方应原样使用记录里的值。
 */
export function resolveEffectiveReasoningEffortOverride(input: {
  override?: ReasoningEffort | null;
  provider?: string | null;
  model?: string | null;
  recordReasoningEffort?: string | null;
}): ReasoningEffort | undefined {
  const override = asValidAgentEffort(input.override);
  if (!override) return undefined;
  if (asValidAgentEffort(input.recordReasoningEffort)) return undefined;
  if (hasReasoningEffortSuffix(input.model)) return undefined;
  if (!(input.provider ?? "").trim() || !(input.model ?? "").trim()) return undefined;
  const efforts = confirmedReasoningEfforts(input.provider, input.model);
  return efforts?.includes(override) ? override : undefined;
}

/**
 * 内存里给本次 run 的配置覆盖推理档（不落盘、不改传入对象）。
 *
 * rawRecord 一并覆盖：部分下游从 rawRecord 重新读档位，只改顶层会让它们看到旧值。
 * 没有覆盖值（`undefined`）时原样返回，调用方可据此判断「本次没有覆盖」。
 */
export function withReasoningEffortOverride<
  T extends { reasoning_effort?: string; rawRecord?: Record<string, unknown> },
>(config: T, effort: ReasoningEffort | null | undefined): T {
  if (!effort) return config;
  return {
    ...config,
    reasoning_effort: effort,
    ...(config.rawRecord
      ? { rawRecord: { ...config.rawRecord, reasoning_effort: effort } }
      : {}),
  };
}
