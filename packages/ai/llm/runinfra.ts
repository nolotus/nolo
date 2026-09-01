
export const RUNINFRA_GLM_53_FLASH_MODEL = "glm-5-3-flash";

export const RUNINFRA_GLM_53_FLASH_PRICE = {
  input: 0.8,
  inputCacheHit: 0.08,
  output: 3.2,
} as const;

export const runinfraModels = [
  {
    name: RUNINFRA_GLM_53_FLASH_MODEL,
    displayName: "GLM 5.3 Flash",
    hasVision: true,
    price: { ...RUNINFRA_GLM_53_FLASH_PRICE },
    maxOutputTokens: 1048576,
    contextWindow: 1048576,
    supportsTool: true,
    supportsReasoningEffort: true,
  },
];
