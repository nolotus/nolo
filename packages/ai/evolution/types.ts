import type { AgentExecutionObservationEvent } from "../../agent-runtime/executionObservation";
import type { AgentRuntimeResult } from "../../agent-runtime/types";

export type EvolutionRunKind = "interactive" | "subtask";

export type EvolutionToolCallEvidence = {
  toolCallId?: string;
  toolName: string;
  fingerprint: string;
  /**
   * Evidence quality of the fingerprint, not which pipe produced it.
   *
   * - `"full"`: hashed from the complete argument payload — either the
   *   canonical `tool-start.argumentsFingerprint` emitted by the runtime, or
   *   full JSON arguments recovered from `result.trace`. Reliable for
   *   repeated-call detection.
   * - `"preview"`: derived from `tool-start.argumentsPreview`, a lossy
   *   `summarizeToolArguments` projection (e.g. `readFile {path:"a.ts",
   *   lines:"1-50"}` and `{path:"a.ts", lines:"100-150"}` both collapse to
   *   `a.ts`). Two distinct calls can share a preview fingerprint, so
   *   repeated-call counts derived from previews are weaker evidence.
   */
  fingerprintSource?: "full" | "preview";
  round?: number;
  ok?: boolean;
  elapsedMs?: number;
  errorMessage?: string;
};

export type EvolutionRunSnapshot = {
  /**
   * Canonical run identity = the dialogId of the run's owning dialog
   * (continueDialogId ?? the pending dialog created for a fresh sync run;
   * background/subtask runs create their own dialog before running).
   *
   * One dialog turn may produce multiple runs on a continue dialog, so
   * runId is shared across turns of the same dialog — self-exclusion in
   * baseline comparisons is therefore dialog-grained, which is the more
   * conservative choice (same-conversation runs are not independent
   * samples). Per-turn disambiguation uses `candidate.createdAt` as the
   * run boundary, not runId.
   */
  runId?: string;
  dialogId?: string;
  runKind?: EvolutionRunKind;

  startedAt?: number;
  endedAt?: number;
  durationMs?: number;

  success: boolean;
  errorMessage?: string;

  provider?: string;
  model?: string;
  llmRequestCount: number;

  toolCallCount: number;
  failedToolCallCount: number;
  repeatedToolCallCount: number;
  toolCalls: EvolutionToolCallEvidence[];
  usedToolNames: string[];
  exposedToolNames: string[];

  usage: {
    inputTokens?: number;
    outputTokens?: number;
    cacheHitTokens?: number;
    cacheMissTokens?: number;
    cacheHitRatio?: number;
  };

  context?: {
    maxMessageCount?: number;
    maxContentChars?: number;
    maxToolMessageCount?: number;
    maxRawToolContentChars?: number;
    maxProjectedToolContentChars?: number;
    maxTruncatedToolResults?: number;
    maxStableContextChars?: number;
    maxDynamicContextChars?: number;
  };

  latency?: {
    totalMs?: number;
    llmWaitMs?: number;
    llmJsonParseMs?: number;
    toolExecutionMs?: number;
    timeToFirstAssistantMs?: number;
    timeToFirstToolResultMs?: number;
  };

  stalled: boolean;
  compactionCount: number;
  observations: AgentExecutionObservationEvent[];
};

export type EvolutionRunSnapshotInput = {
  runId?: string;
  dialogId?: string;
  runKind?: EvolutionRunKind;
  startedAt?: number;
  endedAt?: number;
  result: AgentRuntimeResult;
  observations?: readonly AgentExecutionObservationEvent[];
};

export type EvolutionSignalEvidence = {
  observationIndex?: number;
  round?: number;
  toolCallId?: string;
  toolName?: string;
  fingerprint?: string;
  /**
   * Present on repeated_tool_call evidence. `"preview"` fingerprints come from a
   * lossy argument summary and can collide across genuinely different calls;
   * downstream consumers should treat them as weaker evidence than `"full"`.
   */
  fingerprintSource?: "full" | "preview";
  value?: number;
  errorMessage?: string;
};

export type EvolutionSignal =
  | {
      kind: "run_failure";
      count: 1;
      evidence: EvolutionSignalEvidence[];
    }
  | {
      kind: "tool_failure";
      count: number;
      evidence: EvolutionSignalEvidence[];
    }
  | {
      kind: "repeated_tool_call";
      count: number;
      evidence: EvolutionSignalEvidence[];
    }
  | {
      kind: "loop_stall";
      count: number;
      evidence: EvolutionSignalEvidence[];
    }
  | {
      kind: "high_tool_call_count";
      value: number;
      threshold: number;
      evidence: EvolutionSignalEvidence[];
    }
  | {
      kind: "large_context";
      value: number;
      threshold: number;
      evidence: EvolutionSignalEvidence[];
    };

export type EvolutionSignalThresholds = {
  highToolCallCount: number;
  largeContextChars: number;
};
