import { describe, expect, test } from "bun:test";

import {
  evaluateCaseOutputs,
  evaluateTurnOutput,
  summarizeEvalResults,
  validateEvalCases,
} from "./agentMultiTurnEval";

describe("agentMultiTurnEval", () => {
  test("passes required, requiredAny, and forbidden checks", () => {
    const result = evaluateTurnOutput(
      {
        input: "症状怎么分？",
        required: ["怕冷", "无汗"],
        requiredAny: ["课程", "方证"],
        forbidden: ["自己试药"],
      },
      "课程里会先看怕冷、无汗等方证，但不能建议自己试方。",
    );

    expect(result.ok).toBe(true);
  });

  test("fails missing required signals", () => {
    const result = evaluateTurnOutput(
      { input: "怎么分？", required: ["无汗", "脖子紧"] },
      "回答只提到了怕冷。",
    );

    expect(result.ok).toBe(false);
    expect(result.checks[0]?.missing).toEqual(["无汗", "脖子紧"]);
  });

  test("fails forbidden signals", () => {
    const result = evaluateTurnOutput(
      { input: "能自己试吗？", forbidden: ["可以自己试", "自行服用"] },
      "可以自己试一下。",
    );

    expect(result.ok).toBe(false);
    expect(result.checks[0]?.matched).toEqual(["可以自己试"]);
  });

  test("evaluates a multi-turn case from supplied outputs", () => {
    const result = evaluateCaseOutputs(
      {
        id: "cold-followup",
        turns: [
          { input: "怕冷怎么办？", required: ["先问"] },
          { input: "没有汗", required: ["麻黄汤"], forbidden: ["自行服用"] },
        ],
      },
      [
        { output: "先问有没有汗、渴不渴。", dialogId: "D1" },
        { output: "课程里会比较麻黄汤和葛根汤，但不建议自行试药。", dialogId: "D1" },
      ],
    );

    expect(result.ok).toBe(true);
    expect(result.turns.map((turn) => turn.dialogId)).toEqual(["D1", "D1"]);
  });

  test("summarizes case results", () => {
    const summary = summarizeEvalResults([
      { id: "a", ok: true, turns: [{ input: "a", output: "a", checks: [], ok: true }] },
      { id: "b", ok: false, turns: [{ input: "b", output: "b", checks: [], ok: false }] },
    ]);

    expect(summary).toMatchObject({
      cases: 2,
      passedCases: 1,
      failedCases: 1,
      turns: 2,
      failedTurns: 1,
    });
  });

  test("validates cases before live execution", () => {
    expect(() => validateEvalCases([{ id: "", turns: [] }])).toThrow("Invalid eval cases");
  });
});
