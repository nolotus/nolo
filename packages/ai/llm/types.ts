// ai/llm/types.ts

import type { ModelAbility } from "./modelAbility";

export interface ModelPrice {
  input: number;
  output: number;
  cachingWrite?: number;
  cachingRead?: number;
  inputCacheHit?: number; // 为DeepSeek模型保留
}

// 新增：定价阶梯定义
export interface PricingTier {
  minContext: number; // 触发此价格的最小 Token 数 (例如 200001)
  price: ModelPrice; // 此阶梯对应的完整价格表
}

// 新增：定价策略定义
export interface PricingStrategy {
  type: "tiered_context"; // 目前支持基于上下文长度的阶梯定价
  tiers: PricingTier[];
}

export interface ServiceTierPriceMultiplier {
  inputOutput: number;
  cache?: number;
}

export interface ImageGenerationWaitTimeSeconds {
  min: number;
  max: number;
}

export interface ImageGenerationProfile {
  key: "speed" | "quality";
  label: string;
  imageModel: string;
  description?: string;
  waitTimeSeconds?: ImageGenerationWaitTimeSeconds;
}

export interface Model {
  name: string;
  displayName?: string; // 可选的 displayName 字段
  hasVision: boolean;
  contextWindow?: any; // 建议改为 number，但保持你原有的 any 兼容
  price: ModelPrice; // 基础/默认价格

  /**
   * 分时计价的峰时/谷时价（可选）。
   * 有这两个字段的模型在前端价格页显示峰谷双行；
   * 切换到不分时的上游时去掉这两个字段即可，前端自动回退到单一 price。
   */
  peakPrice?: ModelPrice;
  offPeakPrice?: ModelPrice;

  // 新增字段：支持高级定价策略
  pricingStrategy?: PricingStrategy;
  serviceTierPriceMultipliers?: Partial<
    Record<"batch" | "flex" | "priority", ServiceTierPriceMultiplier>
  >;

  /**
   * 最大输出令牌数（建议改为 number）。
   *
   * ⚠ 未经验证的参考值，**不要用它构造请求的 max_tokens**。这份数据没有任何请求路径消费，
   * 因此从未被真实调用校正过，已知至少两处失真：deepseek-v4-pro 标 384000（把
   * contextWindow 抄进了本字段，实测约 4K 即被截断）；deepinfra 的 Claude 系标 4092
   * （远低于这些模型的真实输出能力）。真值在 provider 手里，我们抄一份只会静默偏离。
   */
  maxOutputTokens?: any;
  jsonOutput?: boolean; // 是否支持 JSON 结构化输出
  fnCall?: boolean; // 是否支持函数调用
  provider?: string; // 供应商
  description?: string; // 描述
  hasAudio?: boolean; // 是否支持音频输入
  maxImageResolution?: string; // 最大图像分辨率
  canFineTune?: boolean; // 是否可以微调

  hasImageOutput?: boolean; // 是否支持图片输出
  supportsImageOutput?: boolean; // 兼容旧字段名
  supportsTool?: boolean; // 是否支持工具调用

  // ✅ 新增：图像生成相关能力
  supportsImageConfig?: boolean; // 是否支持 image_config（aspect_ratio / image_size）
  requiresImageModalities?: boolean; // 是否需要显式设置 modalities 才能出图
  defaultModalities?: Array<"text" | "image">; // 模型推荐的默认输出模态组合
  supportedAspectRatios?: string[];
  supportedImageSizes?: string[];
  pricePerImage?: number;
  imagePricingNote?: string;
  imageTokenPricePerMillion?: number;
  imageOutputTokenEstimateBySize?: Partial<
    Record<
      "1K" | "2K" | "4K",
      | number
      | Partial<Record<"low" | "medium" | "high" | "auto", number>>
    >
  >;
  imageGenerationWaitTimeSeconds?: ImageGenerationWaitTimeSeconds;
  imageGenerationProfiles?: ImageGenerationProfile[];

  supportsReasoningEffort?: boolean; // 是否支持推理功能
  endpointKey?: string;

  /**
   * 模型思考模式（provider 请求体格式分流的权威来源）。
   * - "adaptive": Anthropic 5 代 + 4.6/4.7/4.8 系，走 thinking:{type:"adaptive"} + output_config.effort
   * - "extended": 4.5 及更早（含 haiku-4-5），走 thinking:{type:"enabled", budget_tokens}
   * 未填时由消费方 fallback 判定（如模型 id 子串匹配）。
   */
  thinkingMode?: "adaptive" | "extended";

  /** Optional benchmark capability metadata. */
  ability?: ModelAbility;

  /**
   * 使用该模型所需的最低客户端版本（semver）——客户端版本闸门第 1 层。
   *
   * 只由平台托管模型（provider=nolo 家族）填充，真值住在
   * ai/llm/platformHostedRoutingTable 的 minClientVersion，这里是"下发给客户端
   * 的目录投影"。客户端拿到后可用于置灰/提示升级；server 与本地 runtime 另有
   * 使用时的硬拒绝（见 ai/llm/platformHostedClientVersionGate）。
   *
   * 用户自定义模型 / OAuth 订阅模型永远不填：那是用户自己的凭据与选择。
   */
  minClientVersion?: string;
}
