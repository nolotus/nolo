// ai/agent/candidateQualityFacts.ts
// Candidate-scoped, compact quality context for agent selection.

import {
  resolveCandidateQualityEvidence,
  type ModelQualityDomain,
  type ModelQualityEvidence,
} from "../llm/modelQualityEvidence";
import { MODEL_QUALITY_EVIDENCE } from "../llm/modelQualityEvidenceData";
import { resolveTaskQualityDomain } from "./taskQualityDomain";

export interface CandidateQualityFact {
  model: string;
  evidence: {
    benchmark: string;
    benchmarkVersion?: string;
    score: number;
  } | null;
}

function toCompactEvidence(
  evidence: ModelQualityEvidence | null,
): CandidateQualityFact["evidence"] {
  if (!evidence) return null;
  const { benchmark, benchmarkVersion, score } = evidence;
  return benchmarkVersion === undefined
    ? { benchmark, score }
    : { benchmark, benchmarkVersion, score };
}

export function resolveCandidateQualityFacts(
  models: readonly string[],
  domain: ModelQualityDomain,
): CandidateQualityFact[] {
  const uniqueModels = [...new Set(models.map((model) => model.trim()).filter(Boolean))];
  return resolveCandidateQualityEvidence(uniqueModels, domain, MODEL_QUALITY_EVIDENCE).map(
    ({ model, evidence }) => ({ model, evidence: toCompactEvidence(evidence) }),
  );
}

export function formatCandidateQualityFacts(
  domain: ModelQualityDomain,
  facts: readonly CandidateQualityFact[],
): string | null {
  if (facts.length === 0 || facts.every((fact) => fact.evidence === null)) return null;
  const parts = facts.map((fact) => {
    if (!fact.evidence) return `${fact.model}=n/a`;
    const identity = fact.evidence.benchmarkVersion
      ? `${fact.evidence.benchmark} ${fact.evidence.benchmarkVersion}`
      : fact.evidence.benchmark;
    return `${fact.model}=${fact.evidence.score} (${identity})`;
  });
  return `quality[${domain}]: ${parts.join("; ")}`;
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
