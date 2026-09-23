import type { EvolutionRunSnapshot, EvolutionSignal } from "./types";

export type EvolutionCandidateStatus = "open" | "accepted" | "rejected" | "resolved";

export type EvolutionCandidateSignalSummary = {
  kind: EvolutionSignal["kind"];
  count?: number;
  value?: number;
  threshold?: number;
};

export type EvolutionCandidateSnapshotSummary = {
  runKind?: EvolutionRunSnapshot["runKind"];
  success: boolean;
  provider?: string;
  model?: string;
  durationMs?: number;
  llmRequestCount: number;
  toolCallCount: number;
  failedToolCallCount: number;
  repeatedToolCallCount: number;
  usedToolNames: string[];
  exposedToolNameCount: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheHitRatio?: number;
  maxContentChars?: number;
  totalLatencyMs?: number;
  stalled: boolean;
  compactionCount: number;
};

export type EvolutionCandidate = {
  id: string;
  status: EvolutionCandidateStatus;
  createdAt: string;
  runId?: string;
  dialogId?: string;
  snapshot: EvolutionCandidateSnapshotSummary;
  signals: EvolutionCandidateSignalSummary[];
};

export type CreateEvolutionCandidateInput = {
  candidateId: string;
  createdAt: string;
  snapshot: EvolutionRunSnapshot;
  signals: readonly EvolutionSignal[];
};

export const buildEvolutionCandidateKey = (candidateId: string) =>
  `evolution-candidate-${candidateId}`;

export const buildEvolutionCandidateRange = () => ({
  start: "evolution-candidate-",
  end: "evolution-candidate-\uffff",
});

const compactSignal = (signal: EvolutionSignal): EvolutionCandidateSignalSummary => ({
  kind: signal.kind,
  ...("count" in signal && typeof signal.count === "number" ? { count: signal.count } : {}),
  ...("value" in signal && typeof signal.value === "number" ? { value: signal.value } : {}),
  ...("threshold" in signal && typeof signal.threshold === "number"
    ? { threshold: signal.threshold }
    : {}),
});

const compactSnapshot = (snapshot: EvolutionRunSnapshot): EvolutionCandidateSnapshotSummary => ({
  ...(snapshot.runKind ? { runKind: snapshot.runKind } : {}),
  success: snapshot.success,
  ...(snapshot.provider ? { provider: snapshot.provider } : {}),
  ...(snapshot.model ? { model: snapshot.model } : {}),
  ...(typeof snapshot.durationMs === "number" ? { durationMs: snapshot.durationMs } : {}),
  llmRequestCount: snapshot.llmRequestCount,
  toolCallCount: snapshot.toolCallCount,
  failedToolCallCount: snapshot.failedToolCallCount,
  repeatedToolCallCount: snapshot.repeatedToolCallCount,
  usedToolNames: [...snapshot.usedToolNames],
  exposedToolNameCount: snapshot.exposedToolNames.length,
  ...(typeof snapshot.usage?.inputTokens === "number" ? { inputTokens: snapshot.usage.inputTokens } : {}),
  ...(typeof snapshot.usage?.outputTokens === "number" ? { outputTokens: snapshot.usage.outputTokens } : {}),
  ...(typeof snapshot.usage?.cacheHitRatio === "number" ? { cacheHitRatio: snapshot.usage.cacheHitRatio } : {}),
  ...(typeof snapshot.context?.maxContentChars === "number"
    ? { maxContentChars: snapshot.context.maxContentChars }
    : {}),
  ...(typeof snapshot.latency?.totalMs === "number" ? { totalLatencyMs: snapshot.latency.totalMs } : {}),
  stalled: snapshot.stalled,
  compactionCount: snapshot.compactionCount,
});

/**
 * Persistable, privacy-minimized projection for interesting completed runs.
 *
 * Deliberately excludes observations, trace, arguments, tool results,
 * conversation content, and error messages. Those remain ephemeral evidence
 * until a later Case stage explicitly requests stronger evidence under a
 * separate privacy contract.
 */
export const createEvolutionCandidate = (
  input: CreateEvolutionCandidateInput,
): EvolutionCandidate => ({
  id: input.candidateId,
  status: "open",
  createdAt: input.createdAt,
  ...(input.snapshot.runId ? { runId: input.snapshot.runId } : {}),
  ...(input.snapshot.dialogId ? { dialogId: input.snapshot.dialogId } : {}),
  snapshot: compactSnapshot(input.snapshot),
  signals: input.signals.map(compactSignal),
});
