
export const BASETEN_GLM_53_FLASH_MODEL = "zai-org/GLM-5.3-Flash";

export const BASETEN_GLM_53_FLASH_PRICE = {
  input: 1.2,
  inputCacheHit: 0.24,
  output: 4,
} as const;

export const basetenModels = [
  {
    name: BASETEN_GLM_53_FLASH_MODEL,
    displayName: "GLM 5.3 Flash",
    hasVision: true,
    price: { ...BASETEN_GLM_53_FLASH_PRICE },
    maxOutputTokens: 131072,
    contextWindow: 1048576,
    supportsTool: true,
    supportsReasoningEffort: true,
  },
];
