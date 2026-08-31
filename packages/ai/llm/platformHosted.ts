// packages/ai/llm/platformHosted.ts
// Platform catalog for hosted models (upstream provider is abstracted).
// Public provider id is `nolo` (see providers.ts MODEL_MAP).

export * from "./platformHostedRoutingTable";
export * from "./platformHostedClientVersionGate";
export { isPlatformManagedProvider } from "./kimi";

import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import type { Model } from "./types";
import type { ImageSizeKey } from "./imagePricing";
import {
  PLATFORM_HOSTED_KIMI_K26_MODEL,
  PLATFORM_HOSTED_KIMI_K3_MODEL,
} from "./kimi";
import {
  DEEPINFRA_CLAUDE_OPUS_PRICE,
  DEEPINFRA_CLAUDE_SONNET_PRICE,
  DEEPINFRA_CLAUDE_FABLE_PRICE,
} from "./deepinfra";
import {
  PLATFORM_HOSTED_CLAUDE_SONNET_5_MODEL,
  PLATFORM_HOSTED_CLAUDE_OPUS_5_MODEL,
  PLATFORM_HOSTED_CLAUDE_FABLE_5_MODEL,
  PLATFORM_HOSTED_GROK_4_6_MODEL,
  PLATFORM_HOSTED_GLM_53_MODEL,
  PLATFORM_HOSTED_GLM_52_MODEL,
  PLATFORM_HOSTED_GLM_53_FLASH_MODEL,
  PLATFORM_HOSTED_GEMINI_37_FLASH_MODEL,
  PLATFORM_HOSTED_GEMINI_FLASH_IMAGE_MODEL,
  PLATFORM_HOSTED_GEMINI_PRO_IMAGE_MODEL,
  PLATFORM_HOSTED_GEMINI_FLASH_LITE_IMAGE_MODEL,
  PLATFORM_HOSTED_OPENAI_IMAGE_MODEL,
  PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL,
  PLATFORM_HOSTED_DEEPSEEK_FLASH_VISION_EXP_MODEL,
  PLATFORM_HOSTED_DEEPSEEK_PRO_MODEL,
  PLATFORM_HOSTED_KIMI_K3_MIN_CLIENT_VERSION,
  PLATFORM_HOSTED_GLM_53_FLASH_MIN_CLIENT_VERSION,
} from "./platformHostedRoutingTable";

export const PLATFORM_HOSTED_CLAUDE_MODELS = [
  PLATFORM_HOSTED_CLAUDE_SONNET_5_MODEL,
  PLATFORM_HOSTED_CLAUDE_OPUS_5_MODEL,
  PLATFORM_HOSTED_CLAUDE_FABLE_5_MODEL,
] as const;

export const isPlatformHostedClaudeModel = (
  model?: string | null,
): boolean =>
  PLATFORM_HOSTED_CLAUDE_MODELS.some(
    (m) => asTrimmedLowercaseString(model) === m,
  );

/**
 * nolo 平台内部价格单位：积分 / 1M tokens。
 */
export const PLATFORM_CREDITS_PER_USD = 8;
export const toPlatformCredits = (usdPerMillion: number): number =>
  Number((usdPerMillion * PLATFORM_CREDITS_PER_USD).toFixed(6));

/**
 * 人民币计价上游（DeepSeek / Qwen 等国内服务）的加价系数。
 *
 * 人民币上游若按官方价原样计入积分（¥1 → 1 积分），毛利恰好为 0——连退款与
 * 坏账都覆盖不了。这里统一乘 1.2 把毛利拉到 ~16.7%，与美元档对齐。
 *
 * 注意：人民币上游不受美元汇率影响（收 ¥ 付 ¥），这个系数不需要随汇率调整。
 */
export const CNY_UPSTREAM_MULTIPLIER = 1.2;
export const toCnyCredits = (cnyPerMillion: number): number =>
  Number((cnyPerMillion * CNY_UPSTREAM_MULTIPLIER).toFixed(6));

/**
 * Grok 4.6（平台托管语义）：记录侧 provider=nolo（统一管理），实际上游为
 */
export const isPlatformHostedGrokModel = (model?: string | null): boolean =>
  asTrimmedLowercaseString(model) === PLATFORM_HOSTED_GROK_4_6_MODEL;

export const PLATFORM_HOSTED_GROK_PRICE = {
  input: toPlatformCredits(2), // 16 credits
  output: toPlatformCredits(6), // 48 credits
} as const;

/**
 * = 3.2 / 0.32 / 24.0 credits（in / cache-read / out）。
 *
 * 缓存读取单价来自上游回报的实际账单反推（cost_details.upstream_inference_*）：
 */
export const isPlatformHostedKimiK26Model = (
  model?: string | null,
): boolean => asTrimmedLowercaseString(model) === PLATFORM_HOSTED_KIMI_K26_MODEL;

export const PLATFORM_HOSTED_KIMI_PRICE = {
  input: toPlatformCredits(0.4), // 3.2 credits
  // 缺了这一项时 calculatePrice 的 nolo 分支会退回 calculateSimpleCost，
  // 把 cache_read_input_tokens 按 input 全价收 —— agentic 循环每轮重放整个
  // 上下文，实测 92% 的 input 是缓存读取，等于按原价重复收 10 倍以上。
  inputCacheHit: toPlatformCredits(0.04), // 0.32 credits
  output: toPlatformCredits(3.0), // 24.0 credits (24 = 24)
} as const;

/**
 */
export const PLATFORM_HOSTED_KIMI_K3_PRICE = {
  input: 16,
  inputCacheHit: 2,
  output: 64,
} as const;

/**
 * GLM 5.3（平台托管语义）：记录侧展示与主键为 `glm-5.3`（兼容历史 `glm-5.2`），
 * 保持 11.2 / 35.2 credits 不随上游变动（上游成本低于平台定价），
 */
export const isPlatformHostedGlmModel = (
  model?: string | null,
): boolean => {
  const m = asTrimmedLowercaseString(model);
  return m === PLATFORM_HOSTED_GLM_53_MODEL || m === PLATFORM_HOSTED_GLM_52_MODEL;
};
export const isPlatformHostedGlm52Model = isPlatformHostedGlmModel;
export const isPlatformHostedGlm53Model = isPlatformHostedGlmModel;

export const PLATFORM_HOSTED_GLM_PRICE = {
  input: 7.84, // 11.2 credits
  inputCacheHit: toPlatformCredits(0.06), // 0.48 credits
  output: 24.64, // 35.2 credits (35.2 = 35.2)
} as const;

/**
 * GLM 5.3 Flash（平台托管语义）：RunInfra 独家上游，作为廉价快档（provider=nolo，
 * key 用 RUNINFRA_API_KEY）。模型 id 与 RunInfra 一致（glm-5-3-flash，无需映射）。
 * 注意：上游强制 reasoning，`supportsReasoningEffort=false`（实测不可关闭）。
 */
/**
 */
export const PLATFORM_HOSTED_GLM_53_FLASH_PRICE = {
  input: toPlatformCredits(0.1), // 0.8 credits
  inputCacheHit: toPlatformCredits(0.01), // 0.08 credits
  output: toPlatformCredits(0.4), // 3.2 credits
} as const;

export const isPlatformHostedGlm53FlashModel = (
  model?: string | null,
): boolean => {
  const m = asTrimmedLowercaseString(model);
  return m === PLATFORM_HOSTED_GLM_53_FLASH_MODEL || m === "glm-5.3-flash";
};

/**
 * Gemini 3.7 Flash（平台托管语义）：直连 Google 官方原生 API（gemini-3.7-flash，
 * key 用 GEMINI_API_KEY / GOOGLE_API_KEY）。
 */
export const PLATFORM_HOSTED_GEMINI_37_FLASH_PRICE = {
  input: 4.2, // 6.0 credits
  output: 21, // 30.0 credits
  cachingWrite: 0.42, // 0.6 credits
  cachingRead: 0.42, // 0.6 credits
} as const;

export const isPlatformHostedGeminiModel = (
  model?: string | null,
): boolean => asTrimmedLowercaseString(model) === PLATFORM_HOSTED_GEMINI_37_FLASH_MODEL;

/**
 * 出图模型（平台托管语义）：记录侧 provider=nolo，实际上游分别是
 * OpenAI（gpt-image-2，key 用 OPENAI_API_KEY）与 Google 官方原生 API
 * （gemini-3.x image，key 用 GEMINI_API_KEY / GOOGLE_API_KEY）。
 * 模型 id 与上游一致，出图 tool / handler 按模型名分发，不能改名。
 * 价格沿用原 openai / google 目录中的定义。
 */
export const isPlatformHostedOpenAIImageModel = (
  model?: string | null,
): boolean =>
  asTrimmedLowercaseString(model) === PLATFORM_HOSTED_OPENAI_IMAGE_MODEL;

export const PLATFORM_HOSTED_GEMINI_IMAGE_MODELS = [
  PLATFORM_HOSTED_GEMINI_FLASH_LITE_IMAGE_MODEL,
  PLATFORM_HOSTED_GEMINI_FLASH_IMAGE_MODEL,
  PLATFORM_HOSTED_GEMINI_PRO_IMAGE_MODEL,
] as const;

export const isPlatformHostedGeminiImageModel = (
  model?: string | null,
): boolean =>
  PLATFORM_HOSTED_GEMINI_IMAGE_MODELS.some(
    (m) => asTrimmedLowercaseString(model) === m,
  );

export const isPlatformHostedImageModel = (model?: string | null): boolean =>
  isPlatformHostedOpenAIImageModel(model) ||
  isPlatformHostedGeminiImageModel(model);

const PLATFORM_HOSTED_IMAGE_ASPECT_RATIOS: NonNullable<
  Model["supportedAspectRatios"]
> = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];

const PLATFORM_HOSTED_IMAGE_SIZES: ImageSizeKey[] = ["1K", "2K", "4K"];

const createPlatformHostedGeminiImageModel = ({
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
  imageOutputTokenEstimateBySize?: NonNullable<
    Model["imageOutputTokenEstimateBySize"]
  >;
  pricePerImage?: number;
  maxOutputTokens: number;
  contextWindow: number;
  imageGenerationWaitTimeSeconds?: Model["imageGenerationWaitTimeSeconds"];
  imageGenerationProfiles?: Model["imageGenerationProfiles"];
}) => ({
  name,
  displayName,
  hasVision: true,
  hasImageOutput: true,
  supportsImageOutput: true,
  supportsImageConfig: true,
  requiresImageModalities: true,
  defaultModalities: ["image", "text"] as NonNullable<
    Model["defaultModalities"]
  >,
  supportedAspectRatios: PLATFORM_HOSTED_IMAGE_ASPECT_RATIOS,
  supportedImageSizes: PLATFORM_HOSTED_IMAGE_SIZES,
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

/**
 * DeepSeek V4 peak/off-peak pricing.
 * 官方价为人民币（¥/1M tokens），经 toCnyCredits 加价后计入积分。
 * 括号内为官方原价。
 */
export const PLATFORM_HOSTED_DEEPSEEK_FLASH_PEAK_PRICE = {
  input: toCnyCredits(3), // ¥3
  inputCacheHit: toCnyCredits(0.1), // ¥0.1
  output: toCnyCredits(9), // ¥9
} as const;

export const PLATFORM_HOSTED_DEEPSEEK_FLASH_OFF_PEAK_PRICE = {
  input: toCnyCredits(1.5), // ¥1.5
  inputCacheHit: toCnyCredits(0.05), // ¥0.05
  output: toCnyCredits(4.5), // ¥4.5
} as const;

/**
 */
export const PLATFORM_HOSTED_DEEPSEEK_PRO_PRICE = {
  input: 3.36, // 4.8 credits
  inputCacheHit: 0.168, // 0.24 credits
  output: toPlatformCredits(1.9), // 15.2 credits
} as const;

export const isDeepSeekOffPeakBeijingTime = (nowMs = Date.now()): boolean => {
  // 旧实现只按北京钟点判断（00:00-08:00 为低谷），缺少星期维度，导致周末白天
  // 误按高峰计费。这里改用 +8h 后的 UTC 读取"北京日期/星期/小时"，确保星期与
  // 小时都取自北京时间。北京无夏令时（全年 UTC+8），该移位是精确的。
  const beijing = new Date(nowMs + 8 * 60 * 60 * 1000);
  const beijingDay = beijing.getUTCDay(); // 0=周日, 6=周六
  const beijingHour = beijing.getUTCHours();

  // 官方 2026-08-23（周日）00:00 起：周末（周六/周日）全天不再区分峰谷，
  // 统一按低谷价收费，故周末任何时刻都算低谷。
  if (beijingDay === 0 || beijingDay === 6) return true;

  // 工作日高峰时段为北京时间 9:00-12:00、14:00-18:00，其余为空闲时段；
  // 空闲时段价格 = 高峰价格的一半。
  const isPeakWindow =
    (beijingHour >= 9 && beijingHour < 12) ||
    (beijingHour >= 14 && beijingHour < 18);
  return !isPeakWindow;
};

export const getPlatformHostedDeepSeekV4Price = (
  _model: string,
  nowMs = Date.now(),
) => {
  const isOffPeak = isDeepSeekOffPeakBeijingTime(nowMs);
  return isOffPeak
    ? PLATFORM_HOSTED_DEEPSEEK_FLASH_OFF_PEAK_PRICE
    : PLATFORM_HOSTED_DEEPSEEK_FLASH_PEAK_PRICE;
};

export const isPlatformHostedDeepSeekV4Model = (model: string): boolean =>
  model === PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL ||
  model === PLATFORM_HOSTED_DEEPSEEK_FLASH_VISION_EXP_MODEL;

export const PLATFORM_HOSTED_DEEPSEEK_CHAT_COMPLETIONS_URL =
  "https://api.deepseek.com/chat/completions";
export const PLATFORM_HOSTED_DEEPSEEK_RESPONSES_URL =
  "https://api.deepseek.com/responses";

export type PlatformDeepseekFlashRoutePlan =
  | { kind: "configured" }
  | { kind: "missing_key" }
  | {
      kind: "hosted";
      primaryProvider: "nolo";
      credentialProvider: "deepseek";
      wire: "responses";
    };

export const isPlatformHostedDeepseekModel = (
  model?: string | null,
): boolean =>
  model === PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL ||
  model === PLATFORM_HOSTED_DEEPSEEK_FLASH_VISION_EXP_MODEL;

export const isPlatformHostedDeepseekFlashModel = isPlatformHostedDeepseekModel;

export const isPlatformDeepseekHosted = (
  provider?: string | null,
  model?: string | null,
): boolean => {
  if (!isPlatformHostedDeepseekModel(model)) return false;
  const p = asTrimmedLowercaseString(provider);
  return (
    p === "nolo" ||
    p === "ollama-cloud" ||
    p === "deepseek"
  );
};

const isPlatformDefaultDeepseekResponsesEndpoint = (
  endpoint?: string | null,
): boolean => {
  if (!endpoint || !endpoint.trim()) return false;
  const normalized = endpoint.split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();
  return (
    normalized ===
    PLATFORM_HOSTED_DEEPSEEK_RESPONSES_URL.split(/[?#]/)[0]
      .replace(/\/+$/, "")
      .toLowerCase()
  );
};

export const resolvePlatformDeepseekRoute = (args: {
  provider?: string | null;
  model?: string | null;
  endpoint?: string | null;
  isCustomApi: boolean;
  hasExplicitCredential: boolean;
  hasDeepseekKey: boolean;
}): PlatformDeepseekFlashRoutePlan => {
  const usesResponsesApi =
    typeof args.endpoint === "string" &&
    /\/responses(?:[/?#]|$)/i.test(args.endpoint) &&
    !isPlatformDefaultDeepseekResponsesEndpoint(args.endpoint);
  const eligible =
    isPlatformDeepseekHosted(args.provider, args.model) &&
    !usesResponsesApi &&
    !args.isCustomApi &&
    !args.hasExplicitCredential;

  if (!eligible) return { kind: "configured" };
  if (args.hasDeepseekKey) {
    return {
      kind: "hosted",
      primaryProvider: "nolo",
      credentialProvider: "deepseek",
      wire: "responses",
    };
  }
  return { kind: "missing_key" };
};

export const resolvePlatformDeepseekFlashRoute = resolvePlatformDeepseekRoute;

export const platformHostedModels = [
  {
    name: PLATFORM_HOSTED_KIMI_K3_MODEL,
    displayName: "Kimi K3",
    hasVision: true,
    price: { ...PLATFORM_HOSTED_KIMI_K3_PRICE },
    maxOutputTokens: 262144,
    contextWindow: 1_000_000,
    supportsTool: true,
    supportsReasoningEffort: true,
    // 客户端版本闸门第 1 层（目录标注）：随模型列表下发，新客户端据此置灰 +
    // 提示升级。真值在 platformHostedRoutingTable（见
    // platformHosted.clientVersionGate.test.ts 的目录↔路由表对齐断言）。
    minClientVersion: PLATFORM_HOSTED_KIMI_K3_MIN_CLIENT_VERSION,
  },
  {
    name: PLATFORM_HOSTED_KIMI_K26_MODEL,
    displayName: "Kimi K2.6",
    hasVision: true,
    price: { ...PLATFORM_HOSTED_KIMI_PRICE },
    maxOutputTokens: 262144,
    contextWindow: 262144,
    supportsTool: true,
  },
  {
    name: PLATFORM_HOSTED_GLM_53_MODEL,
    displayName: "GLM 5.3",
    hasVision: true,
    price: { ...PLATFORM_HOSTED_GLM_PRICE },
    maxOutputTokens: 131072,
    contextWindow: 1_050_000,
    supportsTool: true,
    supportsReasoningEffort: true,
  },
  {
    name: PLATFORM_HOSTED_GEMINI_37_FLASH_MODEL,
    displayName: "Gemini 3.7 Flash",
    hasVision: true,
    price: { ...PLATFORM_HOSTED_GEMINI_37_FLASH_PRICE },
    maxOutputTokens: 65536,
    contextWindow: 1_048_576,
    supportsTool: true,
    supportsReasoningEffort: true,
  },
  {
    name: PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL,
    displayName: "DeepSeek V4 Flash",
    hasVision: false,
    price: { ...PLATFORM_HOSTED_DEEPSEEK_FLASH_PEAK_PRICE },
    peakPrice: { ...PLATFORM_HOSTED_DEEPSEEK_FLASH_PEAK_PRICE },
    offPeakPrice: { ...PLATFORM_HOSTED_DEEPSEEK_FLASH_OFF_PEAK_PRICE },
    maxOutputTokens: 384_000,
    contextWindow: 1_000_000,
    supportsTool: true,
    supportsReasoningEffort: true,
  },
  {
    name: PLATFORM_HOSTED_DEEPSEEK_FLASH_VISION_EXP_MODEL,
    displayName: "DeepSeek V4 Flash Vision Exp",
    hasVision: true,
    price: { ...PLATFORM_HOSTED_DEEPSEEK_FLASH_PEAK_PRICE },
    peakPrice: { ...PLATFORM_HOSTED_DEEPSEEK_FLASH_PEAK_PRICE },
    offPeakPrice: { ...PLATFORM_HOSTED_DEEPSEEK_FLASH_OFF_PEAK_PRICE },
    maxOutputTokens: 384_000,
    contextWindow: 1_000_000,
    supportsTool: true,
    supportsReasoningEffort: true,
  },
  {
    name: PLATFORM_HOSTED_DEEPSEEK_PRO_MODEL,
    displayName: "DeepSeek V4 Pro",
    hasVision: false,
    price: { ...PLATFORM_HOSTED_DEEPSEEK_PRO_PRICE },
    maxOutputTokens: 384_000,
    contextWindow: 1_000_000,
    supportsTool: true,
    supportsReasoningEffort: true,
  },
  {
    name: PLATFORM_HOSTED_GLM_53_FLASH_MODEL,
    displayName: "GLM 5.3 Flash",
    hasVision: true,
    price: { ...PLATFORM_HOSTED_GLM_53_FLASH_PRICE },
    maxOutputTokens: 98304,
    contextWindow: 1_048_576,
    supportsTool: true,
    supportsReasoningEffort: false,
    minClientVersion: PLATFORM_HOSTED_GLM_53_FLASH_MIN_CLIENT_VERSION,
  },
  {
    name: PLATFORM_HOSTED_CLAUDE_SONNET_5_MODEL,
    displayName: "Claude Sonnet 5",
    hasVision: true,
    price: { ...DEEPINFRA_CLAUDE_SONNET_PRICE },
    maxOutputTokens: 4092,
    contextWindow: 976000,
    supportsTool: false,
  },
  {
    name: PLATFORM_HOSTED_CLAUDE_OPUS_5_MODEL,
    displayName: "Claude Opus 5",
    hasVision: true,
    price: { ...DEEPINFRA_CLAUDE_OPUS_PRICE },
    maxOutputTokens: 4092,
    contextWindow: 976000,
    supportsTool: false,
  },
  {
    name: PLATFORM_HOSTED_CLAUDE_FABLE_5_MODEL,
    displayName: "Claude Fable 5",
    hasVision: true,
    price: { ...DEEPINFRA_CLAUDE_FABLE_PRICE },
    maxOutputTokens: 4092,
    contextWindow: 976000,
    supportsTool: false,
  },
  {
    name: PLATFORM_HOSTED_GROK_4_6_MODEL,
    displayName: "Grok 4.6",
    hasVision: true,
    price: { ...PLATFORM_HOSTED_GROK_PRICE },
    maxOutputTokens: 100_000,
    contextWindow: 500000,
    supportsTool: true,
  },
  {
    name: PLATFORM_HOSTED_OPENAI_IMAGE_MODEL,
    displayName: "GPT Image 2",
    endpointKey: "responses",
    hasVision: true,
    hasImageOutput: true,
    supportsImageOutput: true,
    supportsTool: false,
    contextWindow: 128_000,
    maxOutputTokens: 32_768,
    price: { input: 40, output: 0, inputCacheHit: 10 },
    pricePerImage: undefined, // Dynamic cost via imageTokenPricePerMillion and quality/size
    imageTokenPricePerMillion: 240,
    // Official GPT Image 2 output estimates from the OpenAI image guide:
    imageOutputTokenEstimateBySize: {
      "1K": { low: 200, medium: 1766, high: 7033 },
      "2K": { low: 166, medium: 1366, high: 5500 },
      "4K": { low: 166, medium: 1366, high: 5500 },
    },
  },
  createPlatformHostedGeminiImageModel({
    name: PLATFORM_HOSTED_GEMINI_PRO_IMAGE_MODEL,
    displayName: "Nano Banana Pro (Gemini 3 Pro Image Preview)",
    inputPrice: 16,
    outputPrice: 96,
    imageTokenPricePerMillion: 960,
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
  createPlatformHostedGeminiImageModel({
    name: PLATFORM_HOSTED_GEMINI_FLASH_IMAGE_MODEL,
    displayName: "Nano Banana 2 (Gemini 3.1 Flash Image Preview)",
    inputPrice: 4,
    outputPrice: 24,
    imageTokenPricePerMillion: 480,
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
  createPlatformHostedGeminiImageModel({
    name: PLATFORM_HOSTED_GEMINI_FLASH_LITE_IMAGE_MODEL,
    displayName: "Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image)",
    inputPrice: 2,
    outputPrice: 12,
    pricePerImage: 0.272,
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

