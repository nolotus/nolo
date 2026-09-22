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
export const PLATFORM_HOSTED_CLAUDE_HAIKU_45_MODEL = "anthropic/claude-haiku-4-5";
export const PLATFORM_HOSTED_GROK_4_6_MODEL = "grok-4.6";
export const PLATFORM_HOSTED_GPT_6_ASTRA_MODEL = "gpt-6-astra";
export const PLATFORM_HOSTED_GPT_56_SOL_MODEL = "gpt-5.6-sol";
export const PLATFORM_HOSTED_GPT_56_TERRA_MODEL = "gpt-5.6-terra";
export const PLATFORM_HOSTED_GPT_56_LUNA_MODEL = "gpt-5.6-luna";
export const PLATFORM_HOSTED_KIMI_K26_OPENROUTER_MODEL_ID = "qwen/qwen3.8-27b";
export const PLATFORM_HOSTED_GLM_53_MODEL = "glm-5.3";
export const PLATFORM_HOSTED_GLM_52_MODEL = "glm-5.2";
export const PLATFORM_HOSTED_GLM_53_FLASH_MODEL = "glm-5-3-flash";
export const PLATFORM_HOSTED_GEMINI_38_FLASH_MODEL = "gemini-3.8-flash";
export const PLATFORM_HOSTED_GEMINI_37_FLASH_MODEL = "gemini-3.7-flash";
export const PLATFORM_HOSTED_GEMINI_25_PRO_MODEL = "gemini-2.5-pro";
export const PLATFORM_HOSTED_GEMINI_31_PRO_MODEL = "gemini-3.1-pro";
export const PLATFORM_HOSTED_GEMINI_FLASH_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
export const PLATFORM_HOSTED_GEMINI_PRO_IMAGE_MODEL = "gemini-3-pro-image-preview";
export const PLATFORM_HOSTED_GEMINI_FLASH_LITE_IMAGE_MODEL = "gemini-3.1-flash-lite-image";
export const PLATFORM_HOSTED_OPENAI_IMAGE_MODEL = "gpt-image-2";
export const PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL = "deepseek-flash";
/** @deprecated use PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL */
export const PLATFORM_HOSTED_DEEPSEEK_FLASH_VISION_EXP_MODEL = "deepseek-v4-flash-vision-exp";
export const PLATFORM_HOSTED_DEEPSEEK_PRO_MODEL = "deepseek-v4-pro";
/** @deprecated use PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL */
export const PLATFORM_HOSTED_LEGACY_DEEPSEEK_V4_FLASH_MODEL = "deepseek-v4-flash";

/**
 * 平台托管上游 id（credential / usage 白名单 / keyName 共用）。
 * 每个成员都必须是 getNoloKey / 凭据解析接受的真实上游 provider。
 */
export type PlatformHostedUpstreamId =
  | "deepinfra"
  | "xai"
  | "openrouter"
  | "runinfra"
  | "baseten"
  | "google"
  | "openai"
  | "deepseek";

/**
 * Kimi K3 的最低客户端版本。
 *
 * 定值依据（可核）：K3 的 wire 要求一组专属 quirk —— 删掉通用采样参数
 * （temperature / top_p / frequency_penalty / presence_penalty）并把
 * max_tokens 改写成 max_completion_tokens，见
 * packages/integrations/openai/providerBodyCompatibility.ts。
 * 这份 quirk 补齐「本地直连出口」的修复是 853dbdd5e（fix(agent): 平台托管
 * K3 本地直连 quirk 缺失与 usage provider 双出口统一），`git tag --contains
 * 853dbdd5e` 的最早 CLI tag 是 cli-v0.38.0-alpha.4。
 * 也就是说 0.38.0-alpha.4 之前的客户端本地直连 K3 必断（2026-08-29 事故的
 * 根因形态：连续截断 + 照常扣积分）。
 */
export const PLATFORM_HOSTED_KIMI_K3_MIN_CLIENT_VERSION = "0.38.0-alpha.4";

/**
 * GLM 5.3 Flash 的最低客户端版本。
 *
 * 定值依据（可核）：闸门比对的是 CLI 版本线（NOLO_CLI_VERSION / 请求头
 * x-nolo-client-version）。0.33.0-alpha.1 是首个包含 d8e52b3b8
 * （parse platform chat completion body by payload shape）修复的 CLI tag
 * （`git tag --contains d8e52b3b8`）。
 * 低于它的客户端（包括 0.32.0 stable 等历史版本）解析 chat.completion body 会
 * 丢正文导致静默空轮。
 */
export const PLATFORM_HOSTED_GLM_53_FLASH_MIN_CLIENT_VERSION = "0.33.0-alpha.1";

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
  /**
   * 使用该托管模型所需的最低客户端版本（semver，见 core/clientVersionGate）。
   *
   * 标注判据：模型有**专属 quirk 或 wire 特殊性**，旧客户端的内置路由/请求体
   * 构造不认识它、选中即撞（连续截断/400），才需要标。没有特殊性的模型不标
   * （YAGNI）—— 多标一个就是多一条会随客户端发版腐化的约束。
   *
   * 两处消费：
   * 1. 目录层：随模型列表下发给客户端，新客户端可据此置灰 + 提示升级；
   * 2. 使用层：server（chatHandler / agentRun）按请求头 x-nolo-client-version
   *    拒绝，本地 runtime 按自身版本 self-check 后不发起上游调用。
   *
   * 只对平台托管模型（provider=nolo 家族）生效。用户自定义模型 / OAuth 订阅
   * 模型走用户自己的凭据与选择，平台不设闸。
   */
  readonly minClientVersion?: string;
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
  // GLM 5.3 & GLM 5.2 -> Baseten（inference.baseten.co）
  [PLATFORM_HOSTED_GLM_53_MODEL]: {
    endpoint: "https://inference.baseten.co/v1/chat/completions",
    usageProvider: "baseten",
    keyName: "baseten",
    // Baseten model library 的官方 id
    upstreamModelId: "zai-org/GLM-5.3",
    wire: "chat.completions",
    agentRunHosted: true,
  },
  [PLATFORM_HOSTED_GLM_52_MODEL]: {
    endpoint: "https://inference.baseten.co/v1/chat/completions",
    usageProvider: "baseten",
    keyName: "baseten",
    // legacy 5.2 显式 remap 到 baseten 的 zai-org/GLM-5.3，不得透传 "glm-5.2"
    upstreamModelId: "zai-org/GLM-5.3",
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
    minClientVersion: PLATFORM_HOSTED_GLM_53_FLASH_MIN_CLIENT_VERSION,
  },
  "glm-5.3-flash": {
    endpoint: "https://api.runinfra.ai/v1/chat/completions",
    usageProvider: "runinfra",
    keyName: "runinfra",
    wire: "chat.completions",
    agentRunHosted: true,
    minClientVersion: PLATFORM_HOSTED_GLM_53_FLASH_MIN_CLIENT_VERSION,
  },
  // Kimi K3 -> Baseten（inference.baseten.co；model library 的 moonshotai/Kimi-K3）
  // wire 要求专属 body quirk（删采样参数 + max_completion_tokens），旧客户端本地直连必断。
  [PLATFORM_HOSTED_KIMI_K3_MODEL]: {
    endpoint: "https://inference.baseten.co/v1/chat/completions",
    usageProvider: "baseten",
    keyName: "baseten",
    upstreamModelId: "moonshotai/Kimi-K3",
    wire: "chat.completions",
    agentRunHosted: true,
    minClientVersion: PLATFORM_HOSTED_KIMI_K3_MIN_CLIENT_VERSION,
  },
  // Gemini 3.8 Flash -> Google official OpenAI-compatible endpoint
  [PLATFORM_HOSTED_GEMINI_38_FLASH_MODEL]: {
    endpoint:
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    usageProvider: "google",
    keyName: "google",
    wire: "chat.completions",
    agentRunHosted: true,
  },
  // Gemini 3.7 Flash -> Google official OpenAI-compatible endpoint (historical compat)
  [PLATFORM_HOSTED_GEMINI_37_FLASH_MODEL]: {
    endpoint:
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    usageProvider: "google",
    keyName: "google",
    wire: "chat.completions",
    agentRunHosted: true,
  },
  // Gemini 2.5 Pro -> Google official OpenAI-compatible endpoint
  [PLATFORM_HOSTED_GEMINI_25_PRO_MODEL]: {
    endpoint:
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    usageProvider: "google",
    keyName: "google",
    wire: "chat.completions",
    agentRunHosted: true,
  },
  // Gemini 3.1 Pro -> Google official OpenAI-compatible endpoint
  [PLATFORM_HOSTED_GEMINI_31_PRO_MODEL]: {
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
  // Claude 系（真实模型）：DeepInfra 官方 id 与平台 id 同名，无需重映射。
  // DeepInfra 这批模型无缓存价（rate_per_input_token_cached=null），计费侧对
  // 无 inputCacheHit 的 deepinfra 模型按 input 全价计（见 calculatePrice）。
  [PLATFORM_HOSTED_CLAUDE_SONNET_5_MODEL]: {
    endpoint: "https://api.deepinfra.com/v1/openai/chat/completions",
    usageProvider: "deepinfra",
    keyName: "deepinfra",
    upstreamModelId: PLATFORM_HOSTED_CLAUDE_SONNET_5_MODEL,
    wire: "chat.completions",
    agentRunHosted: true,
  },
  [PLATFORM_HOSTED_CLAUDE_OPUS_5_MODEL]: {
    endpoint: "https://api.deepinfra.com/v1/openai/chat/completions",
    usageProvider: "deepinfra",
    keyName: "deepinfra",
    upstreamModelId: PLATFORM_HOSTED_CLAUDE_OPUS_5_MODEL,
    wire: "chat.completions",
    agentRunHosted: true,
  },
  [PLATFORM_HOSTED_CLAUDE_FABLE_5_MODEL]: {
    endpoint: "https://api.deepinfra.com/v1/openai/chat/completions",
    usageProvider: "deepinfra",
    keyName: "deepinfra",
    upstreamModelId: PLATFORM_HOSTED_CLAUDE_FABLE_5_MODEL,
    wire: "chat.completions",
    agentRunHosted: true,
  },
  [PLATFORM_HOSTED_CLAUDE_HAIKU_45_MODEL]: {
    endpoint: "https://api.deepinfra.com/v1/openai/chat/completions",
    usageProvider: "deepinfra",
    keyName: "deepinfra",
    upstreamModelId: PLATFORM_HOSTED_CLAUDE_HAIKU_45_MODEL,
    wire: "chat.completions",
    agentRunHosted: true,
  },
  // GPT-6 / GPT-5.6 系（OpenAI 官方 chat.completions）：
  // 平台价按短上下文价目定（长上下文档差价由平台吸收），见 platformHosted.ts。
  [PLATFORM_HOSTED_GPT_6_ASTRA_MODEL]: {
    endpoint: "https://api.openai.com/v1/chat/completions",
    usageProvider: "openai",
    keyName: "openai",
    wire: "chat.completions",
    agentRunHosted: true,
  },
  [PLATFORM_HOSTED_GPT_56_SOL_MODEL]: {
    endpoint: "https://api.openai.com/v1/chat/completions",
    usageProvider: "openai",
    keyName: "openai",
    wire: "chat.completions",
    agentRunHosted: true,
  },
  [PLATFORM_HOSTED_GPT_56_TERRA_MODEL]: {
    endpoint: "https://api.openai.com/v1/chat/completions",
    usageProvider: "openai",
    keyName: "openai",
    wire: "chat.completions",
    agentRunHosted: true,
  },
  [PLATFORM_HOSTED_GPT_56_LUNA_MODEL]: {
    endpoint: "https://api.openai.com/v1/chat/completions",
    usageProvider: "openai",
    keyName: "openai",
    wire: "chat.completions",
    agentRunHosted: true,
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
  // DeepSeek Flash -> DeepSeek Responses API（agentRun 走专用 responses 编排）
  [PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL]: {
    endpoint: "https://api.deepseek.com/responses",
    usageProvider: "deepseek",
    keyName: "deepseek",
    wire: "responses",
    agentRunHosted: false,
  },
  // Legacy DeepSeek model aliases -> remap upstreamModelId to deepseek-flash
  [PLATFORM_HOSTED_LEGACY_DEEPSEEK_V4_FLASH_MODEL]: {
    endpoint: "https://api.deepseek.com/responses",
    usageProvider: "deepseek",
    keyName: "deepseek",
    upstreamModelId: PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL,
    wire: "responses",
    agentRunHosted: false,
  },
  [PLATFORM_HOSTED_DEEPSEEK_FLASH_VISION_EXP_MODEL]: {
    endpoint: "https://api.deepseek.com/responses",
    usageProvider: "deepseek",
    keyName: "deepseek",
    upstreamModelId: PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL,
    wire: "responses",
    agentRunHosted: false,
  },
  // DeepSeek V4 Pro -> 官方 DeepSeek Responses API（2026-09-14 起官方继续提供
  // V4 Pro，model id 直传，不再 remap 到 flash）。
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

/**
 * 查询平台托管模型要求的最低客户端版本。
 * 未注册 / 未门控的模型返回 undefined（= 不设闸）。
 *
 * 这是「目录标注」与「使用时拒绝」两层闸门共用的唯一读取口——server、
 * agent-runtime、catalog 都从这里取，避免任何一侧抄一份常量后腐化。
 */
export function resolvePlatformHostedMinClientVersion(
  model?: string | null,
): string | undefined {
  return resolvePlatformHostedRouting(model)?.minClientVersion;
}

/**
 * 判定给定的模型 / URL / provider 是否路由到 RunInfra。
 */
export function isRuninfraRouting(
  model?: string | null,
  endpoint?: string | null,
  provider?: string | null,
): boolean {
  if (provider === "runinfra") return true;
  if (endpoint && /api\.runinfra\.ai/i.test(endpoint)) return true;
  if (provider && provider !== "nolo" && provider !== "runinfra") {
    return false;
  }
  const routing = resolvePlatformHostedRouting(model);
  if (
    routing &&
    (routing.keyName === "runinfra" ||
      routing.usageProvider === "runinfra" ||
      /api\.runinfra\.ai/i.test(routing.endpoint))
  ) {
    return true;
  }
  return false;
}
