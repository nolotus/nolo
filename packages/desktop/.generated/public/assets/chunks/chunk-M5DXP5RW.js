import {
  getPublicImageAgentMode
} from "/public/assets/chunks/chunk-VCSNZD3S.js";
import {
  getModelInfo,
  toTrimmedString
} from "/public/assets/chunks/chunk-RWWUEPWY.js";

// packages/ai/agent/utils/imageOutput.ts
var LEGACY_IMAGE_MODELS = /* @__PURE__ */ new Set([
  "google/gemini-3-pro-image-preview",
  "google/gemini-3.1-flash-image-preview"
]);
function supportsImageGeneration(agent) {
  if (agent.hasImageOutput === true) return true;
  if (getPublicImageAgentMode(agent) === "continuous") return true;
  const modelName = toTrimmedString(agent.model);
  if (!modelName) return false;
  const modelInfo = getModelInfo(modelName);
  if (modelInfo) {
    return !!(modelInfo.hasImageOutput ?? modelInfo.supportsImageOutput);
  }
  const normalized = modelName.toLowerCase();
  if (LEGACY_IMAGE_MODELS.has(normalized)) return true;
  if (agent.imageConfig?.enabled && agent.hasVision) return true;
  if (getPublicImageAgentMode(agent) === "continuous") return true;
  return normalized.includes("image-preview") || normalized.includes("flash-image") || normalized.includes("seedream") || normalized.includes("flux.");
}

export {
  supportsImageGeneration
};
