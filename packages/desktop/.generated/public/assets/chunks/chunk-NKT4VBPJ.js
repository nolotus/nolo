import {
  PLATFORM_HOSTED_GLM_52_MODEL,
  cloudflareModels,
  deepSeekModels,
  deepinfraModels,
  fireworksModels,
  gmiModels,
  googleModels,
  openAIModels,
  openrouterModels,
  platformHostedModels,
  xaiModels,
  zaiModels
} from "/public/assets/chunks/chunk-XDKHKMJ3.js";

// packages/ai/llm/modelAbility.ts
var MODEL_ABILITY_TABLE = {
  "claude-opus-5": { passAt1: 74, benchmarkScore: 61 },
  "gpt-5.6-sol": { passAt1: 73, benchmarkScore: 59 },
  "gpt-5.6-terra": { passAt1: 70, benchmarkScore: 55 },
  "kimi-k3": { passAt1: 69, benchmarkScore: 57 },
  "grok-4.5": { passAt1: 54, benchmarkScore: 54 },
  "claude-sonnet-5": { passAt1: 54, benchmarkScore: 53 },
  "gpt-5.6-luna": { passAt1: 67, benchmarkScore: 51 },
  "glm-5.2": { passAt1: 44, benchmarkScore: 51 },
  "gemini-3.6-flash": { passAt1: 49, benchmarkScore: 50 }
};
var EFFORT_SUFFIXES = ["-extra-low", "-low", "-medium", "-high"];
function normalizeModelName(raw) {
  let name = raw.trim().toLowerCase();
  const slash = name.indexOf("/");
  if (slash !== -1) name = name.slice(slash + 1);
  for (const suffix of EFFORT_SUFFIXES) {
    if (name.endsWith(suffix) && name.length > suffix.length) {
      name = name.slice(0, -suffix.length);
      break;
    }
  }
  return name;
}
function getModelAbility(modelName) {
  const entry = MODEL_ABILITY_TABLE[normalizeModelName(modelName)];
  return entry ? { ...entry } : void 0;
}

// packages/ai/llm/ollamaCloud.ts
var OLLAMA_CLOUD_GLM_52_MODEL = PLATFORM_HOSTED_GLM_52_MODEL;
var ollamaCloudModels = platformHostedModels;

// packages/ai/llm/models.ts
var withProvider = (provider) => (models) => models.map((model) => ({ ...model, provider }));
var ALL_MODELS = [
  ...withProvider("nolo")(ollamaCloudModels),
  ...withProvider("google")(googleModels),
  ...withProvider("openai")(openAIModels),
  ...withProvider("openrouter")(openrouterModels),
  ...withProvider("xai")(xaiModels),
  ...withProvider("deepseek")(deepSeekModels),
  ...withProvider("deepinfra")(deepinfraModels),
  ...withProvider("fireworks")(fireworksModels),
  ...withProvider("cloudflare")(cloudflareModels),
  ...withProvider("gmi")(gmiModels),
  ...withProvider("zai")(zaiModels)
].map((model) => {
  const ability = getModelAbility(model.name);
  return ability ? { ...model, ability } : model;
});

export {
  getModelAbility,
  OLLAMA_CLOUD_GLM_52_MODEL,
  ALL_MODELS
};
