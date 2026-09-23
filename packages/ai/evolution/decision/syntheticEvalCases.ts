import type { EvolutionRunSnapshot, EvolutionSignal } from "../types";
import type { EvolutionTriageEvalCase } from "./evalHarness";

const baseSnapshot = (overrides: Partial<EvolutionRunSnapshot> = {}): EvolutionRunSnapshot => ({
  success: true,
  provider: "test-provider",
  model: "test-model",
  llmRequestCount: 2,
  toolCallCount: 2,
  failedToolCallCount: 0,
  repeatedToolCallCount: 0,
  toolCalls: [],
  usedToolNames: ["readFile"],
  exposedToolNames: ["readFile", "globFiles"],
  usage: {
    inputTokens: 4_000,
    outputTokens: 500,
    cacheHitTokens: 3_000,
    cacheMissTokens: 1_000,
    cacheHitRatio: 0.75,
  },
  context: {
    maxMessageCount: 8,
    maxContentChars: 12_000,
    maxToolMessageCount: 2,
    maxRawToolContentChars: 2_000,
    maxProjectedToolContentChars: 1_200,
    maxTruncatedToolResults: 0,
    maxStableContextChars: 7_000,
    maxDynamicContextChars: 5_000,
  },
  latency: {
    totalMs: 8_000,
    llmWaitMs: 6_000,
    llmJsonParseMs: 20,
    toolExecutionMs: 500,
  },
  stalled: false,
  compactionCount: 0,
  observations: [],
  ...overrides,
});

const signal = <T extends EvolutionSignal>(value: T): T => value;

export const SYNTHETIC_EVOLUTION_TRIAGE_CASES: readonly EvolutionTriageEvalCase[] = [
  {
    id: "transient-external-failure-recovered",
    description: "A single upstream/network-like failure recovered and the run completed efficiently.",
    input: {
      snapshot: baseSnapshot({
        failedToolCallCount: 1,
        toolCallCount: 3,
      }),
      signals: [
        signal({
          kind: "tool_failure",
          count: 1,
          evidence: [
            {
              round: 1,
              toolCallId: "call-1",
              toolName: "fetchWebpage",
              errorMessage: "socket connection closed unexpectedly",
            },
          ],
        }),
      ],
    },
    expected: {
      investigate: false,
      minLikelyExternalFailure: 0.8,
    },
  },
  {
    id: "repeated-identical-tool-calls",
    description: "The agent repeatedly issues the same call and wastes work before succeeding.",
    input: {
      snapshot: baseSnapshot({
        toolCallCount: 9,
        repeatedToolCallCount: 4,
        usedToolNames: ["globFiles", "readFile"],
      }),
      signals: [
        signal({
          kind: "repeated_tool_call",
          count: 4,
          evidence: [
            { round: 2, toolName: "globFiles", fingerprint: "globFiles:abc" },
            { round: 3, toolName: "globFiles", fingerprint: "globFiles:abc" },
          ],
        }),
      ],
    },
    expected: {
      investigate: true,
      minWorthInvestigating: 0.6,
      minLikelyBehavioralWaste: 0.6,
      suspectedStage: "act",
      suspectedSurface: "tool",
    },
  },
  {
    id: "bloated-tool-surface",
    description: "A simple run sees a very large tool surface and performs excessive exploration.",
    input: {
      snapshot: baseSnapshot({
        toolCallCount: 17,
        exposedToolNames: Array.from({ length: 42 }, (_, index) => `tool${index}`),
        usedToolNames: ["readFile", "globFiles", "execShell"],
      }),
      signals: [
        signal({
          kind: "high_tool_call_count",
          value: 17,
          threshold: 12,
          evidence: [{ value: 17 }],
        }),
      ],
    },
    expected: {
      investigate: true,
      minWorthInvestigating: 0.6,
      minLikelyBehavioralWaste: 0.55,
      suspectedStage: "select",
      suspectedSurface: "tool_exposure",
    },
  },
  {
    id: "large-context-with-compaction",
    description: "Context grows unusually large and requires repeated compaction.",
    input: {
      snapshot: baseSnapshot({
        compactionCount: 2,
        context: {
          maxMessageCount: 80,
          maxContentChars: 120_000,
          maxToolMessageCount: 25,
          maxRawToolContentChars: 65_000,
          maxProjectedToolContentChars: 42_000,
          maxTruncatedToolResults: 6,
          maxStableContextChars: 25_000,
          maxDynamicContextChars: 95_000,
        },
      }),
      signals: [
        signal({
          kind: "large_context",
          value: 120_000,
          threshold: 64_000,
          evidence: [{ value: 120_000 }],
        }),
      ],
    },
    expected: {
      investigate: true,
      minWorthInvestigating: 0.6,
      minLikelyBehavioralWaste: 0.5,
      suspectedStage: "context",
      suspectedSurface: "context",
    },
  },
] as const;
