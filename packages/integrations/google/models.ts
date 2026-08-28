import type { Model } from "ai/llm/types";
import { DEFAULT_GOOGLE_LIVE_AUDIO_MODEL } from "ai/agent/liveAudioModel";

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
];
