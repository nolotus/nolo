import type { Model } from "ai/llm/types";
import { toCnyCredits } from "ai/llm/platformHosted";

/**
 * MiniMax 官方开放平台模型清单（按量计费）。
 *
 * 来源：
 * - 官方博客 / 发布公告：https://www.minimax.io/blog/minimax-m31f（2026-10-19 发布 M3.1 Flash）
 * - 开放平台控制台：https://platform.minimaxi.com/
 * - 接入方式：OpenAI 兼容模式
 *   Base URL: https://api.minimaxi.com/v1
 *
 * 说明：
 * - 国内服务，人民币计价，使用 toCnyCredits 统一换算积分；
 *   - MiniMax-M3.1-Flash：输入 ¥1.00，输出 ¥4.00，缓存命中 ¥0.10
 *   - MiniMax-M3：输入 ¥2.10（≤512k），输出 ¥8.40，缓存命中 ¥0.42
 * - 上下文统一为 1,000,000（1M）tokens；
 * - 与 providerRegistry 的 minimax-api 模板保持同一真值源（MINIMAX_MODEL_OPTIONS 由本文件直接派生）。
 */
export const minimaxModels: Model[] = [
  {
    name: "MiniMax-M3.1-Flash",
    displayName: "MiniMax M3.1 Flash",
    hasVision: true,
    contextWindow: 1_000_000,
    maxOutputTokens: 8_192,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: {
      input: toCnyCredits(1.0),
      output: toCnyCredits(4.0),
      inputCacheHit: toCnyCredits(0.1),
    },
    provider: "minimax",
    description: "MiniMax 新一代 Flash 旗舰模型，1M 上下文，原生多模态视觉理解，针对 Agent、代码与工具调用深度优化。",
  },
  {
    name: "MiniMax-M3",
    displayName: "MiniMax M3",
    hasVision: true,
    contextWindow: 1_000_000,
    maxOutputTokens: 8_192,
    jsonOutput: true,
    fnCall: true,
    supportsTool: true,
    price: {
      input: toCnyCredits(2.1),
      output: toCnyCredits(8.4),
      inputCacheHit: toCnyCredits(0.42),
    },
    provider: "minimax",
    description: "MiniMax M3 旗舰多模态推理模型，1M 上下文，支持文本与视觉理解、工具调用。",
  },
];
