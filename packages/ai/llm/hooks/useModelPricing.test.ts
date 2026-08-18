import { describe, expect, it } from "bun:test";

import { resolveModelPrice } from "./useModelPricing";

describe("resolveModelPrice", () => {
  it("accepts OpenRouter-style pricing records without a price field", () => {
    expect(
      resolveModelPrice({
        name: "xiaomi/mimo-v2.5-pro",
        pricing: { input: 1, output: 3 },
      })
    ).toEqual({
      input: 1,
      output: 3,
      cachingWrite: undefined,
      cachingRead: undefined,
      inputCacheHit: undefined,
    });
  });

  it("falls back to zero pricing when model pricing is absent", () => {
    expect(resolveModelPrice({ name: "custom-model" })).toEqual({
      input: 0,
      output: 0,
      cachingWrite: undefined,
      cachingRead: undefined,
      inputCacheHit: undefined,
    });
  });
});
