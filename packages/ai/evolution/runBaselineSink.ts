import type { EvolutionCompletedAnalysis } from "./candidateSink";
import {
  createEvolutionRunBaselineRecord,
  type EvolutionRunBaselineRecord,
} from "./runBaseline";
import {
  writeEvolutionRunBaselineRecord,
  type EvolutionRunBaselineStore,
} from "./runBaselineWriter";

export type PersistEvolutionRunBaselineResult = {
  persisted: true;
  record: EvolutionRunBaselineRecord;
};

/**
 * Persist one compact baseline row for every completed run presented by the
 * host. This intentionally ignores `analysis.interesting` so later baseline
 * statistics are not biased toward anomalous runs.
 */
export const persistEvolutionRunBaseline = async ({
  store,
  analysis,
  id,
  createdAt,
  taskClass,
}: {
  store: EvolutionRunBaselineStore;
  analysis: EvolutionCompletedAnalysis;
  id: string;
  createdAt: string;
  taskClass?: string | null;
}): Promise<PersistEvolutionRunBaselineResult> => {
  const record = createEvolutionRunBaselineRecord({
    id,
    createdAt,
    analysis,
    taskClass,
  });
  await writeEvolutionRunBaselineRecord({ store, record });
  return { persisted: true, record };
};
