import {
  getPublicImageAgentDefaultProfile
} from "/public/assets/chunks/chunk-VCSNZD3S.js";
import {
  getApproxPricePerImage,
  getModelConfig
} from "/public/assets/chunks/chunk-LPS7IE46.js";
import {
  asOptionalFiniteNumber,
  asOptionalPositiveFiniteNumber
} from "/public/assets/chunks/chunk-RUG5F6GD.js";

// packages/ai/llm/getPricing.ts
var MAX_OUTPUT_TOKENS = 8192;
var getModelPricing = (provider, modelName, _requestedServiceTier) => {
  let model;
  try {
    model = getModelConfig(provider, modelName);
  } catch {
    return null;
  }
  if (!model?.price) return null;
  return getModelPricingForModel(provider, modelName, model);
};
var getModelPricingForModel = (provider, modelName, model) => {
  if (!model.price) return null;
  return {
    inputPrice: model.price.input,
    inputCacheHitPrice: typeof model.price.inputCacheHit === "number" ? model.price.inputCacheHit : 0,
    outputPrice: model.price.output
  };
};
var hasExplicitAgentPricing = (config) => [config?.inputPrice, config?.outputPrice].some(
  (value) => asOptionalPositiveFiniteNumber(value) !== void 0
);
var getPrices = (config, serverPrices) => ({
  agentInput: Number(config?.inputPrice ?? 0),
  agentOutput: Number(config?.outputPrice ?? 0),
  serverInput: Number(serverPrices?.inputPrice ?? 0),
  serverOutput: Number(serverPrices?.outputPrice ?? 0)
});
var getFinalPrice = (prices) => {
  const rawValues = Object.values(prices);
  const validValues = rawValues.flatMap((value) => {
    const finite = asOptionalFiniteNumber(value);
    return finite === void 0 ? [] : [finite];
  });
  if (validValues.length === 0) {
    return 0;
  }
  const maxPricePerMillion = Math.max(...validValues);
  const maxPricePerToken = maxPricePerMillion / 1e6;
  return maxPricePerToken * MAX_OUTPUT_TOKENS;
};
var TYPICAL_INPUT_TOKENS = 500;
var TYPICAL_OUTPUT_TOKENS = 300;
var trimTrailingZeros = (value) => {
  if (!value.includes(".")) return value;
  return value.replace(/\.?0+$/, "");
};
var getAgentPriceHint = (agent) => {
  const imagePriceModel = agent.imageModel ?? agent.model;
  if (agent.imageConfig?.enabled && agent.provider && imagePriceModel) {
    try {
      const model = getModelConfig(agent.provider, imagePriceModel);
      const mode = agent.imageWorkflow;
      if (mode === "generate") {
        const defaultProfile = getPublicImageAgentDefaultProfile("generate");
        const pricePerImage = getApproxPricePerImage(model, "1K");
        if (typeof pricePerImage === "number") {
          return {
            type: "per_image",
            amount: pricePerImage,
            labelKey: "defaultImageProfileEstimate",
            profileLabel: `${defaultProfile.quality} \xB7 ${defaultProfile.size}`
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
    }
  }
  const inputPrice = agent.inputPrice ?? 0;
  const outputPrice = agent.outputPrice ?? 0;
  if (inputPrice === 0 && outputPrice === 0) return null;
  const amount = (inputPrice * TYPICAL_INPUT_TOKENS + outputPrice * TYPICAL_OUTPUT_TOKENS) / 1e6;
  return { type: "per_turn", amount };
};
var formatPriceAmount = (amount) => {
  if (amount >= 0.1) return amount.toFixed(2);
  if (amount >= 0.01) return amount.toFixed(3);
  if (amount >= 1e-3) return amount.toFixed(4);
  if (amount >= 1e-4) return amount.toFixed(5);
  return amount.toFixed(6);
};
var formatModelCostPerMillion = (value, creditsUnit = "\u79EF\u5206") => {
  const finite = asOptionalFiniteNumber(value);
  if (finite === void 0) return "\u672A\u77E5";
  if (finite === 0) return "\u514D\u8D39";
  const decimals = Math.abs(finite) < 1 ? 3 : 2;
  const amount = finite.toFixed(decimals).replace(/\.0+$/, "").replace(/(\.\d*?[1-9])0+$/, "$1");
  return `${amount} ${creditsUnit}`;
};
var formatCompactTurnPrice = (amount) => {
  if (amount <= 0) {
    return { amountText: "0", unitCount: 1 };
  }
  if (amount >= 0.01) {
    return {
      amountText: trimTrailingZeros(formatPriceAmount(amount)),
      unitCount: 1
    };
  }
  const perHundred = amount * 100;
  if (perHundred >= 0.01) {
    return {
      amountText: trimTrailingZeros(formatPriceAmount(perHundred)),
      unitCount: 100
    };
  }
  return {
    amountText: trimTrailingZeros(formatPriceAmount(amount * 1e3)),
    unitCount: 1e3
  };
};

export {
  getModelPricing,
  getModelPricingForModel,
  hasExplicitAgentPricing,
  getPrices,
  getFinalPrice,
  getAgentPriceHint,
  formatPriceAmount,
  formatModelCostPerMillion,
  formatCompactTurnPrice
};
