/**
 * Pure platform provider endpoint map + OpenAI Responses model detection.
 *
 * Single seam for agentCallPlan (descriptor) and providerResolution (execution)
 * so the endpoint tables / responses heuristic cannot drift.
 */

import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import { getModelConfig } from "../ai/llm/providers";
import {
  isPlatformHostedDeepseekModel,
  isPlatformHostedOpenAIImageModel,
  resolvePlatformHostedRouting,
  type PlatformHostedUpstreamId,
} from "../ai/llm/platformHosted";

export { type PlatformHostedUpstreamId } from "../ai/llm/platformHosted";

export const OPENAI_RESPONSES_ENDPOINT =
  "https://api.openai.com/v1/responses";
export const DEEPSEEK_RESPONSES_ENDPOINT =
  "https://api.deepseek.com/responses";
/** xAI 官方 OpenAI 兼容 chat.completions（平台托管 Grok 的实际上游）。 */
export const XAI_CHAT_COMPLETIONS_ENDPOINT =
  "https://api.x.ai/v1/chat/completions";
/** RunInfra 官方 OpenAI 兼容 chat.completions（平台托管 GLM 5.3 Flash 的实际上游）。 */
export const RUNINFRA_CHAT_COMPLETIONS_ENDPOINT =
  "https://api.runinfra.ai/v1/chat/completions";

/** Known platform chat.completions endpoints keyed by provider id. */
export const PLATFORM_CHAT_COMPLETIONS_ENDPOINTS: Readonly<
  Record<string, string>
> = {
  deepinfra: "https://api.deepinfra.com/v1/openai/chat/completions",
  fireworks: "https://api.fireworks.ai/inference/v1/chat/completions",
  google:
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  // xAI 官方 OpenAI 兼容模式（平台托管 Grok）
  xai: "https://api.x.ai/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  // 千问 AI 平台 OpenAI 兼容模式
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  // Moonshot AI（月之暗面）开放平台 OpenAI 兼容模式（按量计费）
  moonshot: "https://api.moonshot.cn/v1/chat/completions",
  // 阶跃星辰（StepFun）开放平台 OpenAI 兼容模式
  stepfun: "https://api.stepfun.com/v1/chat/completions",
  // 平台托管 GLM 5.3 Flash 的实际上游（RunInfra 独家廉价快档）
  runinfra: "https://api.runinfra.ai/v1/chat/completions",
  // 无 nolo 默认上游：平台托管模型全部显式分流，未识别模型返回 undefined
};

/**
 * Whether a model uses the OpenAI Responses wire format.
 * Mirrors isResponseAPIModel.ts logic without pulling heavier deps.
 */
export function isOpenAiResponsesModel(args: {
  provider?: string;
  model?: string;
  endpointKey?: string;
}): boolean {
  const provider = asTrimmedLowercaseString(args.provider);
  if (provider === "openai") {
    if (args.endpointKey === "responses") return true;
    if (!args.model) return false;
    try {
      return getModelConfig("openai", args.model).endpointKey === "responses";
    } catch {
      return false;
    }
  }
  if (
    provider === "deepseek" ||
    provider === "nolo" ||
    provider === "ollama-cloud"
  ) {
    // 平台托管分流真值表是唯一判据（route.wire），不再维护第二份模型 id 名单：
    // 表里 wire === "responses" 的包括 DeepSeek 系、平台托管 GPT 系（Cloudflare
    // Responses 线，gpt-6/5.6 共 6 条）与 gpt-image-2；MiMo / GLM / Gemini 等待
    // 走 chat.completions 的模型自然是 false。
    const hostedRoute = resolvePlatformHostedRouting(args.model);
    if (hostedRoute) return hostedRoute.wire === "responses";
    // 表外旧记录（legacy DeepSeek 别名等）：保持原判据，别让历史记录掉线。
    if (isPlatformHostedDeepseekModel(args.model)) return true;
    // 平台托管 gpt-image-2：上游 OpenAI Responses（endpointKey=responses）
    if (isPlatformHostedOpenAIImageModel(args.model)) return true;
  }
  return false;
}

/**
 * 平台托管 Responses 线在「客户端拿不到账号作用域上游 URL」时返回的规范平台网关标记。
 *
 * 客户端（CLI / 浏览器 / 桌面端）只是平台代理的消费者：真实上游 URL 由平台服务端用
 * 自己的 `CLOUDFLARE_ACCOUNT_ID` 现算（server 侧 chatProxyRouting 的 CF GPT 分支，
 * 缺账号/凭据由 chatHandler 显式 fail closed）。标记保留 `/responses` 结尾，因为
 * 客户端用它判定 wire 形状（platformChatProvider 的 isResponsesEndpoint）；它本身
 * 不是可拨号地址，服务端对这条线也不会采用客户端传来的 url。
 */
export const PLATFORM_HOSTED_RESPONSES_GATEWAY_MARKER =
  "nolo-platform-gateway://responses";

/**
 * 客户端 chat 网关标记：平台托管 Claude（wire = anthropic.messages）在
 * **proxy 传输**下的逻辑端点。
 *
 * 客户端不能自己拨这条线：真实端点是账号作用域模板
 * `.../accounts/{account}/ai/v1/messages`，账号只在服务端 runtime 解析
 * （server 侧 `resolveCloudflareClaudeMessagesUrl`；缺 account/key 显式 400
 * fail closed）。因此这里返回的只是一个逻辑标记。
 *
 * 标记**不以 `/responses` 结尾**，客户端 platformChatProvider 据此选中 OpenAI
 * chat 形状（chat.completions 请求体 + chat SSE 解析），正好对接服务端已合入的
 * CF Messages → OpenAI chat SSE adapter；它同样不是可拨号地址，服务端对平台托管
 * 请求只用自己的 catalog 端点，绝不采用调用方传来的 url。
 */
export const PLATFORM_HOSTED_CHAT_GATEWAY_MARKER =
  "nolo-platform-gateway://chat";

/**
 * 账号作用域模板里的占位符。只用来识别模板，本模块**绝不**把它写进返回值 ——
 * 那会把一个假 URL 当成真的交给调用方发出去。
 */
const CLOUDFLARE_ACCOUNT_ID_PLACEHOLDER = "{account}";

export function resolvePlatformResponsesEndpoint(
  provider: string,
  model?: string | null,
): string | undefined {
  const normalized = asTrimmedLowercaseString(provider);
  if (normalized === "openai") return OPENAI_RESPONSES_ENDPOINT;
  if (
    normalized === "deepseek" ||
    normalized === "nolo" ||
    normalized === "ollama-cloud"
  ) {
    const route = resolvePlatformHostedRouting(model);
    if (route && route.wire === "responses") {
      // 账号作用域模板（Cloudflare AI Responses）：本函数没有账号来源，返回规范
      // 网关标记，账号解析留给持有 CLOUDFLARE_ACCOUNT_ID 的服务端（或显式
      // cloudflareGptResponses 路径）。
      return route.endpoint.includes(CLOUDFLARE_ACCOUNT_ID_PLACEHOLDER)
        ? PLATFORM_HOSTED_RESPONSES_GATEWAY_MARKER
        : route.endpoint;
    }
    if (!model || isPlatformHostedDeepseekModel(model)) {
      return DEEPSEEK_RESPONSES_ENDPOINT;
    }
  }
  return undefined;
}

/**
 * Legacy agent records may still store a provider id that has since been
 * retired. Alias those to `nolo` so the endpoint resolver never throws on
 * records that predate the change.
 */
const PLATFORM_PROVIDER_ENDPOINT_ALIASES: Readonly<Record<string, string>> = {
  "ollama-cloud": "nolo",
  deepseek: "nolo",
};

/** Lookup a known platform chat.completions endpoint; undefined if unknown. */
export function resolvePlatformChatCompletionsEndpoint(
  provider: string,
  model?: string | null,
): string | undefined {
  const key = asTrimmedLowercaseString(provider);
  if (!key) return undefined;
  const aliased = PLATFORM_PROVIDER_ENDPOINT_ALIASES[key] ?? key;
  if (aliased === "nolo") {
    const route = resolvePlatformHostedRouting(model);
    // 只有 chat.completions 协议的路由能走这条通用 chat 选择器：
    // responses 走专用 resolvePlatformResponsesEndpoint；anthropic.messages
    // （平台托管 Claude → CF accounts/{account}/ai/v1/messages 模板）在服务端
    // wire adapter 合入前一律返回 undefined —— 绝不把 Messages 端点模板当成
    // chat.completions 端点下发给请求构建器（否则会发出 OpenAI 兼容体打到
    // Messages 线上，属静默错路由）。
    if (route && route.wire === "chat.completions") {
      return route.endpoint;
    }
    // 非 chat 协议（responses / anthropic.messages / 未来新 wire）或未识别模型
    // 一律 undefined（显式分流，调用方 fail closed）
    return undefined;
  }
  return PLATFORM_CHAT_COMPLETIONS_ENDPOINTS[aliased];
}

/**
 * **Proxy-only**：把「客户端不可自行拨号、但服务端已有 wire adapter」的平台托管
 * 路由映射成客户端可消费的逻辑网关标记。
 *
 * 与 `resolvePlatformChatCompletionsEndpoint` 的分工（两者**不得**合并）：
 * - 后者是 public chat / direct 选择器，对 anthropic.messages 一律返回 undefined
 *   （fail closed，绝不把 Messages 模板当 chat.completions 端点下发），行为不变；
 * - 本函数只允许在调用方已确定 `transport === "proxy"` 时使用：此时真实上游由
 *   服务端按 model 用自己的 catalog 解析，客户端 endpoint 只承载「线形状」信息。
 *
 * 返回 undefined = 这条代理路由没有逻辑网关标记（调用方继续走原有
 * chat/responses 解析或 fail closed）。
 */
export function resolvePlatformProxyChatGatewayEndpoint(
  provider: string,
  model?: string | null,
): string | undefined {
  const key = asTrimmedLowercaseString(provider);
  if (!key) return undefined;
  const aliased = PLATFORM_PROVIDER_ENDPOINT_ALIASES[key] ?? key;
  if (aliased !== "nolo") return undefined;
  const route = resolvePlatformHostedRouting(model);
  // 只给服务端确实实现了 adapter 的线标记：目前仅 Cloudflare Messages
  // （anthropic.messages）。其它 key 的 messages 路由（若将来出现）服务端会显式
  // unsupported_key 拒绝，客户端也不该给出可路由的假象。
  return route?.wire === "anthropic.messages" && route.keyName === "cloudflare"
    ? PLATFORM_HOSTED_CHAT_GATEWAY_MARKER
    : undefined;
}

/**
 * 平台托管模型该用哪个 provider 的 key。
 *
 * 统一消费声明式路由真值表（resolvePlatformHostedRouting）：
 * 端点与凭据同源，彻底杜绝分支漂移与误路由。
 *
 * 返回 undefined = 不是平台托管路由，调用方按记录里的 provider 自己取 key。
 */
export function resolvePlatformHostedCredentialProvider(
  provider: string,
  model?: string | null,
): PlatformHostedUpstreamId | undefined {
  const key = asTrimmedLowercaseString(provider);
  if (!key) return undefined;
  const aliased = PLATFORM_PROVIDER_ENDPOINT_ALIASES[key] ?? key;
  if (aliased !== "nolo") return undefined;
  return resolvePlatformHostedRouting(model)?.keyName;
}

/**
 * 平台托管请求能不能落到一个真实上游。
 *
 * 端点与凭据必须同源：`getNoloKey("nolo")` 已经不再兜底发 key，所以「解析不出
 * 端点」等价于「这个 model 没有上游」。调用方据此显式报错，而不是让请求带着
 * 客户端传来的 url 和一把不相干的 key 出门。
 */
export function hasPlatformHostedUpstreamRoute(
  provider: string,
  model?: string | null,
): boolean {
  return Boolean(
    resolvePlatformChatCompletionsEndpoint(provider, model) ??
      (isOpenAiResponsesModel({ provider, model: model ?? undefined })
        ? resolvePlatformResponsesEndpoint(provider, model)
        : undefined),
  );
}
