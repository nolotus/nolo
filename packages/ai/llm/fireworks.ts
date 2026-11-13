// ai/llm/fireworks.ts
// Kimi + GLM removed from catalog — platform Kimi/GLM are nolo (Ollama Cloud) only.

export const fireworksModels = [
  {
    // 2026-11-04：Kimi 三条历史 id 统一指向这里。Fireworks 真实 id 为 kimi-k3
    // （https://app.fireworks.ai/models/fireworks/kimi-k3）；价格沿用平台 Kimi K3 目录价。
    name: "accounts/fireworks/models/kimi-k3",
    displayName: "MoonshotAI: Kimi K3",
    hasVision: true,
    price: { input: 24, output: 120, cachingRead: 2.4 },
    contextWindow: 256000,
    supportsTool: true,
  },
  {
    // 2026-11-04：minimax-m3 记录迁移到这里。Fireworks 真实 id 为 minimax-m3p1-flash
    name: "accounts/fireworks/models/minimax-m3p1-flash",
    displayName: "MiniMax: MiniMax M3.1 Flash",
    hasVision: true,
    price: { input: 0.6, output: 2.4, cachingRead: 0.06 },
    contextWindow: 512000,
    supportsTool: true,
  },
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
