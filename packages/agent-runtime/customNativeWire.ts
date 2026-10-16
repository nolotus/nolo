/**
 * packages/agent-runtime/customNativeWire.ts
 *
 * CLI 本地 runtime 的三条「custom provider native wire」通道 ——
 * gemini native（`{base}/models/{model}:streamGenerateContent?alt=sse`）、
 * OpenAI Responses（`{base}/responses`）、Anthropic Messages（`{base}/messages`）——
 * 此前各自复制了同一套 endpoint 还原/拼接、鉴权头组装与取消判定。本文件是这些
 * 重复件的单一来源；各通道自己的执行壳（fetch、SSE 聚合、结果构造）仍留在原处。
 *
 * 约束（改动前务必读）：
 *
 * 1. 只放**纯函数/常量**：不含 fetch、不含 SSE 解析、不落可用性记录、不做 I/O。
 * 2. **禁止 import `node:*`**：`packages/agent-runtime` 会被 Web 侧
 *    `agentCallPlan.ts` 链静态引入，顶层 `node:crypto` 之类会让 esbuild
 *    （`platform: "browser"`）直接报 `Could not resolve`（事故记录见
 *    `scripts/dev/webBundleNodeBuiltins.guard.test.ts`）。已知
 *    `anthropicMessagesProvider.ts` / `codexResponsesProvider.ts` 有这个问题，
 *    不要把它们的依赖拖进这条链。
 */
import { isAbortError } from "core/abortError";

/**
 * 三条 native wire 的判别联合。字符串值与模型目录（真 catalog）的
 * `nativeProtocol` 标记逐字一致，闸门处直接比对。
 */
export type CustomNativeWire =
  | "gemini"
  | "openai-responses"
  | "anthropic-messages";

/**
 * customProviderUrl 的契约是「OpenAI 兼容 chat/completions 端点」，native 通道
 * 一律先把它还原成 base 再拼自己的路径。
 *
 * 还原规则与三条通道此前的现状逐字一致：剥掉结尾的 `/chat/completions`（允许
 * 一个尾斜杠），再剥掉剩余的全部尾斜杠。因此对非 chat/completions 输入
 * （如 `https://gw.example/v1`）是幂等的：只清尾斜杠。
 */
const CHAT_COMPLETIONS_SUFFIX = /\/chat\/completions\/?$/;

function resolveCustomNativeBase(endpoint: string): string {
  return endpoint.replace(CHAT_COMPLETIONS_SUFFIX, "").replace(/\/+$/, "");
}

/**
 * 两条「target path 是常量后缀」的 wire 的 native 路径 —— **单一出处**：既供拼接
 * 使用，也供下面的幂等判定使用（两处若各写一份，迟早漂移）。
 *
 * gemini 不在此表内：它的路径含 model 与 query
 * （`/models/{model}:streamGenerateContent?alt=sse`），不是常量后缀，也没有任何
 * 端点形状把它当作 customProviderUrl 的既有直连形状。
 */
const NATIVE_PATH_SUFFIX = {
  "openai-responses": "/responses",
  "anthropic-messages": "/messages",
} as const;

/** Anthropic Messages wire 要求的固定版本头值。 */
export const ANTHROPIC_MESSAGES_VERSION = "2023-06-01";

/**
 * OpenCode Go 的 legacy 基址规范化 —— 本文件唯一的 host/基址特例。
 *
 * 背景（2026-10-16 真实网关实测，`POST https://opencode.ai/{zen,inference}/go/v1/…`）：
 * 网关在 `/zen/go` 上只挂了 `/chat/completions`、`/responses`、`/messages` 三条路由，
 * gemini 的 `/models/{model}:streamGenerateContent` **只在 `/inference/go` 上存在**
 * （zen 基址返回站点 HTML 404，inference 基址进入上游）。而 catalog / OAuth 流程 /
 * `providerRegistry` 里 opencode-go 的历史基址是 `/zen/go/v1`，于是 agent 记录里存
 * legacy 基址 + gemini wire 的模型直接 404，同一 provider 下别的模型却正常。
 *
 * 规范化**只碰这一格**：host 必须是 `opencode.ai`（host 按 URL 语义大小写不敏感、
 * 一律小写比较），path 必须以 `/zen/go` 起头，且 wire 必须是 gemini。其余一律
 * 逐字返回：非 `opencode.ai` 的自定义端点属于别的 provider，不动；`/responses`、
 * `/messages` 在 zen 基址上今天可用，搬到 inference 没有收益却会改变在用出站行为。
 */
const OPENCODE_HOST = "opencode.ai";
const OPENCODE_ZEN_GO_PREFIX = "/zen/go";
const OPENCODE_INFERENCE_GO_PREFIX = "/inference/go";

function normalizeOpencodeGoGeminiBase(base: string, wire: CustomNativeWire): string {
  if (wire !== "gemini") return base;
  const schemeEnd = base.indexOf("://");
  if (schemeEnd <= 0 || base.slice(0, schemeEnd).toLowerCase() !== "https") return base;
  const authorityStart = schemeEnd + 3;
  const pathStart = base.indexOf("/", authorityStart);
  if (pathStart < 0) return base;
  const host = base.slice(authorityStart, pathStart).toLowerCase();
  if (host !== OPENCODE_HOST) return base;
  const pathAndQuery = base.slice(pathStart);
  const isZenGoPath =
    pathAndQuery === OPENCODE_ZEN_GO_PREFIX ||
    pathAndQuery.startsWith(`${OPENCODE_ZEN_GO_PREFIX}/`);
  if (!isZenGoPath) return base;
  // 只替换 path 前缀：query/hash、以及 host 之后原样的其余部分都保留。
  return `${base.slice(0, authorityStart)}${OPENCODE_HOST}${OPENCODE_INFERENCE_GO_PREFIX}${pathAndQuery.slice(
    OPENCODE_ZEN_GO_PREFIX.length,
  )}`;
}

/**
 * 按 wire 拼出真实上游 URL。gemini 的路径含 model，故 model 是必需参数
 * （另两条 wire 忽略它）。
 *
 * **幂等**：若传入 endpoint（剥掉 `/chat/completions` 与尾斜杠后的 base）已经就是
 * 该 wire 的目标路径（`…/responses`、`…/messages`），原样返回，不再重复拼接。
 *
 * 理由（不要"简化"掉这段）：`customProviderUrl` 除了 OpenAI 兼容 chat/completions
 * 形状，还允许**直接**写成目标 wire 的 URL —— `agentCallPlan.ts#resolveCustomUpstreamWire`
 * 的规则 1a 明确保留「catalog 声明 `openai-responses` 且端点已以 `/responses` 结尾」
 * 的既有 `"responses"` passthrough（客户端自己说 Responses、通用代理原样转发），
 * 规则 2 同理会把 `/responses` 结尾端点判成该形状；`resolveCustomProviderEndpoint`
 * 也原样保留它。但本地 native 通道的 gate 只看 `Model.nativeProtocol`，不看 URL 结尾，
 * 于是同一个配置在 CLI 直连时会走到这里 —— 不幂等就拼出
 * `…/v1/responses/responses`（404）。这里做成幂等，两种判据就落到同一个 URL 上：
 * 判定分歧最多影响「谁发请求」，不会再改坏路径。
 *
 * 与 call plan 对齐的判定细节：大小写敏感（plan 规则 1a 用的是 `endpoint.includes("/responses")`，
 * 本文件的 `CHAT_COMPLETIONS_SUFFIX` 同样是大小写敏感），故 `/RESPONSES` 视为未声明 wire
 * 的 base，照旧追加。正常形态（纯 base、带/不带 `/chat/completions` 后缀、尾斜杠）行为一字不变。
 */
export function resolveCustomNativeEndpoint(
  endpoint: string,
  wire: CustomNativeWire,
  model: string,
): string {
  const base = normalizeOpencodeGoGeminiBase(resolveCustomNativeBase(endpoint), wire);
  switch (wire) {
    case "gemini":
      return `${base}/models/${model}:streamGenerateContent?alt=sse`;
    case "openai-responses":
    case "anthropic-messages": {
      const suffix = NATIVE_PATH_SUFFIX[wire];
      return base.endsWith(suffix) ? base : `${base}${suffix}`;
    }
  }
}

/**
 * 显式 `apiKeyHeader` 覆盖（agent 配置里声明的自定义鉴权头名）的**保留头黑名单**。
 *
 * 这些头要么由本文件/各通道自己决定（`Content-Type`、`anthropic-version`、
 * `x-opencode-session`、`User-Agent`），要么会改变请求语义或造成请求走私
 * （`Host` / `Cookie` / `Content-Length` / hop-by-hop 家族）。命中一律**显式报错**：
 * 静默接受会让用户以为配置生效，而实际发出去的却是另一组头。
 */
export const RESERVED_CUSTOM_NATIVE_AUTH_HEADERS: readonly string[] = [
  // 凭据之外、由通道自己决定的头
  "accept",
  "accept-encoding",
  "anthropic-version",
  "content-type",
  "content-length",
  "user-agent",
  "x-opencode-session",
  // 请求走私 / 连接语义（hop-by-hop 与 Host/Cookie 家族）
  "connection",
  "cookie",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

/** RFC 7230 token 语法：header 名只允许这些字符（无空白、冒号、CR/LF、控制字符）。 */
const HTTP_HEADER_TOKEN_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

/**
 * 显式 `apiKeyHeader` 非法（token 语法不合法或命中保留名单）时抛出的错误。
 *
 * 调用方可以据此把它当成**配置错误**处理（服务端回 400、不上报上游冷却），而不是
 * 上游故障：这就是「显式报错、不静默回落到默认凭据头」的落点。
 */
export class CustomNativeApiKeyHeaderError extends Error {
  readonly code = "INVALID_API_KEY_HEADER";
  constructor(message: string) {
    super(message);
    this.name = "CustomNativeApiKeyHeaderError";
  }
}

/**
 * 归一化并校验显式 `apiKeyHeader`（唯一的校验出处，`customNativeAuthHeaders` 与各
 * 调用点/执行壳共用）：
 * - `undefined` / 空串 / 纯空白 → `undefined`，表示「未显式指定」，调用方回落到该
 *   wire 的默认凭据头（既有行为）；
 * - 非法头名（含空白、冒号、CR/LF 等非 token 字符）或命中
 *   `RESERVED_CUSTOM_NATIVE_AUTH_HEADERS` → 抛 `CustomNativeApiKeyHeaderError`。
 */
export function resolveCustomNativeApiKeyHeader(
  apiKeyHeader?: string | null,
): string | undefined {
  const headerName = apiKeyHeader?.trim();
  if (!headerName) return undefined;
  if (!HTTP_HEADER_TOKEN_RE.test(headerName)) {
    throw new CustomNativeApiKeyHeaderError(
      `Invalid apiKeyHeader "${headerName}": not a valid HTTP header name (spaces, ":", CR/LF, control characters and other non-token characters are not allowed).`,
    );
  }
  if (RESERVED_CUSTOM_NATIVE_AUTH_HEADERS.includes(headerName.toLowerCase())) {
    throw new CustomNativeApiKeyHeaderError(
      `Invalid apiKeyHeader "${headerName}": reserved header, it cannot be used as the API key header.`,
    );
  }
  return headerName;
}

/**
 * 显式头名对应的**值格式** —— 与 OpenAI 兼容路径
 * （`providerResolution.buildProviderAuthHeaders`）逐字一致：`authorization`
 * （大小写不敏感）补 `Bearer ` 前缀（已有则不重复补），其它头名传**裸** apiKey。
 */
function customNativeAuthHeaderValue(headerName: string, apiKey: string): string {
  return headerName.toLowerCase() === "authorization"
    ? apiKey.startsWith("Bearer ")
      ? apiKey
      : `Bearer ${apiKey}`
    : apiKey;
}

/**
 * wire 对应的鉴权头。只含鉴权（+ anthropic 版本头）：`Content-Type` 与 gateway
 * session 头由各通道自己决定（session 头是每调用一次的，见各 transport 的
 * `complete()`）。
 *
 * `apiKeyHeader` 是**显式覆盖**（可选）：非空（trim 后）时按「显式 `apiKeyHeader`
 * > 该 wire 的默认凭据头」的优先级**替换**默认凭据头 —— 绝不追加，否则上游会收到
 * 两个凭据头而报错。`anthropic-version` 不是凭据头，覆盖时仍保留。空/纯空白视为
 * 未指定（默认行为逐字不变）；非法配置抛 `CustomNativeApiKeyHeaderError`。
 */
export function customNativeAuthHeaders(
  wire: CustomNativeWire,
  apiKey: string,
  apiKeyHeader?: string | null,
): Record<string, string> {
  const overrideName = resolveCustomNativeApiKeyHeader(apiKeyHeader);
  switch (wire) {
    case "gemini":
      return overrideName
        ? { [overrideName]: customNativeAuthHeaderValue(overrideName, apiKey) }
        : { "x-goog-api-key": apiKey };
    case "openai-responses":
      return overrideName
        ? { [overrideName]: customNativeAuthHeaderValue(overrideName, apiKey) }
        : { Authorization: `Bearer ${apiKey}` };
    case "anthropic-messages":
      return {
        ...(overrideName
          ? { [overrideName]: customNativeAuthHeaderValue(overrideName, apiKey) }
          : { "x-api-key": apiKey }),
        "anthropic-version": ANTHROPIC_MESSAGES_VERSION,
      };
  }
}

/**
 * 调用方取消的判据：abort 形状的异常，或调用方 signal 已 aborted。
 *
 * ⚠️ 必须传调用方**原始** signal（`options.signal`），不要传
 * `AbortSignal.any([caller, timeout])` 合成后的 signal —— 超时也会 abort 合成
 * signal，混用会把「上游超时」误判成「用户取消」，从而漏记本该冷却的上游故障
 * （超时必须记账）。
 *
 * `callerSignal?.aborted` 这一半不可省：machine WS 派发用的是
 * `controller.abort(new Error(...))`，而 `AbortSignal.any` 会原样透传 abort
 * reason，抛出的错误 `name` 是 "Error" 而非 "AbortError"，单靠 `isAbortError`
 * 会漏判，并把整个 `custom-endpoint:<origin>` 冷却 5 分钟。
 *
 * 在「没有异常对象可传」的记账点（如 `!response.ok` 分支，此时手上只有
 * Response）传 `undefined`，判据退化为只看调用方 signal。
 */
export function isCallerCancellation(
  error: unknown,
  callerSignal?: AbortSignal | null,
): boolean {
  return isAbortError(error) || callerSignal?.aborted === true;
}
