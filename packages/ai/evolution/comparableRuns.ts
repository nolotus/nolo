import type { EvolutionCandidate } from "./candidate";
import type { MaterializedEvolutionCase } from "./caseMaterialization";

export type EvolutionToolSurfaceBucket =
  | "none"
  | "small"
  | "medium"
  | "large"
  | "xlarge";

export type EvolutionComparableRunKey = {
  taskClass: string;
  runKind?: EvolutionCandidate["snapshot"]["runKind"];
  toolSurfaceBucket: EvolutionToolSurfaceBucket;
};

export type EvolutionComparableRunSample = {
  id: string;
  key: EvolutionComparableRunKey;
  success: boolean;
  durationMs?: number;
  llmRequestCount: number;
  toolCallCount: number;
  failedToolCallCount: number;
  repeatedToolCallCount: number;
  inputTokens?: number;
  outputTokens?: number;
  maxContentChars?: number;
  totalLatencyMs?: number;
};

export type EvolutionMetricDistribution = {
  count: number;
  min: number;
  p50: number;
  p90: number;
  p95: number;
  max: number;
};

export type EvolutionComparableBaseline = {
  key: EvolutionComparableRunKey;
  sampleCount: number;
  successRate: number;
  durationMs?: EvolutionMetricDistribution;
  llmRequestCount: EvolutionMetricDistribution;
  toolCallCount: EvolutionMetricDistribution;
  failedToolCallCount: EvolutionMetricDistribution;
  repeatedToolCallCount: EvolutionMetricDistribution;
  inputTokens?: EvolutionMetricDistribution;
  outputTokens?: EvolutionMetricDistribution;
  maxContentChars?: EvolutionMetricDistribution;
  totalLatencyMs?: EvolutionMetricDistribution;
};

export const bucketEvolutionToolSurface = (
  exposedToolNameCount: number,
): EvolutionToolSurfaceBucket => {
  if (!Number.isFinite(exposedToolNameCount) || exposedToolNameCount <= 0) {
    return "none";
  }
  if (exposedToolNameCount <= 4) return "small";
  if (exposedToolNameCount <= 12) return "medium";
  if (exposedToolNameCount <= 24) return "large";
  return "xlarge";
};

export const buildEvolutionComparableRunSample = ({
  candidate,
  materializedCase,
}: {
  candidate: EvolutionCandidate;
  materializedCase: MaterializedEvolutionCase;
}): EvolutionComparableRunSample | null => {
  const taskClass = materializedCase.task.taskClass?.trim();
  if (!taskClass) return null;
  if (candidate.id !== materializedCase.candidateId) {
    throw new Error("evolution comparable candidate mismatch");
  }

  const snapshot = candidate.snapshot;
  return {
    id: candidate.id,
    key: {
      taskClass,
      ...(snapshot.runKind ? { runKind: snapshot.runKind } : {}),
      toolSurfaceBucket: bucketEvolutionToolSurface(snapshot.exposedToolNameCount),
    },
    success: snapshot.success,
    ...(typeof snapshot.durationMs === "number" ? { durationMs: snapshot.durationMs } : {}),
    llmRequestCount: snapshot.llmRequestCount,
    toolCallCount: snapshot.toolCallCount,
    failedToolCallCount: snapshot.failedToolCallCount,
    repeatedToolCallCount: snapshot.repeatedToolCallCount,
    ...(typeof snapshot.inputTokens === "number" ? { inputTokens: snapshot.inputTokens } : {}),
    ...(typeof snapshot.outputTokens === "number" ? { outputTokens: snapshot.outputTokens } : {}),
    ...(typeof snapshot.maxContentChars === "number" ? { maxContentChars: snapshot.maxContentChars } : {}),
    ...(typeof snapshot.totalLatencyMs === "number" ? { totalLatencyMs: snapshot.totalLatencyMs } : {}),
  };
};

export const isEvolutionComparableRun = (
  left: EvolutionComparableRunKey,
  right: EvolutionComparableRunKey,
): boolean =>
  left.taskClass === right.taskClass &&
  left.runKind === right.runKind &&
  left.toolSurfaceBucket === right.toolSurfaceBucket;

const percentile = (sorted: readonly number[], q: number): number => {
  if (sorted.length === 0) throw new Error("percentile requires samples");
  if (sorted.length === 1) return sorted[0]!;
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower]!;
  const weight = position - lower;
  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
};

const distribution = (
  values: readonly (number | undefined)[],
): EvolutionMetricDistribution | undefined => {
  const sorted = values
    .filter((value): value is number =>
      typeof value === "number" && Number.isFinite(value),
    )
    .sort((a, b) => a - b);
  if (sorted.length === 0) return undefined;
  return {
    count: sorted.length,
    min: sorted[0]!,
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    p95: percentile(sorted, 0.95),
    max: sorted.at(-1)!,
  };
};

/**
 * Build baseline statistics for an explicitly supplied comparable population.
 *
 * IMPORTANT: callers must supply an unbiased run population. The current
 * EvolutionCandidate sink persists only `interesting === true` runs, so a list
 * of candidates alone is NOT a valid baseline population. This function stays
 * storage-agnostic on purpose; a later all-run compact baseline sink can feed it
 * without changing the matching/statistics contract.
 */
export const buildEvolutionComparableBaseline = ({
  key,
  population,
}: {
  key: EvolutionComparableRunKey;
  population: readonly EvolutionComparableRunSample[];
}): EvolutionComparableBaseline | null => {
  const matches = population.filter((sample) =>
    isEvolutionComparableRun(key, sample.key),
  );
  if (matches.length === 0) return null;

  const required = (values: readonly number[]): EvolutionMetricDistribution =>
    distribution(values)!;

  const durationMs = distribution(matches.map((sample) => sample.durationMs));
  const inputTokens = distribution(matches.map((sample) => sample.inputTokens));
  const outputTokens = distribution(matches.map((sample) => sample.outputTokens));
  const maxContentChars = distribution(
    matches.map((sample) => sample.maxContentChars),
  );
  const totalLatencyMs = distribution(
    matches.map((sample) => sample.totalLatencyMs),
  );

  return {
    key,
    sampleCount: matches.length,
    successRate: matches.filter((sample) => sample.success).length / matches.length,
    ...(durationMs ? { durationMs } : {}),
    llmRequestCount: required(matches.map((sample) => sample.llmRequestCount)),
    toolCallCount: required(matches.map((sample) => sample.toolCallCount)),
    failedToolCallCount: required(matches.map((sample) => sample.failedToolCallCount)),
    repeatedToolCallCount: required(matches.map((sample) => sample.repeatedToolCallCount)),
    ...(inputTokens ? { inputTokens } : {}),
    ...(outputTokens ? { outputTokens } : {}),
    ...(maxContentChars ? { maxContentChars } : {}),
    ...(totalLatencyMs ? { totalLatencyMs } : {}),
  };
};
