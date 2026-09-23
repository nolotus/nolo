import {
  DEFAULT_EVOLUTION_TRIAGE_POLICY,
  type EvolutionDecisionModel,
  type EvolutionTriageInput,
  type EvolutionTriagePolicy,
  type EvolutionTriageResult,
} from "./types";

export type EvolutionTriageDecision = {
  result: EvolutionTriageResult;
  investigate: boolean;
  reason:
    | "worth_investigating"
    | "likely_external_failure"
    | "below_threshold";
};

const clampProbability = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

export function applyEvolutionTriagePolicy(
  raw: EvolutionTriageResult,
  policy: EvolutionTriagePolicy = DEFAULT_EVOLUTION_TRIAGE_POLICY,
): EvolutionTriageDecision {
  const result: EvolutionTriageResult = {
    ...raw,
    worthInvestigating: clampProbability(raw.worthInvestigating),
    likelyExternalFailure: clampProbability(raw.likelyExternalFailure),
    likelyBehavioralWaste: clampProbability(raw.likelyBehavioralWaste),
    expectedImpact: clampProbability(raw.expectedImpact),
  };

  if (
    result.likelyExternalFailure >= policy.externalFailureSuppressThreshold &&
    result.likelyBehavioralWaste < policy.investigateThreshold
  ) {
    return { result, investigate: false, reason: "likely_external_failure" };
  }

  if (result.worthInvestigating >= policy.investigateThreshold) {
    return { result, investigate: true, reason: "worth_investigating" };
  }

  return { result, investigate: false, reason: "below_threshold" };
}

export async function triageEvolutionRun(
  model: EvolutionDecisionModel,
  input: EvolutionTriageInput,
  policy: EvolutionTriagePolicy = DEFAULT_EVOLUTION_TRIAGE_POLICY,
): Promise<EvolutionTriageDecision> {
  return applyEvolutionTriagePolicy(await model.triage(input), policy);
}
