// ai/llm/fireworks.ts
// Kimi + GLM removed from catalog — platform Kimi/GLM are nolo (Ollama Cloud) only.

export const fireworksModels = [
  {
    name: "accounts/fireworks/models/minimax-m3",
    displayName: "MiniMax: MiniMax M3",
    hasVision: true,
    price: {
      input: 2.4,
      output: 9.6,
      cachingRead: 0.48,
    },
    contextWindow: 512000,
    supportsTool: true,
  },
];
