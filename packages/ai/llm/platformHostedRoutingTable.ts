// packages/ai/llm/platformHostedRoutingTable.ts
//
// 平台托管模型路由单一声明式真值表（Single Source of Truth）。
//
// 目标：将「平台托管模型该走哪个上游」收敛为一张声明式表。
// 类型系统强制所有字段必填（endpoint / usageProvider / keyName / wire 必须显式指定，
// 不得给默认值，防止计费漏账与上游行为漂移）。
//
// 消费方：
// 1. packages/server/handlers/agentRun/loopUpstream.ts（server agentRun 主路径）
// 2. packages/server/handlers/chatProxyRouting.ts（chat proxy 路径）
// 3. packages/agent-runtime/platformProviderEndpoints.ts（agent-runtime / 本地 CLI 直连路径）

import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import {
  PLATFORM_HOSTED_KIMI_K26_MODEL,
  PLATFORM_HOSTED_KIMI_K3_MODEL,
} from "./kimi";

export const PLATFORM_HOSTED_CLAUDE_SONNET_5_MODEL = "anthropic/claude-sonnet-5";
export const PLATFORM_HOSTED_CLAUDE_OPUS_5_MODEL = "anthropic/claude-opus-5";
export const PLATFORM_HOSTED_CLAUDE_FABLE_5_MODEL = "anthropic/claude-fable-5";
export const PLATFORM_HOSTED_GROK_4_6_MODEL = "grok-4.6";
export const PLATFORM_HOSTED_KIMI_K26_OPENROUTER_MODEL_ID = "qwen/qwen3.8-27b";
export const PLATFORM_HOSTED_GLM_53_MODEL = "glm-5.3";
export const PLATFORM_HOSTED_GLM_52_MODEL = "glm-5.2";
export const PLATFORM_HOSTED_GLM_53_OPENROUTER_MODEL_ID = "z-ai/glm-5.3";
export const PLATFORM_HOSTED_GLM_52_OPENROUTER_MODEL_ID = "z-ai/glm-5.3";
export const PLATFORM_HOSTED_GLM_53_FLASH_MODEL = "glm-5-3-flash";
export const PLATFORM_HOSTED_GEMINI_37_FLASH_MODEL = "gemini-3.7-flash";
export const PLATFORM_HOSTED_GEMINI_FLASH_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
export const PLATFORM_HOSTED_GEMINI_PRO_IMAGE_MODEL = "gemini-3-pro-image-preview";
export const PLATFORM_HOSTED_GEMINI_FLASH_LITE_IMAGE_MODEL = "gemini-3.1-flash-lite-image";
export const PLATFORM_HOSTED_OPENAI_IMAGE_MODEL = "gpt-image-2";
export const PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL = "deepseek-v4-flash";
export const PLATFORM_HOSTED_DEEPSEEK_FLASH_VISION_EXP_MODEL = "deepseek-v4-flash-vision-exp";
export const PLATFORM_HOSTED_DEEPSEEK_PRO_MODEL = "deepseek-v4-pro";

/**
 * 平台托管上游 id（credential / usage 白名单 / keyName 共用）。
 * 每个成员都必须是 getNoloKey / 凭据解析接受的真实上游 provider。
 */
export type PlatformHostedUpstreamId =
  | "deepinfra"
  | "xai"
  | "openrouter"
  | "runinfra"
  | "upstream-k3"
  | "google"
  | "openai"
  | "deepseek";

export type PlatformHostedRoutingEntry = {
  readonly endpoint: string;
  readonly usageProvider: PlatformHostedUpstreamId;
  readonly keyName: PlatformHostedUpstreamId;
  readonly upstreamModelId?: string;
  readonly wire: "chat.completions" | "responses";
  /**
   * 是否在 server agentRun 循环中作为托管路由分流。
   * 为 false 时，agentRun 路径保持「未分流模型报错 (no upstream route)」，
   * 仅在 chatProxy / 本地 CLI 路径生效（如 Claude / Grok 在 server 侧未分流）。
   */
  readonly agentRunHosted?: boolean;
};

export const PLATFORM_HOSTED_ROUTING_TABLE: Readonly<
  Record<string, PlatformHostedRoutingEntry>
> = {
  [PLATFORM_HOSTED_KIMI_K26_MODEL]: {
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    usageProvider: "openrouter",
    keyName: "openrouter",
    upstreamModelId: PLATFORM_HOSTED_KIMI_K26_OPENROUTER_MODEL_ID,
    wire: "chat.completions",
    agentRunHosted: true,
  },
  [PLATFORM_HOSTED_GLM_53_MODEL]: {
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    usageProvider: "openrouter",
    keyName: "openrouter",
    upstreamModelId: PLATFORM_HOSTED_GLM_53_OPENROUTER_MODEL_ID,
    wire: "chat.completions",
    agentRunHosted: true,
  },
  [PLATFORM_HOSTED_GLM_52_MODEL]: {
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    usageProvider: "openrouter",
    keyName: "openrouter",
    upstreamModelId: PLATFORM_HOSTED_GLM_53_OPENROUTER_MODEL_ID,
    wire: "chat.completions",
    agentRunHosted: true,
  },
  // GLM 5.3 Flash -> RunInfra (独家廉价快档)
  [PLATFORM_HOSTED_GLM_53_FLASH_MODEL]: {
    endpoint: "https://api.runinfra.ai/v1/chat/completions",
    usageProvider: "runinfra",
    keyName: "runinfra",
    wire: "chat.completions",
    agentRunHosted: true,
  },
  "glm-5.3-flash": {
    endpoint: "https://api.runinfra.ai/v1/chat/completions",
    usageProvider: "runinfra",
    keyName: "runinfra",
    wire: "chat.completions",
    agentRunHosted: true,
  },
  [PLATFORM_HOSTED_KIMI_K3_MODEL]: {
    endpoint: "https://crof.ai/v1/chat/completions",
    usageProvider: "upstream-k3",
    keyName: "upstream-k3",
    wire: "chat.completions",
    agentRunHosted: true,
  },
  // Gemini 3.7 Flash -> Google official OpenAI-compatible endpoint
  [PLATFORM_HOSTED_GEMINI_37_FLASH_MODEL]: {
    endpoint:
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    usageProvider: "google",
    keyName: "google",
    wire: "chat.completions",
    agentRunHosted: true,
  },
  // Gemini Image models -> Google
  [PLATFORM_HOSTED_GEMINI_FLASH_IMAGE_MODEL]: {
    endpoint:
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    usageProvider: "google",
    keyName: "google",
    wire: "chat.completions",
    agentRunHosted: true,
  },
  [PLATFORM_HOSTED_GEMINI_PRO_IMAGE_MODEL]: {
    endpoint:
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    usageProvider: "google",
    keyName: "google",
    wire: "chat.completions",
    agentRunHosted: true,
  },
  [PLATFORM_HOSTED_GEMINI_FLASH_LITE_IMAGE_MODEL]: {
    endpoint:
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    usageProvider: "google",
    keyName: "google",
    wire: "chat.completions",
    agentRunHosted: true,
  },
  // Claude models -> DeepInfra（server agentRun 侧未分流，保持 no upstream route 报错）
  [PLATFORM_HOSTED_CLAUDE_SONNET_5_MODEL]: {
    endpoint: "https://api.deepinfra.com/v1/openai/chat/completions",
    usageProvider: "deepinfra",
    keyName: "deepinfra",
    wire: "chat.completions",
    agentRunHosted: false,
  },
  [PLATFORM_HOSTED_CLAUDE_OPUS_5_MODEL]: {
    endpoint: "https://api.deepinfra.com/v1/openai/chat/completions",
    usageProvider: "deepinfra",
    keyName: "deepinfra",
    wire: "chat.completions",
    agentRunHosted: false,
  },
  [PLATFORM_HOSTED_CLAUDE_FABLE_5_MODEL]: {
    endpoint: "https://api.deepinfra.com/v1/openai/chat/completions",
    usageProvider: "deepinfra",
    keyName: "deepinfra",
    wire: "chat.completions",
    agentRunHosted: false,
  },
  // Grok -> xAI（server agentRun 侧未分流，保持 no upstream route 报错）
  [PLATFORM_HOSTED_GROK_4_6_MODEL]: {
    endpoint: "https://api.x.ai/v1/chat/completions",
    usageProvider: "xai",
    keyName: "xai",
    wire: "chat.completions",
    agentRunHosted: false,
  },
  // OpenAI Image -> OpenAI Responses API
  [PLATFORM_HOSTED_OPENAI_IMAGE_MODEL]: {
    endpoint: "https://api.openai.com/v1/responses",
    usageProvider: "openai",
    keyName: "openai",
    wire: "responses",
    agentRunHosted: true,
  },
  // DeepSeek Flash / Vision / Pro -> DeepSeek Responses API（agentRun 走专用 responses 编排）
  [PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL]: {
    endpoint: "https://api.deepseek.com/responses",
    usageProvider: "deepseek",
    keyName: "deepseek",
    wire: "responses",
    agentRunHosted: false,
  },
  [PLATFORM_HOSTED_DEEPSEEK_FLASH_VISION_EXP_MODEL]: {
    endpoint: "https://api.deepseek.com/responses",
    usageProvider: "deepseek",
    keyName: "deepseek",
    wire: "responses",
    agentRunHosted: false,
  },
  [PLATFORM_HOSTED_DEEPSEEK_PRO_MODEL]: {
    endpoint: "https://api.deepseek.com/responses",
    usageProvider: "deepseek",
    keyName: "deepseek",
    wire: "responses",
    agentRunHosted: false,
  },
};

/**
 * 查询平台托管模型的路由配置。
 * 若模型未在托管表中注册，返回 undefined。
 */
export function resolvePlatformHostedRouting(
  model?: string | null,
): PlatformHostedRoutingEntry | undefined {
  const normalized = asTrimmedLowercaseString(model);
  if (!normalized) return undefined;
  return PLATFORM_HOSTED_ROUTING_TABLE[normalized];
}
