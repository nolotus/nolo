import type { EvolutionCandidate } from "./candidate";
import type { MaterializedEvolutionCase } from "./caseMaterialization";
import {
  buildEvolutionComparableBaseline,
  buildEvolutionComparableRunSample,
  type EvolutionComparableBaseline,
  type EvolutionComparableRunKey,
  type EvolutionComparableRunSample,
} from "./comparableRuns";
import {
  baselineRecordToComparableRunSample,
  type EvolutionRunBaselineRecord,
} from "./runBaseline";

export type EvolutionHistoricalBaselineStatus = "resolved" | "unavailable";

export type EvolutionHistoricalBaseline = {
  status: EvolutionHistoricalBaselineStatus;
  key?: EvolutionComparableRunKey;
  /** Number of comparable historical samples after filtering + self-exclusion. */
  sampleCount: number;
  /** true iff sampleCount >= minSamples. Statistics may still be present. */
  sufficient: boolean;
  baseline?: EvolutionComparableBaseline;
};

export const DEFAULT_MIN_COMPARABLE_SAMPLES = 10;

/**
 * Resolve the historical baseline distribution for one comparable run key.
 *
 * Pure logic: accepts already-fetched baseline records, converts them to
 * comparable samples (unclassified records are dropped by
 * baselineRecordToComparableRunSample), excludes the current run via runId,
 * then delegates ALL statistics to buildEvolutionComparableBaseline.
 * No I/O, no store access.
 *
 * `currentRunId` is the runId of the run being analyzed; records sharing it
 * are excluded so a run never contributes to its own baseline. Legacy records
 * without runId cannot be self-excluded — they predate the field and are
 * accepted as-is (a fresh write path always sets runId when the snapshot has
 * one).
 */
export const resolveEvolutionHistoricalBaseline = ({
  key,
  records,
  currentRunId,
  minSamples = DEFAULT_MIN_COMPARABLE_SAMPLES,
}: {
  key: EvolutionComparableRunKey;
  records: readonly EvolutionRunBaselineRecord[];
  currentRunId?: string;
  minSamples?: number;
}): EvolutionHistoricalBaseline => {
  const samples: EvolutionComparableRunSample[] = [];

  for (const record of records) {
    if (currentRunId && record.runId === currentRunId) continue;
    const sample = baselineRecordToComparableRunSample(record);
    if (!sample) continue;
    samples.push(sample);
  }

  const baseline = buildEvolutionComparableBaseline({ key, population: samples });
  const sampleCount = baseline?.sampleCount ?? 0;

  return {
    status: "resolved",
    key,
    sampleCount,
    sufficient: sampleCount >= minSamples,
    ...(baseline ? { baseline } : {}),
  };
};

/**
 * Convenience wrapper for the materialized-case path.
 *
 * Derives the comparable key via the existing buildEvolutionComparableRunSample
 * contract (taskClass + runKind + toolSurfaceBucket). When taskClass is
 * unresolved it returns `status: "unavailable"` — callers must not fall back
 * to a fabricated key such as "unknown".
 */
export const resolveEvolutionHistoricalBaselineForCase = ({
  candidate,
  materializedCase,
  records,
  minSamples,
}: {
  candidate: EvolutionCandidate;
  materializedCase: MaterializedEvolutionCase;
  records: readonly EvolutionRunBaselineRecord[];
  minSamples?: number;
}): EvolutionHistoricalBaseline => {
  const currentSample = buildEvolutionComparableRunSample({
    candidate,
    materializedCase,
  });
  if (!currentSample) {
    return { status: "unavailable", sampleCount: 0, sufficient: false };
  }
  return resolveEvolutionHistoricalBaseline({
    key: currentSample.key,
    records,
    ...(candidate.runId ? { currentRunId: candidate.runId } : {}),
    ...(typeof minSamples === "number" ? { minSamples } : {}),
  });
};
