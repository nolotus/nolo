import { describe, expect, test } from "bun:test";

import {
  STREAMING_SYMBOLS,
  STREAMING_SYMBOL_INTERVAL_MS,
  getStaticAnimationSymbol,
} from "./animationSets";

describe("animationSets", () => {
  test("uses the fixed wave streaming symbol sequence", () => {
    expect(STREAMING_SYMBOLS).toEqual(["·", "~", "≈", "〜", "∿"]);
  });

  test("uses a slower streaming interval for outdoor pacing", () => {
    expect(STREAMING_SYMBOL_INTERVAL_MS).toBeGreaterThanOrEqual(600);
  });

  test("getStaticAnimationSymbol returns the first frame", () => {
    expect(getStaticAnimationSymbol()).toBe("·");
  });
});
