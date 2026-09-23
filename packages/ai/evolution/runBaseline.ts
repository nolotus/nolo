import type { EvolutionCompletedAnalysis } from "./candidateSink";
import {
  bucketEvolutionToolSurface,
  type EvolutionComparableRunSample,
  type EvolutionToolSurfaceBucket,
} from "./comparableRuns";

export type EvolutionRunBaselineRecord = {
  id: string;
  createdAt: string;
  /** runId of the source run, present when the snapshot carries one. Used for
   *  self-exclusion in historical baseline queries; never populated from raw
   *  user content. */
  runId?: string;
  taskClass?: string;
  runKind?: EvolutionCompletedAnalysis["snapshot"]["runKind"];
  toolSurfaceBucket: EvolutionToolSurfaceBucket;
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

export type CreateEvolutionRunBaselineInput = {
  id: string;
  createdAt: string;
  analysis: EvolutionCompletedAnalysis;
  taskClass?: string | null;
};

export const buildEvolutionRunBaselineKey = (id: string) =>
  `evolution-run-baseline-${id}`;

export const buildEvolutionRunBaselineRange = () => ({
  start: "evolution-run-baseline-",
  end: "evolution-run-baseline-\uffff",
});

/**
 * Compact record written for every completed foreground run when the baseline
 * sink is enabled. Unlike EvolutionCandidate, this is intentionally NOT gated
 * by `interesting`; otherwise baseline statistics would be selection-biased.
 *
 * No task text, trace, observations, error strings, tool arguments/results or
 * conversation content are stored. taskClass is optional so unclassified runs
 * still remain part of the unbiased all-run source without being falsely
 * grouped into a known task class.
 */
export const createEvolutionRunBaselineRecord = (
  input: CreateEvolutionRunBaselineInput,
): EvolutionRunBaselineRecord => {
  const snapshot = input.analysis.snapshot;
  const taskClass = input.taskClass?.trim();
  return {
    id: input.id,
    createdAt: input.createdAt,
    ...(snapshot.runId ? { runId: snapshot.runId } : {}),
    ...(taskClass ? { taskClass } : {}),
    ...(snapshot.runKind ? { runKind: snapshot.runKind } : {}),
    toolSurfaceBucket: bucketEvolutionToolSurface(snapshot.exposedToolNames.length),
    success: snapshot.success,
    ...(typeof snapshot.durationMs === "number" ? { durationMs: snapshot.durationMs } : {}),
    llmRequestCount: snapshot.llmRequestCount,
    toolCallCount: snapshot.toolCallCount,
    failedToolCallCount: snapshot.failedToolCallCount,
    repeatedToolCallCount: snapshot.repeatedToolCallCount,
    ...(typeof snapshot.usage?.inputTokens === "number" ? { inputTokens: snapshot.usage.inputTokens } : {}),
    ...(typeof snapshot.usage?.outputTokens === "number" ? { outputTokens: snapshot.usage.outputTokens } : {}),
    ...(typeof snapshot.context?.maxContentChars === "number"
      ? { maxContentChars: snapshot.context.maxContentChars }
      : {}),
    ...(typeof snapshot.latency?.totalMs === "number"
      ? { totalLatencyMs: snapshot.latency.totalMs }
      : {}),
  };
};

/** Convert one classified baseline record into Comparable Runs v1 input. */
export const baselineRecordToComparableRunSample = (
  record: EvolutionRunBaselineRecord,
): EvolutionComparableRunSample | null => {
  if (!record.taskClass) return null;
  return {
    id: record.id,
    key: {
      taskClass: record.taskClass,
      ...(record.runKind ? { runKind: record.runKind } : {}),
      toolSurfaceBucket: record.toolSurfaceBucket,
    },
    success: record.success,
    ...(typeof record.durationMs === "number" ? { durationMs: record.durationMs } : {}),
    llmRequestCount: record.llmRequestCount,
    toolCallCount: record.toolCallCount,
    failedToolCallCount: record.failedToolCallCount,
    repeatedToolCallCount: record.repeatedToolCallCount,
    ...(typeof record.inputTokens === "number" ? { inputTokens: record.inputTokens } : {}),
    ...(typeof record.outputTokens === "number" ? { outputTokens: record.outputTokens } : {}),
    ...(typeof record.maxContentChars === "number" ? { maxContentChars: record.maxContentChars } : {}),
    ...(typeof record.totalLatencyMs === "number" ? { totalLatencyMs: record.totalLatencyMs } : {}),
  };
};
