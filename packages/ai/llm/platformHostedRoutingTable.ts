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
// 2026-09 新一代 Claude（广场只上架最新一代）：DeepInfra 官方模型名与平台
// 模型名同名（anthropic/claude-* 前缀是 DeepInfra 的官方 id 形态）。
export const PLATFORM_HOSTED_CLAUDE_OPUS_5_5_MODEL = "anthropic/claude-opus-5-5";
export const PLATFORM_HOSTED_CLAUDE_FABLE_5_1_MODEL = "anthropic/claude-fable-5-1";
// Claude Sonnet 5.5（2026-09-28 发布）：与 Sonnet 5 同价，替换上一代 Sonnet 5 上架。
export const PLATFORM_HOSTED_CLAUDE_SONNET_5_5_MODEL =
  "anthropic/claude-sonnet-5-5";

/**
 * Cloudflare Workers AI / AI Gateway 上游官方 Catalog 模型 ID。
 * 标点对齐：
 * - 平台内部常量保留 haiku-4-5 / opus-5-5 / fable-5-1 的连字符定义；
 * - CF 官方上游模型 ID 对小版本使用点号（如 claude-haiku-4.5、claude-opus-5.5、claude-fable-5.1）。
 */
export const CLOUDFLARE_CLAUDE_SONNET_5_UPSTREAM_MODEL_ID =
  "anthropic/claude-sonnet-5";
export const CLOUDFLARE_CLAUDE_OPUS_5_UPSTREAM_MODEL_ID =
  "anthropic/claude-opus-5";
export const CLOUDFLARE_CLAUDE_FABLE_5_UPSTREAM_MODEL_ID =
  "anthropic/claude-fable-5";
export const CLOUDFLARE_CLAUDE_HAIKU_45_UPSTREAM_MODEL_ID =
  "anthropic/claude-haiku-4.5";
export const CLOUDFLARE_CLAUDE_OPUS_5_5_UPSTREAM_MODEL_ID =
  "anthropic/claude-opus-5.5";
export const CLOUDFLARE_CLAUDE_FABLE_5_1_UPSTREAM_MODEL_ID =
  "anthropic/claude-fable-5.1";
export const CLOUDFLARE_CLAUDE_SONNET_5_5_UPSTREAM_MODEL_ID =
  "anthropic/claude-sonnet-5.5";

/**
 * Cloudflare AI 统一 Messages 端点占位模板。
 * 静态真值表由浏览器/服务端共享，禁止在模块求值时读取 process.env 也不得硬编码测试账号。
 * 契约：后续 integration 运行时由服务端 resolver 将 `{account}` 替换为 CLOUDFLARE_ACCOUNT_ID。
 */
export const CLOUDFLARE_AI_MESSAGES_ENDPOINT_TEMPLATE =
  "https://api.cloudflare.com/client/v4/accounts/{account}/ai/v1/messages";
export const PLATFORM_HOSTED_GROK_4_6_MODEL = "grok-4.6";
export const PLATFORM_HOSTED_GPT_6_ASTRA_MODEL = "gpt-6-astra";
export const PLATFORM_HOSTED_GPT_6_LUNA_MODEL = "gpt-6-luna";
export const PLATFORM_HOSTED_GPT_56_SOL_MODEL = "gpt-5.6-sol";
export const PLATFORM_HOSTED_GPT_56_TERRA_MODEL = "gpt-5.6-terra";
export const PLATFORM_HOSTED_GPT_56_LUNA_MODEL = "gpt-5.6-luna";
/**
 * GPT-6.1 Sol（2026-10-13 收进广场）：上游走 Cloudflare AI（Responses 协议）。
 * CF 官方 catalog id 是 `openai/gpt-6.1-sol`（见下方 CLOUDFLARE_GPT_*_UPSTREAM_MODEL_ID 与
 * CLOUDFLARE_AI_RESPONSES_ENDPOINT_TEMPLATE），与平台 id 不同名 → 必须显式 remap，
 * 不得隐式拼接 `openai/` 前缀。
 * 官方页：developers.cloudflare.com/ai/models/openai/gpt-6.1-sol/（2026-10-13 核对）。
 */
export const PLATFORM_HOSTED_GPT_6_1_SOL_MODEL = "gpt-6.1-sol";
export const PLATFORM_HOSTED_KIMI_K26_OPENROUTER_MODEL_ID = "qwen/qwen3.8-27b";
export const PLATFORM_HOSTED_GLM_53_MODEL = "glm-5.3";
export const PLATFORM_HOSTED_GLM_52_MODEL = "glm-5.2";
export const PLATFORM_HOSTED_GLM_53_FLASH_MODEL = "glm-5-3-flash";
export const PLATFORM_HOSTED_GEMINI_38_FLASH_MODEL = "gemini-3.8-flash";
export const PLATFORM_HOSTED_GEMINI_37_FLASH_MODEL = "gemini-3.7-flash";
export const PLATFORM_HOSTED_GEMINI_25_PRO_MODEL = "gemini-2.5-pro";
export const PLATFORM_HOSTED_GEMINI_4_ARGON_MODEL = "gemini-4-argon";
export const PLATFORM_HOSTED_GEMINI_FLASH_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
export const PLATFORM_HOSTED_GEMINI_PRO_IMAGE_MODEL = "gemini-3-pro-image-preview";
export const PLATFORM_HOSTED_GEMINI_FLASH_LITE_IMAGE_MODEL = "gemini-3.1-flash-lite-image";
export const PLATFORM_HOSTED_OPENAI_IMAGE_MODEL = "gpt-image-2";
/**
 * MiMo V2.6 系（小米官方按量计费 API）：模型 id 与上游一致（直传，不 remap）。
 * 上游为 OpenAI 兼容 chat.completions，鉴权头是 `api-key`（见
 * agent-runtime/providerResolution.ts 的 endpoint→header 推断）。
 */
export const PLATFORM_HOSTED_MIMO_FLASH_MODEL = "mimo-v2.6-flash";
export const PLATFORM_HOSTED_MIMO_PRO_MODEL = "mimo-v2.6-pro";
export const PLATFORM_HOSTED_MIMO_PRO_ULTRASPEED_MODEL =
  "mimo-v2.6-pro-ultraspeed";

export const PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL = "deepseek-flash";
/** @deprecated use PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL */
export const PLATFORM_HOSTED_DEEPSEEK_FLASH_VISION_EXP_MODEL = "deepseek-v4-flash-vision-exp";
export const PLATFORM_HOSTED_DEEPSEEK_PRO_MODEL = "deepseek-v4-pro";
/** @deprecated use PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL */
export const PLATFORM_HOSTED_LEGACY_DEEPSEEK_V4_FLASH_MODEL = "deepseek-v4-flash";

/**
 * Cloudflare Workers AI / AI Gateway 上游官方 Catalog 模型 ID（GPT 文本系）。
 * CF 官方模型名是 `author/model` 形态的 catalog id，与平台 id 不同名
 * （平台 `gpt-6-astra` ↔ 上游 `openai/gpt-6-astra`，`gpt-6.1-sol` ↔ `openai/gpt-6.1-sol`），
 * 因此必须逐条显式声明，不得在运行时隐式拼接前缀。
 * 来源：developers.cloudflare.com/ai/models/openai/<model>/（2026-10-13 核对）。
 */
export const CLOUDFLARE_GPT_6_ASTRA_UPSTREAM_MODEL_ID = "openai/gpt-6-astra";
export const CLOUDFLARE_GPT_6_LUNA_UPSTREAM_MODEL_ID = "openai/gpt-6-luna";
export const CLOUDFLARE_GPT_56_SOL_UPSTREAM_MODEL_ID = "openai/gpt-5.6-sol";
export const CLOUDFLARE_GPT_56_TERRA_UPSTREAM_MODEL_ID = "openai/gpt-5.6-terra";
export const CLOUDFLARE_GPT_56_LUNA_UPSTREAM_MODEL_ID = "openai/gpt-5.6-luna";
export const CLOUDFLARE_GPT_6_1_SOL_UPSTREAM_MODEL_ID = "openai/gpt-6.1-sol";

/**
 * Cloudflare AI 统一 Responses 端点占位模板（GPT 文本系）。
 * 静态真值表由浏览器/服务端共享，禁止在模块求值时读取 process.env 也不得硬编码测试账号。
 * 契约：后续 integration 运行时由服务端 resolver 将 `{account}` 替换为 CLOUDFLARE_ACCOUNT_ID。
 */
export const CLOUDFLARE_AI_RESPONSES_ENDPOINT_TEMPLATE =
  "https://api.cloudflare.com/client/v4/accounts/{account}/ai/v1/responses";

/**
 * 平台托管上游 id（credential / usage 白名单 / keyName 共用）。
 * 每个成员都必须是 getNoloKey / 凭据解析接受的真实上游 provider。
 * `cloudflare` 复用 getNoloKey 的 CLOUDFLARE_API_TOKEN 分支（本分支已存在，未改动）。
 */
export type PlatformHostedUpstreamId =
  | "deepinfra"
  | "xai"
  | "openrouter"
  | "runinfra"
  | "baseten"
  | "google"
  | "openai"
  | "deepseek"
  | "mimo"
  | "cloudflare";

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
  readonly wire: "chat.completions" | "responses" | "anthropic.messages";
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
  // 同一模型的旧公开 id（点号）：RunInfra 只认连字符 id，必须显式 remap，
  // 否则会把 "glm-5.3-flash" 直传给上游并拿到
  // `Model 'glm-5.3-flash' is not available as a verified deployment`（404）。
  "glm-5.3-flash": {
    endpoint: "https://api.runinfra.ai/v1/chat/completions",
    usageProvider: "runinfra",
    keyName: "runinfra",
    upstreamModelId: PLATFORM_HOSTED_GLM_53_FLASH_MODEL,
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
  // Gemini 4 Argon -> Google official OpenAI-compatible endpoint
  [PLATFORM_HOSTED_GEMINI_4_ARGON_MODEL]: {
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
  // Claude 系（Cloudflare Workers AI 上游，遵循 Anthropic Messages 协议）：
  // 端点使用统一 accounts/{account}/ai/v1/messages 占位模板，上游使用官方 Catalog ID；
  // 专用分支按 agentRunHosted 开关放行，缺 CF 凭据/账号在任何 fetch 前显式失败。
  [PLATFORM_HOSTED_CLAUDE_SONNET_5_MODEL]: {
    endpoint: CLOUDFLARE_AI_MESSAGES_ENDPOINT_TEMPLATE,
    usageProvider: "cloudflare",
    keyName: "cloudflare",
    upstreamModelId: CLOUDFLARE_CLAUDE_SONNET_5_UPSTREAM_MODEL_ID,
    wire: "anthropic.messages",
    agentRunHosted: true,
  },
  [PLATFORM_HOSTED_CLAUDE_OPUS_5_MODEL]: {
    endpoint: CLOUDFLARE_AI_MESSAGES_ENDPOINT_TEMPLATE,
    usageProvider: "cloudflare",
    keyName: "cloudflare",
    upstreamModelId: CLOUDFLARE_CLAUDE_OPUS_5_UPSTREAM_MODEL_ID,
    wire: "anthropic.messages",
    agentRunHosted: true,
  },
  [PLATFORM_HOSTED_CLAUDE_FABLE_5_MODEL]: {
    endpoint: CLOUDFLARE_AI_MESSAGES_ENDPOINT_TEMPLATE,
    usageProvider: "cloudflare",
    keyName: "cloudflare",
    upstreamModelId: CLOUDFLARE_CLAUDE_FABLE_5_UPSTREAM_MODEL_ID,
    wire: "anthropic.messages",
    agentRunHosted: true,
  },
  [PLATFORM_HOSTED_CLAUDE_HAIKU_45_MODEL]: {
    endpoint: CLOUDFLARE_AI_MESSAGES_ENDPOINT_TEMPLATE,
    usageProvider: "cloudflare",
    keyName: "cloudflare",
    upstreamModelId: CLOUDFLARE_CLAUDE_HAIKU_45_UPSTREAM_MODEL_ID,
    wire: "anthropic.messages",
    agentRunHosted: true,
  },
  // 新一代 Claude（2026-09-24 收进广场）：同 Cloudflare 通道、官方 Catalog ID。
  [PLATFORM_HOSTED_CLAUDE_OPUS_5_5_MODEL]: {
    endpoint: CLOUDFLARE_AI_MESSAGES_ENDPOINT_TEMPLATE,
    usageProvider: "cloudflare",
    keyName: "cloudflare",
    upstreamModelId: CLOUDFLARE_CLAUDE_OPUS_5_5_UPSTREAM_MODEL_ID,
    wire: "anthropic.messages",
    agentRunHosted: true,
  },
  [PLATFORM_HOSTED_CLAUDE_FABLE_5_1_MODEL]: {
    endpoint: CLOUDFLARE_AI_MESSAGES_ENDPOINT_TEMPLATE,
    usageProvider: "cloudflare",
    keyName: "cloudflare",
    upstreamModelId: CLOUDFLARE_CLAUDE_FABLE_5_1_UPSTREAM_MODEL_ID,
    wire: "anthropic.messages",
    agentRunHosted: true,
  },
  // Claude Sonnet 5.5（2026-09-28 发布，与 opus-5-5 同通道同协议）：
  // 目录侧它以新 id 上架，补齐这条路由；上一代 sonnet-5 的路由条目**保留**，
  // 供存量记录继续解析上游（下架 ≠ 删除）。
  [PLATFORM_HOSTED_CLAUDE_SONNET_5_5_MODEL]: {
    endpoint: CLOUDFLARE_AI_MESSAGES_ENDPOINT_TEMPLATE,
    usageProvider: "cloudflare",
    keyName: "cloudflare",
    upstreamModelId: CLOUDFLARE_CLAUDE_SONNET_5_5_UPSTREAM_MODEL_ID,
    wire: "anthropic.messages",
    agentRunHosted: true,
  },
  // GPT-6 / GPT-6.1 / GPT-5.6 文本系（Cloudflare AI 上游，Responses 协议）：
  // 平台价仍按短上下文价目定（长上下文档差价由平台吸收），见 platformHosted.ts；
  // 计价口径不随上游迁移变化，对客价目不动。
  //
  // ⚠️ 隔离改动（2026-10-13）：catalog-only 路由切换，**未启用生产**。
  // endpoint 是账号作用域占位模板（含字面量 `{account}`），必须由运行时 resolver 用
  // CLOUDFLARE_ACCOUNT_ID 替换、并按 Responses wire 组装请求体；而旧消费者
  // （server agentRun / chatProxy / agent-runtime platformProviderEndpoints）尚未具备该能力
  // —— 它们会把 OpenAI chat.completions 形状的 body POST 到这个模板 URL，或用字面量
  // `{account}` 直接发请求。因此在 wire adapter + account 替换 + 专用 wire 门控合入前，
  // 集成块（2026-10-13）已为 server agentRun 加专用 wire 分支：这 6 条（含兼容别名 id）
  // 的 agentRunHosted 翻为 true，专用分支按该开关放行、token/账号缺一在任何 fetch 前显式失败；
  [PLATFORM_HOSTED_GPT_6_ASTRA_MODEL]: {
    endpoint: CLOUDFLARE_AI_RESPONSES_ENDPOINT_TEMPLATE,
    usageProvider: "cloudflare",
    keyName: "cloudflare",
    upstreamModelId: CLOUDFLARE_GPT_6_ASTRA_UPSTREAM_MODEL_ID,
    wire: "responses",
    agentRunHosted: true,
  },
  // GPT-6 Luna（2026-09-22 随 GPT-6 Sol/Luna 上线）：CF catalog id `openai/gpt-6-luna`。
  [PLATFORM_HOSTED_GPT_6_LUNA_MODEL]: {
    endpoint: CLOUDFLARE_AI_RESPONSES_ENDPOINT_TEMPLATE,
    usageProvider: "cloudflare",
    keyName: "cloudflare",
    upstreamModelId: CLOUDFLARE_GPT_6_LUNA_UPSTREAM_MODEL_ID,
    wire: "responses",
    agentRunHosted: true,
  },
  // gpt-5.6-sol 不再单独建条目：它是 gpt-6.1-sol 的兼容别名
  // （PLATFORM_MODEL_ALIASES），resolvePlatformHostedRouting 解析到 6.1 的条目。
  [PLATFORM_HOSTED_GPT_56_TERRA_MODEL]: {
    endpoint: CLOUDFLARE_AI_RESPONSES_ENDPOINT_TEMPLATE,
    usageProvider: "cloudflare",
    keyName: "cloudflare",
    upstreamModelId: CLOUDFLARE_GPT_56_TERRA_UPSTREAM_MODEL_ID,
    wire: "responses",
    agentRunHosted: true,
  },
  [PLATFORM_HOSTED_GPT_56_LUNA_MODEL]: {
    endpoint: CLOUDFLARE_AI_RESPONSES_ENDPOINT_TEMPLATE,
    usageProvider: "cloudflare",
    keyName: "cloudflare",
    upstreamModelId: CLOUDFLARE_GPT_56_LUNA_UPSTREAM_MODEL_ID,
    wire: "responses",
    agentRunHosted: true,
  },
  // GPT-6.1 Sol（2026-10-13 新增）：CF 官方页只声明「Responses, Chat Completions」
  // 两种请求格式与 reasoning_effort；本表按 Responses 统一线走。
  [PLATFORM_HOSTED_GPT_6_1_SOL_MODEL]: {
    endpoint: CLOUDFLARE_AI_RESPONSES_ENDPOINT_TEMPLATE,
    usageProvider: "cloudflare",
    keyName: "cloudflare",
    upstreamModelId: CLOUDFLARE_GPT_6_1_SOL_UPSTREAM_MODEL_ID,
    wire: "responses",
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
  // MiMo V2.6 系 -> 小米官方按量计费 API（api.xiaomimimo.com，key 用 MIMO_API_KEY）。
  // 模型 id 与上游一致，无 upstreamModelId（直传，不做 remap）；
  // wire 是 chat.completions（不是 responses 特例，走通用 hostedRoute 分支）。
  //
  // 上游事实（mimo.mi.com 官方文档 /api/chat/openai-api，2026-09-20 版）：
  // - `thinking.type` 默认 enabled；平台未显式开启思考时补 {type:"disabled"}
  //   （判据同时认 provider=mimo / xiaomimimo.com 端点与下面的托管模型 id）；
  // - 同时兼容 `max_tokens` 与 `max_completion_tokens`（实测 200 OK）；文档
  //   未提及 `stream_options` / `include_usage`——平台因此不请求
  //   include_usage，usage 由响应体自带（含 prompt_tokens_details.cached_tokens，
  //   缓存命中按 inputCacheHit 价计入积分）；
  // - 1M 上下文 / 128K 最大输出 / 文本+图+音视频输入（全模态理解）。
  [PLATFORM_HOSTED_MIMO_FLASH_MODEL]: {
    endpoint: "https://api.xiaomimimo.com/v1/chat/completions",
    usageProvider: "mimo",
    keyName: "mimo",
    wire: "chat.completions",
    agentRunHosted: true,
  },
  [PLATFORM_HOSTED_MIMO_PRO_MODEL]: {
    endpoint: "https://api.xiaomimimo.com/v1/chat/completions",
    usageProvider: "mimo",
    keyName: "mimo",
    wire: "chat.completions",
    agentRunHosted: true,
  },
  [PLATFORM_HOSTED_MIMO_PRO_ULTRASPEED_MODEL]: {
    endpoint: "https://api.xiaomimimo.com/v1/chat/completions",
    usageProvider: "mimo",
    keyName: "mimo",
    wire: "chat.completions",
    agentRunHosted: true,
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
 * 平台模型兼容别名（单一声明，owner 2026-10-13 明确授权）。
 *
 * 语义：旧 id 继续被接受（不报错、不拒绝），但**执行与计费一律落到实际模型**
 * ——上游调用换用实际模型的 catalog id，记账/定价用实际模型目录价。原始请求 id
 * 原样留在记录里（`billing_model` 诊断字段），映射是显式记录而非隐藏。
 *
 * 作用域（platform-scoped）：只在**平台托管**请求上生效（provider 为平台托管，
 * 且无自定义端点 / 自带 key）。BYOK / custom / OAuth 的旧 model id 打的是用户
 * 自己的上游，不做任何重映射。
 *
 * 单一真值：路由（resolvePlatformHostedRouting）、上游 id 解析
 * （resolveCloudflareGptUpstreamModelId）、计费目标（resolveBillingTarget）
 * 都只从这里读，禁止各写一份。
 */
export type PlatformModelAlias = {
  /** 实际执行 / 计费使用的平台模型 id。 */
  readonly aliasOf: string;
  readonly since: string;
  readonly reason: string;
};

export const PLATFORM_MODEL_ALIASES: Readonly<
  Record<string, PlatformModelAlias>
> = {
  [PLATFORM_HOSTED_GPT_56_SOL_MODEL]: {
    aliasOf: PLATFORM_HOSTED_GPT_6_1_SOL_MODEL,
    since: "2026-10-13",
    reason:
      "CF 官方目录换代：gpt-5.6-sol 由 gpt-6.1-sol 承接（owner 授权透明映射，按 6.1 计费）。",
  },
};

/** 旧 id 的别名声明（无别名 / 未知 id 返回 undefined）。 */
export function resolvePlatformModelAlias(
  model?: string | null,
): PlatformModelAlias | undefined {
  const normalized = asTrimmedLowercaseString(model);
  if (!normalized) return undefined;
  return PLATFORM_MODEL_ALIASES[normalized];
}

/** 实际执行 / 计费模型 id（无别名时返回原 id；空值返回 undefined）。 */
export function resolvePlatformEffectiveModel(
  model?: string | null,
): string | undefined {
  const normalized = asTrimmedLowercaseString(model);
  if (!normalized) return undefined;
  return PLATFORM_MODEL_ALIASES[normalized]?.aliasOf ?? normalized;
}

/**
 * 查询平台托管模型的路由配置。
 * 若模型未在托管表中注册，返回 undefined。
 *
 * 兼容别名（PLATFORM_MODEL_ALIASES）在这里解析到**实际模型**的条目：旧 id 拿到
 * 的上游/端点与 6.1 完全一致，未知 id 也不会穿透到内置 / 客户端路由。
 */
export function resolvePlatformHostedRouting(
  model?: string | null,
): PlatformHostedRoutingEntry | undefined {
  const effective = resolvePlatformEffectiveModel(model);
  if (!effective) return undefined;
  return PLATFORM_HOSTED_ROUTING_TABLE[effective];
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
