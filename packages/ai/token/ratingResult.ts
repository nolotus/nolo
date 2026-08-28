import { findModelConfig } from "ai/llm/providers";
import { asOptionalFiniteNumber } from "core/optionalNumber";
import { calculatePrice, API_REPORTED_COST_MULTIPLIER, type Usage } from "./calculatePrice";

export type RatingResultSnapshot = {
  provider: string;
  model: string;
  serviceTier?: string;
  providerCurrency: "USD";
  settlementCurrency: "CREDITS";
  commercialMultiplier: number;
  providerUnitPrices: {
    input: number;
    output: number;
    cachingWrite?: number;
    cachingRead?: number;
    inputCacheHit?: number;
  };
  settlementUnitPrices: {
    input: number;
    output: number;
    cachingWrite?: number;
    cachingRead?: number;
    inputCacheHit?: number;
  };
  pricingVersion: string;
  formulaVersion: string;
  roundingPolicy: "credits_6dp";
};

export type RatingResult = {
  id: string;
  billableEventId: string;
  provider: string;
  model: string;
  platformCredits: number;
  snapshot: RatingResultSnapshot;
  createdAt: string;
};

type CreateRatingResultInput = {
  ratingId: string;
  billableEventId: string;
  provider: string;
  model: string;
  serviceTier?: string;
  usage: Usage;
  createdAt: string;
};

export const buildRatingResultKey = (ratingId: string) =>
  `rating-result-${ratingId}`;

const resolveCommercialMultiplier = (provider: string, model: string) => {
  if (provider === "openai") return 8;
  if (provider === "anthropic") return 9;
  if (provider === "deepinfra" && model.startsWith("anthropic/")) return 9;
  // API_REPORTED_COST_MULTIPLIER 共享同一汇率，消除 dual-rate seam。
  return API_REPORTED_COST_MULTIPLIER;
};

const divideDefined = (value: unknown, divisor: number) => {
  const numeric = asOptionalFiniteNumber(value);
  return typeof numeric === "number" ? numeric / divisor : undefined;
};

const scaleDefined = (value: unknown, multiplier: number) => {
  const numeric = asOptionalFiniteNumber(value);
  return typeof numeric === "number" ? numeric * multiplier : undefined;
};

const compactPrice = <T extends Record<string, number | undefined>>(price: T) =>
  Object.fromEntries(
    Object.entries(price).filter(([, value]) => typeof value === "number")
  ) as { [K in keyof T]: number };

const resolveSettlementUnitPrices = ({
  provider,
  model,
  serviceTier,
  usage,
}: {
  provider: string;
  model: string;
  serviceTier?: string;
  usage: Usage;
}): {
  input: number;
  output: number;
  cachingWrite?: number;
  cachingRead?: number;
  inputCacheHit?: number;
} => {
  const modelConfig = findModelConfig(provider, model);
  if (!modelConfig?.price) {
    return { input: 0, output: 0 };
  }

  let input = modelConfig.price.input;
  let output = modelConfig.price.output;
  let cachingWrite = modelConfig.price.cachingWrite;
  let cachingRead = modelConfig.price.cachingRead;
  let inputCacheHit = modelConfig.price.inputCacheHit;

  if (modelConfig.pricingStrategy?.type === "tiered_context") {
    const tiers = [...(modelConfig.pricingStrategy.tiers || [])].sort(
      (a, b) => a.minContext - b.minContext
    );
    for (const tier of tiers) {
      if ((usage.input_tokens || 0) >= tier.minContext) {
        input = tier.price.input;
        output = tier.price.output;
        cachingWrite = tier.price.cachingWrite;
        cachingRead = tier.price.cachingRead;
        inputCacheHit = tier.price.inputCacheHit;
      }
    }
  }

  return compactPrice({
    input,
    output,
    cachingWrite,
    cachingRead,
    inputCacheHit,
  });
};

export const createRatingResult = (
  input: CreateRatingResultInput
): RatingResult => {
  const price = calculatePrice({
    provider: input.provider,
    modelName: input.model,
    billingServiceTier: input.serviceTier,
    usage: input.usage,
  });
  const commercialMultiplier = resolveCommercialMultiplier(
    input.provider,
    input.model
  );
  const settlementUnitPrices = resolveSettlementUnitPrices({
    provider: input.provider,
    model: input.model,
    serviceTier: input.serviceTier,
    usage: input.usage,
  });

  return {
    id: input.ratingId,
    billableEventId: input.billableEventId,
    provider: input.provider,
    model: input.model,
    platformCredits: price.cost,
    snapshot: {
      provider: input.provider,
      model: input.model,
      serviceTier: input.serviceTier,
      providerCurrency: "USD",
      settlementCurrency: "CREDITS",
      commercialMultiplier,
      providerUnitPrices: compactPrice({
        input: settlementUnitPrices.input / commercialMultiplier,
        output: settlementUnitPrices.output / commercialMultiplier,
        cachingWrite: divideDefined(
          settlementUnitPrices.cachingWrite,
          commercialMultiplier
        ),
        cachingRead: divideDefined(
          settlementUnitPrices.cachingRead,
          commercialMultiplier
        ),
        inputCacheHit: divideDefined(
          settlementUnitPrices.inputCacheHit,
          commercialMultiplier
        ),
      }),
      settlementUnitPrices: compactPrice({
        input: scaleDefined(settlementUnitPrices.input, 1),
        output: scaleDefined(settlementUnitPrices.output, 1),
        cachingWrite: scaleDefined(settlementUnitPrices.cachingWrite, 1),
        cachingRead: scaleDefined(settlementUnitPrices.cachingRead, 1),
        inputCacheHit: scaleDefined(settlementUnitPrices.inputCacheHit, 1),
      }),
      pricingVersion: "model-registry-current",
      formulaVersion: "token-rating-v1",
      roundingPolicy: "credits_6dp",
    },
    createdAt: input.createdAt,
  };
};
