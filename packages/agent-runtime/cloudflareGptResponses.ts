/**
 * Cloudflare account-scoped Responses wire for the platform-hosted GPT family.
 *
 * 真值（2026-10-13 官方文档核对）：
 * - REST API endpoint：`https://api.cloudflare.com/client/v4/accounts/{account}/ai/v1/responses`
 *   （`ai-gateway/usage/rest-api` → `/ai/v1/responses — OpenAI Responses API`）。
 * - 鉴权：`Authorization: Bearer $CLOUDFLARE_API_TOKEN` + `Content-Type: application/json`；
 *   账号 id 由注入的 `CLOUDFLARE_ACCOUNT_ID` 提供，**不硬编码、不探测 OAuth 凭据**。
 * - 模型名用 `author/model` 形态：平台 id `gpt-6-astra` → `openai/gpt-6-astra`。
 * - `cf-aig-gateway-id` 在官方 REST 文档中只对 `@cf/` Workers AI 模型是必需项；第三方
 *   `openai/*` 走 `/ai/v1` 时 AI Gateway 能力（日志/缓存/限流）已自动生效，因此这里
 *   只在调用方**显式**给出 gatewayId 时才带该头，绝不隐式注入（`DEFAULT_CLOUDFLARE_AI_GATEWAY_ID`
 *   供调用方显式使用）。
 *
 * 本模块只做「解析 + body 组装」，不改动平台路由真值表，也不发起请求：调用方接入是后续工作。
 * 未知模型一律显式报错，绝不 alias 到别的上游。
 */

import {
  resolvePlatformEffectiveModel,
  resolvePlatformModelAlias,
} from "ai/llm/platformHostedRoutingTable";
import { isRecord } from "core/isRecord";
import {
  CLOUDFLARE_AI_RESPONSES_ENDPOINT_TEMPLATE,
  CLOUDFLARE_GPT_56_LUNA_UPSTREAM_MODEL_ID,
  CLOUDFLARE_GPT_56_SOL_UPSTREAM_MODEL_ID,
  CLOUDFLARE_GPT_56_TERRA_UPSTREAM_MODEL_ID,
  CLOUDFLARE_GPT_6_1_SOL_UPSTREAM_MODEL_ID,
  CLOUDFLARE_GPT_6_ASTRA_UPSTREAM_MODEL_ID,
  CLOUDFLARE_GPT_6_LUNA_UPSTREAM_MODEL_ID,
  PLATFORM_HOSTED_GPT_56_LUNA_MODEL,
  PLATFORM_HOSTED_GPT_56_SOL_MODEL,
  PLATFORM_HOSTED_GPT_56_TERRA_MODEL,
  PLATFORM_HOSTED_GPT_6_1_SOL_MODEL,
  PLATFORM_HOSTED_GPT_6_ASTRA_MODEL,
  PLATFORM_HOSTED_GPT_6_LUNA_MODEL,
} from "../ai/llm/platformHostedRoutingTable";
import { buildResponsesRequestBody } from "../integrations/openai/responsesRequestBody";

// 平台 id、CF catalog id（6 条）与 endpoint 模板的唯一真值在
// `../ai/llm/platformHostedRoutingTable`（catalog 侧声明）；本模块只 import 消费，
// 不再本地复制一份常量——否则会立刻长出第二份会腐化的真值表。

/** 走 Cloudflare Responses 的平台 GPT 模型（5 个既有 + gpt-6.1-sol）。 */
export const CLOUDFLARE_GPT_PLATFORM_MODEL_IDS = [
  PLATFORM_HOSTED_GPT_6_ASTRA_MODEL,
  PLATFORM_HOSTED_GPT_6_LUNA_MODEL,
  PLATFORM_HOSTED_GPT_56_SOL_MODEL,
  PLATFORM_HOSTED_GPT_56_TERRA_MODEL,
  PLATFORM_HOSTED_GPT_56_LUNA_MODEL,
  PLATFORM_HOSTED_GPT_6_1_SOL_MODEL,
] as const;

/**
 * 可上架（新建 / 选择器可选项）的 CF GPT 平台目录：排除兼容别名 id。
 * 2026-10-13 起 gpt-5.6-sol 是 gpt-6.1-sol 的兼容别名 → 6 个可路由 id 中 5 个可选。
 * `CLOUDFLARE_GPT_PLATFORM_MODEL_IDS` 仍保留旧 id，因为它是「平台 id → CF
 * catalog id」的路由真值：删掉会让未知 id 穿透到别的路由（静默换路），旧 id 也
 * 无法被透明映射到 6.1。
 */
export const CLOUDFLARE_GPT_ACTIVE_PLATFORM_MODEL_IDS =
  CLOUDFLARE_GPT_PLATFORM_MODEL_IDS.filter(
    (id) => resolvePlatformModelAlias(id) === undefined,
  );

export type CloudflareGptPlatformModelId =
  (typeof CLOUDFLARE_GPT_PLATFORM_MODEL_IDS)[number];

/**
 * 平台 id → CF catalog id。逐项显式声明（不做字符串拼接猜测），未知 id 无表项即拒绝。
 * 注意：GPT image（`gpt-image-2`）不在本表内，保持既有 Responses 路径不变。
 */
const CLOUDFLARE_GPT_UPSTREAM_MODEL_IDS: Readonly<
  Record<CloudflareGptPlatformModelId, string>
> = {
  [PLATFORM_HOSTED_GPT_6_ASTRA_MODEL]: CLOUDFLARE_GPT_6_ASTRA_UPSTREAM_MODEL_ID,
  [PLATFORM_HOSTED_GPT_6_LUNA_MODEL]: CLOUDFLARE_GPT_6_LUNA_UPSTREAM_MODEL_ID,
  // 兼容别名（PLATFORM_MODEL_ALIASES）：旧 id 的上游/执行模型就是 6.1。
  [PLATFORM_HOSTED_GPT_56_SOL_MODEL]: CLOUDFLARE_GPT_6_1_SOL_UPSTREAM_MODEL_ID,
  [PLATFORM_HOSTED_GPT_56_TERRA_MODEL]: CLOUDFLARE_GPT_56_TERRA_UPSTREAM_MODEL_ID,
  [PLATFORM_HOSTED_GPT_56_LUNA_MODEL]: CLOUDFLARE_GPT_56_LUNA_UPSTREAM_MODEL_ID,
  [PLATFORM_HOSTED_GPT_6_1_SOL_MODEL]: CLOUDFLARE_GPT_6_1_SOL_UPSTREAM_MODEL_ID,
};

/**
 * 路由表 endpoint 模板里的账号占位符。本模块不再自带 origin/path 常量：
 * 端点形态唯一真值是 `CLOUDFLARE_AI_RESPONSES_ENDPOINT_TEMPLATE`，这里只做替换。
 */
export const CLOUDFLARE_ACCOUNT_ID_PLACEHOLDER = "{account}";
/** 官方文档示例里的默认 gateway id；仅供调用方显式传入，绝不隐式注入。 */
export const DEFAULT_CLOUDFLARE_AI_GATEWAY_ID = "default";
/**
 * 真实 nolo 上游 UA（与 providerResolution 的 OPENCODE_USER_AGENT 同值）。
 * providerSessionHeaders.test.ts 断言两者一致以防漂移。
 */
export const NOLO_UPSTREAM_USER_AGENT = "nolo-agent/1.0";

export type CloudflareGptResponsesErrorCode =
  | "unsupported_model"
  | "missing_account_id"
  | "missing_api_token";

export class CloudflareGptResponsesError extends Error {
  readonly code: CloudflareGptResponsesErrorCode;

  constructor(code: CloudflareGptResponsesErrorCode, message: string) {
    super(message);
    this.name = "CloudflareGptResponsesError";
    this.code = code;
  }
}

export type CloudflareGptResponsesRoute = {
  endpoint: string;
  /** CF catalog id（`openai/<platform id>`），wire body 的 `model` 字段用它。 */
  upstreamModelId: string;
  headers: Record<string, string>;
};

const trimmed = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

/** 是否需要走 Cloudflare Responses（精确匹配平台 id，不识别上游 `openai/*` 形态）。 */
export function isCloudflareGptPlatformModel(
  model: string | null | undefined,
): model is CloudflareGptPlatformModelId {
  const id = trimmed(model);
  return (CLOUDFLARE_GPT_PLATFORM_MODEL_IDS as readonly string[]).includes(id);
}

/** 平台 id → CF catalog id；未知 id 显式失败，绝不 alias。 */
export function resolveCloudflareGptUpstreamModelId(model: string): string {
  const id = trimmed(model);
  if (!isCloudflareGptPlatformModel(id)) {
    throw new CloudflareGptResponsesError(
      "unsupported_model",
      `Model "${String(model)}" is not a Cloudflare-routed platform GPT model; refusing to alias it to another upstream.`,
    );
  }
  // 兼容别名解析到实际模型的上游 id（单一声明：PLATFORM_MODEL_ALIASES）。
  const effectiveId = resolvePlatformEffectiveModel(id) ?? id;
  // 别名目标必须仍是本表登记的平台 id：用类型守卫收窄后再索引（不留 string 索引，
  // 也不用 as any）；未知目标显式失败，绝不 alias 到别的上游。
  if (!isCloudflareGptPlatformModel(effectiveId)) {
    throw new CloudflareGptResponsesError(
      "unsupported_model",
      `Model "${String(model)}" aliases to "${effectiveId}", which is not a registered Cloudflare-routed platform GPT model; refusing to alias it to another upstream.`,
    );
  }
  return CLOUDFLARE_GPT_UPSTREAM_MODEL_IDS[effectiveId];
}

/** 账号作用域的 Responses endpoint；缺少账号 id 直接失败（不回落官方 OpenAI）。 */
export function cloudflareAiResponsesEndpoint(accountId: string): string {
  const id = trimmed(accountId);
  if (!id) {
    throw new CloudflareGptResponsesError(
      "missing_account_id",
      "CLOUDFLARE_ACCOUNT_ID is required for the Cloudflare AI Responses wire.",
    );
  }
  return CLOUDFLARE_AI_RESPONSES_ENDPOINT_TEMPLATE.replace(
    CLOUDFLARE_ACCOUNT_ID_PLACEHOLDER,
    () => encodeURIComponent(id),
  );
}

/**
 * 解析一次 CF Responses 上游调用（endpoint + 上游模型名 + 请求头）。
 *
 * 账号/token 由调用方显式注入（可经 `env` 记录），缺失即失败——绝不携带官方 OpenAI
 * 端点兜底，也绝不读取 OAuth 凭据。
 */
export function resolveCloudflareGptResponsesRoute(args: {
  model: string;
  accountId?: string | null;
  apiToken?: string | null;
  gatewayId?: string | null;
  env?: Record<string, string | undefined>;
}): CloudflareGptResponsesRoute {
  const upstreamModelId = resolveCloudflareGptUpstreamModelId(args.model);
  const env = args.env ?? (typeof process !== "undefined" ? process.env : {});
  const accountId = trimmed(args.accountId) || trimmed(env.CLOUDFLARE_ACCOUNT_ID) || undefined;
  if (!accountId) {
    throw new CloudflareGptResponsesError(
      "missing_account_id",
      "Cloudflare account id is required (pass accountId or CLOUDFLARE_ACCOUNT_ID); there is no fallback to the public OpenAI endpoint.",
    );
  }
  const apiToken = trimmed(args.apiToken) || trimmed(env.CLOUDFLARE_API_TOKEN) || undefined;
  if (!apiToken) {
    throw new CloudflareGptResponsesError(
      "missing_api_token",
      "Cloudflare API token is required (pass apiToken or CLOUDFLARE_API_TOKEN); credential probing is not attempted.",
    );
  }
  const gatewayId = trimmed(args.gatewayId);
  return {
    endpoint: cloudflareAiResponsesEndpoint(accountId),
    upstreamModelId,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      "User-Agent": NOLO_UPSTREAM_USER_AGENT,
      ...(gatewayId ? { "cf-aig-gateway-id": gatewayId } : {}),
    },
  };
}

/**
 * 组装 CF Responses wire body。
 *
 * 复用共享 Responses 转换器（`buildResponsesRequestBody` → tools / vision / reasoning），
 * 只加两个 wire 决定性字段：
 * - `stream: true`：官方 usage 只在流末 `response.completed` 才完整，非流式拿不到完整账；
 * - `store: false`：不把平台请求留在上游。
 * `metadata.rid` 只补位、不覆盖（原始 provider_call_id 是对账锚点）；不注入任何计费字段。
 */
export function buildCloudflareGptResponsesBody(args: {
  model: string;
  body: Record<string, any>;
  providerCallId?: string | null;
}): Record<string, any> {
  const upstreamModelId = resolveCloudflareGptUpstreamModelId(args.model);
  const prepared = buildResponsesRequestBody(args.body ?? {}, upstreamModelId);
  const incoming = prepared.metadata;
  let metadata: Record<string, any> | undefined = isRecord(incoming)
    ? { ...incoming }
    : undefined;
  const rid = trimmed(args.providerCallId);
  if (rid) {
    if (metadata) {
      if (!trimmed(metadata.rid)) metadata.rid = rid;
    } else if (incoming === undefined) {
      metadata = { rid };
    }
  }
  const body: Record<string, any> = { ...prepared, stream: true, store: false };
  if (metadata) body.metadata = metadata;
  return body;
}
