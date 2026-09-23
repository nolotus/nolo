import type {
  EvolutionRunSnapshot,
  EvolutionSignal,
  EvolutionSignalThresholds,
} from "./types";

export const DEFAULT_EVOLUTION_SIGNAL_THRESHOLDS: EvolutionSignalThresholds = {
  highToolCallCount: 12,
  largeContextChars: 64_000,
};

export function detectEvolutionSignals(
  snapshot: EvolutionRunSnapshot,
  thresholds: EvolutionSignalThresholds = DEFAULT_EVOLUTION_SIGNAL_THRESHOLDS,
): EvolutionSignal[] {
  const signals: EvolutionSignal[] = [];

  if (!snapshot.success) {
    signals.push({
      kind: "run_failure",
      count: 1,
      evidence: [
        {
          ...(snapshot.errorMessage ? { errorMessage: snapshot.errorMessage } : {}),
        },
      ],
    });
  }

  const toolFailures = snapshot.observations
    .map((event, observationIndex) => ({ event, observationIndex }))
    .filter(
      (item): item is {
        event: Extract<(typeof snapshot.observations)[number], { kind: "tool-end" }>;
        observationIndex: number;
      } => item.event.kind === "tool-end" && !item.event.ok,
    );
  if (toolFailures.length > 0) {
    signals.push({
      kind: "tool_failure",
      count: toolFailures.length,
      evidence: toolFailures.map(({ event, observationIndex }) => ({
        observationIndex,
        round: event.round,
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        ...(event.errorMessage ? { errorMessage: event.errorMessage } : {}),
      })),
    });
  }

  // Group by the fingerprint already computed in the snapshot instead of
  // re-deriving it. `snapshot.repeatedToolCallCount` is derived from the same
  // every-member-full rule below, so count and evidence stay in sync.
  const callsByFingerprint = new Map<string, typeof snapshot.toolCalls>();
  for (const call of snapshot.toolCalls) {
    const existing = callsByFingerprint.get(call.fingerprint) ?? [];
    existing.push(call);
    callsByFingerprint.set(call.fingerprint, existing);
  }
  // A group only counts as a repeated call when EVERY member carries a
  // full-quality fingerprint (runtime-emitted argumentsFingerprint, or full
  // arguments recovered from trace). Preview-derived fingerprints are lossy —
  // two genuinely different calls can share one — so a group containing any
  // preview member is not trustworthy evidence. v1 prefers under-reporting to
  // false positives that would send the wrong runs to triage.
  const repeated = [...callsByFingerprint.entries()]
    .filter(
      ([, calls]) => calls.length > 1 && calls.every((call) => call.fingerprintSource === "full"),
    )
    .sort(([left], [right]) => left.localeCompare(right));
  if (repeated.length > 0) {
    // Count from the same filtered groups the evidence comes from — a group
    // containing any preview member is excluded, matching
    // snapshot.repeatedToolCallCount exactly.
    const repeatedFullCount = repeated.reduce((sum, [, calls]) => sum + calls.length - 1, 0);
    signals.push({
      kind: "repeated_tool_call",
      count: repeatedFullCount,
      evidence: repeated.flatMap(([fingerprint, calls]) =>
        calls.map((call) => ({
          ...(call.round !== undefined ? { round: call.round } : {}),
          ...(call.toolCallId ? { toolCallId: call.toolCallId } : {}),
          toolName: call.toolName,
          fingerprint,
          ...(call.fingerprintSource ? { fingerprintSource: call.fingerprintSource } : {}),
        })),
      ),
    });
  }

  const stalls = snapshot.observations
    .map((event, observationIndex) => ({ event, observationIndex }))
    .filter(
      (item): item is {
        event: Extract<(typeof snapshot.observations)[number], { kind: "loop-stalled" }>;
        observationIndex: number;
      } => item.event.kind === "loop-stalled",
    );
  if (stalls.length > 0) {
    signals.push({
      kind: "loop_stall",
      count: stalls.length,
      evidence: stalls.map(({ event, observationIndex }) => ({
        observationIndex,
        ...(event.round !== undefined ? { round: event.round } : {}),
        ...(event.consecutiveRounds !== undefined ? { value: event.consecutiveRounds } : {}),
      })),
    });
  }

  if (snapshot.toolCallCount > thresholds.highToolCallCount) {
    signals.push({
      kind: "high_tool_call_count",
      value: snapshot.toolCallCount,
      threshold: thresholds.highToolCallCount,
      evidence: [{ value: snapshot.toolCallCount }],
    });
  }

  const contextChars = snapshot.context?.maxContentChars;
  if (contextChars !== undefined && contextChars > thresholds.largeContextChars) {
    signals.push({
      kind: "large_context",
      value: contextChars,
      threshold: thresholds.largeContextChars,
      evidence: [{ value: contextChars }],
    });
  }

  return signals;
}

export const isInterestingEvolutionRun = (signals: readonly EvolutionSignal[]): boolean =>
  signals.length > 0;
