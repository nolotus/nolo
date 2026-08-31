import { describe, expect, it } from "bun:test";

import { xaiModels } from "./models";

const grok46 = xaiModels.find((model) => model.name === "grok-4.6");

describe("xAI Grok 4.6 model pricing", () => {
  it("stores the short-context price in platform credits at 8 credits per dollar", () => {
    expect(grok46?.price).toEqual({
      input: 16,
      output: 48,
      inputCacheHit: 4,
    });
  });

  it("stores the official long-context tier", () => {
    expect(grok46?.pricingStrategy).toEqual({
      type: "tiered_context",
      tiers: [
        {
          minContext: 200_001,
          price: {
            input: 32,
            output: 96,
            inputCacheHit: 8,
          },
        },
      ],
    });
  });

  it("declares a 500k context window", () => {
    expect(grok46?.contextWindow).toBe(500000);
  });
});
