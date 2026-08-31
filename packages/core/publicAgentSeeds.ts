/**
 * packages/core/publicAgentSeeds.ts
 *
 * 公共 Agent 种子定义的唯一代码真相源 (Single Source of Truth)。
 * 包含所有公开 Agent（文本助手 + 图像助手）的种子配置与确定性 ID 生成。
 *
 * 零副作用：不读取 profile，不发起网络请求，不触碰 process.argv。
 */

import { getModelPricing } from "../ai/llm/getPricing";
import { getModelConfig } from "../ai/llm/providers";
import { isPlatformHostedImageModel } from "../ai/llm/platformHosted";
import { isNoloHostedProvider } from "../ai/llm/kimi";
import {
  PUBLIC_DEEPSEEK_V4_FLASH_AGENT_ID,
  PUBLIC_DEEPSEEK_V4_PRO_AGENT_ID,
  PUBLIC_GLM_53_FLASH_AGENT_ID,
  PUBLIC_GPT_IMAGE_2_GENERATOR_AGENT_ID,
  PUBLIC_GPT_IMAGE_2_EDITOR_AGENT_ID,
  PUBLIC_GPT_IMAGE_2_CONTINUOUS_AGENT_ID,
  PUBLIC_NANO_BANANA_2_LITE_AGENT_ID,
} from "./builtinAgents";
import { publicAgentKey } from "./prefix";

export type PublicImageAgentMode = "generate" | "edit" | "continuous";

export interface AgentSeedDefaults {
  isPublic: boolean;
  allowFork: boolean;
  hasVision: boolean;
  tools: string[];
}

export type AgentSeedConfig = {
  id: string;
  presetKey?: string;
  name: string;
  provider?: string;
  apiSource?: "platform" | "custom";
  model: string;
  customProviderUrl?: string;
  apiKeyEnv?: string;
  apiKeyFromAgentKey?: string;
  imageModel?: string;
  isPublic: boolean;
  allowFork: boolean;
  platformAudit?: boolean;
  hasImageOutput?: boolean;
  imageWorkflow?: PublicImageAgentMode;
  imageConfig?: {
    enabled: boolean;
    imageSize?: "1K" | "2K" | "4K";
  };
  introduction: string;
  greeting: string | { text: string; menu?: unknown[] };
  prompt: string;
  tools: string[];
  tags: string[];
  references?: Array<{ dbKey: string; title: string; type: "knowledge" | "instruction" }>;
  enabledPacks?: string[];
  inputPrice?: number;
  outputPrice?: number;
  hasVision?: boolean;
  maxConcurrent?: number;
};

export type AgentSeed = AgentSeedConfig;

export type AgentSeedInput = {
  id: string;
  presetKey?: string;
  name: string;
  provider?: string;
  apiSource?: "platform" | "custom";
  model: string;
  customProviderUrl?: string;
  apiKeyEnv?: string;
  apiKeyFromAgentKey?: string;
  imageModel?: string;
  isPublic?: boolean;
  allowFork?: boolean;
  platformAudit?: boolean;
  hasImageOutput?: boolean;
  imageWorkflow?: PublicImageAgentMode;
  imageConfig?: {
    enabled: boolean;
    imageSize?: "1K" | "2K" | "4K";
  };
  introduction: string;
  greeting: string | { text: string; menu?: unknown[] };
  prompt: string;
  tools?: string[];
  tags?: string[];
  references?: Array<{ dbKey: string; title: string; type: "knowledge" | "instruction" }>;
  enabledPacks?: string[];
  inputPrice?: number;
  outputPrice?: number;
  hasVision?: boolean;
  maxConcurrent?: number;
};

export type PublicAgentSeedConfig = AgentSeedConfig & { presetKey: string };

export const AGENT_SEED_DEFAULTS: AgentSeedDefaults = {
  isPublic: true,
  allowFork: true,
  hasVision: false,
  tools: [],
};

/**
 * FNV-1a hash → 固定 26 位 ULID 风格 ID
 * 保证同 seed 每次生成相同 ID（幂等）
 */
export function deterministicId(prefix: string, seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  const suffix = h.toString(36).toUpperCase().padStart(14, "0");
  return (prefix + suffix).slice(0, 26);
}

/**
 * Resolve model input/output prices and vision flag.
 * 平台托管出图模型归一到 nolo 目录查询真值。
 */
export function resolveModelPrice(
  provider: string,
  model: string
): { input: number; output: number; hasVision: boolean } {
  const providerForLookup = isPlatformHostedImageModel(model)
    ? "nolo"
    : (provider || "nolo");
  const pricing = getModelPricing(providerForLookup, model);
  const modelConfig = getModelConfig(providerForLookup as any, model);
  if (!pricing) {
    throw new Error(`未找到模型价格元数据: ${providerForLookup}/${model}`);
  }
  return {
    input: pricing.inputPrice,
    output: pricing.outputPrice,
    hasVision: !!modelConfig.hasVision,
  };
}

export function defineAgentSeed<const T extends AgentSeedInput>(
  input: T
): T & AgentSeedConfig {
  const providerForLookup = isPlatformHostedImageModel(input.model)
    ? "nolo"
    : (input.provider || "nolo");
  const tools = input.tools ? [...input.tools] : [...AGENT_SEED_DEFAULTS.tools];
  const isPublic = input.isPublic ?? AGENT_SEED_DEFAULTS.isPublic;
  const allowFork = input.allowFork ?? AGENT_SEED_DEFAULTS.allowFork;
  const tags: string[] = input.tags ? [...input.tags] : [];

  const isPlatformHosted = isNoloHostedProvider(input.provider);
  let inputPrice = isPlatformHosted ? 0 : input.inputPrice;
  let outputPrice = isPlatformHosted ? 0 : input.outputPrice;
  let hasVision = input.hasVision;
  const pricesProvided =
    input.inputPrice !== undefined || input.outputPrice !== undefined;

  if (!isPlatformHosted && (inputPrice === undefined || outputPrice === undefined)) {
    const pricing = getModelPricing(providerForLookup, input.model);
    if (!pricing) {
      throw new Error(`未找到模型价格元数据: ${providerForLookup}/${input.model}`);
    }
    if (inputPrice === undefined) inputPrice = pricing.inputPrice;
    if (outputPrice === undefined) outputPrice = pricing.outputPrice;
  }

  if (hasVision === undefined) {
    if (pricesProvided) {
      hasVision = AGENT_SEED_DEFAULTS.hasVision;
    } else {
      const modelConfig = getModelConfig(providerForLookup as any, input.model);
      hasVision = !!modelConfig.hasVision;
    }
  }

  // 进入公开 agent seed 的 name/introduction/greeting/prompt/tags。
  // 原因：换供应商/换托管渠道不应牵动用户可见文案；模型厂商名（xAI/OpenAI 等身份词）不在此限。
  const userVisibleTexts: Array<[string, string]> = [
    ["name", input.name],
    ["introduction", input.introduction],
    [
      "greeting",
      typeof input.greeting === "string" ? input.greeting : input.greeting?.text,
    ],
    ["prompt", input.prompt],
    ...(input.tags ?? []).map((tag) => ["tags", tag] as [string, string]),
  ];
  for (const [fieldName, text] of userVisibleTexts) {
    if (!text) continue;
    const hit = text.match(/平台托管|runinfra|openrouter|crof|ollama/i);
    if (hit) {
      throw new Error(
        `公开 agent seed「${input.name}」的用户可见字段 ${fieldName} 含上游路由/托管渠道词「${hit[0]}」，禁止写入（换供应商不应牵动用户文案；模型厂商名不在此限）`
      );
    }
  }

  return {
    ...input,
    tools,
    isPublic,
    allowFork,
    tags,
    inputPrice,
    outputPrice,
    hasVision,
  } as T & AgentSeedConfig;
}

// ── 导出公共 Agent ID 常量 ──
export {
  PUBLIC_DEEPSEEK_V4_FLASH_AGENT_ID,
  PUBLIC_DEEPSEEK_V4_PRO_AGENT_ID,
  PUBLIC_GLM_53_FLASH_AGENT_ID,
  PUBLIC_GPT_IMAGE_2_GENERATOR_AGENT_ID,
  PUBLIC_GPT_IMAGE_2_EDITOR_AGENT_ID,
  PUBLIC_GPT_IMAGE_2_CONTINUOUS_AGENT_ID,
  PUBLIC_NANO_BANANA_2_LITE_AGENT_ID,
};

export const GPT_5_6_SOL_DEF = defineAgentSeed({
  id: deterministicId("01GPT56SOLPB", "shared-space-openai-gpt-5-6-sol"),
  presetKey: "gpt-5.6-sol",
  name: "GPT-5.6 Sol",
  provider: "openai",
  model: "gpt-5.6-sol",
  isPublic: true,
  platformAudit: true,
  introduction: "OpenAI GPT-5.6 Sol 公开助手（旗舰），适合复杂推理、长链路 agent、大规模代码与多步任务。",
  greeting: "你好，我是 GPT-5.6 Sol 公共助手。把高难度任务直接交给我即可。",
  prompt:
    "优先直接完成任务；面对复杂任务先理清目标、约束和关键风险，再给出可靠结果。",
  tools: [],
  tags: ["openai"],
});

export const GPT_5_6_TERRA_DEF = defineAgentSeed({
  id: deterministicId("01GPT56TERPB", "shared-space-openai-gpt-5-6-terra"),
  presetKey: "gpt-5.6-terra",
  name: "GPT-5.6 Terra",
  provider: "openai",
  model: "gpt-5.6-terra",
  isPublic: true,
  platformAudit: true,
  introduction: "OpenAI GPT-5.6 Terra 公开助手（均衡档），适合日常交互、agentic 编码与常规生产负载。",
  greeting: "你好，我是 GPT-5.6 Terra。均衡档位，适合日常任务与常规编码。",
  prompt:
    "优先直接完成任务；面对复杂任务时保持简洁、可执行、可复核。",
  tools: [],
  tags: ["openai"],
});

export const GPT_5_6_LUNA_DEF = defineAgentSeed({
  id: deterministicId("01GPT56LUNPB", "shared-space-openai-gpt-5-6-luna"),
  presetKey: "gpt-5.6-luna",
  name: "GPT-5.6 Luna",
  provider: "openai",
  model: "gpt-5.6-luna",
  isPublic: true,
  platformAudit: true,
  introduction: "OpenAI GPT-5.6 Luna 公开助手（轻量档），适合高吞吐、低成本、速度敏感任务。",
  greeting: "你好，我是 GPT-5.6 Luna。轻量档位，适合快速、低成本任务。",
  prompt:
    "优先快速完成任务；保持回答直接、结论明确。",
  tools: [],
  tags: ["openai"],
});

export const GPT_5_5_PRO_DEF = defineAgentSeed({
  id: deterministicId("01GPT55PROPUB", "shared-space-openai-gpt-5-5-pro"),
  presetKey: "gpt-5.5-pro",
  name: "GPT-5.5 Pro",
  provider: "openai",
  model: "gpt-5.5-pro",
  isPublic: true,
  platformAudit: true,
  introduction: "OpenAI GPT-5.5 Pro 公开助手，适合高难度推理、审阅、规划与关键决策。",
  greeting: "你好，我是 GPT-5.5 Pro。适合复杂推理、规划、审阅和高要求任务。",
  prompt:
    "面对高难度任务先建立清晰判断框架，再给出结构化、可执行、可验证的结果。",
  tools: [],
  tags: ["openai"],
});

export const DEEPSEEK_V4_FLASH_DEF = defineAgentSeed({
  id: PUBLIC_DEEPSEEK_V4_FLASH_AGENT_ID,
  presetKey: "deepseek-v4-flash",
  name: "DeepSeek V4 Flash",
  provider: "nolo",
  model: "deepseek-v4-flash-vision-exp",
  isPublic: true,
  introduction:
    "DeepSeek V4 Flash 公开助手，适合高性价比通用问答、代码与长上下文任务。",
  greeting: "你好，我是 DeepSeek V4 Flash。适合快速处理通用问题、代码和长上下文任务。",
  prompt:
    "优先快速、直接、稳定地完成任务；需要推理时保持步骤清晰。",
  tools: [],
  tags: ["nolo", "deepseek"],
});

export const DEEPSEEK_V4_PRO_DEF = defineAgentSeed({
  id: PUBLIC_DEEPSEEK_V4_PRO_AGENT_ID,
  presetKey: "deepseek-v4-pro",
  name: "DeepSeek V4 Pro",
  provider: "nolo",
  model: "deepseek-v4-pro",
  isPublic: true,
  introduction: "DeepSeek V4 Pro 公开助手，适合复杂推理、代码、agentic 工作流与长上下文任务。",
  greeting: "你好，我是 DeepSeek V4 Pro。适合复杂推理、代码分析和长上下文任务。",
  prompt:
    "面对复杂任务优先拆清目标、证据和执行路径，再给出可靠结论。",
  tools: [],
  tags: ["nolo", "deepseek"],
});

export const GLM_5_3_DEF = defineAgentSeed({
  id: "01GLM52DIPB00000000I3E2MY",
  presetKey: "glm-5.3",
  name: "GLM 5.3",
  provider: "nolo",
  model: "glm-5.3",
  isPublic: true,
  hasVision: true,
  introduction: "GLM 5.3 公开助手，适合复杂推理、长上下文、中文理解与代码分析。",
  greeting: "你好，我是 GLM 5.3。适合处理复杂分析、高质量中文问答与代码推理任务。",
  prompt:
    "优先给出直接、准确、可执行的回答；复杂问题先理清目标和约束再推理，保持结构清晰、依据明确。",
  tools: [],
  tags: ["nolo", "glm"],
});

export const GLM_5_3_FLASH_DEF = defineAgentSeed({
  id: PUBLIC_GLM_53_FLASH_AGENT_ID,
  presetKey: "glm-5-3-flash",
  name: "GLM 5.3 Flash",
  provider: "nolo",
  model: "glm-5-3-flash",
  isPublic: true,
  hasVision: true,
  introduction: "GLM 5.3 Flash 公开助手，廉价快档，适合高频轻量问答与批量任务。注意：该模型强制深度思考、无法关闭，思考过程 token 会计入输出计费（输出 3.2 积分/百万 token），实际消耗高于同长度可见回复。",
  greeting: "你好，我是 GLM 5.3 Flash。轻量快速、价格低，适合日常问答与批量轻量任务。",
  prompt: "直接、简洁地完成任务；回答保持简短，先给结论。",
  tools: [],
  tags: ["nolo", "glm", "flash"],
});

export const CLAUDE_SONNET_5_DEF = defineAgentSeed({
  id: deterministicId("01CLSO50DIPB", "shared-space-deepinfra-claude-sonnet-5"),
  presetKey: "claude-sonnet-5-deepinfra",
  name: "Claude Sonnet 5",
  provider: "deepinfra",
  model: "anthropic/claude-sonnet-5",
  isPublic: true,
  platformAudit: true,
  hasVision: true,
  introduction: "Claude Sonnet 5 公开助手，适合复杂问答、代码分析和图片理解。",
  greeting: "你好，我是 Claude Sonnet 5。适合复杂问题、代码分析和图片理解。",
  prompt:
    "面对复杂任务先厘清目标和约束，再给出可靠、可执行、可复核的结果。",
  tools: [],
  tags: ["claude", "anthropic"],
});

export const CLAUDE_OPUS_5_DEF = defineAgentSeed({
  id: deterministicId("01CLOP48DIPB", "shared-space-deepinfra-claude-opus-4-8"),
  presetKey: "claude-opus-5-deepinfra",
  name: "Claude Opus 5",
  provider: "deepinfra",
  model: "anthropic/claude-opus-5",
  isPublic: true,
  platformAudit: true,
  hasVision: true,
  introduction: "Claude Opus 5 公开助手，适合高难推理、长链路分析和图片理解。",
  greeting: "你好，我是 Claude Opus 5。适合高难推理、复杂分析和图片理解。",
  prompt:
    "先确认问题目标、证据和风险，再给出结构清楚、结论明确的回答。",
  tools: [],
  tags: ["claude", "anthropic"],
});

export const CLAUDE_FABLE_5_DEF = defineAgentSeed({
  id: deterministicId("01FABLE5DIPB", "shared-space-deepinfra-claude-fable-5"),
  presetKey: "claude-fable-5-deepinfra",
  name: "Claude Fable 5",
  provider: "deepinfra",
  model: "anthropic/claude-fable-5",
  isPublic: true,
  platformAudit: true,
  hasVision: true,
  introduction: "Claude Fable 5 公开助手，适合高难推理、复杂分析和图片理解。",
  greeting: "你好，我是 Claude Fable 5。适合高难推理、复杂分析和图片理解。",
  prompt:
    "先确认问题目标、证据和风险，再给出结构清楚、结论明确的回答。",
  tools: [],
  tags: ["claude", "anthropic"],
});

export const GROK_4_6_DEF = defineAgentSeed({
  id: deterministicId("01GROK46PLAZ", "shared-space-xai-grok-4-6"),
  presetKey: "grok-4.6",
  name: "Grok 4.6",
  provider: "xai",
  model: "grok-4.6",
  isPublic: true,
  hasVision: true,
  introduction: "xAI Grok 4.6 公开助手，适合实时信息分析、复杂推理、代码和多模态任务。",
  greeting: "你好，我是 Grok 4.6。可以帮你分析问题、编写代码、理解图片并处理复杂任务。",
  prompt:
    "优先给出直接、准确、可执行的回答；面对复杂问题先梳理目标和约束，再进行可靠推理。对不确定的内容明确说明依据与时效性，不编造。",
  tools: [],
  tags: ["xai", "grok"],
});

export const GEMINI_3_7_FLASH_DEF = defineAgentSeed({
  id: deterministicId("01GEM37FLPB", "shared-space-google-gemini-3-7-flash"),
  presetKey: "gemini-3.7-flash",
  name: "Gemini 3.7 Flash",
  provider: "google",
  model: "gemini-3.7-flash",
  isPublic: true,
  introduction: "Gemini 3.7 Flash 公开助手，适合快速前沿问答、代码、多模态和长上下文任务。",
  greeting: "你好，我是 Gemini 3.7 Flash。适合快速处理长上下文、多模态和代码任务。",
  prompt:
    "优先直接完成任务；需要推理或写代码时保持步骤清晰、结论可靠。",
  tools: [],
  tags: ["google", "gemini"],
});

export const GPT_IMAGE_2_GENERATOR_DEF = defineAgentSeed({
  id: PUBLIC_GPT_IMAGE_2_GENERATOR_AGENT_ID,
  presetKey: "gpt-image-2-generator",
  name: "GPT Image 2 图片生成器",
  provider: "openai",
  model: "gpt-5.6-luna",
  imageModel: "gpt-image-2",
  isPublic: true,
  hasImageOutput: true,
  imageWorkflow: "generate",
  imageConfig: { enabled: true },
  introduction:
    "专门负责 GPT Image 2 新图生成：文本生成新图片，也可把上传图片当作参考图来生成新的画面。",
  greeting:
    "你好，我是 GPT Image 2 图片生成器。直接告诉我你想画什么；如果你上传参考图，我会把它们当作灵感参考来生成一张新的图片。",
  prompt: [
    "定位：",
    "- 你的主任务是文本生成新图片。",
    "- 如果用户上传了参考图，它们只用于参考图影响新图构图、风格、角色关系和视觉方向。",
    "- 不要把这类请求处理成多轮连续编辑会话；默认按单次请求完成一版新图。",
    "",
    "工作方式：",
    "- 用户给出清晰需求后，直接生成，不先写长篇解释。",
    "- prompt 要明确主体、场景、镜头、光线、材质、风格与禁止项。",
    "- 如果用户要求多版本，可以一次给少量候选；默认先给 1 张。",
    "- 如果用户其实是在要求精确改图、局部替换、多图拼合或 mask 修改，提醒更适合改用“GPT Image 2 图片编辑器”。",
    "",
    "回复方式：",
    "- 默认中文输出，简短说明结果，并给 2-4 个下一步可继续微调的方向。",
  ].join("\n"),
  tools: ["openAIGptImageGenerate"],
  tags: ["image", "openai", "gpt-image-2", "generate"],
});

export const GPT_IMAGE_2_EDITOR_DEF = defineAgentSeed({
  id: PUBLIC_GPT_IMAGE_2_EDITOR_AGENT_ID,
  presetKey: "gpt-image-2-editor",
  name: "GPT Image 2 图片编辑器",
  provider: "openai",
  model: "gpt-5.6-luna",
  imageModel: "gpt-image-2",
  isPublic: true,
  hasImageOutput: true,
  imageWorkflow: "edit",
  imageConfig: { enabled: true },
  introduction:
    "专门负责 GPT Image 2 单次请求改图：支持单图编辑、多图参考合成，以及带 mask 的精确修改。",
  greeting:
    "你好，我是 GPT Image 2 图片编辑器。把要修改的图片、参考图或 mask 发给我，我会按单次请求改图的方式给你一版结果。",
  prompt: [
    "定位：",
    "- 你的主任务是单次请求改图，不是长对话陪伴式创作。",
    "- 你支持单图编辑、多图参考、拼合构图，以及可选的 mask 局部修改。",
    "- 如果用户要的是持续几轮“继续改、再来一版、延续上一轮”的创作过程，提醒更适合“GPT Image 2 连续创作助手”。",
    "",
    "工作方式：",
    "- 收到图片后，优先按单次请求改图完成当前目标。",
    "- 多图参考时，要明确每张图分别承担主体、风格、背景或构图参考。",
    "- 如果用户提供了 mask，就把 mask 视为必须遵守的编辑范围。",
    "- 如果缺少关键原图、参考图或 mask，先用一句话指出缺口，再等用户补齐。",
    "- 调用 openAIGptImageEdit 时，优先复用用户已上传的原始 http(s) 图片 URL；不要自己手写 data URL 或重编码缩略图。",
    "- 调用 openAIGptImageEdit 时，不要传 transparent background；background 一律用 opaque，除非底层能力以后明确支持再调整。",
    "- 如果 outputFormat 是 png（或没有显式改成 jpeg/webp），不要传 outputCompression。",
    "",
    "回复方式：",
    "- 默认中文输出，简短说明这次改动，并给 2-4 个可继续细化的方向。",
  ].join("\n"),
  tools: ["openAIGptImageEdit"],
  tags: ["image", "openai", "gpt-image-2", "edit"],
});

export const GPT_IMAGE_2_CONTINUOUS_DEF = defineAgentSeed({
  id: PUBLIC_GPT_IMAGE_2_CONTINUOUS_AGENT_ID,
  presetKey: "gpt-image-2-continuous",
  name: "GPT Image 2 连续创作助手",
  provider: "openai",
  model: "gpt-5.6-luna",
  imageModel: "gpt-image-2",
  isPublic: true,
  hasImageOutput: true,
  imageWorkflow: "continuous",
  imageConfig: { enabled: true },
  introduction:
    "专门负责 GPT Image 2 多轮连续创作：适合先出一版，再围绕上一轮图片继续修改、继续扩展和继续迭代。",
  greeting:
    "你好，我是 GPT Image 2 连续创作助手。你可以先让我出一版图，再围绕上一轮继续修改、继续扩展或继续定稿。",
  prompt: [
    "定位：",
    "- 你的主任务是多轮连续创作。",
    "- 用户经常会基于上一轮结果继续修改、继续细化、继续换风格、继续补元素。",
    "- 你要把当前对话里的上一轮图片视作默认延续对象，而不是每轮都重新开始。",
    "",
    "工作方式：",
    "- 如果当前轮用户没有上传新图，且上下文里也没有上一轮可用图片，但用户是在要求先出一版图，先调用 openAIGptImageGenerate 生成初始版本。",
    "- 如果当前轮用户上传了新图，优先基于新图继续创作。",
    "- 如果用户没有上传新图，但上下文里已有上一轮可用图片，默认沿用上一轮结果继续修改。",
    "- 调用 openAIGptImageEdit 时，优先复用当前对话里最近一轮可用的原始 http(s) 图片 URL；不要把已有图片重新手写成 data URL 或低保真缩略图。",
    "- 如果用户请求编辑却没有任何可用图片，就明确提示用户先上传一张图片再继续。",
    "- 默认先给快速、可迭代的一版；用户明确说要最终版、高清版时，再提高质量。",
    "- 调用 openAIGptImageEdit 时，不要传 transparent background；background 一律用 opaque，除非底层能力以后明确支持再调整。",
    "- 如果 outputFormat 是 png（或没有显式改成 jpeg/webp），不要传 outputCompression。",
    "",
    "回复方式：",
    "- 默认中文输出，保持连续协作口吻，生成后提示用户可以从哪些方向继续细化。",
  ].join("\n"),
  tools: ["openAIGptImageGenerate", "openAIGptImageEdit"],
  tags: ["image", "openai", "gpt-image-2", "continuous"],
});

export const NANO_BANANA_2_LITE_GENERATOR_DEF = defineAgentSeed({
  id: PUBLIC_NANO_BANANA_2_LITE_AGENT_ID,
  presetKey: "nano-banana-2-lite-generator",
  name: "Nano Banana 2 Lite 文生图",
  provider: "google",
  model: "gemini-3.1-flash-lite-image",
  isPublic: true,
  hasImageOutput: true,
  imageWorkflow: "generate",
  imageConfig: { enabled: true },
  introduction:
    "Nano Banana 2 Lite 公开文生图助手：Google 最快、最便宜的图片模型，适合快速草稿、批量生图和低成本视觉探索。",
  greeting:
    "你好，我是 Nano Banana 2 Lite 文生图助手。告诉我你想画什么，我会用 Google 最快的图片模型快速生成。",
  prompt: [
    "定位：",
    "- 你的主任务是快速生成新图片。",
    "- 如果用户需要更精致的编辑、多图合成或复杂修图，建议他们去使用“GPT Image 2 图片编辑器”或“证件照制作”等更合适的工具。",
    "",
    "工作方式：",
    "- 用户给出清晰需求后，直接用当前模型生成图片。",
    "- 对用户说明时，把当前图片模型称为图片生成模型，不要把模型说成工具。",
    "- prompt 要明确主体、场景、风格、光线、氛围。",
    "- 如果用户要求多版本，可以一次给少量候选；默认先给 1 张。",
    "- 如果用户上传了参考图，让模型参考构图或风格。",
    "- 默认比例 5:4，默认尺寸 2K；用户明确要求时按指定值传入。",
    "",
    "回复方式：",
    "- 默认中文输出，简短说明结果，并给 2-4 个可继续调整的方向（风格、比例、构图、细节等）。",
  ].join("\n"),
  tools: [],
  tags: ["image", "google", "gemini", "nano-banana", "fast", "generate"],
});

export const PUBLIC_AGENT_DEFS = [
  GPT_5_6_SOL_DEF,
  GPT_5_6_TERRA_DEF,
  GPT_5_6_LUNA_DEF,
  GPT_5_5_PRO_DEF,
  DEEPSEEK_V4_FLASH_DEF,
  DEEPSEEK_V4_PRO_DEF,
  GLM_5_3_DEF,
  GLM_5_3_FLASH_DEF,
  CLAUDE_SONNET_5_DEF,
  CLAUDE_OPUS_5_DEF,
  CLAUDE_FABLE_5_DEF,
  GROK_4_6_DEF,
  GEMINI_3_7_FLASH_DEF,
  GPT_IMAGE_2_GENERATOR_DEF,
  GPT_IMAGE_2_EDITOR_DEF,
  GPT_IMAGE_2_CONTINUOUS_DEF,
  NANO_BANANA_2_LITE_GENERATOR_DEF,
] as const satisfies readonly PublicAgentSeedConfig[];

export type PlatformAuditedAgentSpec = {
  readonly name: string;
  readonly key: string;
};

export const PLATFORM_AUDITED_AGENT_SPECS: readonly PlatformAuditedAgentSpec[] =
  (PUBLIC_AGENT_DEFS as readonly AgentSeedConfig[])
    .filter((def) => def.platformAudit)
    .map((def) => ({
      name: def.name,
      key: publicAgentKey(def.id),
    }));
