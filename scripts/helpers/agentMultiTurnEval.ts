export type AgentEvalSignalCheck = {
  kind: "required" | "requiredAny" | "forbidden";
  signals: string[];
};

export type AgentEvalTurn = {
  input: string;
  required?: string[];
  requiredAny?: string[];
  forbidden?: string[];
};

export type AgentEvalCase = {
  id: string;
  title?: string;
  turns: AgentEvalTurn[];
};

export type AgentEvalTurnOutput = {
  input: string;
  output: string;
  dialogId?: string;
  checks: Array<{
    kind: AgentEvalSignalCheck["kind"];
    ok: boolean;
    signals: string[];
    matched: string[];
    missing?: string[];
  }>;
  ok: boolean;
};

export type AgentEvalCaseResult = {
  id: string;
  title?: string;
  ok: boolean;
  turns: AgentEvalTurnOutput[];
  error?: string;
};

function normalizeText(value: string) {
  return value.toLowerCase();
}

function matchedSignals(output: string, signals: string[]) {
  const normalizedOutput = normalizeText(output);
  return signals.filter((signal) => normalizedOutput.includes(normalizeText(signal)));
}

export function evaluateTurnOutput(turn: AgentEvalTurn, output: string): AgentEvalTurnOutput {
  const checks: AgentEvalTurnOutput["checks"] = [];
  const required = turn.required ?? [];
  const requiredAny = turn.requiredAny ?? [];
  const forbidden = turn.forbidden ?? [];

  if (required.length > 0) {
    const matched = matchedSignals(output, required);
    checks.push({
      kind: "required",
      ok: matched.length === required.length,
      signals: required,
      matched,
      missing: required.filter((signal) => !matched.includes(signal)),
    });
  }

  if (requiredAny.length > 0) {
    const matched = matchedSignals(output, requiredAny);
    checks.push({
      kind: "requiredAny",
      ok: matched.length > 0,
      signals: requiredAny,
      matched,
      missing: matched.length > 0 ? [] : requiredAny,
    });
  }

  if (forbidden.length > 0) {
    const matched = matchedSignals(output, forbidden);
    checks.push({
      kind: "forbidden",
      ok: matched.length === 0,
      signals: forbidden,
      matched,
    });
  }

  return {
    input: turn.input,
    output,
    checks,
    ok: checks.every((check) => check.ok),
  };
}

export function evaluateCaseOutputs(
  testCase: AgentEvalCase,
  outputs: Array<{ output: string; dialogId?: string }>,
): AgentEvalCaseResult {
  const turns = testCase.turns.map((turn, index) => {
    const evaluated = evaluateTurnOutput(turn, outputs[index]?.output ?? "");
    return {
      ...evaluated,
      dialogId: outputs[index]?.dialogId,
    };
  });
  return {
    id: testCase.id,
    title: testCase.title,
    ok: turns.every((turn) => turn.ok),
    turns,
  };
}

export function summarizeEvalResults(results: AgentEvalCaseResult[]) {
  const turns = results.flatMap((result) => result.turns);
  return {
    cases: results.length,
    passedCases: results.filter((result) => result.ok).length,
    failedCases: results.filter((result) => !result.ok).length,
    turns: turns.length,
    passedTurns: turns.filter((turn) => turn.ok).length,
    failedTurns: turns.filter((turn) => !turn.ok).length,
  };
}

export function validateEvalCases(cases: AgentEvalCase[]) {
  const errors: string[] = [];
  cases.forEach((testCase, caseIndex) => {
    if (!testCase.id?.trim()) errors.push(`case[${caseIndex}] is missing id`);
    if (!Array.isArray(testCase.turns) || testCase.turns.length === 0) {
      errors.push(`case ${testCase.id || caseIndex} has no turns`);
      return;
    }
    testCase.turns.forEach((turn, turnIndex) => {
      if (!turn.input?.trim()) errors.push(`case ${testCase.id || caseIndex} turn[${turnIndex}] is missing input`);
    });
  });
  if (errors.length > 0) {
    throw new Error(`Invalid eval cases:\n${errors.join("\n")}`);
  }
}
