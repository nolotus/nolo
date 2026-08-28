// packages/agent-runtime/executionObservation.ts
//
// Shared execution-observation vocabulary for the Agent Runtime.
//
// Server Agent Loop (packages/server/handlers/agentRun/loop.ts) and Local Agent
// Loop (packages/agent-runtime/localLoop.ts) both emit a single set of
// observation events with identical structure, so an observer (or a downstream
// analysis pipeline) can consume either loop's output without knowing which
// runtime produced it.
//
// - `AgentExecutionContextMetrics` mirrors what a loop knows about the request
//   context it handed to the LLM for a round.
// - `AgentExecutionObservationEvent` is the canonical union. `LocalAgentLoopEvent`
//   in localLoop.ts is a compat alias of this type.

export type AgentExecutionContextMetrics = {
  messageCount: number;
  contentChars: number;
  toolMessageCount: number;
  rawToolContentChars: number;
  projectedToolContentChars: number;
  truncatedToolResults: number;
  stableContextChars: number;
  dynamicContextChars: number;
};

export type AgentExecutionObservationEvent =
  | {
      kind: "llm-start";
      round: number;
      atMs: number;
      provider?: string;
      model?: string;
      context?: AgentExecutionContextMetrics;
    }
  | {
      kind: "llm-end";
      round: number;
      atMs: number;
      ok: boolean;
      provider?: string;
      model?: string;
      providerCallId?: string;
      errorMessage?: string;
      /** Per-request cache metrics from provider usage, for token-level analysis. */
      cache?: {
        inputTokens: number;
        outputTokens: number;
        cacheHitTokens: number;
        cacheMissTokens: number;
        hitRatio: number;
      };
    }
  | {
      kind: "tool-start";
      round: number;
      toolCallId: string;
      toolName: string;
      atMs: number;
      argumentsPreview?: string;
    }
  | {
      kind: "tool-end";
      round: number;
      toolCallId: string;
      toolName: string;
      atMs: number;
      ok: boolean;
      elapsedMs?: number;
      summary?: string;
      errorMessage?: string;
      metadata?: Record<string, unknown>;
    }
  | { kind: "image-downgraded"; reason: "no-vision"; atMs: number };
