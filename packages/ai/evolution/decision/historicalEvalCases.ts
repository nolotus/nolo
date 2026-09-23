import type { EvolutionRunSnapshot, EvolutionSignal } from "../types";
import type { EvolutionTriageEvalCase } from "./evalHarness";

const baseSnapshot = (overrides: Partial<EvolutionRunSnapshot> = {}): EvolutionRunSnapshot => ({
  success: true,
  provider: "historical",
  model: "unknown",
  llmRequestCount: 2,
  toolCallCount: 2,
  failedToolCallCount: 0,
  repeatedToolCallCount: 0,
  toolCalls: [],
  usedToolNames: [],
  exposedToolNames: [],
  usage: {},
  stalled: false,
  compactionCount: 0,
  observations: [],
  ...overrides,
});

const signal = <T extends EvolutionSignal>(value: T): T => value;

/**
 * Reconstructed from known production incidents, not raw persisted traces.
 * Keep these clearly separate from future historical cases built from exact
 * EvolutionRunSnapshot records. Their purpose is to encode expected triage
 * semantics until original snapshots are available.
 */
export const RECONSTRUCTED_HISTORICAL_EVOLUTION_TRIAGE_CASES: readonly EvolutionTriageEvalCase[] = [
  {
    id: "historical-transient-socket-drop-recovered",
    description:
      "TUI run lost its upstream socket mid-request; retry/continue immediately recovered in the same conversation. Treat as external/transient noise unless recovery itself becomes wasteful.",
    input: {
      snapshot: baseSnapshot({
        success: true,
        llmRequestCount: 2,
        toolCallCount: 0,
        failedToolCallCount: 0,
        errorMessage:
          "The socket connection was closed unexpectedly. The upstream connection dropped mid-request.",
        latency: { totalMs: 20_000, llmWaitMs: 19_000, llmJsonParseMs: 0, toolExecutionMs: 0 },
      }),
      signals: [
        signal({
          kind: "loop_stall",
          count: 1,
          evidence: [{ round: 1 }],
        }),
      ],
    },
    expected: {
      investigate: false,
    },
  },
  {
    id: "historical-glob-or-pattern-zero-match",
    description:
      "A repo-navigation subtask used an invalid/ambiguous glob OR pattern, returned zero matches and caused repeated exploration. Treat as actionable tool-contract/usage behavior rather than external noise.",
    input: {
      snapshot: baseSnapshot({
        success: true,
        runKind: "subtask",
        llmRequestCount: 5,
        toolCallCount: 7,
        failedToolCallCount: 0,
        repeatedToolCallCount: 2,
        usedToolNames: ["globFiles", "readFile"],
        exposedToolNames: ["globFiles", "readFile", "execShell"],
      }),
      signals: [
        signal({
          kind: "repeated_tool_call",
          count: 2,
          evidence: [
            { round: 1, toolName: "globFiles", fingerprint: "globFiles:historical-or-pattern" },
            { round: 2, toolName: "globFiles", fingerprint: "globFiles:historical-or-pattern" },
            { round: 3, toolName: "globFiles", fingerprint: "globFiles:historical-or-pattern" },
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
] as const;
