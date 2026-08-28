import type { Agent } from "app/types";
import { findModelConfig } from "./providers";
import { isPlatformHostedImageModel } from "./platformHosted";
import type { Model } from "./types";

export type ImageSizeKey = "1K" | "2K" | "4K";
export type ImageQualityKey = "low" | "medium" | "high" | "auto";

type ImagePricingModel = Pick<
  Model,
  "pricePerImage" | "imageTokenPricePerMillion" | "imageOutputTokenEstimateBySize"
>;

const DEFAULT_IMAGE_SIZE: ImageSizeKey = "1K";
const DEFAULT_IMAGE_QUALITY: ImageQualityKey = "medium";

type ImageTokenEstimate =
  NonNullable<ImagePricingModel["imageOutputTokenEstimateBySize"]>[ImageSizeKey];

const hasEstimateForSize = (
  tokenEstimates: NonNullable<ImagePricingModel["imageOutputTokenEstimateBySize"]>,
  size: ImageSizeKey
): boolean => typeof tokenEstimates[size] !== "undefined";

const resolveTokenEstimate = (
  estimate: ImageTokenEstimate,
  requestedQuality?: ImageQualityKey
): number | undefined => {
  if (typeof estimate === "number") return estimate;
  if (!estimate) return undefined;

  const quality =
    requestedQuality && typeof estimate[requestedQuality] === "number"
      ? requestedQuality
      : DEFAULT_IMAGE_QUALITY;
  return estimate[quality];
};

export const getApproxPricePerImage = (
  model: ImagePricingModel | null | undefined,
  requestedSize?: ImageSizeKey,
  requestedQuality?: ImageQualityKey
): number | undefined => {
  if (!model) return undefined;

  if (typeof model.pricePerImage === "number") {
    return model.pricePerImage;
  }

  if (typeof model.imageTokenPricePerMillion !== "number") {
    return undefined;
  }

  const tokenEstimates = model.imageOutputTokenEstimateBySize;
  if (!tokenEstimates) return undefined;

  const resolvedSize =
    requestedSize && hasEstimateForSize(tokenEstimates, requestedSize)
      ? requestedSize
      : DEFAULT_IMAGE_SIZE;
  const outputTokens = resolveTokenEstimate(
    tokenEstimates[resolvedSize],
    requestedQuality
  );

  if (typeof outputTokens !== "number") {
    return undefined;
  }

  return (model.imageTokenPricePerMillion * outputTokens) / 1_000_000;
};

const OPENAI_IMAGE_FALLBACK_MODEL = "gpt-image-2";

export const getApproxAgentPricePerImage = (
  agent: Pick<Agent, "provider" | "model" | "imageConfig">
): number | undefined => {
  if (!agent.imageConfig?.enabled || !agent.provider || !agent.model) {
    return undefined;
  }

  const requestedSize = agent.imageConfig.imageSize as ImageSizeKey | undefined;
  const directModel = findModelConfig(agent.provider, agent.model);
  const directPrice = getApproxPricePerImage(directModel, requestedSize);
  if (typeof directPrice === "number") {
    return directPrice;
  }

  // 出图模型已整体收进 nolo 平台托管目录；历史 agent 记录仍可能存着
  // provider=openai/google，按模型名回落到 nolo 目录再查一次。
  if (isPlatformHostedImageModel(agent.model)) {
    const hostedPrice = getApproxPricePerImage(
      findModelConfig("nolo", agent.model),
      requestedSize
    );
    if (typeof hostedPrice === "number") return hostedPrice;
  }

  const providerKey = String(agent.provider).toLowerCase();
  if (providerKey !== "openai" && providerKey !== "nolo") {
    return undefined;
  }

  // gpt-image-2 已收进 nolo 平台托管目录（provider=nolo）
  const fallbackModel = findModelConfig("nolo", OPENAI_IMAGE_FALLBACK_MODEL);
  return getApproxPricePerImage(fallbackModel, requestedSize);
};
