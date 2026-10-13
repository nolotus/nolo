import type { EvolutionRunSnapshot, EvolutionSignal } from "../types";
import type {
  EvolutionDecisionModel,
  EvolutionExecutionStage,
  EvolutionOptimizationSurface,
  EvolutionTriageInput,
  EvolutionTriageResult,
} from "./types";

const DEFAULT_JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const DEFAULT_JEV_MODEL = "jev-latest";

export type JevDecisionModelOptions = {
  apiKey: string;
  endpoint?: string;
  model?: string;
  fetchFn?: typeof fetch;
};

type JevChoiceAnswer = {
  type: "choice";
  choice: string;
  confidence?: number;
  probabilities?: Record<string, number>;
};

type JevScoreAnswer = {
  type: "score";
  score: number;
  confidence?: number;
  probabilities?: Record<string, number>;
};

type JevNoulAnswer = {
  type: "noul";
  noul: number;
};

type JevAnswer = JevChoiceAnswer | JevScoreAnswer | JevNoulAnswer;

type JevResponse = {
  model?: string;
  answers?: Record<string, JevAnswer>;
};

const EXECUTION_STAGES: readonly EvolutionExecutionStage[] = [
  "understand",
  "context",
  "select",
  "plan",
  "act",
  "recover",
  "answer",
];

const OPTIMIZATION_SURFACES: readonly EvolutionOptimizationSurface[] = [
  "prompt",
  "tool",
  "tool_exposure",
  "context",
  "routing",
  "runtime",
];

// 5-level impact rubric, indices 0..4. The normalization divisor is derived
// from this array's length so the mapping cannot drift if levels change.
const EXPECTED_IMPACT_CRITERIA = [
  "Negligible impact",
  "Small impact",
  "Moderate impact",
  "High impact",
  "Very high impact",
] as const;
const EXPECTED_IMPACT_MAX_SCORE = EXPECTED_IMPACT_CRITERIA.length - 1;

const clamp01 = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
};

// Only the compact fields triage needs: identity + count/threshold. Signal
// evidence arrays stay out of the state (see collectFailureFacts for the one
// deliberate exception).
const compactSignal = (signal: EvolutionSignal): Record<string, unknown> => {
  const count = "count" in signal ? signal.count : undefined;
  const value = "value" in signal ? signal.value : undefined;
  const threshold = "threshold" in signal ? signal.threshold : undefined;
  return {
    kind: signal.kind,
    ...(typeof count === "number" ? { count } : {}),
    ...(typeof value === "number" ? { value } : {}),
    ...(typeof threshold === "number" ? { threshold } : {}),
  };
};

// Minimal failure evidence so the model can tell "socket closed / timeout /
// 502" apart from "invalid arguments / permission denied" without seeing raw
// observations, tool output, or conversation text. Bounded and clipped.
//
// PRIVACY CONTRACT: these error strings originate from provider responses and
// tool stderr and can still embed credentials, tokens, or host paths. The
// clipping below bounds SIZE, not SENSITIVITY. Before this adapter is wired
// into a real run, the host MUST pass failureFacts through its own error
// redaction / privacy policy. This PR deliberately does not add a redaction
// framework — there is no shared core helper for it yet, and inventing one
// here would expand scope.
const MAX_FAILURE_FACTS = 3;
const MAX_FAILURE_MESSAGE_CHARS = 200;

const clipText = (value: string, max: number): string =>
  value.length <= max ? value : `${value.slice(0, max)}…`;

const collectFailureFacts = (
  signals: readonly EvolutionSignal[],
): Array<{ toolName?: string; errorMessage?: string }> => {
  const facts: Array<{ toolName?: string; errorMessage?: string }> = [];
  for (const signal of signals) {
    if (signal.kind !== "run_failure" && signal.kind !== "tool_failure") continue;
    for (const evidence of signal.evidence) {
      if (facts.length >= MAX_FAILURE_FACTS) return facts;
      // Skip empty evidence so a run_failure with no available error text does
      // not consume one of the bounded failure slots.
      if (!evidence.toolName && !evidence.errorMessage) continue;
      facts.push({
        ...(evidence.toolName ? { toolName: evidence.toolName } : {}),
        ...(evidence.errorMessage
          ? { errorMessage: clipText(evidence.errorMessage, MAX_FAILURE_MESSAGE_CHARS) }
          : {}),
      });
    }
  }
  return facts;
};

const compactSnapshot = (snapshot: EvolutionRunSnapshot): Record<string, unknown> => ({
  success: snapshot.success,
  runKind: snapshot.runKind,
  provider: snapshot.provider,
  model: snapshot.model,
  durationMs: snapshot.durationMs,
  llmRequestCount: snapshot.llmRequestCount,
  toolCallCount: snapshot.toolCallCount,
  failedToolCallCount: snapshot.failedToolCallCount,
  repeatedToolCallCount: snapshot.repeatedToolCallCount,
  usedToolNames: snapshot.usedToolNames,
  // Length, not the names: keeps the triage state compact while still letting
  // the model see how bloated the tool surface was. Field name spells out the
  // unit so it can't be confused with `usedToolNames` (which is a list).
  exposedToolNameCount: snapshot.exposedToolNames.length,
  usage: snapshot.usage,
  context: snapshot.context,
  latency: snapshot.latency,
  stalled: snapshot.stalled,
  compactionCount: snapshot.compactionCount,
});

export function buildJevEvolutionTriageRequest(input: EvolutionTriageInput, model = DEFAULT_JEV_MODEL) {
  return {
    model,
    state: JSON.stringify({
      run: compactSnapshot(input.snapshot),
      signals: input.signals.map(compactSignal),
      // Compact failure evidence only: toolName + clipped errorMessage. Never
      // sends full observations, trace, tool output, arguments, or conversation.
      failureFacts: collectFailureFacts(input.signals),
    }),
    questions: {
      worth_investigating: {
        type: "noul",
        instructions:
          "This run shows evidence of a recurring or actionable system behavior worth deeper causal analysis, rather than normal task complexity or harmless noise.",
      },
      likely_external_failure: {
        type: "noul",
        instructions:
          "The suspicious behavior is primarily caused by an external provider, transient network, gateway, or unavailable dependency rather than bun-nolo agent policy, prompt, context, tool surface, or implementation.",
      },
      likely_behavioral_waste: {
        type: "noul",
        instructions:
          "The run contains avoidable agent inefficiency such as unnecessary tool exploration, redundant calls, excessive context, poor recovery, or other behavior likely improvable by system changes.",
      },
      expected_impact: {
        type: "score",
        instructions:
          "Estimate the practical impact if this behavior is recurring and fixed.",
        criteria: EXPECTED_IMPACT_CRITERIA,
      },
      suspected_stage: {
        type: "choice",
        instructions:
          "Which execution stage most likely contains the first meaningful divergence from a better trajectory?",
        criteria: {
          understand: "Task understanding or intent interpretation",
          context: "Context assembly, retrieval, or context size",
          select: "Capability, model, agent, or tool selection",
          plan: "Planning or decomposition before acting",
          act: "Tool invocation, arguments, implementation, or execution",
          recover: "Retry, fallback, or recovery after an error",
          answer: "Final synthesis or response after execution",
        },
      },
      suspected_surface: {
        type: "choice",
        instructions:
          "Which optimization surface is the best first place to investigate?",
        criteria: {
          prompt: "Agent or system instructions",
          tool: "Tool description, schema, implementation, or tool contract",
          tool_exposure: "Which tools were exposed or hidden for the run",
          context: "Context assembly, retrieval, compression, or injected context",
          routing: "Model, provider, capability, or agent routing",
          runtime: "Runtime, retry, fallback, network handling, or execution control",
        },
      },
    },
  } as const;
}

const getNoul = (answers: Record<string, JevAnswer>, key: string): number => {
  const answer = answers[key];
  return answer?.type === "noul" ? clamp01(answer.noul) : 0;
};

const getExpectedImpact = (answers: Record<string, JevAnswer>): number => {
  const answer = answers.expected_impact;
  if (answer?.type !== "score") return 0;
  // Score is a position across EXPECTED_IMPACT_CRITERIA (0..len-1) and may be
  // fractional. Normalizing by the declared max keeps the mapping bound to the
  // criteria list — adding or removing a level automatically rescales instead
  // of silently mis-mapping.
  return clamp01(answer.score / EXPECTED_IMPACT_MAX_SCORE);
};

const getChoice = <T extends string>(
  answers: Record<string, JevAnswer>,
  key: string,
  allowed: readonly T[],
): { value: T; confidence?: number; probabilities?: Partial<Record<T, number>> } | undefined => {
  const answer = answers[key];
  if (answer?.type !== "choice" || !allowed.includes(answer.choice as T)) return undefined;
  const probabilities = answer.probabilities
    ? Object.fromEntries(
        Object.entries(answer.probabilities)
          .filter(([name]) => allowed.includes(name as T))
          .map(([name, value]) => [name, clamp01(value)]),
      ) as Partial<Record<T, number>>
    : undefined;
  return {
    value: answer.choice as T,
    ...(typeof answer.confidence === "number" ? { confidence: clamp01(answer.confidence) } : {}),
    ...(probabilities ? { probabilities } : {}),
  };
};

export class JevEvolutionDecisionModel implements EvolutionDecisionModel {
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly model: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: JevDecisionModelOptions) {
    this.apiKey = options.apiKey;
    this.endpoint = options.endpoint ?? DEFAULT_JEV_ENDPOINT;
    this.model = options.model ?? DEFAULT_JEV_MODEL;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async triage(input: EvolutionTriageInput): Promise<EvolutionTriageResult> {
    if (!this.apiKey) {
      throw new Error("TypeSafe API key is required for Jev evolution triage.");
    }

    const response = await this.fetchFn(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildJevEvolutionTriageRequest(input, this.model)),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Jev evolution triage failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`);
    }

    const payload = (await response.json()) as JevResponse;
    const answers = payload.answers ?? {};
    const stage = getChoice(answers, "suspected_stage", EXECUTION_STAGES);
    const surface = getChoice(answers, "suspected_surface", OPTIMIZATION_SURFACES);

    return {
      worthInvestigating: getNoul(answers, "worth_investigating"),
      likelyExternalFailure: getNoul(answers, "likely_external_failure"),
      likelyBehavioralWaste: getNoul(answers, "likely_behavioral_waste"),
      expectedImpact: getExpectedImpact(answers),
      ...(stage
        ? {
            suspectedStage: {
              stage: stage.value,
              ...(stage.confidence !== undefined ? { confidence: stage.confidence } : {}),
              ...(stage.probabilities ? { probabilities: stage.probabilities } : {}),
            },
          }
        : {}),
      ...(surface
        ? {
            suspectedSurface: {
              surface: surface.value,
              ...(surface.confidence !== undefined ? { confidence: surface.confidence } : {}),
              ...(surface.probabilities ? { probabilities: surface.probabilities } : {}),
            },
          }
        : {}),
    };
  }
}
