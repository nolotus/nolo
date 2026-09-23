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

export type DelegatedPayloadMetrics = {
  taskChars: number;
  inputChars: number;
  totalChars: number;
  estimatedTaskTokens: number;
  estimatedInputTokens: number;
  estimatedTotalTokens: number;
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
      /**
       * 原始 provider usage 帧（含 cost / billing_unit / token 计数）。
       * 供 CLI TUI 做轮内实时积分显示（platformCreditsFromUsage 折算）；
       * token 级分析仍用下方 cache 投影，勿依赖本字段做上下文计算。
       */
      usage?: Record<string, unknown>;
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
      /**
       * Human-readable lossy projection of arguments (summarizeToolArguments).
       * NOT safe for equality checks — two different argument sets can share
       * the same preview.
       */
      argumentsPreview?: string;
      /**
       * Deterministic machine identity of the full arguments
       * (buildToolArgumentsFingerprint). Safe for repeated-call detection.
       * Omitted when the emitter does not have the raw arguments.
       */
      argumentsFingerprint?: string;
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
  | { kind: "image-downgraded"; reason: "no-vision"; atMs: number }
  | {
      kind: "loop-stalled";
      reason: string;
      atMs: number;
      round?: number;
      detail?: string;
      consecutiveRounds?: number;
    }
  | {
      kind: "compaction";
      atMs: number;
      /** 与 CompactionMetrics.reason 口径一致。 */
      reason: "context_budget" | "cold_resume" | "invalid_summary";
      summaryGenerated: boolean;
      compressed: boolean;
      /** 压缩前估算 token（无对应估算口径则省略）。 */
      beforeTokens?: number;
      /** 压缩后估算 token。 */
      afterTokens?: number;
      /** 压缩省下的估算 token（before - after）。 */
      savedTokens?: number;
      droppedCount?: number;
      /**
       * 自动压缩尝试失败（如摘要 LLM 调用报错）：本轮以未压缩上下文继续。
       * 失败必须可观测——此前只有 console.warn，TUI 重绘下用户完全无感，
       * 表现为「上下文超限了也没自动压缩」。
       */
      failed?: boolean;
      detail?: string;
    };
