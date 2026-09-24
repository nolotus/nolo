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
// >272K 输入按 2x 输入 / 1.5x 输出计（整笔请求）。平台价 = 官方价 × 8。
// 修复前本条目仍是旧价 5/0.5/30 → 40/4/240，比官方多收 25% 输入、50% 输出；
// 而同模型的 nolo 平台常量（PLATFORM_HOSTED_GPT_56_SOL_PRICE）本就是正确值。
const GPT_5_6_SOL_STANDARD_PRICE: ModelPrice = {
  input: 32,
  output: 160,
  inputCacheHit: 3.2,
};

const GPT_5_6_SOL_LONG_CONTEXT_PRICE: ModelPrice = {
  input: 64,
  output: 240,
  inputCacheHit: 6.4,
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

const GPT_6_ASTRA_STANDARD_PRICE: ModelPrice = {
  input: 80,
  output: 400,
  inputCacheHit: 8,
};

const GPT_6_ASTRA_LONG_CONTEXT_PRICE: ModelPrice = {
  input: 160,
  output: 600,
  inputCacheHit: 16,
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
    // 已知缺口（2026-09-24 官网核对）：官方对 >272K 输入有 2x/1.5x 规则，本条目
    // 未建模档位；平台托管侧又明确「价不随档位浮动」。是否给 BYO 档位属于计费
    // 策略决定，留待 owner 决策，不在此顺手改。
    endpointKey: "responses",
    hasVision: true,
    contextWindow: 1_050_000,
    maxOutputTokens: 128_000,
    supportsReasoningEffort: true,
    price: GPT_5_6_LUNA_PRICE,
  },
  {
    name: "gpt-6-astra",
    displayName: "GPT-6 Astra",
    endpointKey: "responses",
    hasVision: true,
    contextWindow: 1_050_000,
    maxOutputTokens: 128_000,
    supportsReasoningEffort: true,
    price: GPT_6_ASTRA_STANDARD_PRICE,
    pricingStrategy: {
      type: "tiered_context",
      tiers: [
        {
          minContext: 272_001,
          price: GPT_6_ASTRA_LONG_CONTEXT_PRICE,
        },
      ],
    },
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
