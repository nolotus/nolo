// integrations/anthropic/anthropicModels.ts
import { Model } from "ai/llm/types";

export const anthropicModels: Model[] = [
  {
    name: "claude-3-5-sonnet-latest",
    displayName: "Claude 3.5 Sonnet",
    hasVision: true,
    description: "Our most intelligent model to date",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    price: {
      input: 27.0,
      output: 135.0,
      cachingWrite: 33.75,
      cachingRead: 2.7,
    },
  },
  {
    name: "claude-3-7-sonnet-latest",
    displayName: "Claude 3.7 Sonnet",
    hasVision: true,
    description: "Our most intelligent model to date",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    price: {
      input: 27.0,
      output: 135.0,
      cachingWrite: 33.75,
      cachingRead: 2.7,
    },
  },
  {
    name: "claude-3-5-haiku-20241022",
    displayName: "Claude 3.5 Haiku",
    hasVision: false,
    description: "Fastest, most cost-effective model",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    price: {
      input: 7.2,
      output: 36.0,
      cachingWrite: 9.0,
      cachingRead: 0.72,
    },
  },
];
