import type { EvolutionRunSnapshot, EvolutionSignal } from "../types";

export type EvolutionExecutionStage =
  | "understand"
  | "context"
  | "select"
  | "plan"
  | "act"
  | "recover"
  | "answer";

export type EvolutionOptimizationSurface =
  | "prompt"
  | "tool"
  | "tool_exposure"
  | "context"
  | "routing"
  | "runtime";

export type EvolutionTriageInput = {
  snapshot: EvolutionRunSnapshot;
  signals: readonly EvolutionSignal[];
};

export type EvolutionTriageResult = {
  worthInvestigating: number;
  likelyExternalFailure: number;
  likelyBehavioralWaste: number;
  expectedImpact: number;
  suspectedStage?: {
    stage: EvolutionExecutionStage;
    confidence?: number;
    probabilities?: Partial<Record<EvolutionExecutionStage, number>>;
  };
  suspectedSurface?: {
    surface: EvolutionOptimizationSurface;
    confidence?: number;
    probabilities?: Partial<Record<EvolutionOptimizationSurface, number>>;
  };
};

export interface EvolutionDecisionModel {
  triage(input: EvolutionTriageInput): Promise<EvolutionTriageResult>;
}

export type EvolutionTriagePolicy = {
  investigateThreshold: number;
  externalFailureSuppressThreshold: number;
};

export const DEFAULT_EVOLUTION_TRIAGE_POLICY: EvolutionTriagePolicy = {
  investigateThreshold: 0.65,
  externalFailureSuppressThreshold: 0.85,
};
