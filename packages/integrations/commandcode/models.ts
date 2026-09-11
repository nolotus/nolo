// 路径: integrations/commandcode/models.ts
// CommandCode（https://commandcode.ai）订阅可选模型清单。
//
// 来源：官方模型注册表 https://commandcode.ai/docs/reference/cli/models
//       （Provider API 与 CLI 共用同一模型注册表，任意 ID 原样透传，
//       可通过 GET /provider/v1/models 实时校验）
// 接入方式：Provider API（OpenAI 兼容）
//   Base URL: https://api.commandcode.ai/provider/v1
//   认证：Studio 生成的 Bearer API Key（GOAT/Pro/Max/Team 订阅可用）
//
// 说明：
// - 订阅制（非按量），请求按订阅额度计费，price 留 0。
// - reasoning_effort 支持 low/medium/high/xhigh/max，端点会按模型 clamp。

import type { Model } from "ai/llm/types";

export const commandCodeModels: Model[] = [
  // ── DeepSeek ──
  {
    name: "deepseek/deepseek-v4-flash",
    displayName: "DeepSeek V4 Flash",
    hasVision: false,
    price: { input: 0, output: 0 },
    provider: "commandcode",
    description: "CommandCode 官方默认模型，快速混合注意力推理。",
  },
  {
    name: "deepseek/deepseek-v4-pro",
    displayName: "DeepSeek V4 Pro",
    hasVision: false,
    price: { input: 0, output: 0 },
    provider: "commandcode",
    description: "混合注意力长上下文推理旗舰。",
  },
  {
    name: "deepseek/deepseek-v4.1-flash",
    displayName: "DeepSeek V4.1 Flash",
    hasVision: true,
    price: { input: 0, output: 0 },
    provider: "commandcode",
    description: "V4.1 混合注意力推理，带视觉。",
  },

  // ── Moonshot ──
  {
    name: "moonshotai/Kimi-K3",
    displayName: "Kimi K3",
    hasVision: false,
    price: { input: 0, output: 0 },
    provider: "commandcode",
    description: "Kimi K3，月之暗面旗舰。",
  },
  {
    name: "moonshotai/Kimi-K2.7-Code",
    displayName: "Kimi K2.7 Code",
    hasVision: false,
    price: { input: 0, output: 0 },
    provider: "commandcode",
    description: "Kimi K2.7 Code，编程特化。",
  },

  // ── Qwen ──
  {
    name: "Qwen/Qwen3.8-Max",
    displayName: "Qwen 3.8 Max",
    hasVision: true,
    price: { input: 0, output: 0 },
    provider: "commandcode",
    description: "自主长程编程与专业工作。",
  },

  // ── Z AI ──
  {
    name: "zai-org/GLM-5.3",
    displayName: "GLM 5.3",
    hasVision: false,
    price: { input: 0, output: 0 },
    provider: "commandcode",
    description: "前沿编程模型，1M 上下文。",
  },
  {
    name: "z-ai/glm-5.3-flash",
    displayName: "GLM 5.3 Flash",
    hasVision: true,
    price: { input: 0, output: 0 },
    provider: "commandcode",
    description: "快速实惠的 GLM 编程模型，1M 上下文。",
  },

  // ── Xiaomi ──
  {
    name: "xiaomi/mimo-v2.5-pro",
    displayName: "MiMo V2.5 Pro",
    hasVision: false,
    price: { input: 0, output: 0 },
    provider: "commandcode",
    description: "高能力长上下文 agentic 编程。",
  },

  // ── MiniMax ──
  {
    name: "MiniMaxAI/MiniMax-M3",
    displayName: "MiniMax M3",
    hasVision: false,
    price: { input: 0, output: 0 },
    provider: "commandcode",
    description: "MiniMax M3 推理模型。",
  },

  // ── xAI ──
  {
    name: "xai/grok-4.6",
    displayName: "Grok 4.6",
    hasVision: true,
    price: { input: 0, output: 0 },
    provider: "commandcode",
    description: "编程、知识与 STEM 前沿表现。",
  },
  {
    name: "xai/grok-4.5",
    displayName: "Grok 4.5",
    hasVision: true,
    price: { input: 0, output: 0 },
    provider: "commandcode",
    description: "编程与 agentic 任务智能之选。",
  },

  // ── Anthropic ──
  {
    name: "claude-sonnet-5",
    displayName: "Claude Sonnet 5",
    hasVision: false,
    price: { input: 0, output: 0 },
    provider: "commandcode",
    description: "速度与智能的最佳平衡（官方推荐）。",
  },
  {
    name: "claude-opus-5",
    displayName: "Claude Opus 5",
    hasVision: false,
    price: { input: 0, output: 0 },
    provider: "commandcode",
    description: "最智能的 Opus，agent 与编程。",
  },

  // ── OpenAI ──
  {
    name: "gpt-5.6-sol",
    displayName: "GPT-5.6 Sol",
    hasVision: false,
    price: { input: 0, output: 0 },
    provider: "commandcode",
    description: "OpenAI GPT-5.6 Sol。",
  },
  {
    name: "gpt-6-astra",
    displayName: "GPT-6 Astra",
    hasVision: false,
    price: { input: 0, output: 0 },
    provider: "commandcode",
    description: "OpenAI GPT-6 Astra 旗舰。",
  },

  // ── Google ──
  {
    name: "google/gemini-3.8-flash",
    displayName: "Gemini 3.8 Flash",
    hasVision: true,
    price: { input: 0, output: 0 },
    provider: "commandcode",
    description: "Gemini 3.8 Flash，多模态。",
  },
];
