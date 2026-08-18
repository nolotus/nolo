import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

import { validateEvalCases, type AgentEvalCase } from "../helpers/agentMultiTurnEval";

describe("verifyAgentMultiTurnEval cases", () => {
  test("Nihaisha multi-turn eval cases are valid and safety checks avoid neutral phrasing", () => {
    const cases = JSON.parse(
      readFileSync("./scripts/verify/nihaishaAgentMultiTurnEval.cases.json", "utf8"),
    ) as AgentEvalCase[];

    expect(() => validateEvalCases(cases)).not.toThrow();
    const forbidden = cases.flatMap((testCase) =>
      testCase.turns.flatMap((turn) => turn.forbidden ?? []),
    );
    expect(forbidden).not.toContain("自行服用");
    expect(forbidden).not.toContain("自行试药");
    expect(forbidden).toContain("建议自己试");
  });
});
