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
  const base = resolveCustomNativeBase(endpoint);
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
 * wire 对应的鉴权头。只含鉴权（+ anthropic 版本头）：`Content-Type` 与 gateway
 * session 头由各通道自己决定（session 头是每调用一次的，见各 transport 的
 * `complete()`）。
 */
export function customNativeAuthHeaders(
  wire: CustomNativeWire,
  apiKey: string,
): Record<string, string> {
  switch (wire) {
    case "gemini":
      return { "x-goog-api-key": apiKey };
    case "openai-responses":
      return { Authorization: `Bearer ${apiKey}` };
    case "anthropic-messages":
      return {
        "x-api-key": apiKey,
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
