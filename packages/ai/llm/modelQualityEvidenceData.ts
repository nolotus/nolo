// ai/llm/modelQualityEvidenceData.ts
//
// Curated, human-confirmed real benchmark evidence (v2).
//
// Data-only: no resolvers, immutable/readonly. Benchmark updates should mostly
// touch this file; adopt a new benchmark family/version by bumping
// DOMAIN_DIMENSION_BENCHMARK_PRIORITY in modelQualityEvidence.ts — never by
// changing the resolver.
//
// Provenance rules:
// - every curated entry carries a sourceUrl pointing at the public page the
//   score was read from;
// - snapshot evidence — values that move over time (leaderboards, Elo ranks) —
//   additionally carries measuredAt with the snapshot date. Creative Writing v3
//   is such a snapshot, so every one of its rows has measuredAt; the older
//   coding rows were transcribed without a recorded date and deliberately keep
//   none (never invent a date just to satisfy this note);
// - no guessing: a model without a confirmed score for a domain simply has no
//   entry (missing evidence must stay missing, never 0);
// - every entry is one atomic fact: (model, domain, dimension, benchmark) and
//   carries its own `direction`;
// - deliberately NOT recorded: Design Arena website scores (the public page
//   exposes no stable exact values), the domain-agnostic Artificial Analysis
//   Intelligence Index for Muse Spark 1.3 (not a domain-specific quality
//   benchmark — Muse Spark 1.3 does have a confirmed Creative Writing v3 row
//   below), pre-4.0 Terminal-Bench snapshots;
//   AA 的域无关智商/速度/延迟/成本快照不住这里，住 ai/llm/modelAbility.ts 的
//   aaSnapshot（展示/软选型参考）；AA 的*域级*评测分（如 Terminal-Bench 4.0）
//   可以进本文件，与 launch 页口径分行共存、各自带 sourceUrl；
// - runtime speed is observed separately as providerCallTiming facts
//   (firstOutputMs / callDurationMs) and is not a quality dimension here.

import type {
  ModelQualityDirection,
  ModelQualityDimension,
  ModelQualityDomain,
  ModelQualityEvidence,
} from "./modelQualityEvidence";

// Canonical model ids follow the repo's existing naming systems:
// - claude family encodes the minor version with dashes (claude-opus-4-6),
//   so Fable 5.1 is `claude-fable-5-1` (not yet in the runtime catalog — the
//   evidence store never requires a catalog hit, so recording the canonical
//   future id is fine; do not alias it to claude-fable-5);
// - `gemini-3.8-flash` matches modelAbility.ts;
// - `glm-5.3` is PLATFORM_HOSTED_GLM_53_MODEL, a different model from
//   `glm-5-3-flash` (PLATFORM_HOSTED_GLM_53_FLASH_MODEL).

/** Source shared by the Terminal-Bench 4.0 and DeepSWE 1.1 tables. */
const GPT6_ASTRA_LAUNCH_URL = "https://openai.com/index/gpt-6-astra/";
/** Agents on Rails update covering Claude Fable 5.1 and GLM 5.3 Flash. */
const RAILS_FABLE_GLM_URL =
  "https://rubyonrails.org/2026/9/2/agents-on-rails-claude-fable-5-1-and-glm-5-3-flash";
/** Artificial Analysis Terminal-Bench 4.0 leaderboard (independent measurement). */
const AA_TERMINAL_BENCH_4_URL =
  "https://artificialanalysis.ai/evaluations/terminalbench-4-0";
/** AA 长上下文/科学推理各榜（2026-09-24 快照，headless 渲染读取）。 */
const AA_LCR_URL = "https://artificialanalysis.ai/evaluations/artificial-analysis-long-context-reasoning";
const AA_GDP_PDF_URL = "https://artificialanalysis.ai/evaluations/gdp-pdf";
const AA_GPQA_URL = "https://artificialanalysis.ai/evaluations/gpqa-diamond";
const AA_HLE_URL = "https://artificialanalysis.ai/evaluations/humanitys-last-exam";
const AA_CRITPT_URL = "https://artificialanalysis.ai/evaluations/critpt";
const AA_SCICODE_URL = "https://artificialanalysis.ai/evaluations/scicode";

/**
 * coding.* evidence. Single dimension (task_success), percent scores stay
 * benchmark-native, never normalized.
 */
const CODING_EVIDENCE: readonly ModelQualityEvidence[] = [
  // coding.terminal — Terminal-Bench 4.0 (percent, same source table).
  { model: "gpt-6-astra", domain: "coding.terminal", dimension: "task_success", benchmark: "terminal-bench-4", benchmarkVersion: "4.0", score: 57.9, direction: "higher_better", sourceUrl: GPT6_ASTRA_LAUNCH_URL },
  { model: "claude-fable-5-1", domain: "coding.terminal", dimension: "task_success", benchmark: "terminal-bench-4", benchmarkVersion: "4.0", score: 55.8, direction: "higher_better", sourceUrl: GPT6_ASTRA_LAUNCH_URL },
  { model: "gemini-3.8-flash", domain: "coding.terminal", dimension: "task_success", benchmark: "terminal-bench-4", benchmarkVersion: "4.0", score: 19.1, direction: "higher_better", sourceUrl: GPT6_ASTRA_LAUNCH_URL },
  // coding.terminal — Terminal-Bench 4.0，AA 独立实测（2026-09-24 快照）。
  // 与上面三行同 benchmark 不同来源：上面是 OpenAI 发布页口径，这里是 AA 自测；
  // 每个 model 只有一行，resolver 按 priority 取首个存在行，不会混。
  // 已有 launch 页口径的 model（gpt-6-astra / gemini-3.8-flash）不重复记。
  // AA 对同型号列多个 effort 档，取最高分；fable-5 在 AA 该榜只有 5.1 数据，不借值。
  { model: "claude-opus-5-5", domain: "coding.terminal", dimension: "task_success", benchmark: "terminal-bench-4", benchmarkVersion: "4.0", score: 59.6, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_TERMINAL_BENCH_4_URL },
  { model: "claude-opus-5", domain: "coding.terminal", dimension: "task_success", benchmark: "terminal-bench-4", benchmarkVersion: "4.0", score: 49.0, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_TERMINAL_BENCH_4_URL },
  { model: "glm-5.3", domain: "coding.terminal", dimension: "task_success", benchmark: "terminal-bench-4", benchmarkVersion: "4.0", score: 41.9, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_TERMINAL_BENCH_4_URL },
  { model: "gpt-5.6-sol", domain: "coding.terminal", dimension: "task_success", benchmark: "terminal-bench-4", benchmarkVersion: "4.0", score: 39.9, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_TERMINAL_BENCH_4_URL },
  { model: "mimo-v2.6-pro", domain: "coding.terminal", dimension: "task_success", benchmark: "terminal-bench-4", benchmarkVersion: "4.0", score: 34.8, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_TERMINAL_BENCH_4_URL },
  { model: "muse-spark-1.3", domain: "coding.terminal", dimension: "task_success", benchmark: "terminal-bench-4", benchmarkVersion: "4.0", score: 33.3, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_TERMINAL_BENCH_4_URL },
  { model: "step-5-preview", domain: "coding.terminal", dimension: "task_success", benchmark: "terminal-bench-4", benchmarkVersion: "4.0", score: 33.3, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_TERMINAL_BENCH_4_URL },
  { model: "grok-4.6", domain: "coding.terminal", dimension: "task_success", benchmark: "terminal-bench-4", benchmarkVersion: "4.0", score: 21.2, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_TERMINAL_BENCH_4_URL },

  // coding.repo — DeepSWE 1.1 (percent, same source).
  { model: "gpt-6-astra", domain: "coding.repo", dimension: "task_success", benchmark: "deepswe-1.1", benchmarkVersion: "1.1", score: 74.1, direction: "higher_better", sourceUrl: GPT6_ASTRA_LAUNCH_URL },
  { model: "claude-fable-5-1", domain: "coding.repo", dimension: "task_success", benchmark: "deepswe-1.1", benchmarkVersion: "1.1", score: 67.4, direction: "higher_better", sourceUrl: GPT6_ASTRA_LAUNCH_URL },
  { model: "gemini-3.8-flash", domain: "coding.repo", dimension: "task_success", benchmark: "deepswe-1.1", benchmarkVersion: "1.1", score: 73.8, direction: "higher_better", sourceUrl: GPT6_ASTRA_LAUNCH_URL },
  // coding.rails — Agents on Rails (leaderboard percent).
  { model: "claude-fable-5-1", domain: "coding.rails", dimension: "task_success", benchmark: "agents-on-rails", score: 92, direction: "higher_better", sourceUrl: RAILS_FABLE_GLM_URL },
  { model: "glm-5-3-flash", domain: "coding.rails", dimension: "task_success", benchmark: "agents-on-rails", score: 83, direction: "higher_better", sourceUrl: RAILS_FABLE_GLM_URL },
];

// --- EQ-Bench Creative Writing v3 ------------------------------------------
//
// Source: https://eqbench.com/creative_writing.html (official leaderboard).
// The page renders five numeric columns from its own published data file; the
// column → dimension contract, including the two display transforms the page
// applies, is recorded here so a future reader can re-verify each number:
//
//   preference ← Elo Score      native (e.g. 2163.9)
//   rubric     ← Rubric Score   raw rubric × 5 (e.g. 16.80 → 84.00)
//   slop       ← Slop           raw slop_score ÷ 7.2 (page prints 1 decimal: 8.41 → 1.2)
//   repetition ← Repetition     native
//   length     ← Length         native avg_length (characters)
//
// Deliberately not recorded from the same leaderboard: Abilities and Style
// (the page only links to detail views, there is no numeric column), and the
// vocabulary-complexity column (no declared dimension this round).
// Elo/preference ranks are snapshots — the leaderboard moves, so every number
// below is scoped to the snapshot date.

const CREATIVE_WRITING_V3_URL = "https://eqbench.com/creative_writing.html";
/** Date this leaderboard snapshot was read. */
const CREATIVE_WRITING_V3_MEASURED_AT = "2026-09-10";
const CREATIVE_WRITING_V3_VERSION = "v3";

interface SnapshotColumn {
  readonly dimension: ModelQualityDimension;
  readonly benchmark: string;
  readonly direction: ModelQualityDirection;
}

/** Dimension contract for the Creative Writing v3 columns, in table order. */
const CREATIVE_WRITING_V3_COLUMNS: readonly SnapshotColumn[] = [
  { dimension: "preference", benchmark: "eqbench-creative-writing-v3-elo", direction: "higher_better" },
  { dimension: "rubric", benchmark: "eqbench-creative-writing-v3-rubric", direction: "higher_better" },
  { dimension: "slop", benchmark: "eqbench-creative-writing-v3-slop", direction: "lower_better" },
  { dimension: "repetition", benchmark: "eqbench-creative-writing-v3-repetition", direction: "lower_better" },
  { dimension: "length", benchmark: "eqbench-creative-writing-v3-length", direction: "neutral" },
];

/**
 * Leaderboard values, one row per model:
 * [model, elo, rubric, slop, repetition, length] — column order matches
 * CREATIVE_WRITING_V3_COLUMNS.
 *
 * Only models whose repo-canonical id is confirmed are listed. Deliberately
 * omitted (cannot be mapped without guessing):
 * - "ox-alpha": the leaderboard has it (Elo 1960.6) but no repo catalog entry
 *   or naming precedent exists, so no canonical id could be confirmed;
 * - "Qwen/Qwen3.8-2.4T-A95B": the leaderboard row is an open-model id, while
 *   the repo only has the provider-side API id `qwen3.8-max`. A shared
 *   2.4T-parameter description (integrations/qwen/models.ts) is not evidence
 *   that they are the same canonical model, so it stays unrecorded.
 * Also not recorded this round: repo-catalog models that do have confirmed
 * rows on the same leaderboard (gemini-3.8-flash, gemini-3.7-flash,
 * claude-sonnet-5, claude-opus-4-6, glm-5.2, deepseek-v4-pro/flash, grok-4.5) —
 * out of scope for the first ingestion, one row per model to add later.
 */
const CREATIVE_WRITING_V3_SCORES: readonly (readonly [string, number, number, number, number, number])[] = [
  ["gpt-6-astra", 2163.9, 84, 1.168, 3.54, 6191],
  ["claude-fable-5-1", 2152.7, 84.75, 1.133, 3.64, 5841],
  ["claude-opus-5", 2120.6, 85.35, 0.915, 4.31, 6003],
  ["kimi-k3", 2070.6, 84.25, 1.347, 3.73, 5488],
  ["glm-5.3", 2064.1, 85.2, 1.169, 3.23, 5913],
  ["gpt-5.6-sol", 1963.4, 83.9, 1.622, 3.41, 8548],
  ["claude-fable-5", 1934.6, 84.05, 1.428, 3.92, 5887],
  ["muse-spark-1.1", 1916.1, 82.7, 1.682, 3.49, 7551],
  ["claude-opus-4-7", 1907.1, 82.85, 1.54, 4, 5692],
  ["muse-spark-1.3", 1905.5, 83.5, 1.49, 3.66, 8001],
  ["gpt-5.6-terra", 1850.3, 82.8, 1.722, 3.02, 10271],
  ["gpt-5.5", 1843.5, 85.05, 1.819, 2.48, 12945],
  ["gpt-5.4", 1835.6, 84.45, 1.694, 2.71, 10488],
  ["claude-opus-4-8", 1835.2, 83.3, 1.828, 3.68, 5842],
  ["muse-spark-1.2", 1835.2, 82.2, 1.803, 3.31, 8618],
  ["gpt-5.6-luna", 1825.8, 82.9, 1.639, 4, 7927],
];

/**
 * Expand a columnar snapshot (columns × model rows) into atomic evidence rows.
 *
 * Generic on purpose: any benchmark that publishes one table of models ×
 * dimension columns can reuse it instead of hand-writing every row.
 */
function expandColumnarSnapshot(
  domain: ModelQualityDomain,
  columns: readonly SnapshotColumn[],
  rows: readonly (readonly [string, ...number[]])[],
  context: { sourceUrl: string; benchmarkVersion: string; measuredAt: string },
): ModelQualityEvidence[] {
  const evidence: ModelQualityEvidence[] = [];

  for (const row of rows) {
    const [model, ...values] = row;
    columns.forEach((column, index) => {
      const score = values[index];
      // A missing cell stays missing: never substitute 0.
      if (typeof score !== "number" || !Number.isFinite(score)) return;
      evidence.push({
        model,
        domain,
        dimension: column.dimension,
        benchmark: column.benchmark,
        benchmarkVersion: context.benchmarkVersion,
        score,
        direction: column.direction,
        measuredAt: context.measuredAt,
        sourceUrl: context.sourceUrl,
      });
    });
  }

  return evidence;
}

/**
 * Curated current evidence. Only human-confirmed values from the source pages
 * above; scores stay benchmark-native, never normalized into a shared scale.
 */
// --- AA 长上下文/长文档 & 科学推理（2026-09-24 快照）-----------------------
//
// 来源：Artificial Analysis 各评测榜（headless Chrome 渲染后读取，URL 与
// modelAbility 的 AA_EVAL_URLS 同源）。写论文（读文献/综述）与写小说
// （长篇一致性）用户需要 long_context；科研问答/推导/论文写作用户需要 science。
// qwen3.8-max 按 canonical-id 规则不进本文件（见下方测试），只留在
// modelAbility 的 aaEvals 参考面。
const LONG_CONTEXT_EVIDENCE: readonly ModelQualityEvidence[] = [
  // long_context — AA-LCR v1.1（10k-100k 文档多步推理，主榜）。
  { model: "kimi-k3", domain: "long_context", dimension: "task_success", benchmark: "aa-lcr-v1.1", benchmarkVersion: "1.1", score: 88.7, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_LCR_URL },
  { model: "step-5-preview", domain: "long_context", dimension: "task_success", benchmark: "aa-lcr-v1.1", benchmarkVersion: "1.1", score: 88.3, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_LCR_URL },
  { model: "mimo-v2.6-pro", domain: "long_context", dimension: "task_success", benchmark: "aa-lcr-v1.1", benchmarkVersion: "1.1", score: 86.3, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_LCR_URL },
  { model: "claude-opus-5-5", domain: "long_context", dimension: "task_success", benchmark: "aa-lcr-v1.1", benchmarkVersion: "1.1", score: 84.7, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_LCR_URL },
  { model: "gpt-5.5", domain: "long_context", dimension: "task_success", benchmark: "aa-lcr-v1.1", benchmarkVersion: "1.1", score: 84.3, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_LCR_URL },
  { model: "gpt-5.6-sol", domain: "long_context", dimension: "task_success", benchmark: "aa-lcr-v1.1", benchmarkVersion: "1.1", score: 84.0, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_LCR_URL },
  { model: "gpt-5.6-luna", domain: "long_context", dimension: "task_success", benchmark: "aa-lcr-v1.1", benchmarkVersion: "1.1", score: 83.7, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_LCR_URL },
  { model: "gpt-6-luna", domain: "long_context", dimension: "task_success", benchmark: "aa-lcr-v1.1", benchmarkVersion: "1.1", score: 83.3, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_LCR_URL },
  { model: "muse-spark-1.3", domain: "long_context", dimension: "task_success", benchmark: "aa-lcr-v1.1", benchmarkVersion: "1.1", score: 83.0, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_LCR_URL },
  { model: "gemini-3.8-flash", domain: "long_context", dimension: "task_success", benchmark: "aa-lcr-v1.1", benchmarkVersion: "1.1", score: 81.3, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_LCR_URL },
  // long_context — GDP.pdf（长文档 all-pass，难度高得多，次级参考）。
  { model: "gpt-6-astra", domain: "long_context", dimension: "task_success", benchmark: "gdp-pdf", score: 32.2, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GDP_PDF_URL },
  { model: "claude-opus-5-5", domain: "long_context", dimension: "task_success", benchmark: "gdp-pdf", score: 28.8, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GDP_PDF_URL },
  { model: "gpt-5.6-sol", domain: "long_context", dimension: "task_success", benchmark: "gdp-pdf", score: 27.2, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GDP_PDF_URL },
  { model: "muse-spark-1.3", domain: "long_context", dimension: "task_success", benchmark: "gdp-pdf", score: 26.6, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GDP_PDF_URL },
  { model: "gpt-5.6-luna", domain: "long_context", dimension: "task_success", benchmark: "gdp-pdf", score: 24.0, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GDP_PDF_URL },
  { model: "kimi-k3", domain: "long_context", dimension: "task_success", benchmark: "gdp-pdf", score: 22.0, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GDP_PDF_URL },
  { model: "claude-opus-5", domain: "long_context", dimension: "task_success", benchmark: "gdp-pdf", score: 21.6, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GDP_PDF_URL },
  { model: "gemini-3.8-flash", domain: "long_context", dimension: "task_success", benchmark: "gdp-pdf", score: 21.0, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GDP_PDF_URL },
  { model: "gpt-6-luna", domain: "long_context", dimension: "task_success", benchmark: "gdp-pdf", score: 20.4, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GDP_PDF_URL },
  { model: "mimo-v2.6-pro", domain: "long_context", dimension: "task_success", benchmark: "gdp-pdf", score: 19.2, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GDP_PDF_URL },
  { model: "grok-4.6", domain: "long_context", dimension: "task_success", benchmark: "gdp-pdf", score: 17.0, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GDP_PDF_URL },
];

const SCIENCE_EVIDENCE: readonly ModelQualityEvidence[] = [
  // science — GPQA Diamond（研究生级科学推理，主榜）。
  { model: "gpt-6-astra", domain: "science", dimension: "task_success", benchmark: "gpqa-diamond", score: 96.3, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GPQA_URL },
  { model: "gemini-3.8-flash", domain: "science", dimension: "task_success", benchmark: "gpqa-diamond", score: 95.3, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GPQA_URL },
  { model: "grok-4.6", domain: "science", dimension: "task_success", benchmark: "gpqa-diamond", score: 94.9, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GPQA_URL },
  { model: "gemini-3.7-flash", domain: "science", dimension: "task_success", benchmark: "gpqa-diamond", score: 94.5, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GPQA_URL },
  { model: "gpt-5.6-sol", domain: "science", dimension: "task_success", benchmark: "gpqa-diamond", score: 94.1, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GPQA_URL },
  { model: "muse-spark-1.3", domain: "science", dimension: "task_success", benchmark: "gpqa-diamond", score: 94.1, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GPQA_URL },
  { model: "kimi-k3", domain: "science", dimension: "task_success", benchmark: "gpqa-diamond", score: 93.5, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GPQA_URL },
  { model: "claude-opus-5", domain: "science", dimension: "task_success", benchmark: "gpqa-diamond", score: 93.2, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GPQA_URL },
  { model: "glm-5.3", domain: "science", dimension: "task_success", benchmark: "gpqa-diamond", score: 91.7, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GPQA_URL },
  { model: "gpt-5.6-luna", domain: "science", dimension: "task_success", benchmark: "gpqa-diamond", score: 91.1, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_GPQA_URL },
  // science — Humanity's Last Exam。
  { model: "claude-opus-5-5", domain: "science", dimension: "task_success", benchmark: "humanitys-last-exam", score: 61.4, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_HLE_URL },
  { model: "claude-fable-5", domain: "science", dimension: "task_success", benchmark: "humanitys-last-exam", score: 55.5, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_HLE_URL },
  { model: "claude-opus-5", domain: "science", dimension: "task_success", benchmark: "humanitys-last-exam", score: 54.9, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_HLE_URL },
  { model: "gpt-6-astra", domain: "science", dimension: "task_success", benchmark: "humanitys-last-exam", score: 54.7, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_HLE_URL },
  { model: "gpt-5.6-sol", domain: "science", dimension: "task_success", benchmark: "humanitys-last-exam", score: 49.5, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_HLE_URL },
  { model: "mimo-v2.6-pro", domain: "science", dimension: "task_success", benchmark: "humanitys-last-exam", score: 49.4, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_HLE_URL },
  { model: "muse-spark-1.3", domain: "science", dimension: "task_success", benchmark: "humanitys-last-exam", score: 48.7, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_HLE_URL },
  { model: "gemini-3.8-flash", domain: "science", dimension: "task_success", benchmark: "humanitys-last-exam", score: 47.8, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_HLE_URL },
  { model: "kimi-k3", domain: "science", dimension: "task_success", benchmark: "humanitys-last-exam", score: 46.9, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_HLE_URL },
  { model: "step-5-preview", domain: "science", dimension: "task_success", benchmark: "humanitys-last-exam", score: 46.5, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_HLE_URL },
  { model: "grok-4.6", domain: "science", dimension: "task_success", benchmark: "humanitys-last-exam", score: 42.9, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_HLE_URL },
  { model: "glm-5.3", domain: "science", dimension: "task_success", benchmark: "humanitys-last-exam", score: 42.3, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_HLE_URL },
  // science — CritPt（研究级物理推理）。
  { model: "gpt-5.6-sol", domain: "science", dimension: "task_success", benchmark: "critpt", score: 32.3, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_CRITPT_URL },
  { model: "claude-opus-5-5", domain: "science", dimension: "task_success", benchmark: "critpt", score: 31.7, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_CRITPT_URL },
  { model: "gpt-6-astra", domain: "science", dimension: "task_success", benchmark: "critpt", score: 31.7, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_CRITPT_URL },
  { model: "claude-opus-5", domain: "science", dimension: "task_success", benchmark: "critpt", score: 29.1, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_CRITPT_URL },
  { model: "mimo-v2.6-pro", domain: "science", dimension: "task_success", benchmark: "critpt", score: 26.6, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_CRITPT_URL },
  { model: "muse-spark-1.3", domain: "science", dimension: "task_success", benchmark: "critpt", score: 24.9, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_CRITPT_URL },
  { model: "kimi-k3", domain: "science", dimension: "task_success", benchmark: "critpt", score: 23.4, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_CRITPT_URL },
  { model: "step-5-preview", domain: "science", dimension: "task_success", benchmark: "critpt", score: 20.9, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_CRITPT_URL },
  { model: "gpt-5.6-luna", domain: "science", dimension: "task_success", benchmark: "critpt", score: 20.6, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_CRITPT_URL },
  { model: "gpt-6-luna", domain: "science", dimension: "task_success", benchmark: "critpt", score: 19.4, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_CRITPT_URL },
  { model: "glm-5.3", domain: "science", dimension: "task_success", benchmark: "critpt", score: 19.1, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_CRITPT_URL },
  { model: "gemini-3.8-flash", domain: "science", dimension: "task_success", benchmark: "critpt", score: 18.3, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_CRITPT_URL },
  // science — SciCode（科学编码）。
  { model: "claude-opus-5-5", domain: "science", dimension: "task_success", benchmark: "scicode", score: 66.9, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_SCICODE_URL },
  { model: "claude-fable-5", domain: "science", dimension: "task_success", benchmark: "scicode", score: 61.0, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_SCICODE_URL },
  { model: "mimo-v2.6-pro", domain: "science", dimension: "task_success", benchmark: "scicode", score: 60.9, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_SCICODE_URL },
  { model: "gemini-3.7-flash", domain: "science", dimension: "task_success", benchmark: "scicode", score: 59.8, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_SCICODE_URL },
  { model: "kimi-k3", domain: "science", dimension: "task_success", benchmark: "scicode", score: 59.5, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_SCICODE_URL },
  { model: "glm-5.3", domain: "science", dimension: "task_success", benchmark: "scicode", score: 59.0, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_SCICODE_URL },
  { model: "step-5-preview", domain: "science", dimension: "task_success", benchmark: "scicode", score: 58.9, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_SCICODE_URL },
  { model: "muse-spark-1.3", domain: "science", dimension: "task_success", benchmark: "scicode", score: 58.8, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_SCICODE_URL },
  { model: "gpt-5.6-sol", domain: "science", dimension: "task_success", benchmark: "scicode", score: 57.1, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_SCICODE_URL },
  { model: "gemini-3.8-flash", domain: "science", dimension: "task_success", benchmark: "scicode", score: 56.6, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_SCICODE_URL },
  { model: "gpt-6-astra", domain: "science", dimension: "task_success", benchmark: "scicode", score: 56.5, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_SCICODE_URL },
  { model: "grok-4.6", domain: "science", dimension: "task_success", benchmark: "scicode", score: 56.5, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_SCICODE_URL },
  { model: "claude-opus-5", domain: "science", dimension: "task_success", benchmark: "scicode", score: 56.4, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_SCICODE_URL },
  { model: "gpt-6-luna", domain: "science", dimension: "task_success", benchmark: "scicode", score: 54.6, direction: "higher_better", measuredAt: "2026-09-24", sourceUrl: AA_SCICODE_URL },
];

export const MODEL_QUALITY_EVIDENCE: readonly ModelQualityEvidence[] = [
  ...CODING_EVIDENCE,
  ...LONG_CONTEXT_EVIDENCE,
  ...SCIENCE_EVIDENCE,
  ...expandColumnarSnapshot("writing.creative", CREATIVE_WRITING_V3_COLUMNS, CREATIVE_WRITING_V3_SCORES, {
    sourceUrl: CREATIVE_WRITING_V3_URL,
    benchmarkVersion: CREATIVE_WRITING_V3_VERSION,
    measuredAt: CREATIVE_WRITING_V3_MEASURED_AT,
  }),
];
