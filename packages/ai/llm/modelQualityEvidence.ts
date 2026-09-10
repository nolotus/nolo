// ai/llm/modelQualityEvidence.ts
//
// Domain- and dimension-aware model quality evidence (v2).
//
// Principles:
// - domain-specific: evidence is only meaningful for one ModelQualityDomain
// - dimension-atomic: one evidence row describes ONE dimension of quality
//   (task_success, preference, rubric, slop, repetition, length, ...). A domain
//   may have several independent dimensions; there is no cross-dimension score.
// - direction travels with the row: consumers never have to guess whether a
//   higher number is better (higher_better / lower_better / neutral).
// - candidate-scoped: resolvers only look at the models you pass in
// - benchmark-version-aware: benchmark identity (name + optional version) is
//   preserved; scores from different benchmarks are never cross-compared
// - raw score preserved: `score` is benchmark-native (percent, Elo, length ...)
//   and only meaningful together with benchmark identity/version; it is never
//   normalized into a universal 0-100 scale
// - no universal score: no overallScore / weightedScore / percentile /
//   confidence / ranking. Missing evidence stays missing (never 0).
//
// Curated real evidence rows live in modelQualityEvidenceData.ts (data-only);
// types, benchmark priority and resolvers live here. Adopting a new benchmark
// family/version is a data + priority change, never a resolver change.
//
// Note on legacy metadata: modelAbility is legacy display/reference metadata
// and is not the source of truth for domain-aware routing (its `writingScore`
// must not be combined with the writing.creative evidence below).

/**
 * Task domains used to scope quality evidence.
 *
 * `coding.general` intentionally has no benchmark priority entry yet: without
 * a declared benchmark list the resolver must not guess.
 */
export type ModelQualityDomain =
  | "coding.general"
  | "coding.repo"
  | "coding.terminal"
  | "coding.rails"
  | "design.website"
  | "writing.creative";

/**
 * Independent quality dimensions.
 *
 * A dimension is a *kind of observation*, not a benchmark: the same dimension
 * can be declared with different benchmark families per domain, and a new
 * domain/dimension combination only needs a priority entry.
 *
 * - task_success: end-to-end task completion quality (percent-style)
 * - preference: comparative/preference rating (e.g. Elo from pairwise judges)
 * - rubric: absolute rubric score from a judge
 * - slop: overused-LLM-phrasing frequency
 * - repetition: repeated words/phrases frequency
 * - length: output length in characters (descriptive, not good or bad)
 */
export type ModelQualityDimension =
  | "task_success"
  | "preference"
  | "rubric"
  | "slop"
  | "repetition"
  | "length";

/**
 * Which way the raw score points.
 *
 * - higher_better: larger values usually mean better quality
 * - lower_better: smaller values usually mean better quality
 * - neutral: descriptive behaviour (e.g. output length); neither better nor worse
 *
 * `direction` is part of the evidence so the selector never infers it.
 */
export type ModelQualityDirection = "higher_better" | "lower_better" | "neutral";

/**
 * One raw benchmark observation for one model, in one domain, on one dimension.
 *
 * `score` is benchmark-native and only meaningful together with benchmark
 * identity/version (percent, Elo, character count ... are NOT interchangeable).
 */
export interface ModelQualityEvidence {
  model: string;

  domain: ModelQualityDomain;

  /** Which independent dimension of quality this row observes. */
  dimension: ModelQualityDimension;

  /** Benchmark identity exactly as declared in DOMAIN_DIMENSION_BENCHMARK_PRIORITY, e.g. "deepswe-1.1" or "eqbench-creative-writing-v3-elo". */
  benchmark: string;
  /** Optional display/audit release label (e.g. "4.0", "v3"); identity matching uses `benchmark` only. */
  benchmarkVersion?: string;

  /** Raw, benchmark-native score. Never normalized, never combined across dimensions. */
  score: number;

  /** Metric semantics: never inferred downstream. */
  direction: ModelQualityDirection;

  /** Optional ISO timestamp of when the score was measured. */
  measuredAt?: string;

  /** Public page the score was read from; minimal provenance for audit. */
  sourceUrl?: string;
}

/**
 * Declared benchmark priority per domain *and* dimension, most preferred first.
 *
 * Shape: domain → dimension → benchmark priority[]. Each dimension decides its
 * own priority, so a new benchmark version can replace just one dimension
 * (e.g. only `rubric`) without touching the others.
 *
 * Only benchmarks listed here may ever be selected; an unreviewed benchmark
 * must not silently enter routing (see resolveModelQualityEvidenceSet). Adding
 * a new benchmark family/version to the front of a dimension list is how
 * "newer benchmark wins" is expressed.
 */
export type DomainDimensionBenchmarkPriority = {
  readonly [K in ModelQualityDomain]?: {
    readonly [D in ModelQualityDimension]?: readonly string[];
  };
};

export const DOMAIN_DIMENSION_BENCHMARK_PRIORITY: DomainDimensionBenchmarkPriority = {
  "coding.terminal": {
    task_success: ["terminal-bench-4", "terminal-bench-3", "terminal-bench-2.1"],
  },
  "coding.rails": {
    task_success: ["agents-on-rails"],
  },
  "coding.repo": {
    task_success: ["deepswe-1.1"],
  },
  "design.website": {
    // Declared but deliberately empty this round: no reviewed value is stable
    // enough to record (see modelQualityEvidenceData.ts).
    preference: ["design-arena-website"],
  },
  "writing.creative": {
    // EQ-Bench Creative Writing v3, one benchmark identity per dimension.
    preference: ["eqbench-creative-writing-v3-elo"],
    rubric: ["eqbench-creative-writing-v3-rubric"],
    slop: ["eqbench-creative-writing-v3-slop"],
    repetition: ["eqbench-creative-writing-v3-repetition"],
    length: ["eqbench-creative-writing-v3-length"],
  },
};

/**
 * Pick the best evidence entry per declared dimension for one candidate model
 * in one domain.
 *
 * - Looks only at `model` and `domain` (never leaks other domains/models).
 * - Walks the domain's dimensions in declaration order, and within each
 *   dimension walks the benchmark priority in order, returning the first
 *   existing entry: a newer declared benchmark always wins over an older one
 *   regardless of raw score.
 * - Returns at most one entry per dimension, in declaration order — stable
 *   output, no ranking, no overall score.
 * - Benchmarks not declared for that dimension are ignored, never auto-selected.
 * - Returns `[]` when nothing matches (missing evidence stays missing, never 0).
 *   Never throws.
 */
export function resolveModelQualityEvidenceSet(
  model: string,
  domain: ModelQualityDomain,
  evidence: readonly ModelQualityEvidence[],
): ModelQualityEvidence[] {
  const dimensions = DOMAIN_DIMENSION_BENCHMARK_PRIORITY[domain];
  if (!dimensions) return [];

  const resolved: ModelQualityEvidence[] = [];
  for (const dimension of Object.keys(dimensions) as ModelQualityDimension[]) {
    const benchmarks = dimensions[dimension];
    if (!benchmarks) continue;

    for (const benchmark of benchmarks) {
      const match = evidence.find(
        (entry) =>
          entry.model === model &&
          entry.domain === domain &&
          entry.dimension === dimension &&
          entry.benchmark === benchmark,
      );
      if (match) {
        resolved.push(match);
        break;
      }
    }
  }
  return resolved;
}

/** One candidate model with its (possibly empty) per-dimension evidence set. */
export interface CandidateQualityEvidenceSet {
  model: string;
  /** Empty array means "no curated evidence", not zero and not weaker. */
  evidence: ModelQualityEvidence[];
}

/**
 * Resolve evidence sets for a candidate list without touching anything else.
 *
 * - Output contains exactly the input candidates, in input order.
 * - Each candidate gets its own evidence array (possibly empty).
 * - Store entries for unrelated models are never scanned into the output,
 *   keeping the downstream prompt/token footprint bounded.
 */
export function resolveCandidateQualityEvidenceSets(
  models: readonly string[],
  domain: ModelQualityDomain,
  evidence: readonly ModelQualityEvidence[],
): CandidateQualityEvidenceSet[] {
  return models.map((model) => ({
    model,
    evidence: resolveModelQualityEvidenceSet(model, domain, evidence),
  }));
}
