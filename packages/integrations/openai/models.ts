// integrations/openai/models.ts
import type { Model, ModelPrice } from "ai/llm/types";

const GPT_5_5_STANDARD_PRICE: ModelPrice = {
  input: 40,
  output: 240,
  inputCacheHit: 4,
};

const GPT_5_5_LONG_CONTEXT_PRICE: ModelPrice = {
  input: 80,
  output: 360,
  inputCacheHit: 8,
};

const GPT_5_5_PRO_STANDARD_PRICE: ModelPrice = {
  input: 240,
  output: 1440,
  inputCacheHit: 0,
};

const GPT_5_5_PRO_LONG_CONTEXT_PRICE: ModelPrice = {
  input: 480,
  output: 2160,
  inputCacheHit: 0,
};
const GPT_5_6_SOL_STANDARD_PRICE: ModelPrice = {
  input: 40,
  output: 240,
  inputCacheHit: 4,
};

const GPT_5_6_SOL_LONG_CONTEXT_PRICE: ModelPrice = {
  input: 80,
  output: 360,
  inputCacheHit: 8,
};

const GPT_5_6_TERRA_STANDARD_PRICE: ModelPrice = {
  input: 16,
  output: 96,
  inputCacheHit: 1.6,
};

const GPT_5_6_TERRA_LONG_CONTEXT_PRICE: ModelPrice = {
  input: 32,
  output: 144,
  inputCacheHit: 3.2,
};

const GPT_5_6_LUNA_PRICE: ModelPrice = {
  input: 1.6,
  output: 9.6,
  inputCacheHit: 0.16,
};

export const openAIModels: Model[] = [
  {
    name: "gpt-5.5",
    displayName: "GPT-5.5 Standard",
    endpointKey: "responses",
    hasVision: true,
    contextWindow: 1_047_576,
    maxOutputTokens: 128_000,
    supportsReasoningEffort: true,
    price: GPT_5_5_STANDARD_PRICE,
    pricingStrategy: {
      type: "tiered_context",
      tiers: [
        {
          minContext: 272_001,
          price: GPT_5_5_LONG_CONTEXT_PRICE,
        },
      ],
    },
  },
  {
    name: "gpt-5.6-sol",
    displayName: "GPT-5.6 Sol (Flagship)",
    endpointKey: "responses",
    hasVision: true,
    contextWindow: 1_050_000,
    maxOutputTokens: 128_000,
    supportsReasoningEffort: true,
    price: GPT_5_6_SOL_STANDARD_PRICE,
    pricingStrategy: {
      type: "tiered_context",
      tiers: [
        {
          minContext: 272_001,
          price: GPT_5_6_SOL_LONG_CONTEXT_PRICE,
        },
      ],
    },
  },
  {
    name: "gpt-5.6-terra",
    displayName: "GPT-5.6 Terra (Balanced)",
    endpointKey: "responses",
    hasVision: true,
    contextWindow: 1_050_000,
    maxOutputTokens: 128_000,
    supportsReasoningEffort: true,
    price: GPT_5_6_TERRA_STANDARD_PRICE,
    pricingStrategy: {
      type: "tiered_context",
      tiers: [
        {
          minContext: 272_001,
          price: GPT_5_6_TERRA_LONG_CONTEXT_PRICE,
        },
      ],
    },
  },
  {
    name: "gpt-5.6-luna",
    displayName: "GPT-5.6 Luna (Fast)",
    endpointKey: "responses",
    hasVision: true,
    contextWindow: 1_050_000,
    maxOutputTokens: 128_000,
    supportsReasoningEffort: true,
    price: GPT_5_6_LUNA_PRICE,
  },
  {
    name: "gpt-5.5-pro",
    displayName: "GPT-5.5 Pro",
    endpointKey: "responses",
    hasVision: true,
    contextWindow: 1_047_576,
    maxOutputTokens: 128_000,
    supportsReasoningEffort: true,
    price: GPT_5_5_PRO_STANDARD_PRICE,
    pricingStrategy: {
      type: "tiered_context",
      tiers: [
        {
          minContext: 272_001,
          price: GPT_5_5_PRO_LONG_CONTEXT_PRICE,
        },
      ],
    },
  },
];
