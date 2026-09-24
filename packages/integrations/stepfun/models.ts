import type { Model } from "ai/llm/types";
import { toCnyCredits } from "ai/llm/platformHosted";

/**
 * 阶跃星辰（StepFun）开放平台模型清单（按量计费）。
 *
 * 来源：
 * - 官方模型页：https://platform.stepfun.ai/docs/en/guides/models/
 * - 官方退役公告（2026-07-08 批次）：https://platform.stepfun.ai/docs/en/guides/model-migration
 * - Artificial Analysis（独立评测/性能交叉验证）：https://artificialanalysis.ai/providers/stepfun
 * 接入方式：OpenAI 兼容模式
 *   Base URL: https://api.stepfun.com/v1（官方文档已迁移至 api.stepfun.ai，.com 域名实测仍服务）
 *
 * 说明：
 * - 国内服务，人民币计价，使用 toCnyCredits 统一换算积分；
 * - 开放平台按量计费与 Step Plan 订阅池（月池 Credit 额度）独立；
 * - contextWindow 单位为 token；能力标记依据官方文档；
 * - 2026-09-24 依据官方退役公告清理：step-1-8k / step-1-32k / step-1v-8k /
 *   step-1v-32k / step-2-16k 已于 2026-07-08 正式退役（不再提供推理服务）；
 *   step-1-flash / step-1-128k / step-1-256k 已不在现行价目表中，一并移除。
 *   官方迁移建议：旧模型统一替换为 step-1o-turbo-vision 或 step-3.7-flash。
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
    description: "阶跃星辰旗舰多模态推理模型，256K 上下文，原生图像+视频理解（无需外挂视觉模型），三档 reasoning_effort（low/medium/high），工具调用，针对 Agent 与 Coding 深度优化；权重开源（Apache 2.0）。",
  },
  {
    name: "step-5-preview",
    displayName: "Step 5 Preview",
    hasVision: true,
    // 官方规格：1M context window / 64k max output（600B 总参 / 27B 激活 MoE）
    contextWindow: 1_000_000,
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
    description: "阶跃星辰新一代旗舰多模态推理模型（2026-09 发布），1M 上下文，文本+图像+视频输入，64k 最大输出，三档 reasoning_effort，支持复杂逻辑分解与长程规划；Artificial Analysis 智能指数 44，为 StepFun 系最高。",
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
    description: "阶跃星辰旗舰语言推理模型，196B 总参数 / 11B 激活参数 MoE，高速推理与工具调用；权重开源。",
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
    // 官方价：输入 ¥0.7/M、缓存命中 ¥0.14/M、输出 ¥2.1/M
    price: {
      input: toCnyCredits(0.7),
      output: toCnyCredits(2.1),
      inputCacheHit: toCnyCredits(0.14),
    },
    provider: "stepfun",
    description: "针对高频 Agent 场景优化，Token 效率与推理速度更佳，支持 low/high reasoning_effort。注意：Artificial Analysis 已标记为 deprecated，官方推荐迁移到 step-3.7-flash。",
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
    // 官方价：输入 ¥2.5/M、缓存命中 ¥0.5/M、输出 ¥8/M
    price: {
      input: toCnyCredits(2.5),
      output: toCnyCredits(8),
      inputCacheHit: toCnyCredits(0.5),
    },
    provider: "stepfun",
    description: "高响应速度视觉模型，支持图片与文档理解；官方退役公告中多数旧模型的指定替换目标。",
  },
];

/**
 * 阶跃星辰 Step Plan 订阅模型清单（Credit 月池计费）。
 *
 * 来源：https://platform.stepfun.ai/docs/en/step-plan/overview（Supported models 一节）
 * 接入方式：OpenAI 兼容模式
 *   Base URL: https://api.stepfun.com/step_plan/v1（官方文档已迁移至 api.stepfun.ai，.com 域名实测仍服务）
 *
 * 说明：
 * - 订阅制月池额度，统一以 Credit 扣费，不从账户余额扣款；
 * - 订阅不按单次 token 计费，price 留 0（由月池额度抵扣）；
 * - 模型 ID 与开放平台相同，但通过专属 step_plan/v1 端点路由；
 * - 2026-09-24 按官方 Supported models 清单校准：移除未列入订阅池的
 *   step-1o-turbo-vision 与已退役的 step-2-16k；
 * - 订阅池另有 stepaudio-2.5-tts / stepaudio-2.5-asr（语音模型，不在本聊天清单内）。
 */
export const stepfunStepPlanModels: Model[] = [
  {
    name: "step-5-preview",
    displayName: "Step 5 Preview",
    hasVision: true,
    // Step Plan 订阅端同样开放 1M context（见 Step Plan / Claude Code 接入文档）
    contextWindow: 1_000_000,
    maxOutputTokens: 65_536,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    supportsReasoningEffort: true,
    price: { input: 0, output: 0 },
    provider: "stepfun",
    description: "阶跃星辰新一代旗舰多模态推理模型，1M 上下文，文本+图像+视频输入，擅长复杂任务分解与多步计划。",
  },
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
    description: "阶跃星辰旗舰多模态推理模型，256K 上下文，原生图像+视频理解，高速推理 + 工具调用，Agent 深度适配。",
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
    description: "针对高频 Agent 场景优化，更佳 Token 效率与推理速度，支持 low/high 推理强度；官方推荐迁移到 step-3.7-flash。",
  },
  {
    name: "step-router-v1",
    displayName: "Step Router V1",
    hasVision: false,
    contextWindow: 262_144,
    maxOutputTokens: 65_536,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    supportsReasoningEffort: true,
    price: { input: 0, output: 0 },
    provider: "stepfun",
    description: "智能路由模型，按任务复杂度自动在 Step 系列模型间调度，订阅可用。",
  },
];
