// ai/llm/modelAbility.ts
//
// Minimal code-level model capability table — LEGACY display/reference metadata.
// Values are 0-100 scores transcribed from benchmark snapshots and domain evaluations.
// No composite score, no steps, no recommendedFor — just optional numeric capability signals.
//
// Boundary (do not blur): this table is NOT the quality truth for task routing.
// Domain-aware routing reads ai/llm/modelQualityEvidence.ts, where each domain
// carries its own independent dimensions (e.g. writing.creative has separate
// preference / rubric / slop / repetition / length evidence, each with its own
// benchmark identity and direction). `writingScore` here is a coarse legacy
// reference number: it must never be treated as that creative-writing evidence,
// and the two must never be combined, weighted or averaged. The default
// listAgents compact projection does not carry modelAbility at all, so the
// selector normally never sees this table.
//
// `aaSnapshot` is a separate, explicitly bounded signal: one reading session of
// Artificial Analysis' domain-agnostic metrics (intelligence index, output
// speed, first-answer-token latency, cost per Intelligence-Index task). It
// carries a single measuredAt + sourceUrl for the whole session, and — same
// boundary as above — must never be mixed, weighted or averaged with passAt1 /
// benchmarkScore / writingScore (different benchmark systems, different
// scales). Artificial Analysis is deliberately still NOT recorded in
// ai/llm/modelQualityEvidenceData.ts (that store stays domain-specific); this
// field is the display/reference home for the AA snapshot only.

/** Optional capability metadata for a model. Legacy reference values — see the file header. */
export interface ModelAbility {
  passAt1?: number;
  benchmarkScore?: number;
  /** Legacy coarse domain reference score (0-100). Not the writing.creative evidence. */
  writingScore?: number;

  /**
   * Artificial Analysis 快照（域无关的"智商"及性能参考，2026-09-24 全量读取，
   * 对应 AA Intelligence Index v4.3.2）。
   *
   * 与上面三个字段不同源、不同标度：AA 是独立基准体系，绝不与 passAt1 /
   * benchmarkScore / writingScore 混合、加权或平均。
   * 刷新时整包更新 measuredAt 与 sourceUrl；某个维度当日没读到就不填
   * （缺失即缺失，不是 0）。
   */
  aaSnapshot?: {
    /** 整包读取日期（ISO date，如 "2026-09-24"）。 */
    measuredAt: string;
    /** 读取来源：AA provider 页或模型页 URL（取提供维度最多的那个页面）。 */
    sourceUrl: string;
    /** Artificial Analysis Intelligence Index（0-100，越高越聪明）。 */
    intelligenceIndex: number;
    /** 输出速度中位数（tokens/s，first-party API 实测）。 */
    outputSpeedTps?: number;
    /** 首个 answer token 时间中位数（秒；推理模型含思考时间，可能很大）。 */
    firstAnswerTokenS?: number;
    /** 跑完一套 Intelligence Index 任务的加权平均成本（USD，越低越划算）。 */
    costPerTaskUsd?: number;
  };

  /**
   * AA 各评测榜分数（与 aaSnapshot 同一次 2026-09-24 读取会话，共享其
   * measuredAt）。key 为 benchmark id（→ URL 见文件末尾 AA_EVAL_URLS）；
   * 百分制榜存百分点（如 terminal-bench-4.0 的 59.6 = 59.6%），Elo 榜存
   * 原始 Elo（如 aa-briefcase-v1.1 的 1822）。同一型号在榜上有多个
   * reasoning_effort 档位时取最高分。AA 未收录该型号的榜不填——缺失即缺失。
   */
  aaEvals?: Record<string, number>;
}

/** Canonical capability table keyed by base model name. */
// Reference scores shown to users and available as a soft selection signal;
// they are not the sole or mandatory task-routing rule. The current benchmark
// reference includes pass@1, benchmarkScore and domain writingScore.
//
// `aaSnapshot` 快照约定（2026-09-24 全量刷新，AA Intelligence Index v4.3.2）：
// - 每个分数都带当日读取的 AA 页面 URL（provider 页或模型页），可逐条回查；
// - AA 对同一型号列多个 reasoning_effort 档位时，取表中该型号 intelligence
//   最高的一行（max/xhigh/high/medium，随型号而异），四个维度同行取数；
// - AA 标注 deprecated 的型号（GLM-5.2、Muse Spark 1.1/1.2、DeepSeek V4 Flash
//   0731、Step 3.5 Flash 2603）分数照记，但选型时应看其官方替代型号；
// - AA 未收录的型号（如 deepseek-flash、mimo-v2.6-flash /
//   mimo-v2.6-pro-ultraspeed）整包不填——缺失即缺失；
// - 个别维度 AA 自己就没有（表格里是 "--"）：同样不填，不要用别的档位借值。
const MODEL_ABILITY_TABLE: Record<string, ModelAbility> = {
  "claude-opus-5": { passAt1: 74, benchmarkScore: 61, writingScore: 82, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/anthropic", intelligenceIndex: 51, outputSpeedTps: 54, firstAnswerTokenS: 50.63, costPerTaskUsd: 5.86 }, aaEvals: { "aa-analyst-agent": 53.8, "aa-briefcase-v1.1": 1673, "aa-omniscience": 60.9, "automationbench-aa": 56.6, "critpt": 29.1, "enterprise-ops-gym-aa": 47.5, "gdp-pdf": 21.6, "gdpval-aa-v2.1": 1708, "harvey-lab-aa": 93.5, "humanitys-last-exam": 54.9, "mlcr-aa": 59.4, "mmmu-pro": 84.7, "scicode": 56.4, "terminal-bench-4.0": 49.0 } },
  "claude-opus-5-5": { aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/anthropic", intelligenceIndex: 58, costPerTaskUsd: 5.98 }, aaEvals: { "aa-briefcase-v1.1": 1822, "aa-lcr-v1.1": 84.7, "aa-omniscience": 66.2, "aa-omniscience-non-hallucination": 58.6, "automationbench-aa": 69.5, "critpt": 31.7, "gdp-pdf": 28.8, "gdpval-aa-v2.1": 1846, "harvey-lab-aa": 91.2, "humanitys-last-exam": 61.4, "mlcr-aa": 66.7, "mmmu-pro": 87.7, "scicode": 66.9, "terminal-bench-4.0": 59.6 } },
  "gpt-6-astra": { passAt1: 85, benchmarkScore: 90, writingScore: 92, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/openai", intelligenceIndex: 53, outputSpeedTps: 52, firstAnswerTokenS: 352.15, costPerTaskUsd: 3.26 }, aaEvals: { "aa-analyst-agent": 51.2, "aa-briefcase-v1.1": 1569, "aa-omniscience": 62.6, "aa-omniscience-non-hallucination": 51.3, "automationbench-aa": 68.5, "critpt": 31.7, "gdp-pdf": 32.2, "gdpval-aa-v2.1": 1542, "humanitys-last-exam": 54.7, "mlcr-aa": 35.0, "mmmu-pro": 86.9, "scicode": 56.5, "terminal-bench-4.0": 59.6 } },
  "claude-opus-4-6": { passAt1: 65, benchmarkScore: 68, writingScore: 78, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/anthropic", intelligenceIndex: 32, outputSpeedTps: 40, firstAnswerTokenS: 21.89 } },
  "gpt-5.6-sol": { passAt1: 73, benchmarkScore: 59, writingScore: 80, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/openai", intelligenceIndex: 47, outputSpeedTps: 77, firstAnswerTokenS: 113.21, costPerTaskUsd: 1.99 }, aaEvals: { "aa-analyst-agent": 47.5, "aa-briefcase-v1.1": 1487, "aa-lcr-v1.1": 84.0, "aa-omniscience": 59.4, "automationbench-aa": 60.1, "critpt": 32.3, "enterprise-ops-gym-aa": 42.9, "gdp-pdf": 27.2, "gdpval-aa-v2.1": 1588, "harvey-lab-aa": 87.2, "humanitys-last-exam": 49.5, "ifbench": 72.7, "itbench-aa": 56.2, "mlcr-aa": 26.1, "mmmu-pro": 83.4, "scicode": 57.1, "terminal-bench-4.0": 39.9 } },
  "claude-fable-5": { passAt1: 70, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/anthropic", intelligenceIndex: 50, outputSpeedTps: 68, firstAnswerTokenS: 110.36, costPerTaskUsd: 8.75 }, aaEvals: { "aa-analyst-agent": 48.8, "aa-omniscience": 65.3, "enterprise-ops-gym-aa": 51.1, "harvey-lab-aa": 93.6, "humanitys-last-exam": 55.5, "mlcr-aa": 64.4, "scicode": 61.0 } },
  "gpt-5.6-terra": { passAt1: 70, benchmarkScore: 55, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/openai", intelligenceIndex: 42, outputSpeedTps: 83, firstAnswerTokenS: 211.09, costPerTaskUsd: 1.4 }, aaEvals: { "apex-agents-aa": 38.9, "itbench-aa": 51.0 } },
  "kimi-k3": { passAt1: 69, benchmarkScore: 57, writingScore: 81, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/kimi", intelligenceIndex: 44, outputSpeedTps: 37, firstAnswerTokenS: 4.08, costPerTaskUsd: 2 }, aaEvals: { "aa-analyst-agent": 38.8, "aa-briefcase-v1.1": 1504, "aa-lcr-v1.1": 88.7, "aa-omniscience": 47.6, "aa-omniscience-non-hallucination": 53.2, "apex-agents-aa": 41.3, "automationbench-aa": 58.3, "critpt": 23.4, "enterprise-ops-gym-aa": 45.3, "gdp-pdf": 22.0, "gdpval-aa-v2.1": 1524, "harvey-lab-aa": 94.6, "humanitys-last-exam": 46.9, "itbench-aa": 47.7, "mlcr-aa": 38.3, "mmmu-pro": 80.5, "scicode": 59.5 } },
  "gpt-5.5": { passAt1: 67, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/openai", intelligenceIndex: 38, outputSpeedTps: 91, firstAnswerTokenS: 62.45, costPerTaskUsd: 2.63 }, aaEvals: { "aa-analyst-agent": 50.0, "aa-lcr-v1.1": 84.3, "apex-agents-aa": 37.7, "itbench-aa": 45.8 } },
  "gpt-5.6-luna": { passAt1: 67, benchmarkScore: 51, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/openai", intelligenceIndex: 37, outputSpeedTps: 133, firstAnswerTokenS: 114.02, costPerTaskUsd: 0.18 }, aaEvals: { "aa-lcr-v1.1": 83.7, "aa-omniscience": 42.7, "apex-agents-aa": 35.8, "critpt": 20.6, "enterprise-ops-gym-aa": 40.8, "gdp-pdf": 24.0, "harvey-lab-aa": 87.9, "itbench-aa": 40.3, "mlcr-aa": 19.4, "mmmu-pro": 78.6 } },
  "gpt-6-luna": { aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/openai", intelligenceIndex: 37, outputSpeedTps: 132, firstAnswerTokenS: 104.42, costPerTaskUsd: 0.07 }, aaEvals: { "aa-lcr-v1.1": 83.3, "aa-omniscience": 43.8, "critpt": 19.4, "gdp-pdf": 20.4, "mmmu-pro": 75.5, "scicode": 54.6 } },
  "grok-4.6": { passAt1: 67, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/xai", intelligenceIndex: 44, outputSpeedTps: 61, firstAnswerTokenS: 45.3, costPerTaskUsd: 1.86 }, aaEvals: { "aa-analyst-agent": 41.2, "aa-briefcase-v1.1": 1546, "aa-omniscience": 48.2, "aa-omniscience-non-hallucination": 34.3, "automationbench-aa": 67.0, "enterprise-ops-gym-aa": 48.3, "gdp-pdf": 17.0, "gdpval-aa-v2.1": 1605, "humanitys-last-exam": 42.9, "scicode": 56.5, "terminal-bench-4.0": 21.2 } },
  "deepseek-v4-pro": { passAt1: 63, writingScore: 79, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/models/deepseek-v4-pro", intelligenceIndex: 36, outputSpeedTps: 66, firstAnswerTokenS: 1.7, costPerTaskUsd: 0.67 }, aaEvals: { "enterprise-ops-gym-aa": 49.6 } },
  "qwen3.8-max": { passAt1: 57, writingScore: 77, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/models/qwen3-8-max", intelligenceIndex: 45, outputSpeedTps: 39.3, costPerTaskUsd: 5.41 }, aaEvals: { "aa-briefcase-v1.1": 1640, "aa-omniscience-non-hallucination": 28.8, "gdp-pdf": 22.8, "gdpval-aa-v2.1": 1668, "humanitys-last-exam": 43.1, "mlcr-aa": 20.0, "mmmu-pro": 82.8, "terminal-bench-4.0": 38.9 } },
  "muse-spark-1.3": { aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/meta", intelligenceIndex: 48, outputSpeedTps: 219, firstAnswerTokenS: 24.12, costPerTaskUsd: 1.6 }, aaEvals: { "aa-briefcase-v1.1": 1597, "aa-lcr-v1.1": 83.0, "aa-omniscience": 43.6, "aa-omniscience-non-hallucination": 32.9, "automationbench-aa": 57.9, "critpt": 24.9, "gdp-pdf": 26.6, "gdpval-aa-v2.1": 1674, "harvey-lab-aa": 95.5, "humanitys-last-exam": 48.7, "mlcr-aa": 43.3, "scicode": 58.8, "terminal-bench-4.0": 33.3 } },
  "muse-spark-1.2": { passAt1: 55, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/meta", intelligenceIndex: 40, outputSpeedTps: 187, firstAnswerTokenS: 16.6, costPerTaskUsd: 0.97 } },
  "grok-4.5": { passAt1: 54, benchmarkScore: 54, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/xai", intelligenceIndex: 39, outputSpeedTps: 55, firstAnswerTokenS: 11.28, costPerTaskUsd: 1.04 } },
  "claude-sonnet-5": { passAt1: 54, benchmarkScore: 53, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/anthropic", intelligenceIndex: 38, outputSpeedTps: 79, firstAnswerTokenS: 150.02, costPerTaskUsd: 5.09 }, aaEvals: { "aa-analyst-agent": 46.2, "mlcr-aa": 55.0 } },
  "deepseek-flash": { passAt1: 53 },
  "deepseek-v4-flash": { passAt1: 53, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/models/deepseek-v4-flash", intelligenceIndex: 34, outputSpeedTps: 221, firstAnswerTokenS: 1.16, costPerTaskUsd: 0.22 } },
  "gemini-3.7-flash": { passAt1: 58, benchmarkScore: 65, writingScore: 88, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/google", intelligenceIndex: 40, outputSpeedTps: 281, firstAnswerTokenS: 4.9 }, aaEvals: { "aa-analyst-agent": 60.0, "enterprise-ops-gym-aa": 50.4, "scicode": 59.8 } },
  // TODO(benchmark): gemini-3.8-flash 官方基准快照未出，暂沿用 3.7 分数占位，确认后更新。
  "gemini-3.8-flash": { passAt1: 58, benchmarkScore: 65, writingScore: 88, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/google", intelligenceIndex: 41, outputSpeedTps: 291, firstAnswerTokenS: 15.14, costPerTaskUsd: 1.24 }, aaEvals: { "aa-lcr-v1.1": 81.3, "aa-omniscience": 54.6, "aa-omniscience-non-hallucination": 55.2, "automationbench-aa": 59.9, "critpt": 18.3, "gdp-pdf": 21.0, "humanitys-last-exam": 47.8, "mlcr-aa": 21.7, "mmmu-pro": 85.6, "scicode": 56.6 } },
  "muse-spark-1.1": { passAt1: 53, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/meta", intelligenceIndex: 34, costPerTaskUsd: 1.38 } },
  "gpt-5.4": { passAt1: 52, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/openai", intelligenceIndex: 39, outputSpeedTps: 140, firstAnswerTokenS: 141.55 }, aaEvals: { "apex-agents-aa": 33.3 } },
  "gemini-3.6-flash": { passAt1: 49, benchmarkScore: 50, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/google", intelligenceIndex: 34, outputSpeedTps: 178, firstAnswerTokenS: 17.32, costPerTaskUsd: 0.93 } },
  "glm-5.3": { passAt1: 52, benchmarkScore: 60, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/models/glm-5-3", intelligenceIndex: 45, outputSpeedTps: 57, costPerTaskUsd: 2.01 }, aaEvals: { "aa-briefcase-v1.1": 1516, "aa-omniscience-non-hallucination": 29.6, "automationbench-aa": 62.2, "critpt": 19.1, "enterprise-ops-gym-aa": 36.4, "gdpval-aa-v2.1": 1646, "humanitys-last-exam": 42.3, "mlcr-aa": 51.1, "scicode": 59.0, "terminal-bench-4.0": 41.9 } },
  "glm-5.2": { passAt1: 44, benchmarkScore: 51, aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/models/glm-5-2", intelligenceIndex: 34, outputSpeedTps: 69.2, costPerTaskUsd: 0.96 }, aaEvals: { "apex-agents-aa": 33.7, "itbench-aa": 42.7 } },

  // ── StepFun（阶跃星辰）─ 仅有 AA 快照，无 pass@1 等旧字段。
  // 来源：https://artificialanalysis.ai/providers/stepfun 对比表。
  // 其中 3.5-flash-2603 已被 AA 标记 deprecated（官方推荐 3.7-flash）。
  "step-5-preview": { aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/stepfun", intelligenceIndex: 44, outputSpeedTps: 85, firstAnswerTokenS: 3.48, costPerTaskUsd: 0.72 }, aaEvals: { "aa-briefcase-v1.1": 1432, "aa-lcr-v1.1": 88.3, "aa-omniscience-non-hallucination": 43.0, "critpt": 20.9, "gdpval-aa-v2.1": 1566, "humanitys-last-exam": 46.5, "mmmu-pro": 76.4, "scicode": 58.9, "terminal-bench-4.0": 33.3 } },
  "step-3.7-flash": { aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/stepfun", intelligenceIndex: 19, outputSpeedTps: 190, firstAnswerTokenS: 2.66 } },
  "step-3.5-flash-2603": { aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/stepfun", intelligenceIndex: 17, outputSpeedTps: 133, firstAnswerTokenS: 3.33 } },
  "step-3.5-flash": { aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/stepfun", intelligenceIndex: 17, outputSpeedTps: 137, firstAnswerTokenS: 3.5 } },

  // ── Xiaomi MiMo ── AA 只收录 Pro 档（V2.6-Pro / V2.5-Pro）；
  // mimo-v2.6-flash 与 mimo-v2.6-pro-ultraspeed AA 未收录，缺失即缺失。
  "mimo-v2.6-pro": { aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/xiaomi", intelligenceIndex: 46, outputSpeedTps: 49, firstAnswerTokenS: 2.93, costPerTaskUsd: 0.13 }, aaEvals: { "aa-briefcase-v1.1": 1522, "aa-lcr-v1.1": 86.3, "aa-omniscience-non-hallucination": 40.6, "automationbench-aa": 58.6, "critpt": 26.6, "gdp-pdf": 19.2, "gdpval-aa-v2.1": 1673, "humanitys-last-exam": 49.4, "scicode": 60.9, "terminal-bench-4.0": 34.8 } },
  "mimo-v2.5-pro": { aaSnapshot: { measuredAt: "2026-09-24", sourceUrl: "https://artificialanalysis.ai/providers/xiaomi", intelligenceIndex: 26, outputSpeedTps: 52, firstAnswerTokenS: 7.95, costPerTaskUsd: 0.05 } },
};

const EFFORT_SUFFIXES = [
  "-extra-low",
  "-low",
  "-medium",
  "-high",
  "-thinking",
  "-tiered",
  ":cloud",
] as const;

/** Normalize provider-prefixed and effort-suffixed model ids to their base name. */
export function normalizeModelName(raw: string): string {
  let name = raw.trim().toLowerCase();
  const slash = name.indexOf("/");
  if (slash !== -1) name = name.slice(slash + 1);

  for (const suffix of EFFORT_SUFFIXES) {
    if (name.endsWith(suffix) && name.length > suffix.length) {
      name = name.slice(0, name.length - suffix.length);
      break;
    }
  }

  return name;
}

/** Resolve capability metadata; unknown models intentionally return undefined. */
export function getModelAbility(modelName: string): ModelAbility | undefined {
  const entry = MODEL_ABILITY_TABLE[normalizeModelName(modelName)];
  return entry ? { ...entry } : undefined;
}

/**
 * AA 评测榜 id → 当日读取的榜单页 URL（2026-09-24）。
 * 覆盖 AA evaluations 目录里的现行（非 Legacy）榜；百分制榜存百分点、
 * Elo 榜存原始 Elo，单位随榜不同，比较时必须连榜 id 一起看。
 * Legacy 档（MMLU-Pro / LiveCodeBench / MATH-500 / AIME 2025 /
 * Global-MMLU-Lite / Terminal-Bench 2.1/Hard / 𝜏³-Banking / 𝜏²-Bench）
 * AA 已停止更新，故意不收。
 */
export const AA_EVAL_URLS: Readonly<Record<string, string>> = {
  "aa-briefcase-v1.1": "https://artificialanalysis.ai/evaluations/aa-briefcase", // Elo
  "gdpval-aa-v2.1": "https://artificialanalysis.ai/evaluations/gdpval-aa", // Elo
  "apex-agents-aa": "https://artificialanalysis.ai/evaluations/apex-agents-aa", // 通过率 %
  "automationbench-aa": "https://artificialanalysis.ai/evaluations/automationbench-aa", // 得分 %
  "terminal-bench-4.0": "https://artificialanalysis.ai/evaluations/terminalbench-4-0", // 通过率 %
  "aa-lcr-v1.1": "https://artificialanalysis.ai/evaluations/artificial-analysis-long-context-reasoning", // 得分 %
  "aa-omniscience": "https://artificialanalysis.ai/evaluations/omniscience", // 准确率 %
  "aa-omniscience-non-hallucination": "https://artificialanalysis.ai/evaluations/omniscience", // 1-幻觉率 %
  "scicode": "https://artificialanalysis.ai/evaluations/scicode", // 得分 %
  "humanitys-last-exam": "https://artificialanalysis.ai/evaluations/humanitys-last-exam", // 准确率 %
  "gdp-pdf": "https://artificialanalysis.ai/evaluations/gdp-pdf", // all-pass %
  "harvey-lab-aa": "https://artificialanalysis.ai/evaluations/harvey-lab-aa", // criterion 通过率 %
  "enterprise-ops-gym-aa": "https://artificialanalysis.ai/evaluations/enterprise-ops-gym-aa", // 完成率 %
  "aa-analyst-agent": "https://artificialanalysis.ai/evaluations/aa-analyst-agent", // 得分 %
  "itbench-aa": "https://artificialanalysis.ai/evaluations/itbench-aa", // 得分 %
  "mmmu-pro": "https://artificialanalysis.ai/evaluations/mmmu-pro", // 准确率 %
  "ifbench": "https://artificialanalysis.ai/evaluations/ifbench", // 得分 %
  "mlcr-aa": "https://artificialanalysis.ai/evaluations/mlcr-aa", // 得分 %
  "critpt": "https://artificialanalysis.ai/evaluations/critpt", // 得分 %
};
