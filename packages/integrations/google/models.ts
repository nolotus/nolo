import type { Model } from "ai/llm/types";
import type { ImageSizeKey } from "ai/llm/imagePricing";
import { DEFAULT_GOOGLE_LIVE_AUDIO_MODEL } from "ai/agent/liveAudioModel";

const GOOGLE_IMAGE_ASPECT_RATIOS: NonNullable<Model["supportedAspectRatios"]> = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
];

const GOOGLE_IMAGE_SIZES: ImageSizeKey[] = ["1K", "2K", "4K"];

const createGoogleImageModel = ({
  name,
  displayName,
  inputPrice,
  outputPrice,
  imageTokenPricePerMillion,
  imageOutputTokenEstimateBySize,
  pricePerImage,
  maxOutputTokens,
  contextWindow,
  imageGenerationWaitTimeSeconds,
  imageGenerationProfiles,
}: {
  name: string;
  displayName: string;
  inputPrice: number;
  outputPrice: number;
  imageTokenPricePerMillion?: number;
  imageOutputTokenEstimateBySize?: NonNullable<Model["imageOutputTokenEstimateBySize"]>;
  pricePerImage?: number;
  maxOutputTokens: number;
  contextWindow: number;
  imageGenerationWaitTimeSeconds?: Model["imageGenerationWaitTimeSeconds"];
  imageGenerationProfiles?: Model["imageGenerationProfiles"];
}): Model => ({
  name,
  displayName,
  provider: "google",
  hasVision: true,
  hasImageOutput: true,
  supportsImageOutput: true,
  supportsImageConfig: true,
  requiresImageModalities: true,
  defaultModalities: ["image", "text"],
  supportedAspectRatios: GOOGLE_IMAGE_ASPECT_RATIOS,
  supportedImageSizes: GOOGLE_IMAGE_SIZES,
  price: {
    input: inputPrice,
    output: outputPrice,
  },
  imageTokenPricePerMillion,
  imageOutputTokenEstimateBySize,
  pricePerImage,
  maxOutputTokens,
  contextWindow,
  imageGenerationWaitTimeSeconds,
  imageGenerationProfiles,
  supportsTool: false,
});

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
      input: 3.5,
      output: 21,
      cachingWrite: 0.35000000000000003,
      cachingRead: 0.35000000000000003,
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
      input: 10.5,
      output: 63,
      cachingWrite: 1.05,
      cachingRead: 1.05,
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
      input: 5.25,
      output: 26.25,
      cachingWrite: 0.525,
      cachingRead: 0.525,
    },
  },
  createGoogleImageModel({
    name: "gemini-3-pro-image-preview",
    displayName: "Nano Banana Pro (Gemini 3 Pro Image Preview)",
    inputPrice: 14,
    outputPrice: 84,
    imageTokenPricePerMillion: 840,
    imageOutputTokenEstimateBySize: {
      "1K": 1120,
      "2K": 1120,
      "4K": 2000,
    },
    maxOutputTokens: 8192,
    contextWindow: 65536,
    imageGenerationWaitTimeSeconds: {
      min: 25,
      max: 60,
    },
    imageGenerationProfiles: [
      {
        key: "speed",
        label: "速度优先",
        imageModel: "gemini-3.1-flash-image-preview",
        waitTimeSeconds: {
          min: 10,
          max: 25,
        },
      },
      {
        key: "quality",
        label: "质量优先",
        imageModel: "gemini-3-pro-image-preview",
        waitTimeSeconds: {
          min: 25,
          max: 60,
        },
      },
    ],
  }),
  createGoogleImageModel({
    name: "gemini-3.1-flash-image-preview",
    displayName: "Nano Banana 2 (Gemini 3.1 Flash Image Preview)",
    inputPrice: 3.5,
    outputPrice: 21,
    imageTokenPricePerMillion: 420,
    imageOutputTokenEstimateBySize: {
      "1K": 1120,
      "2K": 1680,
      "4K": 2520,
    },
    maxOutputTokens: 65536,
    contextWindow: 65536,
    imageGenerationWaitTimeSeconds: {
      min: 10,
      max: 25,
    },
    imageGenerationProfiles: [
      {
        key: "speed",
        label: "速度优先",
        imageModel: "gemini-3.1-flash-image-preview",
        waitTimeSeconds: {
          min: 10,
          max: 25,
        },
      },
      {
        key: "quality",
        label: "质量优先",
        imageModel: "gemini-3-pro-image-preview",
        waitTimeSeconds: {
          min: 25,
          max: 60,
        },
      },
    ],
  }),
  createGoogleImageModel({
    name: "gemini-3.1-flash-lite-image",
    displayName: "Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image)",
    inputPrice: 1.75,
    outputPrice: 10.5,
    pricePerImage: 0.23800000000000002,
    maxOutputTokens: 65536,
    contextWindow: 65536,
    imageGenerationWaitTimeSeconds: {
      min: 4,
      max: 10,
    },
    imageGenerationProfiles: [
      {
        key: "speed",
        label: "速度优先",
        imageModel: "gemini-3.1-flash-lite-image",
        waitTimeSeconds: {
          min: 4,
          max: 10,
        },
      },
      {
        key: "quality",
        label: "质量优先",
        imageModel: "gemini-3-pro-image-preview",
        waitTimeSeconds: {
          min: 25,
          max: 60,
        },
      },
    ],
  }),
];
