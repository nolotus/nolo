import { applyEvolutionTriagePolicy } from "./triage";
import type {
  EvolutionDecisionModel,
  EvolutionExecutionStage,
  EvolutionOptimizationSurface,
  EvolutionTriageInput,
  EvolutionTriageResult,
} from "./types";

export type EvolutionTriageExpected = {
  investigate?: boolean;
  minWorthInvestigating?: number;
  minLikelyExternalFailure?: number;
  maxLikelyExternalFailure?: number;
  minLikelyBehavioralWaste?: number;
  suspectedStage?: EvolutionExecutionStage;
  suspectedSurface?: EvolutionOptimizationSurface;
};

export type EvolutionTriageEvalCase = {
  id: string;
  description?: string;
  input: EvolutionTriageInput;
  expected: EvolutionTriageExpected;
};

export type EvolutionTriageEvalCaseResult = {
  id: string;
  result: EvolutionTriageResult;
  investigate: boolean;
  failures: string[];
  passed: boolean;
};

export type EvolutionTriageEvalReport = {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  cases: EvolutionTriageEvalCaseResult[];
};

const checkExpected = (
  actual: EvolutionTriageResult,
  investigate: boolean,
  expected: EvolutionTriageExpected,
): string[] => {
  const failures: string[] = [];

  if (expected.investigate !== undefined && investigate !== expected.investigate) {
    failures.push(`investigate ${investigate} != ${expected.investigate}`);
  }
  if (
    expected.minWorthInvestigating !== undefined &&
    actual.worthInvestigating < expected.minWorthInvestigating
  ) {
    failures.push(
      `worthInvestigating ${actual.worthInvestigating} < ${expected.minWorthInvestigating}`,
    );
  }
  if (
    expected.minLikelyExternalFailure !== undefined &&
    actual.likelyExternalFailure < expected.minLikelyExternalFailure
  ) {
    failures.push(
      `likelyExternalFailure ${actual.likelyExternalFailure} < ${expected.minLikelyExternalFailure}`,
    );
  }
  if (
    expected.maxLikelyExternalFailure !== undefined &&
    actual.likelyExternalFailure > expected.maxLikelyExternalFailure
  ) {
    failures.push(
      `likelyExternalFailure ${actual.likelyExternalFailure} > ${expected.maxLikelyExternalFailure}`,
    );
  }
  if (
    expected.minLikelyBehavioralWaste !== undefined &&
    actual.likelyBehavioralWaste < expected.minLikelyBehavioralWaste
  ) {
    failures.push(
      `likelyBehavioralWaste ${actual.likelyBehavioralWaste} < ${expected.minLikelyBehavioralWaste}`,
    );
  }
  if (
    expected.suspectedStage !== undefined &&
    actual.suspectedStage?.stage !== expected.suspectedStage
  ) {
    failures.push(
      `suspectedStage ${actual.suspectedStage?.stage ?? "missing"} != ${expected.suspectedStage}`,
    );
  }
  if (
    expected.suspectedSurface !== undefined &&
    actual.suspectedSurface?.surface !== expected.suspectedSurface
  ) {
    failures.push(
      `suspectedSurface ${actual.suspectedSurface?.surface ?? "missing"} != ${expected.suspectedSurface}`,
    );
  }

  return failures;
};

export async function runEvolutionTriageEval(
  model: EvolutionDecisionModel,
  cases: readonly EvolutionTriageEvalCase[],
): Promise<EvolutionTriageEvalReport> {
  const results: EvolutionTriageEvalCaseResult[] = [];

  for (const evalCase of cases) {
    const rawResult = await model.triage(evalCase.input);
    const decision = applyEvolutionTriagePolicy(rawResult);
    const failures = checkExpected(
      decision.result,
      decision.investigate,
      evalCase.expected,
    );
    results.push({
      id: evalCase.id,
      result: decision.result,
      investigate: decision.investigate,
      failures,
      passed: failures.length === 0,
    });
  }

  const passed = results.filter((item) => item.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: results.length > 0 ? passed / results.length : 1,
    cases: results,
  };
}
