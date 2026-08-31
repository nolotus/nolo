import { Model } from "ai/llm/types";

/** xAI Chat Completions model IDs. CLI list: `grok models`. API may lag; verify with a live run. */
export const xaiModels: Model[] = [
  {
    name: "grok-4.6",
    displayName: "Grok 4.6",
    hasVision: true,
    contextWindow: 500000,
    price: { input: 16, output: 48, inputCacheHit: 4 },
    pricingStrategy: {
      type: "tiered_context",
      tiers: [
        {
          minContext: 200_001,
          price: { input: 32, output: 96, inputCacheHit: 8 },
        },
      ],
    },
    fnCall: true,
    jsonOutput: true,
  },
];