// ai/agent/candidateQualityFacts.ts
//
// Compact candidate-scoped quality facts: domain + candidate models +
// curated MODEL_QUALITY_EVIDENCE → tiny selector-ready facts.
//
// Why this module exists: the benchmark DB can grow, but selector context
// must not grow. This projection is the token boundary between the evidence
// store and the future selector:
// - candidate-scoped: output is exactly the input candidates, in input order;
// - missing evidence stays missing (`evidence: null`) — no cross-domain
//   fallback, no copying other benchmarks, no inferred strength;
// - audit fields (sourceUrl/measuredAt) are stripped here: selector facts
//   keep model/benchmark/benchmarkVersion?/score only;
// - scores stay benchmark-native raw values — no normalization, no rank,
//   no winner, no overall score;
// - still not wired to listAgents/selector/system prompt — that integration
//   is a later, separate task.

import {
  resolveCandidateQualityEvidence,
  type ModelQualityDomain,
  type ModelQualityEvidence,
} from "../llm/modelQualityEvidence";
import { MODEL_QUALITY_EVIDENCE } from "../llm/modelQualityEvidenceData";

/** One candidate's compact quality fact; `evidence: null` means unknown. */
export interface CandidateQualityFact {
  model: string;
  evidence:
    | {
        /** Benchmark identity; a bare score is meaningless without it. */
        benchmark: string;
        benchmarkVersion?: string;
        /** Raw benchmark-native score. Never normalized. */
        score: number;
      }
    | null;
}

/** Evidence row → compact fact. Drops audit/provenance fields. */
function toCompactEvidence(
  evidence: ModelQualityEvidence | null,
): CandidateQualityFact["evidence"] {
  if (!evidence) return null;
  const { benchmark, benchmarkVersion, score } = evidence;
  return benchmarkVersion === undefined
    ? { benchmark, score }
    : { benchmark, benchmarkVersion, score };
}

/**
 * Resolve compact quality facts for the current candidates only.
 *
 * Callers never pass (or see) the evidence store. Output contains exactly
 * the input candidates in input order, at most one evidence entry each
 * (possibly `null` — missing stays missing).
 */
export function resolveCandidateQualityFacts(
  models: readonly string[],
  domain: ModelQualityDomain,
): CandidateQualityFact[] {
  return resolveCandidateQualityEvidence(models, domain, MODEL_QUALITY_EVIDENCE).map(
    ({ model, evidence }) => ({ model, evidence: toCompactEvidence(evidence) }),
  );
}

/**
 * Deterministic one-line projection for a future selector prompt, e.g.
 * `quality[coding.rails]: claude-fable-5-1=92 (agents-on-rails); gemini-3.8-flash=n/a`
 *
 * - returns `null` for an empty candidate list or when every candidate is
 *   missing evidence (no decision value — don't spend tokens on it);
 * - partial missing stays visible as `n/a` (missing is a real signal);
 * - facts only: no prose, no explanation, no rank/winner/recommended.
 */
export function formatCandidateQualityFacts(
  domain: ModelQualityDomain,
  facts: readonly CandidateQualityFact[],
): string | null {
  if (facts.length === 0) return null;
  if (facts.every((fact) => fact.evidence === null)) return null;

  const parts = facts.map((fact) => {
    if (!fact.evidence) return `${fact.model}=n/a`;
    const identity = fact.evidence.benchmarkVersion
      ? `${fact.evidence.benchmark} ${fact.evidence.benchmarkVersion}`
      : fact.evidence.benchmark;
    return `${fact.model}=${fact.evidence.score} (${identity})`;
  });
  return `quality[${domain}]: ${parts.join("; ")}`;
}
