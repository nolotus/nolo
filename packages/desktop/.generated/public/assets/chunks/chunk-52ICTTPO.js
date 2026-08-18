import {
  asTrimmedLowercaseString
} from "/public/assets/chunks/chunk-VCXOIOLL.js";

// packages/auth/gptProTier.ts
var ADVANCED_FEATURE_MIN_BALANCE = 19;
var GPT_PRO_REQUIRED_RECHARGE_AMOUNT = 199;
function isGptProModel(provider, model) {
  const normalizedProvider = asTrimmedLowercaseString(provider);
  const normalizedModel = asTrimmedLowercaseString(model);
  if (normalizedProvider === "openai") {
    return /^gpt-[a-z0-9.]+-pro(?:-|$)/.test(normalizedModel);
  }
  if (normalizedProvider === "deepinfra") {
    return normalizedModel.includes("claude") && normalizedModel.includes("opus");
  }
  return false;
}
var GPT_PRO_BLOCKED_MESSAGE = `GPT Pro \u7CFB\u5217\u9700\u8981\u5148\u5F00\u901A ${GPT_PRO_REQUIRED_RECHARGE_AMOUNT} \u79EF\u5206\u6863\u4F4D\u3002`;
function shouldBlockForGptPro(agent, gptProStatus) {
  if (!agent) return { blocked: false };
  if (agent.apiSource === "cli") return { blocked: false };
  if (!isGptProModel(agent.provider, agent.model)) return { blocked: false };
  if (gptProStatus === "active") return { blocked: false };
  return { blocked: true, message: GPT_PRO_BLOCKED_MESSAGE };
}

export {
  ADVANCED_FEATURE_MIN_BALANCE,
  GPT_PRO_REQUIRED_RECHARGE_AMOUNT,
  GPT_PRO_BLOCKED_MESSAGE,
  shouldBlockForGptPro
};
