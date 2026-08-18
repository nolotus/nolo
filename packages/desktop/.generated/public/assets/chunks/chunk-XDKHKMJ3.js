import {
  asTrimmedLowercaseString
} from "/public/assets/chunks/chunk-VCXOIOLL.js";

// packages/ai/llm/kimi.ts
var PLATFORM_HOSTED_KIMI_K3_MODEL = "kimi-k3";
var PLATFORM_HOSTED_KIMI_K26_MODEL = "kimi-k2.6";
var PLATFORM_HOSTED_KIMI_PROVIDER = "nolo";
var LEGACY_OLLAMA_CLOUD_PROVIDER = "ollama-cloud";
var isNoloHostedProvider = (provider) => {
  const normalized = asTrimmedLowercaseString(provider);
  return normalized === PLATFORM_HOSTED_KIMI_PROVIDER || normalized === LEGACY_OLLAMA_CLOUD_PROVIDER;
};
var FIREWORKS_KIMI_LATEST_MODEL = "accounts/fireworks/models/kimi-latest";
var FIREWORKS_KIMI_CURRENT_MODEL = "accounts/fireworks/models/kimi-k2p7-code";
var FIREWORKS_KIMI_K2P6_MODEL = "accounts/fireworks/models/kimi-k2p6";
var DEEPINFRA_KIMI_FALLBACK_MODEL = "moonshotai/Kimi-K2.6";
var isFireworksKimiModel = (model) => model === FIREWORKS_KIMI_LATEST_MODEL || model === FIREWORKS_KIMI_CURRENT_MODEL || model === FIREWORKS_KIMI_K2P6_MODEL;
var isDeepInfraKimiModel = (model) => model === DEEPINFRA_KIMI_FALLBACK_MODEL;
var resolveFireworksKimiModel = (model) => {
  if (model === FIREWORKS_KIMI_LATEST_MODEL) {
    return FIREWORKS_KIMI_CURRENT_MODEL;
  }
  return model ?? "";
};
var shouldHideKimiAliasFromPricing = (provider, model) => provider === "fireworks" && model === FIREWORKS_KIMI_LATEST_MODEL;

// packages/integrations/deepseek/models.ts
var deepSeekModels = [
  {
    name: "deepseek-v4-flash",
    displayName: "DeepSeek V4 Flash",
    hasVision: false,
    contextWindow: 1e6,
    maxOutputTokens: 384e3,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    supportsReasoningEffort: true,
    endpointKey: "chat.completions",
    price: {
      input: 1,
      inputCacheHit: 0.02,
      output: 2
    }
  },
  {
    name: "deepseek-v4-pro",
    displayName: "DeepSeek V4 Pro",
    hasVision: false,
    contextWindow: 1e6,
    maxOutputTokens: 384e3,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    supportsReasoningEffort: true,
    price: {
      input: 3,
      inputCacheHit: 0.1,
      output: 6
    }
  }
];

// packages/ai/agent/liveAudioModel.ts
var DEFAULT_GOOGLE_LIVE_AUDIO_MODEL = "gemini-3.1-flash-live-preview";

// packages/integrations/google/models.ts
var GOOGLE_IMAGE_ASPECT_RATIOS = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9"
];
var GOOGLE_IMAGE_SIZES = ["1K", "2K", "4K"];
var createGoogleImageModel = ({
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
  imageGenerationProfiles
}) => ({
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
    output: outputPrice
  },
  imageTokenPricePerMillion,
  imageOutputTokenEstimateBySize,
  pricePerImage,
  maxOutputTokens,
  contextWindow,
  imageGenerationWaitTimeSeconds,
  imageGenerationProfiles,
  supportsTool: false
});
var googleModels = [
  {
    name: DEFAULT_GOOGLE_LIVE_AUDIO_MODEL,
    displayName: "Gemini 3.1 Flash Live",
    provider: "google",
    description: "Gemini Live API model for low-latency real-time voice conversations.",
    hasVision: true,
    hasAudio: true,
    contextWindow: 1048576,
    maxOutputTokens: 65500,
    supportsTool: true,
    price: {
      input: 0.5 * 7,
      output: 3 * 7,
      cachingWrite: 0.05 * 7,
      cachingRead: 0.05 * 7
    }
  },
  {
    name: "gemini-3.6-flash",
    displayName: "Gemini 3.6 Flash",
    provider: "google",
    description: "Gemini 3.6 Flash model for fast frontier agentic, coding, and multimodal tasks.",
    hasVision: true,
    hasAudio: true,
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    supportsTool: true,
    supportsReasoningEffort: true,
    // TODO(pricing): gemini-3.6-flash 官方定价未确认，暂沿用 3.5-flash 费率，确认后更新。
    price: {
      input: 1.5 * 7,
      output: 9 * 7,
      cachingWrite: 0.15 * 7,
      cachingRead: 0.15 * 7
    },
    serviceTierPriceMultipliers: {
      batch: { inputOutput: 0.5, cache: 0.5 },
      flex: { inputOutput: 0.5, cache: 0.08 / 0.15 },
      priority: { inputOutput: 1.8, cache: 1.8 }
    }
  },
  createGoogleImageModel({
    name: "gemini-3-pro-image-preview",
    displayName: "Nano Banana Pro (Gemini 3 Pro Image Preview)",
    inputPrice: 2 * 7,
    outputPrice: 12 * 7,
    imageTokenPricePerMillion: 120 * 7,
    imageOutputTokenEstimateBySize: {
      "1K": 1120,
      "2K": 1120,
      "4K": 2e3
    },
    maxOutputTokens: 8192,
    contextWindow: 65536,
    imageGenerationWaitTimeSeconds: {
      min: 25,
      max: 60
    },
    imageGenerationProfiles: [
      {
        key: "speed",
        label: "\u901F\u5EA6\u4F18\u5148",
        imageModel: "gemini-3.1-flash-image-preview",
        waitTimeSeconds: {
          min: 10,
          max: 25
        }
      },
      {
        key: "quality",
        label: "\u8D28\u91CF\u4F18\u5148",
        imageModel: "gemini-3-pro-image-preview",
        waitTimeSeconds: {
          min: 25,
          max: 60
        }
      }
    ]
  }),
  createGoogleImageModel({
    name: "gemini-3.1-flash-image-preview",
    displayName: "Nano Banana 2 (Gemini 3.1 Flash Image Preview)",
    inputPrice: 0.5 * 7,
    outputPrice: 3 * 7,
    imageTokenPricePerMillion: 60 * 7,
    imageOutputTokenEstimateBySize: {
      "1K": 1120,
      "2K": 1680,
      "4K": 2520
    },
    maxOutputTokens: 65536,
    contextWindow: 65536,
    imageGenerationWaitTimeSeconds: {
      min: 10,
      max: 25
    },
    imageGenerationProfiles: [
      {
        key: "speed",
        label: "\u901F\u5EA6\u4F18\u5148",
        imageModel: "gemini-3.1-flash-image-preview",
        waitTimeSeconds: {
          min: 10,
          max: 25
        }
      },
      {
        key: "quality",
        label: "\u8D28\u91CF\u4F18\u5148",
        imageModel: "gemini-3-pro-image-preview",
        waitTimeSeconds: {
          min: 25,
          max: 60
        }
      }
    ]
  }),
  createGoogleImageModel({
    name: "gemini-3.1-flash-lite-image",
    displayName: "Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image)",
    inputPrice: 0.25 * 7,
    outputPrice: 1.5 * 7,
    pricePerImage: 0.034 * 7,
    maxOutputTokens: 65536,
    contextWindow: 65536,
    imageGenerationWaitTimeSeconds: {
      min: 4,
      max: 10
    },
    imageGenerationProfiles: [
      {
        key: "speed",
        label: "\u901F\u5EA6\u4F18\u5148",
        imageModel: "gemini-3.1-flash-lite-image",
        waitTimeSeconds: {
          min: 4,
          max: 10
        }
      },
      {
        key: "quality",
        label: "\u8D28\u91CF\u4F18\u5148",
        imageModel: "gemini-3-pro-image-preview",
        waitTimeSeconds: {
          min: 25,
          max: 60
        }
      }
    ]
  })
];

// packages/integrations/openai/models.ts
var GPT_5_5_STANDARD_PRICE = {
  input: 5 * 8,
  output: 30 * 8,
  inputCacheHit: 0.5 * 8
};
var GPT_5_5_LONG_CONTEXT_PRICE = {
  input: 10 * 8,
  output: 45 * 8,
  inputCacheHit: 1 * 8
};
var GPT_5_5_PRO_STANDARD_PRICE = {
  input: 30 * 8,
  output: 180 * 8,
  inputCacheHit: 0
};
var GPT_5_5_PRO_LONG_CONTEXT_PRICE = {
  input: 60 * 8,
  output: 270 * 8,
  inputCacheHit: 0
};
var GPT_5_6_SOL_STANDARD_PRICE = {
  input: 5 * 8,
  output: 30 * 8,
  inputCacheHit: 0.5 * 8
};
var GPT_5_6_SOL_LONG_CONTEXT_PRICE = {
  input: 10 * 8,
  output: 45 * 8,
  inputCacheHit: 1 * 8
};
var GPT_5_6_TERRA_STANDARD_PRICE = {
  input: 2 * 8,
  output: 12 * 8,
  inputCacheHit: 0.2 * 8
};
var GPT_5_6_TERRA_LONG_CONTEXT_PRICE = {
  input: 4 * 8,
  output: 18 * 8,
  inputCacheHit: 0.4 * 8
};
var GPT_5_6_LUNA_PRICE = {
  input: 0.2 * 8,
  output: 1.2 * 8,
  inputCacheHit: 0.02 * 8
};
var openAIModels = [
  {
    name: "gpt-5.5",
    displayName: "GPT-5.5 Standard",
    endpointKey: "responses",
    hasVision: true,
    contextWindow: 1047576,
    maxOutputTokens: 128e3,
    supportsReasoningEffort: true,
    price: GPT_5_5_STANDARD_PRICE,
    pricingStrategy: {
      type: "tiered_context",
      tiers: [
        {
          minContext: 272001,
          price: GPT_5_5_LONG_CONTEXT_PRICE
        }
      ]
    }
  },
  {
    name: "gpt-5.6-sol",
    displayName: "GPT-5.6 Sol (Flagship)",
    endpointKey: "responses",
    hasVision: true,
    contextWindow: 105e4,
    maxOutputTokens: 128e3,
    supportsReasoningEffort: true,
    price: GPT_5_6_SOL_STANDARD_PRICE,
    pricingStrategy: {
      type: "tiered_context",
      tiers: [
        {
          minContext: 272001,
          price: GPT_5_6_SOL_LONG_CONTEXT_PRICE
        }
      ]
    }
  },
  {
    name: "gpt-5.6-terra",
    displayName: "GPT-5.6 Terra (Balanced)",
    endpointKey: "responses",
    hasVision: true,
    contextWindow: 105e4,
    maxOutputTokens: 128e3,
    supportsReasoningEffort: true,
    price: GPT_5_6_TERRA_STANDARD_PRICE,
    pricingStrategy: {
      type: "tiered_context",
      tiers: [
        {
          minContext: 272001,
          price: GPT_5_6_TERRA_LONG_CONTEXT_PRICE
        }
      ]
    }
  },
  {
    name: "gpt-5.6-luna",
    displayName: "GPT-5.6 Luna (Fast)",
    endpointKey: "responses",
    hasVision: true,
    contextWindow: 105e4,
    maxOutputTokens: 128e3,
    supportsReasoningEffort: true,
    price: GPT_5_6_LUNA_PRICE
  },
  {
    name: "gpt-5.5-pro",
    displayName: "GPT-5.5 Pro",
    endpointKey: "responses",
    hasVision: true,
    contextWindow: 1047576,
    maxOutputTokens: 128e3,
    supportsReasoningEffort: true,
    price: GPT_5_5_PRO_STANDARD_PRICE,
    pricingStrategy: {
      type: "tiered_context",
      tiers: [
        {
          minContext: 272001,
          price: GPT_5_5_PRO_LONG_CONTEXT_PRICE
        }
      ]
    }
  },
  {
    name: "gpt-image-2",
    displayName: "GPT Image 2",
    endpointKey: "responses",
    hasVision: true,
    hasImageOutput: true,
    supportsImageOutput: true,
    supportsTool: false,
    contextWindow: 128e3,
    maxOutputTokens: 32768,
    price: { input: 5 * 8, output: 0, inputCacheHit: 1.25 * 8 },
    pricePerImage: void 0,
    // Dynamic cost via imageTokenPricePerMillion and quality/size
    imageTokenPricePerMillion: 30 * 8,
    // $30.00 per 1M output tokens
    // Official GPT Image 2 output estimates from the OpenAI image guide:
    // low/medium/high cost by size divided by $30 per 1M output tokens.
    imageOutputTokenEstimateBySize: {
      "1K": { low: 200, medium: 1766, high: 7033 },
      "2K": { low: 166, medium: 1366, high: 5500 },
      "4K": { low: 166, medium: 1366, high: 5500 }
    }
  }
];

// packages/ai/llm/openrouterModels.ts
var OPENROUTER_MODELS = [];
var openrouterModels = OPENROUTER_MODELS;

// packages/ai/llm/deepinfra.ts
var deepinfraModels = [
  {
    name: "anthropic/claude-haiku-4-5",
    displayName: "Anthropic: Claude Haiku 4.5",
    hasVision: true,
    price: {
      input: 1 * 9,
      output: 5 * 9
    },
    contextWindow: 195e3,
    maxOutputTokens: 4092,
    supportsTool: false
  },
  {
    name: "anthropic/claude-sonnet-5",
    displayName: "Anthropic: Claude Sonnet 5",
    hasVision: true,
    price: {
      input: 3 * 9,
      output: 15 * 9
    },
    contextWindow: 976e3,
    maxOutputTokens: 4092,
    supportsTool: false
  },
  {
    name: "anthropic/claude-opus-4-8",
    displayName: "Anthropic: Claude Opus 4.8",
    hasVision: true,
    price: {
      input: 5 * 9,
      output: 25 * 9
    },
    contextWindow: 976e3,
    maxOutputTokens: 4092,
    supportsTool: false
  }
];

// packages/integrations/xai/models.ts
var xaiModels = [
  {
    name: "grok-4.5",
    displayName: "Grok 4.5",
    hasVision: true,
    contextWindow: 5e5,
    price: { input: 2 * 7, output: 6 * 7 },
    // $2/$6 per MTok × 7
    fnCall: true,
    jsonOutput: true
  }
];

// packages/ai/llm/fireworks.ts
var fireworksModels = [
  {
    name: "accounts/fireworks/models/minimax-m3",
    displayName: "MiniMax: MiniMax M3",
    hasVision: true,
    price: {
      input: 0.3 * 8,
      output: 1.2 * 8,
      cachingRead: 0.06 * 8
    },
    contextWindow: 512e3,
    supportsTool: true
  }
];

// packages/ai/llm/cloudflare.ts
var getCloudflareWorkersAiChatCompletionsUrl = (accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()) => {
  if (!accountId) {
    throw new Error(
      "CLOUDFLARE_ACCOUNT_ID is required for Cloudflare Workers AI chat completions"
    );
  }
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
};
var cloudflareModels = [];

// packages/ai/llm/gmi.ts
var GMI_CHAT_COMPLETIONS_URL = "https://api.gmi-serving.com/v1/chat/completions";
var gmiModels = [];

// packages/ai/llm/zai.ts
var zaiModels = [];

// packages/ai/llm/platformHosted.ts
var PLATFORM_CREDITS_PER_USD = 7;
var EXTERNAL_API_DISCOUNT = 0.8;
var toPlatformCredits = (usdPerMillion) => Number(
  (usdPerMillion * EXTERNAL_API_DISCOUNT * PLATFORM_CREDITS_PER_USD).toFixed(
    6
  )
);
var PLATFORM_HOSTED_KIMI_PRICE = {
  input: toPlatformCredits(0.6),
  output: toPlatformCredits(2.4)
};
var PLATFORM_HOSTED_KIMI_K3_PRICE = {
  input: 16,
  // crof $2 × 8，特殊价不走通用 0.8×7 换算
  inputCacheHit: 2,
  // crof $0.25 × 8
  output: 64
  // crof $8 × 8
};
var PLATFORM_HOSTED_GLM_PRICE = {
  input: toPlatformCredits(1.4),
  inputCacheHit: toPlatformCredits(0.26),
  output: toPlatformCredits(4.4)
};
var PLATFORM_HOSTED_GLM_52_MODEL = "glm-5.2";
var PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL = "deepseek-v4-flash";
var PLATFORM_HOSTED_DEEPSEEK_FLASH_PRICE = {
  input: 1,
  inputCacheHit: 0.02,
  output: 2
};
var PLATFORM_HOSTED_CHAT_COMPLETIONS_URL = "https://ollama.com/v1/chat/completions";
var platformHostedModels = [
  {
    name: PLATFORM_HOSTED_KIMI_K3_MODEL,
    displayName: "Kimi K3",
    hasVision: true,
    price: { ...PLATFORM_HOSTED_KIMI_K3_PRICE },
    maxOutputTokens: 262144,
    contextWindow: 1e6,
    supportsTool: true,
    supportsReasoningEffort: true
  },
  {
    name: PLATFORM_HOSTED_KIMI_K26_MODEL,
    displayName: "Kimi K2.6",
    hasVision: true,
    price: { ...PLATFORM_HOSTED_KIMI_PRICE },
    maxOutputTokens: 262144,
    contextWindow: 262144,
    supportsTool: true
  },
  {
    name: PLATFORM_HOSTED_GLM_52_MODEL,
    displayName: "GLM 5.2",
    hasVision: false,
    price: { ...PLATFORM_HOSTED_GLM_PRICE },
    maxOutputTokens: 131072,
    contextWindow: 1e6,
    supportsTool: true,
    supportsReasoningEffort: true
  },
  {
    name: PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL,
    displayName: "DeepSeek V4 Flash",
    hasVision: false,
    price: { ...PLATFORM_HOSTED_DEEPSEEK_FLASH_PRICE },
    maxOutputTokens: 384e3,
    contextWindow: 1e6,
    supportsTool: true,
    supportsReasoningEffort: true
  }
];

export {
  PLATFORM_HOSTED_KIMI_K3_MODEL,
  PLATFORM_HOSTED_KIMI_K26_MODEL,
  PLATFORM_HOSTED_KIMI_PROVIDER,
  LEGACY_OLLAMA_CLOUD_PROVIDER,
  isNoloHostedProvider,
  isFireworksKimiModel,
  isDeepInfraKimiModel,
  resolveFireworksKimiModel,
  shouldHideKimiAliasFromPricing,
  deepSeekModels,
  googleModels,
  openAIModels,
  openrouterModels,
  deepinfraModels,
  xaiModels,
  fireworksModels,
  PLATFORM_HOSTED_GLM_PRICE,
  PLATFORM_HOSTED_GLM_52_MODEL,
  PLATFORM_HOSTED_CHAT_COMPLETIONS_URL,
  platformHostedModels,
  getCloudflareWorkersAiChatCompletionsUrl,
  cloudflareModels,
  GMI_CHAT_COMPLETIONS_URL,
  gmiModels,
  zaiModels
};
