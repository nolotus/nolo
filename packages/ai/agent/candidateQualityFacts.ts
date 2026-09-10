// ai/agent/candidateQualityFacts.ts
//
// Candidate-scoped, compact quality context for agent selection.
//
// One candidate can carry several independent dimensions (preference, rubric,
// slop, ...). There is no overall score, no weighting and no ranking here: the
// formatter groups facts by (dimension, benchmark identity, direction) so the
// selector reads each dimension as its own evidence, with the metric direction
// stated explicitly. Missing dimensions simply produce no line — missing is not
// zero and not "weaker". sourceUrl/measuredAt stay in the evidence layer and are
// never injected into the prompt. Only benchmarks declared for the domain +
// dimension are rendered, so facts from another domain cannot leak into
// quality[<domain>].

import {
  DOMAIN_DIMENSION_BENCHMARK_PRIORITY,
  resolveCandidateQualityEvidenceSets,
  type ModelQualityDirection,
  type ModelQualityDimension,
  type ModelQualityDomain,
  type ModelQualityEvidence,
} from "../llm/modelQualityEvidence";
import { MODEL_QUALITY_EVIDENCE } from "../llm/modelQualityEvidenceData";
import { resolveTaskQualityDomain } from "./taskQualityDomain";

export interface CandidateQualityFact {
  model: string;
  /** One entry per dimension with evidence; an empty array means "no curated evidence". */
  evidence: Array<{
    dimension: ModelQualityDimension;
    benchmark: string;
    benchmarkVersion?: string;
    score: number;
    direction: ModelQualityDirection;
  }>;
}

function toCompactEvidence(
  evidence: readonly ModelQualityEvidence[],
): CandidateQualityFact["evidence"] {
  return evidence.map((entry) => {
    const { dimension, benchmark, benchmarkVersion, score, direction } = entry;
    return benchmarkVersion === undefined
      ? { dimension, benchmark, score, direction }
      : { dimension, benchmark, benchmarkVersion, score, direction };
  });
}

export function resolveCandidateQualityFacts(
  models: readonly string[],
  domain: ModelQualityDomain,
): CandidateQualityFact[] {
  const uniqueModels = [...new Set(models.map((model) => model.trim()).filter(Boolean))];
  return resolveCandidateQualityEvidenceSets(uniqueModels, domain, MODEL_QUALITY_EVIDENCE).map(
    ({ model, evidence }) => ({ model, evidence: toCompactEvidence(evidence) }),
  );
}

/** One dimension + benchmark identity group: `dimension=value` pairs for the candidates that have it. */
interface QualityFactGroup {
  dimension: ModelQualityDimension;
  benchmark: string;
  benchmarkVersion?: string;
  direction: ModelQualityDirection;
  entries: Array<{ model: string; score: number }>;
}

/**
 * Group facts by dimension + benchmark identity, in the domain's declared
 * dimension order (so the output order never depends on which candidate
 * happened to come first in the input list).
 */
/**
 * Only benchmarks declared for this (domain, dimension) may be rendered.
 *
 * The compact projection deliberately drops `domain` to keep the payload
 * small, so the formatter re-checks the pair it is rendering under: a fact set
 * built for another domain can otherwise leak foreign evidence into
 * `quality[<domain>]`. (An unreviewed benchmark is dropped here too, which
 * keeps the "never declared → never rendered" rule true at every boundary.)
 */
function isDeclaredBenchmark(
  domain: ModelQualityDomain,
  dimension: ModelQualityDimension,
  benchmark: string,
): boolean {
  return DOMAIN_DIMENSION_BENCHMARK_PRIORITY[domain]?.[dimension]?.includes(benchmark) ?? false;
}

function groupQualityFacts(domain: ModelQualityDomain, facts: readonly CandidateQualityFact[]): QualityFactGroup[] {
  const groups = new Map<string, QualityFactGroup>();

  for (const fact of facts) {
    for (const evidence of fact.evidence) {
      if (!isDeclaredBenchmark(domain, evidence.dimension, evidence.benchmark)) continue;
      const key = `${evidence.dimension}|${evidence.benchmark}|${evidence.benchmarkVersion ?? ""}|${evidence.direction}`;
      const group = groups.get(key) ?? {
        dimension: evidence.dimension,
        benchmark: evidence.benchmark,
        benchmarkVersion: evidence.benchmarkVersion,
        direction: evidence.direction,
        entries: [],
      };
      group.entries.push({ model: fact.model, score: evidence.score });
      groups.set(key, group);
    }
  }

  const declaredOrder = Object.keys(
    DOMAIN_DIMENSION_BENCHMARK_PRIORITY[domain] ?? {},
  ) as ModelQualityDimension[];
  const rank = (dimension: ModelQualityDimension) => {
    const index = declaredOrder.indexOf(dimension);
    return index === -1 ? declaredOrder.length : index;
  };
  // Array.prototype.sort is stable: same-dimension groups keep insertion order.
  return [...groups.values()].sort((left, right) => rank(left.dimension) - rank(right.dimension));
}

function formatDirection(direction: ModelQualityDirection): string {
  // neutral must stay explicit: it describes the metric, not quality.
  return direction === "neutral"
    ? "[neutral: descriptive, not better/worse]"
    : `[${direction}]`;
}

function formatGroupHeader(group: QualityFactGroup): string {
  const identity = group.benchmarkVersion
    ? `${group.benchmark} ${group.benchmarkVersion}`
    : group.benchmark;
  return `${group.dimension} ${formatDirection(group.direction)} (${identity})`;
}

/**
 * Build the selector-facing quality context, or `null` when there is nothing
 * to say (no candidates, or none of them has curated evidence for the domain).
 *
 * Facts are expected to come from resolveCandidateQualityFacts(models, domain);
 * entries whose benchmark is not declared for this domain + dimension are
 * dropped rather than rendered under the wrong domain.
 */
export function formatCandidateQualityFacts(
  domain: ModelQualityDomain,
  facts: readonly CandidateQualityFact[],
): string | null {
  const groups = groupQualityFacts(domain, facts);
  if (groups.length === 0) return null;

  const lines = groups.map((group) => {
    const values = group.entries.map((entry) => `${entry.model}=${entry.score}`).join("; ");
    return `  ${formatGroupHeader(group)}: ${values}`;
  });
  return `quality[${domain}]:\n${lines.join("\n")}`;
}

/** Build selector-only quality context from the current task and candidates. */
export function resolveTaskCandidateQualityContext(
  task: string | null | undefined,
  models: readonly string[],
): string | null {
  const domain = resolveTaskQualityDomain({ task });
  if (!domain) return null;
  return formatCandidateQualityFacts(domain, resolveCandidateQualityFacts(models, domain));
}

/**
 * Add quality context at the selector boundary, not in listAgents discovery.
 * Invalid/non-list results and undecidable tasks remain byte-for-byte intact.
 */
export function injectQualityContextIntoListAgentsResult(
  result: string,
  task: string | null | undefined,
): string {
  let parsed: any;
  try {
    parsed = JSON.parse(result);
  } catch {
    return result;
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.agents)) return result;

  const models = parsed.agents
    .map((agent: any) => agent?.model)
    .filter((model: unknown): model is string => typeof model === "string");
  const qualityContext = resolveTaskCandidateQualityContext(task, models);
  return qualityContext ? JSON.stringify({ ...parsed, qualityContext }) : result;
}
