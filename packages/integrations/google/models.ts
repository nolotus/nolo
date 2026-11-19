import type { Model } from "ai/llm/types";
import { DEFAULT_GOOGLE_LIVE_AUDIO_MODEL } from "ai/agent/liveAudioModel";
import {
  GEMINI_NEON_SERVICE_TIER_MULTIPLIERS,
  GEMINI_NEON_STANDARD_PRICE_USD,
} from "ai/llm/geminiNeonPricing";

export const googleModels: Model[] = [
  {
    name: DEFAULT_GOOGLE_LIVE_AUDIO_MODEL,
    displayName: "Gemini 3.1 Flash Live",
    provider: "google",
    description:
      "Gemini Live API model for low-latency real-time voice conversations.",
    hasVision: true,
    hasAudio: true,
    contextWindow: 1048576,
    maxOutputTokens: 65500,
    supportsTool: true,
    price: {
      input: 4,
      output: 24,
      cachingWrite: 0.4,
      cachingRead: 0.4,
    },
  },
  {
    name: "gemini-3.6-flash",
    displayName: "Gemini 3.6 Flash",
    provider: "google",
    description:
      "Gemini 3.6 Flash model for fast frontier agentic, coding, and multimodal tasks.",
    hasVision: true,
    hasAudio: true,
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    supportsTool: true,
    supportsReasoningEffort: true,
    price: {
      input: 12,
      output: 72,
      cachingWrite: 1.2,
      cachingRead: 1.2,
    },
    serviceTierPriceMultipliers: {
      batch: { inputOutput: 0.5, cache: 0.5 },
      flex: { inputOutput: 0.5, cache: 0.08 / 0.15 },
      priority: { inputOutput: 1.8, cache: 1.8 },
    },
  },
  {
    name: "gemini-3.7-flash",
    displayName: "Gemini 3.7 Flash",
    provider: "google",
    description:
      "Gemini 3.7 Flash model for fast frontier agentic, coding, and multimodal tasks.",
    hasVision: true,
    hasAudio: true,
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    supportsTool: true,
    supportsReasoningEffort: true,
    // Antigravity's subscription wire route is tiered; Gemini API uses this logical id.
    price: {
      input: 6,
      output: 30,
      cachingWrite: 0.6,
      cachingRead: 0.6,
    },
  },
  {
    name: "gemini-3.8-flash",
    displayName: "Gemini 3.8 Flash",
    provider: "google",
    description:
      "Gemini 3.8 Flash model for fast frontier agentic, coding, and multimodal tasks.",
    hasVision: true,
    hasAudio: true,
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    supportsTool: true,
    supportsReasoningEffort: true,
    price: {
      input: 6,
      output: 30,
      cachingWrite: 0.6,
      cachingRead: 0.6,
    },
  },
  {
    name: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    provider: "google",
    description:
      "Gemini 2.5 Pro model for complex reasoning, coding, and large context multimodal tasks.",
    hasVision: true,
    hasAudio: true,
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    supportsTool: true,
    supportsReasoningEffort: true,
    price: {
      input: 10,
      output: 40,
      cachingWrite: 2.5,
      cachingRead: 2.5,
    },
  },
  {
    name: "gemini-4-argon",
    displayName: "Gemini 4 Argon",
    provider: "google",
    description:
      "Gemini 4 Argon flagship reasoning, coding, and multimodal model.",
    hasVision: true,
    hasAudio: true,
    // TODO(model-spec): 上下文/最大输出沿用 Gemini 3.x 的 1M/64K 占位，待官方模型页确认后更新。
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    supportsTool: true,
    supportsReasoningEffort: true,
    // thinking; implicit caching only, so cachingWrite mirrors cachingRead).
    price: {
      input: 16,
      output: 80,
      cachingWrite: 0.8,
      cachingRead: 0.8,
    },
  },
  {
    name: "gemini-4-neon",
    displayName: "Gemini 4 Neon",
    provider: "google",
    description:
      "Gemini 4 Neon frontier model for complex software engineering, knowledge work, and science workflows.",
    hasVision: true,
    hasAudio: true,
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    supportsTool: true,
    supportsReasoningEffort: true,
    // 官方 Gemini API pricing (Standard tier, checked 2026-11-19):
    // 数字真值在 ai/llm/geminiNeonPricing.ts（nolo 托管目录共用同一份，避免同一上游
    // 价目出现两份生产真值）；× 8 = credits，与本文件其它条目同口径。
    // Implicit caching only (explicit caching unsupported), so cachingWrite mirrors cachingRead.
    // 档位：Flex = 0.5x、Priority = 1.8x（官方同步线路的 service_tier）。平台没有 Batch
    // 线路（Batch API 是独立的异步接口，本仓库不接），故不登记 batch 倍率。
    price: {
      input: GEMINI_NEON_STANDARD_PRICE_USD.input * 8,
      output: GEMINI_NEON_STANDARD_PRICE_USD.output * 8,
      cachingWrite: GEMINI_NEON_STANDARD_PRICE_USD.cache * 8,
      cachingRead: GEMINI_NEON_STANDARD_PRICE_USD.cache * 8,
    },
    serviceTierPriceMultipliers: { ...GEMINI_NEON_SERVICE_TIER_MULTIPLIERS },
  },
];
