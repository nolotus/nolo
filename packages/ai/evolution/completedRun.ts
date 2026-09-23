import { buildEvolutionRunSnapshot } from "./runSnapshot";
import { detectEvolutionSignals, isInterestingEvolutionRun } from "./signals";
import type { EvolutionRunSnapshotInput, EvolutionSignalThresholds } from "./types";

/**
 * Runtime-neutral completion seam for Evolution PR1.
 *
 * Hosts keep ownership of run lifecycle and observations. Evolution only derives
 * a snapshot and deterministic signals after a run has completed; it never
 * changes runtime behavior or persistence.
 */
export function analyzeCompletedEvolutionRun(
  input: EvolutionRunSnapshotInput,
  thresholds?: EvolutionSignalThresholds,
) {
  const snapshot = buildEvolutionRunSnapshot(input);
  const signals = detectEvolutionSignals(snapshot, thresholds);
  return {
    snapshot,
    signals,
    interesting: isInterestingEvolutionRun(signals),
  };
}
