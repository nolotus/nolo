import { canonicalizeToolName } from "../../agent-runtime/toolNameAliases";
import { buildToolArgumentsFingerprint } from "../../agent-runtime/toolArgumentsFingerprint";
import type { AgentExecutionObservationEvent } from "../../agent-runtime/executionObservation";
import type { AgentRuntimeChatMessage, AgentRuntimeResult } from "../../agent-runtime/types";
import type {
  EvolutionRunSnapshot,
  EvolutionRunSnapshotInput,
  EvolutionToolCallEvidence,
} from "./types";

const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const maxDefined = (values: Array<number | undefined>): number | undefined => {
  const finite = values.filter((value): value is number => value !== undefined);
  return finite.length > 0 ? Math.max(...finite) : undefined;
};

const collectTraceToolCalls = (
  trace: readonly AgentRuntimeChatMessage[] | undefined,
): EvolutionToolCallEvidence[] => {
  if (!trace) return [];

  const calls: EvolutionToolCallEvidence[] = [];
  for (const message of trace) {
    if (message.role !== "assistant" || !Array.isArray(message.tool_calls)) continue;
    for (const call of message.tool_calls) {
      const toolName = canonicalizeToolName(call.function.name);
      const argumentsFingerprint = buildToolArgumentsFingerprint(call.function.arguments);
      if (!argumentsFingerprint) {
        // Argument field absent in trace — no real identity available. Keep the
        // call visible but tag it as non-full so it cannot masquerade as
        // evidence in repeated-call detection. (enrichToolCallsFromObservations
        // upgrades it to full when the tool-start observation still carries the
        // canonical fingerprint.)
        calls.push({
          toolCallId: call.id,
          toolName,
          fingerprint: `${toolName}:absent`,
          fingerprintSource: "preview",
        });
        continue;
      }
      calls.push({
        toolCallId: call.id,
        toolName,
        fingerprint: `${toolName}:${argumentsFingerprint}`,
        fingerprintSource: "full",
      });
    }
  }
  return calls;
};

// `tool-start.argumentsFingerprint` is the canonical runtime-emitted full-args
// identity (preferred); `argumentsPreview` is a lossy human-readable summary
// used only as a last resort when neither the fingerprint nor trace exist.
const collectObservationToolCalls = (
  observations: readonly AgentExecutionObservationEvent[],
): EvolutionToolCallEvidence[] => {
  return observations
    .filter((event): event is Extract<AgentExecutionObservationEvent, { kind: "tool-start" }> => event.kind === "tool-start")
    .map((event) => {
      const toolName = canonicalizeToolName(event.toolName);
      if (event.argumentsFingerprint) {
        return {
          toolCallId: event.toolCallId,
          toolName,
          round: event.round,
          fingerprint: `${toolName}:${event.argumentsFingerprint}`,
          fingerprintSource: "full" as const,
        };
      }
      // Preview fallback: `argumentsPreview` is already a lossy string summary,
      // not raw JSON. We keep the preview text itself in the fingerprint (with
      // a `preview:` marker) rather than re-hashing — it stays debuggable, and
      // the `fingerprintSource` tag is what tells consumers to distrust it.
      // Two genuinely different argument sets CAN still collide here; that's
      // the known weakness this source tag exists to flag.
      return {
        toolCallId: event.toolCallId,
        toolName,
        round: event.round,
        fingerprint: `${toolName}:preview:${(event.argumentsPreview ?? "").trim()}`,
        fingerprintSource: "preview" as const,
      };
    });
};

const enrichToolCallsFromObservations = (
  calls: EvolutionToolCallEvidence[],
  observations: readonly AgentExecutionObservationEvent[],
): EvolutionToolCallEvidence[] => {
  const starts = new Map<string, Extract<AgentExecutionObservationEvent, { kind: "tool-start" }>>();
  const ends = new Map<string, Extract<AgentExecutionObservationEvent, { kind: "tool-end" }>>();

  for (const event of observations) {
    if (event.kind === "tool-start") starts.set(event.toolCallId, event);
    if (event.kind === "tool-end") ends.set(event.toolCallId, event);
  }

  return calls.map((call) => {
    const start = call.toolCallId ? starts.get(call.toolCallId) : undefined;
    const end = call.toolCallId ? ends.get(call.toolCallId) : undefined;
    return {
      ...call,
      ...(start ? { round: start.round } : {}),
      // `tool-start.argumentsFingerprint` is the canonical identity — hashed
      // from the exact payload the tool received — so it outranks the trace
      // projection: trace-derived values win ties, but a trace call whose
      // argument field went missing stays `preview`/`absent` until this
      // upgrade, and suppressing that evidence loses genuine repeats.
      ...(start?.argumentsFingerprint
        ? {
            fingerprint: `${call.toolName}:${start.argumentsFingerprint}`,
            fingerprintSource: "full" as const,
          }
        : {}),
      ...(end
        ? {
            ok: end.ok,
            ...(end.elapsedMs !== undefined ? { elapsedMs: end.elapsedMs } : {}),
            ...(end.errorMessage ? { errorMessage: end.errorMessage } : {}),
          }
        : {}),
    };
  });
};

const collectToolCalls = (
  result: AgentRuntimeResult,
  observations: readonly AgentExecutionObservationEvent[],
): EvolutionToolCallEvidence[] => {
  const fromTrace = collectTraceToolCalls(result.trace);
  const fromObservations = collectObservationToolCalls(observations);

  if (fromTrace.length === 0) {
    return enrichToolCallsFromObservations(fromObservations, observations);
  }

  // Trace is the preferred ordering/detail source when present, but it is not
  // guaranteed to be complete. A partial persisted trace must not erase tool
  // calls that were observed live. Merge by toolCallId: keep every trace call
  // in trace order, then append observation-only calls in observation order.
  // Calls sharing an id are represented once and enriched below with the
  // canonical runtime fingerprint/outcome.
  const traceCallIds = new Set(
    fromTrace
      .map((call) => call.toolCallId)
      .filter((toolCallId): toolCallId is string => typeof toolCallId === "string" && toolCallId.length > 0),
  );
  const observationOnly = fromObservations.filter(
    (call) => !call.toolCallId || !traceCallIds.has(call.toolCallId),
  );
  return enrichToolCallsFromObservations([...fromTrace, ...observationOnly], observations);
};

const collectExposedToolNames = (result: AgentRuntimeResult): string[] => {
  const direct = Array.isArray(result.runtimeToolNames)
    ? result.runtimeToolNames.filter((name): name is string => typeof name === "string")
    : [];

  let surface: string[] = [];
  if (result.runtimeToolSurface && typeof result.runtimeToolSurface === "object") {
    const finalToolNames = (result.runtimeToolSurface as Record<string, unknown>).finalToolNames;
    if (Array.isArray(finalToolNames)) {
      surface = finalToolNames.filter((name): name is string => typeof name === "string");
    }
  }

  return Array.from(new Set((direct.length > 0 ? direct : surface).map(canonicalizeToolName))).sort();
};

const usageFromResult = (usage: Record<string, any> | undefined) => {
  if (!usage) return {};
  const inputTokens =
    asFiniteNumber(usage.input_tokens) ??
    asFiniteNumber(usage.prompt_tokens) ??
    asFiniteNumber(usage.inputTokens);
  const outputTokens =
    asFiniteNumber(usage.output_tokens) ??
    asFiniteNumber(usage.completion_tokens) ??
    asFiniteNumber(usage.outputTokens);
  const cacheHitTokens =
    asFiniteNumber(usage.cache_hit_tokens) ??
    asFiniteNumber(usage.cached_tokens) ??
    asFiniteNumber(usage.prompt_tokens_details?.cached_tokens) ??
    asFiniteNumber(usage.input_tokens_details?.cached_tokens);
  const cacheMissTokens =
    asFiniteNumber(usage.cache_miss_tokens) ??
    (inputTokens !== undefined && cacheHitTokens !== undefined
      ? Math.max(0, inputTokens - cacheHitTokens)
      : undefined);
  const cacheHitRatio =
    inputTokens !== undefined && inputTokens > 0 && cacheHitTokens !== undefined
      ? cacheHitTokens / inputTokens
      : undefined;
  return { inputTokens, outputTokens, cacheHitTokens, cacheMissTokens, cacheHitRatio };
};

const collectUsage = (
  result: AgentRuntimeResult,
  observations: readonly AgentExecutionObservationEvent[],
): EvolutionRunSnapshot["usage"] => {
  const llmEnds = observations.filter(
    (event): event is Extract<AgentExecutionObservationEvent, { kind: "llm-end" }> => event.kind === "llm-end",
  );
  const cacheEvents = llmEnds.map((event) => event.cache).filter((cache): cache is NonNullable<typeof cache> => !!cache);
  // `result.usage` is not a consistent cross-runtime total: the server loop
  // accumulates via addUsageTotal, while localLoop's `contextUsage` is only the
  // final round's context snapshot. Per-request `llm-end.cache` is the only
  // additive source available to both, so prefer it whenever present and only
  // fall back to `result.usage` when no cache events were emitted at all.
  // Caveat: if some llm-end events carry `cache` and others don't, this sum
  // undercounts the requests that didn't report cache metrics.
  if (cacheEvents.length === 0) return usageFromResult(result.usage);

  const inputTokens = cacheEvents.reduce((sum, cache) => sum + cache.inputTokens, 0);
  const outputTokens = cacheEvents.reduce((sum, cache) => sum + cache.outputTokens, 0);
  const cacheHitTokens = cacheEvents.reduce((sum, cache) => sum + cache.cacheHitTokens, 0);
  const cacheMissTokens = cacheEvents.reduce((sum, cache) => sum + cache.cacheMissTokens, 0);
  return {
    inputTokens,
    outputTokens,
    cacheHitTokens,
    cacheMissTokens,
    ...(inputTokens > 0 ? { cacheHitRatio: cacheHitTokens / inputTokens } : {}),
  };
};

const collectContext = (
  observations: readonly AgentExecutionObservationEvent[],
): EvolutionRunSnapshot["context"] | undefined => {
  const contexts = observations
    .filter((event): event is Extract<AgentExecutionObservationEvent, { kind: "llm-start" }> => event.kind === "llm-start")
    .map((event) => event.context)
    .filter((context): context is NonNullable<typeof context> => !!context);
  if (contexts.length === 0) return undefined;

  return {
    maxMessageCount: maxDefined(contexts.map((context) => context.messageCount)),
    maxContentChars: maxDefined(contexts.map((context) => context.contentChars)),
    maxToolMessageCount: maxDefined(contexts.map((context) => context.toolMessageCount)),
    maxRawToolContentChars: maxDefined(contexts.map((context) => context.rawToolContentChars)),
    maxProjectedToolContentChars: maxDefined(contexts.map((context) => context.projectedToolContentChars)),
    maxTruncatedToolResults: maxDefined(contexts.map((context) => context.truncatedToolResults)),
    maxStableContextChars: maxDefined(contexts.map((context) => context.stableContextChars)),
    maxDynamicContextChars: maxDefined(contexts.map((context) => context.dynamicContextChars)),
  };
};

const isHardRunFailure = (result: AgentRuntimeResult): boolean => {
  if (result.error === true) return true;
  if (result.runtimeProviderFailure) return true;
  if (result.emptyAssistantFallbackReason && result.emptyAssistantOutputUsable !== true) return true;
  return false;
};

export function buildEvolutionRunSnapshot(input: EvolutionRunSnapshotInput): EvolutionRunSnapshot {
  const observations = [...(input.observations ?? [])];
  const toolCalls = collectToolCalls(input.result, observations);
  // Same "every member must be full" rule as detectEvolutionSignals: a
  // preview-sourced group (lossy fingerprints can collide across genuinely
  // different calls) must not inflate this count, or the Jev triage state
  // would show a repeat count the signal list deliberately suppresses.
  const callsByFingerprint = new Map<string, EvolutionToolCallEvidence[]>();
  for (const call of toolCalls) {
    const existing = callsByFingerprint.get(call.fingerprint);
    if (existing) existing.push(call);
    else callsByFingerprint.set(call.fingerprint, [call]);
  }
  const repeatedToolCallCount = [...callsByFingerprint.values()]
    .filter((calls) => calls.length > 1 && calls.every((call) => call.fingerprintSource === "full"))
    .reduce((sum, calls) => sum + calls.length - 1, 0);

  const failedToolCallCount = observations.filter((event) => event.kind === "tool-end" && !event.ok).length;
  const llmRequestCountFromEvents = observations.filter((event) => event.kind === "llm-start").length;
  const context = collectContext(observations);
  const startedAt = input.startedAt;
  const endedAt = input.endedAt;
  const durationMs =
    startedAt !== undefined && endedAt !== undefined && endedAt >= startedAt
      ? endedAt - startedAt
      : input.result.latencyProfile?.totalMs;

  return {
    ...(input.runId ? { runId: input.runId } : {}),
    ...(input.dialogId ? { dialogId: input.dialogId } : {}),
    ...(input.runKind ? { runKind: input.runKind } : {}),
    ...(startedAt !== undefined ? { startedAt } : {}),
    ...(endedAt !== undefined ? { endedAt } : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
    success: !isHardRunFailure(input.result),
    ...(input.result.errorMessage || input.result.runtimeProviderFailure?.message
      ? { errorMessage: input.result.errorMessage ?? input.result.runtimeProviderFailure?.message }
      : {}),
    ...(input.result.provider ? { provider: input.result.provider } : {}),
    ...(input.result.model ? { model: input.result.model } : {}),
    // Same undercount rule as toolCallCount: `llm-start` observation events are
    // detailed evidence and can be partial when the stream is truncated, while
    // `latencyProfile.llmRequestCount` is the runtime's authoritative aggregate
    // of upstream fetches (including retries). A partial event list must not
    // pull the count below the real total.
    llmRequestCount: Math.max(
      llmRequestCountFromEvents,
      input.result.latencyProfile?.llmRequestCount ?? 0,
    ),
    // `toolCalls` is detailed evidence and can still be partial if neither
    // trace nor observations carried every call. Keep the aggregate count at
    // least as large as the runtime-reported total instead of letting any
    // non-empty evidence array accidentally undercount the run.
    toolCallCount: Math.max(toolCalls.length, input.result.toolCallCount ?? 0),
    failedToolCallCount,
    repeatedToolCallCount,
    toolCalls,
    usedToolNames: Array.from(new Set(toolCalls.map((call) => call.toolName))).sort(),
    exposedToolNames: collectExposedToolNames(input.result),
    usage: collectUsage(input.result, observations),
    ...(context ? { context } : {}),
    ...(input.result.latencyProfile
      ? {
          latency: {
            totalMs: input.result.latencyProfile.totalMs,
            llmWaitMs: input.result.latencyProfile.llmWaitMs,
            llmJsonParseMs: input.result.latencyProfile.llmJsonParseMs,
            toolExecutionMs: input.result.latencyProfile.toolExecutionMs,
            ...(input.result.latencyProfile.timeToFirstAssistantMs !== undefined
              ? { timeToFirstAssistantMs: input.result.latencyProfile.timeToFirstAssistantMs }
              : {}),
            ...(input.result.latencyProfile.timeToFirstToolResultMs !== undefined
              ? { timeToFirstToolResultMs: input.result.latencyProfile.timeToFirstToolResultMs }
              : {}),
          },
        }
      : {}),
    stalled: observations.some((event) => event.kind === "loop-stalled"),
    compactionCount: observations.filter((event) => event.kind === "compaction").length,
    observations,
  };
}
