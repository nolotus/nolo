import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  findModelConfig,
  getProviderByModelName
} from "/public/assets/chunks/chunk-LPS7IE46.js";
import {
  asTrimmedLowercaseString
} from "/public/assets/chunks/chunk-VCXOIOLL.js";

// packages/ai/llm/agentCapabilities.ts
var isCustomAgent = (agent) => {
  const apiSource = agent.apiSource?.toLowerCase();
  const provider = agent.provider?.toLowerCase();
  return apiSource === "custom" || provider === "custom";
};
var ANTIGRAVITY_EFFORT_SUFFIXES = [
  "-extra-low",
  "-low",
  "-medium",
  "-high"
];
function stripEffortSuffix(model) {
  for (const suffix of ANTIGRAVITY_EFFORT_SUFFIXES) {
    if (model.endsWith(suffix) && model.length > suffix.length) {
      return model.slice(0, -suffix.length);
    }
  }
  return model;
}
function stripPreviewSuffix(model) {
  const suffix = "-preview";
  if (model.endsWith(suffix) && model.length > suffix.length) {
    return model.slice(0, -suffix.length);
  }
  return model;
}
var lookupKnownModelVision = (provider, model) => {
  if (!model) return void 0;
  const candidates = [model];
  const strippedEffort = stripEffortSuffix(model);
  if (strippedEffort !== model) candidates.push(strippedEffort);
  const strippedPreview = stripPreviewSuffix(model);
  if (strippedPreview !== model) candidates.push(strippedPreview);
  for (const candidate of candidates) {
    if (provider) {
      const direct = findModelConfig(provider, candidate);
      if (direct) return direct.hasVision;
    }
    const detected = getProviderByModelName(candidate);
    if (detected) {
      const found = findModelConfig(detected, candidate)?.hasVision;
      if (found !== void 0) return found;
    }
    if (!provider && candidate.includes("/")) {
      const slash = candidate.indexOf("/");
      const modelProvider = candidate.slice(0, slash).toLowerCase();
      const modelName = candidate.slice(slash + 1);
      const nested = findModelConfig(modelProvider, modelName);
      if (nested) return nested.hasVision;
    }
  }
  return void 0;
};
var resolveAgentImageInputSupport = (agent) => {
  if (!agent) return true;
  const provider = asTrimmedLowercaseString(agent.provider) || null;
  const model = asOptionalTrimmedString(agent.model) ?? "";
  const custom = isCustomAgent(agent);
  const catalogHasVision = lookupKnownModelVision(
    custom ? null : provider,
    model
  );
  if (!custom && catalogHasVision !== void 0) {
    return catalogHasVision;
  }
  if (custom) {
    if (catalogHasVision === true) return true;
    return true;
  }
  if (typeof agent.hasVision === "boolean") {
    return agent.hasVision;
  }
  return true;
};

export {
  resolveAgentImageInputSupport
};
