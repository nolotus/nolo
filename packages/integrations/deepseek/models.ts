import type { Model } from "ai/llm/types";
import {
  PLATFORM_HOSTED_DEEPSEEK_FLASH_OFF_PEAK_PRICE,
  PLATFORM_HOSTED_DEEPSEEK_FLASH_PEAK_PRICE,
  PLATFORM_HOSTED_DEEPSEEK_PRO_OFF_PEAK_PRICE,
  PLATFORM_HOSTED_DEEPSEEK_PRO_PEAK_PRICE,
} from "ai/llm/platformHosted";

/**
 * DeepSeek 官方 API 模型清单（按量计费）。
 *
 * 来源：DeepSeek 官方 API 文档（api-docs.deepseek.com）
 * 接入方式：OpenAI 兼容模式
 *
 * 说明：
 * - 官方按 token 计费（人民币），高峰 / 空闲双价、缓存命中单独计价。价格不在此处
 *   重复维护：直接引用 ai/llm/platformHosted 的官方价常量（同一上游、同一
 *   toCnyCredits 加价口径），官方调价时只需改一处。
 * - 旧名 deepseek-v4-flash / deepseek-v4-flash-vision-exp 已并入 deepseek-flash
 *   计费（见 PLATFORM_HOSTED_LEGACY_DEEPSEEK_MODELS），本表只列当前在售 ID。
 * - maxOutputTokens 故意留空：该字段没有任何请求路径消费（真值在 provider 手里），
 *   且 types.ts 已记录 deepseek-v4-pro 的 384K 抄录值失真，不再复制一份。
 * - contextWindow 单位为 token；能力标记依据官方模型卡片：V4 Pro 纯文本，
 *   Flash 支持视觉输入。
 */
export const deepseekModels: Model[] = [
  // ── 旗舰 ──
  {
    name: "deepseek-v4-pro",
    displayName: "DeepSeek V4 Pro",
    hasVision: false,
    contextWindow: 1_000_000,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    supportsReasoningEffort: true,
    price: { ...PLATFORM_HOSTED_DEEPSEEK_PRO_PEAK_PRICE },
    peakPrice: { ...PLATFORM_HOSTED_DEEPSEEK_PRO_PEAK_PRICE },
    offPeakPrice: { ...PLATFORM_HOSTED_DEEPSEEK_PRO_OFF_PEAK_PRICE },
    provider: "deepseek",
    description:
      "DeepSeek 旗舰推理模型，1M 上下文，思考模式 + 工具调用；纯文本模型，不支持图片输入。",
  },

  // ── 高性价比 ──
  {
    name: "deepseek-flash",
    displayName: "DeepSeek Flash",
    hasVision: true,
    contextWindow: 1_000_000,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    supportsReasoningEffort: true,
    price: { ...PLATFORM_HOSTED_DEEPSEEK_FLASH_PEAK_PRICE },
    peakPrice: { ...PLATFORM_HOSTED_DEEPSEEK_FLASH_PEAK_PRICE },
    offPeakPrice: { ...PLATFORM_HOSTED_DEEPSEEK_FLASH_OFF_PEAK_PRICE },
    provider: "deepseek",
    description:
      "DeepSeek 高性价比模型，1M 上下文，支持视觉输入与思考模式，长程编程与日常问答兼顾。",
  },
];
