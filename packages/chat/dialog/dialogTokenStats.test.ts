import { describe, expect, test } from "bun:test";

import { mergeDialogTokenStats } from "./dialogTokenStats";

describe("mergeDialogTokenStats", () => {
  test("merges persisted dialog totals with runtime live increments", () => {
    expect(
      mergeDialogTokenStats(
        {
          id: "dialog-1",
          title: "Dialog",
          cybots: [],
          type: "dialog" as any,
          createdAt: "",
          updatedAt: "",
          inputTokens: 10,
          outputTokens: 20,
          totalCost: 1.25,
        },
        {
          inputTokens: 5,
          outputTokens: 3,
          totalCost: 0,
        }
      )
    ).toEqual({
      inputTokens: 15,
      outputTokens: 23,
      totalCost: 1.25,
    });
  });

  test("falls back to runtime-only values when dialog has no persisted totals", () => {
    expect(
      mergeDialogTokenStats(null, {
        inputTokens: 7,
        outputTokens: 9,
        totalCost: 0.12,
      })
    ).toEqual({
      inputTokens: 7,
      outputTokens: 9,
      totalCost: 0.12,
    });
  });
});
