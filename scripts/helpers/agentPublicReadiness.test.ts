import { describe, expect, test } from "bun:test";

import { evaluateAgentPublicReadiness, type AgentPublicReadinessInput } from "./agentPublicReadiness";
import type { AgentEvalCase } from "./agentMultiTurnEval";
import type { AgentPublicGateConfig } from "./agentCreationSpec";

function makeEvalCase(overrides: Partial<AgentEvalCase> & { id: string }): AgentEvalCase {
  return {
    turns: [{ input: "hello" }],
    ...overrides,
  };
}

const baseGate: AgentPublicGateConfig = {
  minCases: 1,
  minMultiTurnCases: 0,
  minSourceGroundedCases: 0,
  minSafetyCases: 0,
  requirePublicAlias: false,
  requireNoPublicSecrets: false,
};

function makeInput(partial: Partial<AgentPublicReadinessInput> = {}): AgentPublicReadinessInput {
  return {
    evalCases: [makeEvalCase({ id: "c1" })],
    prompt: "你好，我是课程助手。",
    recordName: "课程助手",
    recordText: "课程助手\n你好，我是课程助手。",
    publicAlias: null,
    gate: baseGate,
    ...partial,
  };
}

describe("evaluateAgentPublicReadiness", () => {
  test("passes when all thresholds are met", () => {
    const report = evaluateAgentPublicReadiness(makeInput());
    expect(report.ok).toBe(true);
    expect(report.checks.every((c) => c.severity === "ok")).toBe(true);
    expect(report.summary).toContain("All checks passed");
  });

  test("fails when eval case count is below minimum", () => {
    const report = evaluateAgentPublicReadiness(
      makeInput({
        evalCases: [],
        gate: { ...baseGate, minCases: 2 },
      }),
    );
    expect(report.ok).toBe(false);
    const check = report.checks.find((c) => c.id === "eval-case-count");
    expect(check?.severity).toBe("fail");
  });

  test("fails when multi-turn cases are below minimum", () => {
    const report = evaluateAgentPublicReadiness(
      makeInput({
        evalCases: [makeEvalCase({ id: "c1", turns: [{ input: "single" }] })],
        gate: { ...baseGate, minMultiTurnCases: 1 },
      }),
    );
    expect(report.ok).toBe(false);
    const check = report.checks.find((c) => c.id === "multi-turn-case-count");
    expect(check?.severity).toBe("fail");
  });

  test("counts multi-turn cases correctly", () => {
    const cases: AgentEvalCase[] = [
      makeEvalCase({ id: "single", turns: [{ input: "one" }] }),
      makeEvalCase({ id: "multi", turns: [{ input: "first" }, { input: "second" }] }),
    ];
    const report = evaluateAgentPublicReadiness(
      makeInput({
        evalCases: cases,
        gate: { ...baseGate, minMultiTurnCases: 1 },
      }),
    );
    expect(report.ok).toBe(true);
  });

  test("fails when source-grounded cases are below minimum", () => {
    const cases: AgentEvalCase[] = [
      makeEvalCase({ id: "plain", turns: [{ input: "hello" }] }),
    ];
    const report = evaluateAgentPublicReadiness(
      makeInput({
        evalCases: cases,
        gate: { ...baseGate, minSourceGroundedCases: 1, sourceGroundingSignals: ["课程"] },
      }),
    );
    expect(report.ok).toBe(false);
    const check = report.checks.find((c) => c.id === "source-grounded-case-count");
    expect(check?.severity).toBe("fail");
  });

  test("counts source-grounded cases via required signals", () => {
    const cases: AgentEvalCase[] = [
      makeEvalCase({
        id: "source",
        turns: [{ input: "about course", required: ["课程"] }],
      }),
    ];
    const report = evaluateAgentPublicReadiness(
      makeInput({
        evalCases: cases,
        gate: { ...baseGate, minSourceGroundedCases: 1, sourceGroundingSignals: ["课程"] },
      }),
    );
    expect(report.ok).toBe(true);
  });

  test("fails source-grounded threshold when signals are not configured", () => {
    const cases: AgentEvalCase[] = [
      makeEvalCase({
        id: "source",
        turns: [{ input: "about course", required: ["课程"] }],
      }),
    ];
    const report = evaluateAgentPublicReadiness(
      makeInput({
        evalCases: cases,
        gate: { ...baseGate, minSourceGroundedCases: 1 },
      }),
    );
    expect(report.ok).toBe(false);
    const check = report.checks.find((c) => c.id === "source-grounded-case-count");
    expect(check?.detail).toContain("sourceGroundingSignals");
  });

  test("fails when safety cases are below minimum", () => {
    const cases: AgentEvalCase[] = [
      makeEvalCase({ id: "plain", turns: [{ input: "hello" }] }),
    ];
    const report = evaluateAgentPublicReadiness(
      makeInput({
        evalCases: cases,
        gate: { ...baseGate, minSafetyCases: 1, safetySignals: ["自己试"] },
      }),
    );
    expect(report.ok).toBe(false);
    const check = report.checks.find((c) => c.id === "safety-case-count");
    expect(check?.severity).toBe("fail");
  });

  test("counts safety cases via forbidden signals", () => {
    const cases: AgentEvalCase[] = [
      makeEvalCase({
        id: "safety",
        turns: [{ input: "can I try?", forbidden: ["可以自己试"] }],
      }),
    ];
    const report = evaluateAgentPublicReadiness(
      makeInput({
        evalCases: cases,
        gate: { ...baseGate, minSafetyCases: 1, safetySignals: ["可以自己试"] },
      }),
    );
    expect(report.ok).toBe(true);
  });

  test("fails safety threshold when signals are not configured", () => {
    const cases: AgentEvalCase[] = [
      makeEvalCase({
        id: "safety",
        turns: [{ input: "can I try?", forbidden: ["可以自己试"] }],
      }),
    ];
    const report = evaluateAgentPublicReadiness(
      makeInput({
        evalCases: cases,
        gate: { ...baseGate, minSafetyCases: 1 },
      }),
    );
    expect(report.ok).toBe(false);
    const check = report.checks.find((c) => c.id === "safety-case-count");
    expect(check?.detail).toContain("safetySignals");
  });

  test("fails when record text contains forbidden terms", () => {
    const report = evaluateAgentPublicReadiness(
      makeInput({
        recordName: "课程助手",
        recordText: "课程助手\n内部代号 MVP\n你好",
        gate: { ...baseGate, forbiddenRecordText: ["MVP"] },
      }),
    );
    expect(report.ok).toBe(false);
    const check = report.checks.find((c) => c.id === "forbidden-record-text");
    expect(check?.severity).toBe("fail");
    expect(check?.detail).toContain("MVP");
  });

  test("fails when prompt is missing required text", () => {
    const report = evaluateAgentPublicReadiness(
      makeInput({
        prompt: "你好",
        gate: { ...baseGate, requiredPromptText: ["参考资料"] },
      }),
    );
    expect(report.ok).toBe(false);
    const check = report.checks.find((c) => c.id === "required-prompt-text");
    expect(check?.severity).toBe("fail");
    expect(check?.detail).toContain("参考资料");
  });

  test("fails when public alias is required but missing", () => {
    const report = evaluateAgentPublicReadiness(
      makeInput({
        publicAlias: null,
        gate: { ...baseGate, requirePublicAlias: true },
      }),
    );
    expect(report.ok).toBe(false);
    const check = report.checks.find((c) => c.id === "public-alias-exists");
    expect(check?.severity).toBe("fail");
  });

  test("fails when public alias contains secrets", () => {
    const report = evaluateAgentPublicReadiness(
      makeInput({
        publicAlias: { dbKey: "agent-pub-123", apiKey: "secret-key" },
        gate: { ...baseGate, requirePublicAlias: true, requireNoPublicSecrets: true },
      }),
    );
    expect(report.ok).toBe(false);
    const check = report.checks.find((c) => c.id === "no-public-secrets");
    expect(check?.severity).toBe("fail");
    expect(check?.detail).toContain("apiKey");
  });

  test("fails when record name does not match publicName", () => {
    const report = evaluateAgentPublicReadiness(
      makeInput({
        recordName: "课程助手",
        recordText: "课程助手",
        publicName: "课程研读助手",
      }),
    );
    const check = report.checks.find((c) => c.id === "public-name-match");
    expect(check?.severity).toBe("fail");
    expect(report.ok).toBe(false);
  });

  test("passes when record name matches publicName", () => {
    const report = evaluateAgentPublicReadiness(
      makeInput({
        recordName: "课程研读助手",
        publicName: "课程研读助手",
      }),
    );
    const check = report.checks.find((c) => c.id === "public-name-match");
    expect(check?.severity).toBe("ok");
  });

  test("skips checks for unset gate thresholds", () => {
    const report = evaluateAgentPublicReadiness(
      makeInput({
        gate: {},
      }),
    );
    expect(report.ok).toBe(true);
    expect(report.checks).toHaveLength(0);
  });

  test("full Nihaisha-like config passes with proper inputs", () => {
    const nihaishaGate: AgentPublicGateConfig = {
      minCases: 2,
      minMultiTurnCases: 1,
      minSourceGroundedCases: 1,
      minSafetyCases: 1,
      sourceGroundingSignals: ["课程", "参考资料"],
      safetySignals: ["可以自己试"],
      forbiddenRecordText: ["MVP", "DeepSeek V4 Pro"],
      requiredPromptText: ["参考资料"],
      requirePublicAlias: true,
      requireNoPublicSecrets: true,
      requireReferenceReadability: true,
      forbidUnrelatedUserGlobalMemory: true,
    };

    const cases: AgentEvalCase[] = [
      makeEvalCase({
        id: "multi-source",
        turns: [
          { input: "课程内容", required: ["课程"] },
          { input: "更多", requiredAny: ["参考资料"] },
        ],
      }),
      makeEvalCase({
        id: "safety",
        turns: [{ input: "试试", forbidden: ["可以自己试"] }],
      }),
    ];

    const report = evaluateAgentPublicReadiness(
      makeInput({
        evalCases: cases,
        prompt: "我是课程研读助手，回答会附上参考资料。",
        recordName: "倪海厦课程研读助手",
        recordText: "倪海厦课程研读助手\n我是课程研读助手，回答会附上参考资料。",
        publicAlias: { dbKey: "agent-pub-test", name: "倪海厦课程研读助手" },
        gate: nihaishaGate,
        referenceReadabilityResults: [
          { dbKey: "page-001", ok: true, status: 200 },
          { dbKey: "page-002", ok: true, status: 200 },
        ],
        memoryInjectionResult: { hasUnrelatedUserGlobalMemory: false },
      }),
    );
    expect(report.ok).toBe(true);
    expect(report.checks).toHaveLength(10);
    expect(report.checks.every((c) => c.severity === "ok")).toBe(true);
  });

  test("fails when reference readability is required but references are unreadable", () => {
    const report = evaluateAgentPublicReadiness(
      makeInput({
        gate: { ...baseGate, requireReferenceReadability: true },
        referenceReadabilityResults: [
          { dbKey: "page-001", ok: true, status: 200 },
          { dbKey: "page-002", ok: false, status: 401, message: "Unauthorized" },
        ],
      }),
    );
    expect(report.ok).toBe(false);
    const check = report.checks.find((c) => c.id === "reference-readability");
    expect(check?.severity).toBe("fail");
    expect(check?.detail).toContain("page-002");
    expect(check?.detail).toContain("401");
  });

  test("fails when reference readability results are missing entirely", () => {
    const report = evaluateAgentPublicReadiness(
      makeInput({
        gate: { ...baseGate, requireReferenceReadability: true },
      }),
    );
    expect(report.ok).toBe(false);
    const check = report.checks.find((c) => c.id === "reference-readability");
    expect(check?.severity).toBe("fail");
    expect(check?.detail).toContain("No reference readability results");
  });

  test("passes reference readability when all references are readable", () => {
    const report = evaluateAgentPublicReadiness(
      makeInput({
        gate: { ...baseGate, requireReferenceReadability: true },
        referenceReadabilityResults: [
          { dbKey: "page-001", ok: true, status: 200 },
          { dbKey: "page-002", ok: true, status: 200 },
        ],
      }),
    );
    const check = report.checks.find((c) => c.id === "reference-readability");
    expect(check?.severity).toBe("ok");
  });

  test("fails when unrelated user-global memory is detected for public agent", () => {
    const report = evaluateAgentPublicReadiness(
      makeInput({
        gate: { ...baseGate, forbidUnrelatedUserGlobalMemory: true },
        memoryInjectionResult: {
          hasUnrelatedUserGlobalMemory: true,
          detail: "Greeting contains '不希望我的读者理解我' which is unrelated to TCM course agent.",
        },
      }),
    );
    expect(report.ok).toBe(false);
    const check = report.checks.find((c) => c.id === "no-unrelated-memory-injection");
    expect(check?.severity).toBe("fail");
    expect(check?.detail).toContain("读者");
  });

  test("fails when memory injection result is missing for public agent gate", () => {
    const report = evaluateAgentPublicReadiness(
      makeInput({
        gate: { ...baseGate, forbidUnrelatedUserGlobalMemory: true },
      }),
    );
    expect(report.ok).toBe(false);
    const check = report.checks.find((c) => c.id === "no-unrelated-memory-injection");
    expect(check?.severity).toBe("fail");
    expect(check?.detail).toContain("No memory injection verification result");
  });

  test("passes memory injection check when no unrelated memory is detected", () => {
    const report = evaluateAgentPublicReadiness(
      makeInput({
        gate: { ...baseGate, forbidUnrelatedUserGlobalMemory: true },
        memoryInjectionResult: { hasUnrelatedUserGlobalMemory: false },
      }),
    );
    const check = report.checks.find((c) => c.id === "no-unrelated-memory-injection");
    expect(check?.severity).toBe("ok");
  });
});
