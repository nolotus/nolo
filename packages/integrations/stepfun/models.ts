import type { Model } from "ai/llm/types";
import { toCnyCredits } from "ai/llm/platformHosted";

/**
 * 阶跃星辰（StepFun）开放平台模型清单（按量计费）。
 *
 * 来源：https://platform.stepfun.com/docs/zh/guides/pricing/details
 * 接入方式：OpenAI 兼容模式
 *   Base URL: https://api.stepfun.com/v1
 *
 * 说明：
 * - 国内服务，人民币计价，使用 toCnyCredits 统一换算积分；
 * - 开放平台按量计费与 Step Plan 订阅池（月池 Credit 额度）独立；
 * - contextWindow 单位为 token；能力标记依据官方文档。
 */
export const stepfunModels: Model[] = [
  // ── 旗舰多模态推理 ──
  {
    name: "step-3.7-flash",
    displayName: "Step 3.7 Flash",
    hasVision: true,
    contextWindow: 262_144,
    maxOutputTokens: 65_536,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    supportsReasoningEffort: true,
    // 官方价：输入 ¥1.35/M、缓存命中 ¥0.27/M、输出 ¥8.1/M
    price: {
      input: toCnyCredits(1.35),
      output: toCnyCredits(8.1),
      inputCacheHit: toCnyCredits(0.27),
    },
    provider: "stepfun",
    description: "阶跃星辰旗舰多模态推理模型，256K 上下文，高速推理 + 原生多模态 + 工具调用，针对 Agent 与 Coding 深度优化。",
  },
  {
    name: "step-5-preview",
    displayName: "Step 5 Preview",
    hasVision: true,
    contextWindow: 262_144,
    maxOutputTokens: 65_536,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    supportsReasoningEffort: true,
    // 官方价：输入 ¥7/M、缓存命中 ¥0.35/M、输出 ¥20/M
    price: {
      input: toCnyCredits(7),
      output: toCnyCredits(20),
      inputCacheHit: toCnyCredits(0.35),
    },
    provider: "stepfun",
    description: "阶跃星辰新一代旗舰多模态推理模型，支持复杂逻辑分解与长程规划。",
  },

  // ── 旗舰语言推理 ──
  {
    name: "step-3.5-flash",
    displayName: "Step 3.5 Flash",
    hasVision: false,
    contextWindow: 262_144,
    maxOutputTokens: 65_536,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    supportsReasoningEffort: true,
    // 官方价：输入 ¥0.7/M、缓存命中 ¥0.14/M、输出 ¥2.1/M
    price: {
      input: toCnyCredits(0.7),
      output: toCnyCredits(2.1),
      inputCacheHit: toCnyCredits(0.14),
    },
    provider: "stepfun",
    description: "阶跃星辰旗舰语言推理模型，196B 总参数 / 11B 激活参数 MoE，高速推理与工具调用。",
  },
  {
    name: "step-3.5-flash-2603",
    displayName: "Step 3.5 Flash (Agent优化版)",
    hasVision: false,
    contextWindow: 262_144,
    maxOutputTokens: 65_536,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    supportsReasoningEffort: true,
    price: {
      input: toCnyCredits(0.7),
      output: toCnyCredits(2.1),
      inputCacheHit: toCnyCredits(0.14),
    },
    provider: "stepfun",
    description: "针对高频 Agent 场景优化，Token 效率与推理速度更佳，支持 low/high reasoning_effort。",
  },

  // ── 经典视觉模型 ──
  {
    name: "step-1o-turbo-vision",
    displayName: "Step 1o Turbo Vision",
    hasVision: true,
    contextWindow: 65_536,
    maxOutputTokens: 8_192,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: {
      input: toCnyCredits(2.5),
      output: toCnyCredits(8),
      inputCacheHit: toCnyCredits(0.5),
    },
    provider: "stepfun",
    description: "高响应速度视觉模型，支持图片与文档理解。",
  },

  // ── 经典通用语言模型 ──
  {
    name: "step-2-16k",
    displayName: "Step 2 16K",
    hasVision: false,
    contextWindow: 16_384,
    maxOutputTokens: 4_096,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: toCnyCredits(38), output: toCnyCredits(120) },
    provider: "stepfun",
    description: "千亿参数 MoE 语言大模型，适合逻辑复杂长文本生成。",
  },
  {
    name: "step-1-flash",
    displayName: "Step 1 Flash",
    hasVision: false,
    contextWindow: 8_192,
    maxOutputTokens: 4_096,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: toCnyCredits(1), output: toCnyCredits(4) },
    provider: "stepfun",
  },
  {
    name: "step-1-8k",
    displayName: "Step 1 8K",
    hasVision: false,
    contextWindow: 8_192,
    maxOutputTokens: 4_096,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: toCnyCredits(5), output: toCnyCredits(20) },
    provider: "stepfun",
  },
  {
    name: "step-1-32k",
    displayName: "Step 1 32K",
    hasVision: false,
    contextWindow: 32_768,
    maxOutputTokens: 4_096,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: toCnyCredits(15), output: toCnyCredits(70) },
    provider: "stepfun",
  },
  {
    name: "step-1-128k",
    displayName: "Step 1 128K",
    hasVision: false,
    contextWindow: 131_072,
    maxOutputTokens: 4_096,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: toCnyCredits(40), output: toCnyCredits(200) },
    provider: "stepfun",
  },
  {
    name: "step-1-256k",
    displayName: "Step 1 256K",
    hasVision: false,
    contextWindow: 262_144,
    maxOutputTokens: 4_096,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: toCnyCredits(60), output: toCnyCredits(300) },
    provider: "stepfun",
  },
  {
    name: "step-1v-8k",
    displayName: "Step 1V 8K",
    hasVision: true,
    contextWindow: 8_192,
    maxOutputTokens: 4_096,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: toCnyCredits(5), output: toCnyCredits(20) },
    provider: "stepfun",
  },
  {
    name: "step-1v-32k",
    displayName: "Step 1V 32K",
    hasVision: true,
    contextWindow: 32_768,
    maxOutputTokens: 4_096,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: toCnyCredits(15), output: toCnyCredits(70) },
    provider: "stepfun",
  },
];

/**
 * 阶跃星辰 Step Plan 订阅模型清单（Credit 月池计费）。
 *
 * 来源：https://platform.stepfun.com/docs/zh/step-plan/overview
 * 接入方式：OpenAI 兼容模式
 *   Base URL: https://api.stepfun.com/step_plan/v1
 *
 * 说明：
 * - 订阅制月池额度，统一以 Credit 扣费，不从账户余额扣款；
 * - 订阅不按单次 token 计费，price 留 0（由月池额度抵扣）；
 * - 模型 ID 与开放平台相同，但通过专属 step_plan/v1 端点路由。
 */
export const stepfunStepPlanModels: Model[] = [
  {
    name: "step-3.7-flash",
    displayName: "Step 3.7 Flash",
    hasVision: true,
    contextWindow: 262_144,
    maxOutputTokens: 65_536,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    supportsReasoningEffort: true,
    price: { input: 0, output: 0 },
    provider: "stepfun",
    description: "阶跃星辰旗舰多模态推理模型，256K 上下文，高速推理 + 原生多模态 + 工具调用，Agent 深度适配。",
  },
  {
    name: "step-5-preview",
    displayName: "Step 5 Preview",
    hasVision: true,
    contextWindow: 262_144,
    maxOutputTokens: 65_536,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    supportsReasoningEffort: true,
    price: { input: 0, output: 0 },
    provider: "stepfun",
    description: "阶跃星辰新一代旗舰多模态推理模型，擅长复杂任务分解与多步计划。",
  },
  {
    name: "step-3.5-flash",
    displayName: "Step 3.5 Flash",
    hasVision: false,
    contextWindow: 262_144,
    maxOutputTokens: 65_536,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    supportsReasoningEffort: true,
    price: { input: 0, output: 0 },
    provider: "stepfun",
    description: "阶跃星辰旗舰语言推理模型，196B MoE 架构，高速推理与工具调用。",
  },
  {
    name: "step-3.5-flash-2603",
    displayName: "Step 3.5 Flash (Agent优化版)",
    hasVision: false,
    contextWindow: 262_144,
    maxOutputTokens: 65_536,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    supportsReasoningEffort: true,
    price: { input: 0, output: 0 },
    provider: "stepfun",
    description: "针对高频 Agent 场景优化，更佳 Token 效率与推理速度，支持 low/high 推理强度。",
  },
  {
    name: "step-1o-turbo-vision",
    displayName: "Step 1o Turbo Vision",
    hasVision: true,
    contextWindow: 65_536,
    maxOutputTokens: 8_192,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: 0, output: 0 },
    provider: "stepfun",
  },
  {
    name: "step-2-16k",
    displayName: "Step 2 16K",
    hasVision: false,
    contextWindow: 16_384,
    maxOutputTokens: 4_096,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: { input: 0, output: 0 },
    provider: "stepfun",
  },
];
