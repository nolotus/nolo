import { createEvolutionCandidate, type EvolutionCandidate } from "./candidate";
import { writeEvolutionCandidate, type EvolutionCandidateStore } from "./candidateWriter";
import type { EvolutionRunSnapshot, EvolutionSignal } from "./types";

export type EvolutionCompletedAnalysis = {
  snapshot: EvolutionRunSnapshot;
  signals: EvolutionSignal[];
  interesting: boolean;
};

export type PersistEvolutionCandidateResult =
  | { persisted: false; reason: "not_interesting" }
  | { persisted: true; key: string; candidate: EvolutionCandidate };

/**
 * Persistence boundary for the candidate funnel.
 *
 * Only deterministic-interest runs cross this boundary. The persisted record
 * is the compact projection from createEvolutionCandidate; raw observations,
 * trace/tool evidence and error text never reach the store through this API.
 */
export async function persistInterestingEvolutionCandidate({
  store,
  analysis,
  candidateId,
  createdAt,
}: {
  store: EvolutionCandidateStore;
  analysis: EvolutionCompletedAnalysis;
  candidateId: string;
  createdAt: string;
}): Promise<PersistEvolutionCandidateResult> {
  if (!analysis.interesting) {
    return { persisted: false, reason: "not_interesting" };
  }

  const candidate = createEvolutionCandidate({
    candidateId,
    createdAt,
    snapshot: analysis.snapshot,
    signals: analysis.signals,
  });
  const { key } = await writeEvolutionCandidate({ store, candidate });
  return { persisted: true, key, candidate };
}
