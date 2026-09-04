// ai/llm/modelQualityEvidence.ts
//
// Domain-aware model quality evidence (v1.1).
//
// Principles:
// - domain-specific: evidence is only meaningful for one ModelQualityDomain
// - candidate-scoped: resolvers only look at the models you pass in
// - benchmark-version-aware: benchmark identity (name + optional version) is
//   preserved; scores from different benchmarks are never cross-compared
// - raw score preserved: `score` is benchmark-native and only meaningful
//   together with benchmark identity/version; never normalized into a
//   universal 0-100 scale
// - no universal score: no overallScore / trustScore / percentile / confidence
//
// Curated real evidence rows live in modelQualityEvidenceData.ts (data-only);
// types, benchmark priority and resolvers live here.
//
// Note on legacy metadata: modelAbility is legacy display/reference metadata
// and is not the source of truth for future domain-aware routing.

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
  | "design.website";

/**
 * One raw benchmark observation for one model in one domain.
 *
 * `score` is benchmark-native and only meaningful together with benchmark
 * identity/version (percent, Elo, pass@1 ... are NOT interchangeable scales).
 */
export interface ModelQualityEvidence {
  model: string;

  domain: ModelQualityDomain;

  /** Benchmark identity exactly as declared in DOMAIN_BENCHMARK_PRIORITY, e.g. "terminal-bench-4" or "deepswe-1.1". */
  benchmark: string;
  /** Optional display/audit release label (e.g. "4.0"); identity matching uses `benchmark` only. */
  benchmarkVersion?: string;

  /** Raw, benchmark-native score. Never normalized. */
  score: number;

  /** Optional ISO timestamp of when the score was measured. */
  measuredAt?: string;

  /** Public page the score was read from; minimal provenance for audit. */
  sourceUrl?: string;
}

/**
 * Declared benchmark priority per domain, most preferred first.
 *
 * Only benchmarks listed here may ever be selected for the domain; an
 * unreviewed benchmark must not silently enter routing (see
 * resolveModelQualityEvidence). Adding a new benchmark family/version to the
 * front of a list is how "newer benchmark wins" is expressed.
 */
export const DOMAIN_BENCHMARK_PRIORITY: {
  readonly [K in ModelQualityDomain]?: readonly string[];
} = {
  "coding.terminal": [
    "terminal-bench-4",
    "terminal-bench-3",
    "terminal-bench-2.1",
  ],
  "coding.rails": ["agents-on-rails"],
  "coding.repo": ["deepswe-1.1"],
  "design.website": ["design-arena-website"],
};

/**
 * Pick the single best evidence entry for one candidate model in one domain.
 *
 * - Looks only at `model` and `domain` (never leaks other domains/models).
 * - Walks `DOMAIN_BENCHMARK_PRIORITY[domain]` in order and returns the first
 *   existing evidence entry, so a newer declared benchmark always wins over
 *   an older one regardless of raw score.
 * - Benchmarks not declared for the domain are ignored, never auto-selected.
 * - Returns `null` when nothing matches. Never throws.
 */
export function resolveModelQualityEvidence(
  model: string,
  domain: ModelQualityDomain,
  evidence: readonly ModelQualityEvidence[],
): ModelQualityEvidence | null {
  const priority = DOMAIN_BENCHMARK_PRIORITY[domain];
  if (!priority) return null;

  for (const benchmark of priority) {
    for (const entry of evidence) {
      if (
        entry.model === model &&
        entry.domain === domain &&
        entry.benchmark === benchmark
      ) {
        return entry;
      }
    }
  }
  return null;
}

/**
 * Resolve evidence for a candidate list without touching anything else.
 *
 * - Output contains exactly the input candidates, in input order.
 * - Each candidate gets at most one evidence entry (possibly `null`).
 * - Store entries for unrelated models are never scanned into the output,
 *   keeping the downstream prompt/token footprint bounded.
 */
export function resolveCandidateQualityEvidence(
  models: readonly string[],
  domain: ModelQualityDomain,
  evidence: readonly ModelQualityEvidence[],
): Array<{
  model: string;
  evidence: ModelQualityEvidence | null;
}> {
  return models.map((model) => ({
    model,
    evidence: resolveModelQualityEvidence(model, domain, evidence),
  }));
}
