import type { Agent } from "app/types";
import { getModelConfig } from "ai/llm/providers";
import { isPlatformManagedProvider } from "ai/llm/kimi";
import { resolvePlatformEffectiveModel } from "ai/llm/platformHostedRoutingTable";
import { isPlatformHostedImageModel } from "ai/llm/platformHosted";
import { getPublicImageAgentDefaultProfile } from "ai/agent/utils/publicImageAgentMode";
import { asOptionalFiniteNumber } from "core/optionalNumber";
import { asOptionalPositiveFiniteNumber } from "core/optionalPositiveNumber";
import { getApproxPricePerImage } from "./imagePricing";

interface ModelPricing {
  inputPrice: number;
  inputCacheHitPrice: number;
  outputPrice: number;
}

interface Prices {
  agentInput: number;
  agentOutput: number;
  serverInput: number;
  serverOutput: number;
}

const MAX_OUTPUT_TOKENS = 8192; // 单次返回最大 token 数

export const getModelPricing = (
  provider: string,
  modelName: string,
  _requestedServiceTier?: string,
  /**
   * 可信平台计费身份（apiSource === "platform" 或代码内置 agent canonical key）。
   * 判据与 resolveBillingTarget 一致：只有它为 true **且** provider 命中平台托管时
   * 才做平台别名规范化；BYOK / custom / OAuth（未传 / false）按原 id 估价。
   */
  isPlatformBilled?: boolean
): ModelPricing | null => {
  // 平台别名（旧 id → 实际计费模型）：估价必须落在**实际计费目录**上，否则旧 id 的
  // 余额闸门会按 0 放行（2026-10-13 gpt-5.6-sol → gpt-6.1-sol 的实测缺口）。复用与
  // 落库计费同一个中央别名解析器；绝不恢复旧目录条目、也不用旧费率。
  const pricedModel =
    isPlatformBilled === true && isPlatformManagedProvider(provider, modelName)
      ? (resolvePlatformEffectiveModel(modelName) ?? modelName)
      : modelName;

  let model;
  try {
    model = getModelConfig(provider as any, pricedModel);
  } catch {
    return null;
  }

  if (!model?.price) return null;

  return getModelPricingForModel(provider, pricedModel, model);
};

export const getModelPricingForModel = (
  provider: string,
  modelName: string,
  model: { price?: { input: number; inputCacheHit?: number; output: number } | null }
): ModelPricing | null => {
  if (!model.price) return null;

  // 缓存命中价有两个字段名：Gemini/Anthropic/Fireworks 用 cachingRead，
  // DeepSeek 系用 inputCacheHit。只读后者会把前者的缓存价显示成 0——
  // 2026-09-24 实测因此误判过「Gemini 缓存漏账」（真实计费路径 calculatePrice
  // 是正确处理 cachingRead 的，错的是这个展示/探针口径）。
  const rawCacheHit =
    typeof (model.price as { inputCacheHit?: number }).inputCacheHit === "number"
      ? (model.price as { inputCacheHit?: number }).inputCacheHit
      : (model.price as { cachingRead?: number }).cachingRead;

  return {
    inputPrice: model.price.input,
    inputCacheHitPrice: typeof rawCacheHit === "number" ? rawCacheHit : 0,
    outputPrice: model.price.output,
  };
};

/**
 * 展示用的 token 价格分解（每 1M tokens 的积分）。
 *
 * 与 getModelPricing 的分工：那个函数是「余额预估/风控」口径，只需要 input/output；
 * 这里是**展示**口径，要额外给出缓存命中/写入价，并且必须区分两件事：
 *   - 模型不支持缓存 → 字段缺席（undefined）
 *   - 缓存免费 → 字段为 0
 * 历史上 getModelPricingForModel 把缺失塌成 0，UI 会把「不支持缓存」显示成「免费」。
 *
 * 取价顺序与计费侧一致（serverTokenWriter / calculatePrice）：平台自营只认目录价；
 * 创作者 agent（非平台且带正价）取 max(创作者价, 目录价)；目录解析不到才看 agent 价。
 * agent 记录上的 inputPrice/outputPrice；cache 价只可能来自目录（agent 记录没有
 * 这两个字段），所以回落分支下 cache 两个字段必然缺席。
 */
export interface AgentTokenPriceBreakdown {
  inputPrice: number;
  /** 命中缓存的输入价；模型不支持缓存时缺席（不是 0）。 */
  cacheReadPrice?: number;
  /** 写入缓存价；只有显式缓存模型（Anthropic/CF Claude 系）才有。 */
  cacheWritePrice?: number;
  outputPrice: number;
}

export const resolveAgentTokenPriceBreakdown = (
  agent: Pick<Agent, "provider" | "model" | "inputPrice" | "outputPrice">,
  isPlatformBilled?: boolean
): AgentTokenPriceBreakdown | null => {
  const provider = typeof agent?.provider === "string" ? agent.provider : "";
  const modelName = typeof agent?.model === "string" ? agent.model : "";

  let catalog:
    | {
        input: number;
        output: number;
        cacheRead?: number;
        cacheWrite?: number;
      }
    | null = null;

  if (provider && modelName) {
    const pricedModel =
      isPlatformBilled === true && isPlatformManagedProvider(provider, modelName)
        ? (resolvePlatformEffectiveModel(modelName) ?? modelName)
        : modelName;
    try {
      const model = getModelConfig(provider as any, pricedModel);
      const price = model?.price as
        | {
            input?: number;
            output?: number;
            cachingRead?: number;
            inputCacheHit?: number;
            cachingWrite?: number;
          }
        | null
        | undefined;
      if (
        price &&
        typeof price.input === "number" &&
        typeof price.output === "number"
      ) {
        // 缓存命中价有两个字段名（见 getModelPricingForModel 的同款说明）。
        const rawCacheHit =
          typeof price.inputCacheHit === "number"
            ? price.inputCacheHit
            : price.cachingRead;
        catalog = {
          input: price.input,
          output: price.output,
          ...(typeof rawCacheHit === "number" ? { cacheRead: rawCacheHit } : {}),
          ...(typeof price.cachingWrite === "number"
            ? { cacheWrite: price.cachingWrite }
            : {}),
        };
      }
    } catch {
      catalog = null;
    }
  }

  const agentInput = asOptionalFiniteNumber(agent?.inputPrice);
  const agentOutput = asOptionalFiniteNumber(agent?.outputPrice);
  const hasAgentInput = agentInput !== undefined && agentInput > 0;
  const hasAgentOutput = agentOutput !== undefined && agentOutput > 0;

  // 与计费口径严格一致（calculatePrice.getEffectivePrices + prepareTokenUsageData）：
  //   平台自营（apiSource=platform）→ 只认目录价，持久化价在计费侧被忽略（仅告警）；
  //   创作者 agent（非平台，且带正价）→ 计费用 max(创作者价, 目录价)。
  // 少这一层 max，会出现「页面显示底座目录价、实际按创作者加价扣费」的倒挂
  // （reviewer 在 2026-10-18 抓到；原实现是 catalog 无条件优先）。
  const pickDisplayPrice = (
    agentPrice: number | undefined,
    hasAgentPrice: boolean,
    catalogPrice: number | undefined
  ): number | undefined => {
    if (isPlatformBilled === true) {
      // 平台自营：计费只认目录价（持久化价在计费侧被无条件忽略，仅告警）。
      // 目录解析不到时**不回落到持久化价** —— 那等于展示一个计费永远不会采用的
      // 价格（reviewer 2026-10-18 指出的边界）。宁可不给出价，也不伪装成平台报价。
      return catalogPrice;
    }
    if (catalogPrice === undefined) return hasAgentPrice ? agentPrice : undefined;
    if (!hasAgentPrice) return catalogPrice;
    return Math.max(agentPrice as number, catalogPrice);
  };

  const inputPrice = pickDisplayPrice(agentInput, hasAgentInput, catalog?.input);
  const outputPrice = pickDisplayPrice(agentOutput, hasAgentOutput, catalog?.output);

  if (inputPrice === undefined && outputPrice === undefined) return null;

  return {
    inputPrice: inputPrice ?? 0,
    outputPrice: outputPrice ?? 0,
    ...(catalog?.cacheRead !== undefined
      ? { cacheReadPrice: catalog.cacheRead }
      : {}),
    ...(catalog?.cacheWrite !== undefined
      ? { cacheWritePrice: catalog.cacheWrite }
      : {}),
  };
};

export const hasExplicitAgentPricing = (config: any): boolean =>
  [config?.inputPrice, config?.outputPrice].some(
    (value) => asOptionalPositiveFiniteNumber(value) !== undefined
  );

export const getPrices = (config: any, serverPrices: any): Prices => ({
  agentInput: Number(config?.inputPrice ?? 0),
  agentOutput: Number(config?.outputPrice ?? 0),
  serverInput: Number(serverPrices?.inputPrice ?? 0),
  serverOutput: Number(serverPrices?.outputPrice ?? 0),
});

/**
 * 计算最终价格：
 * - 从所有价格中取「每百万 tokens 价格」的最大值
 * - 再换算成单 token 价格
 * - 再乘以最大输出 token 数
 */
export const getFinalPrice = (prices: Prices): number => {
  // 1. 取出所有价格字段
  const rawValues = Object.values(prices);

  // 2. 过滤出合法数字（去掉 NaN、Infinity、null/undefined 等）
  const validValues = rawValues.flatMap((value) => {
    const finite = asOptionalFiniteNumber(value);
    return finite === undefined ? [] : [finite];
  });

  // 3. 没有合法值时返回 0，避免 Math.max(...[]) 抛错
  if (validValues.length === 0) {
    return 0;
  }

  // 4. 找到每百万 token 的最高单价
  const maxPricePerMillion = Math.max(...validValues);

  // 5. 换算成单 token 价格
  const maxPricePerToken = maxPricePerMillion / 1_000_000;

  // 6. 计算 8192 个 token 的费用
  return maxPricePerToken * MAX_OUTPUT_TOKENS;
};

/**
 * 每次对话估算的典型 token 用量（输入含历史上下文，输出为单次回复）
 * 仅用于 UI 展示的估算，并非计费依据。
 */
const TYPICAL_INPUT_TOKENS = 500;
const TYPICAL_OUTPUT_TOKENS = 300;

export type AgentPriceHint =
  | {
      type: "per_image";
      amount: number;
      labelKey?: "defaultImageProfileEstimate";
      profileLabel?: string;
    }
  | { type: "per_turn"; amount: number };

export interface CompactTurnPriceDisplay {
  amountText: string;
  unitCount: number;
}

const trimTrailingZeros = (value: string): string => {
  if (!value.includes(".")) return value;
  return value.replace(/\.?0+$/, "");
};

/**
 * 根据 agent 配置返回用户可读的价格提示：
 * - 图像 agent（imageConfig.enabled）：从 model config 查 pricePerImage，以每张为单位
 * - 文字 agent：用典型 token 用量估算每次对话费用
 * - 无价格信息则返回 null
 */
export const getAgentPriceHint = (
  agent: Pick<
    Agent,
    | "inputPrice"
    | "outputPrice"
    | "model"
    | "imageModel"
    | "provider"
    | "imageConfig"
    | "imageWorkflow"
  >
): AgentPriceHint | null => {
  const imagePriceModel = agent.imageModel ?? agent.model;

  if (agent.imageConfig?.enabled && agent.provider && imagePriceModel) {
    try {
      // 出图模型已收进 nolo 平台托管目录；历史 agent 记录可能仍存
      // provider=openai/google，按模型名解析到 nolo 目录。
      const imageModelProvider = isPlatformHostedImageModel(imagePriceModel)
        ? "nolo"
        : agent.provider;
      const model = getModelConfig(imageModelProvider as any, imagePriceModel);
      const mode = agent.imageWorkflow;
      
      if (mode === "generate") {
        // For generator agents, always use the default profile price
        const defaultProfile = getPublicImageAgentDefaultProfile("generate");
        const pricePerImage = getApproxPricePerImage(model, "1K");
        if (typeof pricePerImage === "number") {
          return {
            type: "per_image",
            amount: pricePerImage,
            labelKey: "defaultImageProfileEstimate",
            profileLabel: `${defaultProfile.quality} · ${defaultProfile.size}`,
          };
        }
      } else {
        const pricePerImage = getApproxPricePerImage(
          model,
          agent.imageConfig?.imageSize
        );
        if (typeof pricePerImage === "number") {
          return { type: "per_image", amount: pricePerImage };
        }
      }
    } catch {
      // Fall through to token-based pricing or null.
    }
  }

  const inputPrice = agent.inputPrice ?? 0;
  const outputPrice = agent.outputPrice ?? 0;
  if (inputPrice === 0 && outputPrice === 0) return null;

  const amount =
    (inputPrice * TYPICAL_INPUT_TOKENS + outputPrice * TYPICAL_OUTPUT_TOKENS) /
    1_000_000;
  return { type: "per_turn", amount };
};

/** 将金额格式化为用户可读字符串（2 位有效数字，不使用科学计数法）*/
export const formatPriceAmount = (amount: number): string => {
  if (amount >= 0.1) return amount.toFixed(2);
  if (amount >= 0.01) return amount.toFixed(3);
  if (amount >= 0.001) return amount.toFixed(4);
  if (amount >= 0.0001) return amount.toFixed(5);
  return amount.toFixed(6);
};

export const formatModelCostPerMillion = (
  value?: number,
  creditsUnit = "积分"
): string => {
  const finite = asOptionalFiniteNumber(value);
  if (finite === undefined) return "未知";
  if (finite === 0) return "免费";
  const decimals = Math.abs(finite) < 1 ? 3 : 2;
  const amount = finite
    .toFixed(decimals)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?[1-9])0+$/, "$1");
  return `${amount} ${creditsUnit}`;
};

export const formatCompactTurnPrice = (
  amount: number
): CompactTurnPriceDisplay => {
  if (amount <= 0) {
    return { amountText: "0", unitCount: 1 };
  }

  if (amount >= 0.01) {
    return {
      amountText: trimTrailingZeros(formatPriceAmount(amount)),
      unitCount: 1,
    };
  }

  const perHundred = amount * 100;
  if (perHundred >= 0.01) {
    return {
      amountText: trimTrailingZeros(formatPriceAmount(perHundred)),
      unitCount: 100,
    };
  }

  return {
    amountText: trimTrailingZeros(formatPriceAmount(amount * 1000)),
    unitCount: 1000,
  };
};
