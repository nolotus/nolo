/**
 * packages/agent-runtime/customNativeProvider.ts
 *
 * 三条「custom provider native wire」通道的**共享执行壳**：
 * gemini native（`{base}/models/{model}:streamGenerateContent?alt=sse`）、
 * OpenAI Responses（`{base}/responses`）、Anthropic Messages（`{base}/messages`）。
 *
 * 背景：这三条通道此前在 CLI 各有一份**完整**的 `complete()`（fetch、SSE 聚合、
 * 结果构造、失败记账），而桌面本地 runtime 完全不看 `Model.nativeProtocol`，把
 * `customProviderUrl` 一律当 OpenAI 兼容 `/chat/completions` 直连。桌面是直连
 * （`runtimeKind=local`，不吃 `useServerProxy`），所以必须在**本地执行壳**里修，
 * 不能靠服务端翻译。
 *
 * 本文件把三份 `complete()` **逐字搬入**（行为等价：URL/头/body 组装、SSE 聚合、
 * 失败分类、可用性记账判据、诊断日志 payload 与 transport 标签都不变），由 CLI
 * 三条 transport 与桌面本地 runtime 共同调用。搬迁唯一允许的改写是把「宿主注入
 * 的东西」参数化，即 `config.model/apiKey`、`config.endpoint`（→ 入参 `endpoint`，
 * 契约形状）、native URL（原文件的局部 `endpoint` 常量 → 入参派生出的
 * `nativeEndpoint`）、`ctx.serverUrl`、`ctx.authToken`、`logLocalRuntimeDiagnostic`
 * （→ `log`）、`recordLocalAvailability`（→ `recordAvailability`）与 `sessionId`
 * 兜底值；这些在下方每个 `complete()` 顶部一次性解构，函数体其余部分与原文件逐字
 * 一致。
 *
 * ⚠️ 契约端点与 native URL 是**两个**东西，别合并：
 * `buildProviderSessionHeaders` 的 endpoint 判别用的是**契约**端点（原文件的
 * `config.endpoint`），而 fetch 与日志 `requestUrl` 用派生出的 native URL。见
 * `CreateCustomNativeProviderArgs.endpoint` 的说明。
 *
 * 导入约束（改前必读）：
 * - **不要**从 `agent-runtime/index.ts` 桶导出本文件。它经
 *   `anthropicMessagesProvider` 顶层 import `node:crypto`，桶导出会把 `node:*`
 *   拖进 web bundle（`agentCallPlan.ts` 链被 Web 侧静态引入），esbuild
 *   `platform:"browser"` 直接构建失败 —— 事故记录见
 *   `scripts/dev/webBundleNodeBuiltins.guard.test.ts`。一律**深路径 import**。
 * - 纯执行件，**不做 gate**：`customProviderUrl` / `nativeProtocol` / 本地 key 的
 *   判别、`resolveCliOpenAiProviderConfig`、工具包解析与 `provider.selected` 诊断
 *   留在各调用方（CLI transport 与桌面 adapter）。本文件只负责「拿到已判定的
 *   wire + endpoint + key 之后怎么打这一炮」。
 */
import type {
  AgentRuntimeAgentConfig,
  AgentRuntimeProvider,
} from "./hostAdapter";
import type { AgentRuntimeResult } from "./types";
import { buildProviderSessionHeaders } from "./providerResolution";
import {
  accumulateGeminiChunks,
  buildGeminiGenerateContentRequest,
  resolveGeminiModelQuirks,
} from "./geminiNativeShared";
import {
  customNativeAuthHeaders,
  isCallerCancellation,
  resolveCustomNativeApiKeyHeader,
  resolveCustomNativeEndpoint,
  type CustomNativeWire,
} from "./customNativeWire";
import { parseSseDataLineJson } from "./sseDataLine";
import { readSseDataValues } from "./sseFrames";
import { aggregateAnthropicMessageStream } from "./anthropicMessagesStream";
import {
  buildAnthropicMessagesBody,
  mapAnthropicMessageToOpenAi,
} from "./anthropicMessagesProvider";
import { convertMessagesToResponsesInput, toResponsesTools } from "../integrations/openai/responsesHelpers";
import {
  readResponsesSseCompletion,
  responsesStreamFailureStatus,
  type ResponsesStreamFailure,
} from "./responsesSseStream";
import { inlineImageUrlsForCustomProvider } from "../ai/chat/inlineImageUrlsForCustomProvider";

export type { CustomNativeWire };

/**
 * 诊断日志入口。CLI 传 `logLocalRuntimeDiagnostic`（输出与原行为一致），桌面等
 * 宿主可缺省（缺省为 no-op）。
 */
export type CustomNativeProviderLog = (
  event: string,
  fields: Record<string, unknown>,
) => void;

/**
 * 一次上游 HTTP 结果的可用性结论（429 冷却 / 恢复）。CLI 传
 * `ctx.recordLocalAvailability`，桌面传 `desktopAgentAvailability` 的既有入口。
 */
export type CustomNativeRecordAvailability = (
  status: number,
  body?: unknown,
) => Promise<void>;

/**
 * 只用到「发一次请求拿 Response」这一面：CLI 的 `CliFetchImpl` 与宿主的
 * `typeof fetch` 都满足（后者多一个 `preconnect` 成员，故不能直接写
 * `typeof fetch`）。
 */
export type CustomNativeFetch = (
  input: string,
  init: RequestInit,
) => Promise<Response>;

export type CreateCustomNativeProviderArgs = {
  /** 已判定的 native wire（gate 留在调用方）。 */
  wire: CustomNativeWire;
  model: string;
  /**
   * `customProviderUrl` 原值 —— 仍是 **chat/completions 契约形状**（不是 native
   * 路径）。本文件内部按 wire 还原 base 再拼出真正要打的 native URL。
   *
   * 这个区分**不是**形式主义：搬迁前的三条通道都是「`requestUrl` / fetch 用 native
   * URL，而 `buildProviderSessionHeaders` 的 endpoint 判别用契约 URL」，
   * `isOpenCodeGoEndpoint` 的锚定方式让两者在个别端点下结论不同（如带查询串 /
   * native 路径里再出现 `go/` 的用户自建网关）。传 native URL 进来会静默改变
   * gateway session 头的开关，因此保持契约形状入参。
   */
  endpoint: string;
  apiKey: string;
  /**
   * agent 配置里**显式**声明的自定义鉴权头名（`apiKeyHeader`）。非空时替换该 wire
   * 的默认凭据头（`x-goog-api-key` / `Authorization: Bearer` / `x-api-key`），空/
   * 未传保持默认。**必须传原始配置值，不要传
   * `resolveProviderAuthHeaderName` 的解析结果** —— 后者恒有一个 `Authorization`
   * 默认值，会把 gemini/anthropic 的 wire 默认头错误地换掉。非法头名在这里就抛
   * `CustomNativeApiKeyHeaderError`（显式报错，不静默回落）。
   */
  apiKeyHeader?: string | null;
  agentConfig: AgentRuntimeAgentConfig;
  /** 已解析的 OpenAI 形状工具包（各处解析顺序不同，故由调用方传入）。 */
  tools: unknown[];
  fetchImpl: CustomNativeFetch;
  /**
   * gateway session 头的**兜底** session id（`options.dialogId` 缺省时使用）。
   * 缺省取 `agentConfig.key` —— 与三条通道搬迁前的 `sessionId = dialogId ??
   * agentConfig.key` 一致。session 头是每调用一次的，故仍以 `options.dialogId`
   * 优先。
   */
  sessionId?: string | null;
  /** 诊断日志用（`provider.request.start` 的 payload）。 */
  requestedToolNames?: readonly string[];
  /**
   * gemini 通道内联图片白名单用的本机 server origin；缺省时 `isAllowedImageUrl`
   * 恒为 false（与「origin 不匹配」走同一条路径）。
   */
  serverUrl?: string;
  /** 拉取本机 server 图片时带的本地登录态。 */
  authToken?: string;
  log?: CustomNativeProviderLog;
  recordAvailability?: CustomNativeRecordAvailability;
};

/**
 * 搬迁前三条通道各自的诊断 transport 标签，逐字保留（改动会影响日志消费方）。
 * 导出给 CLI 的 `customNativeTransport` 复用：`provider.selected` 与
 * `provider.request.*` 的标签必须同源，免得两处各写一份后漂移。
 */
export const TRANSPORT_LABEL: Record<CustomNativeWire, string> = {
  "gemini": "gemini-native-custom",
  "openai-responses": "openai-responses-custom",
  "anthropic-messages": "anthropic-messages-custom",
};

type ResolvedCustomNative = {
  transport: string;
  model: string;
  /** customProviderUrl 契约端点（供 `buildProviderSessionHeaders` 判别）。 */
  endpoint: string;
  /** 按 wire 拼出的真实上游 URL（供 fetch 与日志 `requestUrl`）。 */
  nativeEndpoint: string;
  apiKey: string;
  /** 已校验的显式 `apiKeyHeader` 覆盖；`undefined` = 用该 wire 的默认凭据头。 */
  apiKeyHeader?: string;
  agentConfig: AgentRuntimeAgentConfig;
  tools: unknown[];
  fetchImpl: CustomNativeFetch;
  fallbackSessionId: string | null | undefined;
  requestedToolNames?: readonly string[];
  serverUrl?: string;
  authToken?: string;
  log: CustomNativeProviderLog;
  recordAvailability: CustomNativeRecordAvailability;
};

const noopLog: CustomNativeProviderLog = () => {};
const noopRecordAvailability: CustomNativeRecordAvailability = async () => {};

/**
 * 建一条 custom native wire provider。
 *
 * 返回的 `AgentRuntimeProvider` 与搬迁前各 transport 返回的等价：`model` 为本次
 * 解析出的模型，`complete()` 行为逐字一致（唯一差别是依赖来自入参而非闭包）。
 */
export function createCustomNativeProvider(
  args: CreateCustomNativeProviderArgs,
): AgentRuntimeProvider {
  // 配置错误在这里就暴露（构造期），不拖到第一次请求才炸、更不静默回落默认头。
  const apiKeyHeader = resolveCustomNativeApiKeyHeader(args.apiKeyHeader);
  const resolved: ResolvedCustomNative = {
    transport: TRANSPORT_LABEL[args.wire],
    model: args.model,
    endpoint: args.endpoint,
    nativeEndpoint: resolveCustomNativeEndpoint(args.endpoint, args.wire, args.model),
    apiKey: args.apiKey,
    ...(apiKeyHeader ? { apiKeyHeader } : {}),
    agentConfig: args.agentConfig,
    tools: args.tools,
    fetchImpl: args.fetchImpl,
    fallbackSessionId: args.sessionId ?? args.agentConfig.key,
    ...(args.requestedToolNames ? { requestedToolNames: args.requestedToolNames } : {}),
    ...(typeof args.serverUrl === "string" ? { serverUrl: args.serverUrl } : {}),
    ...(typeof args.authToken === "string" ? { authToken: args.authToken } : {}),
    log: args.log ?? noopLog,
    recordAvailability: args.recordAvailability ?? noopRecordAvailability,
  };

  switch (args.wire) {
    case "gemini":
      return buildGeminiCustomNativeProvider(resolved);
    case "openai-responses":
      return buildOpenAiResponsesCustomNativeProvider(resolved);
    case "anthropic-messages":
      return buildAnthropicMessagesCustomNativeProvider(resolved);
  }
}

// ---------------------------------------------------------------------------
// gemini native
// 搬迁自 packages/cli/client/providerResolution/customNativeTransport.ts 的 gemini wire
// （原 geminiNativeCustomTransport.ts；M1 起三条同构壳合并为这一个 resolver）
// 的 `complete()`（`ctx.serverUrl`/`ctx.authToken` → 入参；`config.*` → 入参）。
// ---------------------------------------------------------------------------

function buildGeminiCustomNativeProvider(p: ResolvedCustomNative): AgentRuntimeProvider {
  const { model, endpoint, nativeEndpoint, apiKey, apiKeyHeader, agentConfig, tools, fetchImpl, fallbackSessionId, requestedToolNames, serverUrl, authToken, transport, log, recordAvailability } = p;
  return {
    model,
    complete: async (messages, options) => {
      const inlineResult = await inlineImageUrlsForCustomProvider({ messages }, {
        shouldInline: true,
        isAllowedImageUrl: (url) => { try { return new URL(url).origin === new URL(serverUrl as string).origin; } catch { return false; } },
        fetchImage: async (url) => { const image = await fetchImpl(url, { headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined, signal: options?.signal }); if (!image.ok) return { ok: false, error: `HTTP ${image.status}` }; return { ok: true, mimeType: image.headers.get("content-type") ?? "application/octet-stream", bytes: new Uint8Array(await image.arrayBuffer()) }; },
      }) as { messages: typeof messages };
      const body = buildGeminiGenerateContentRequest({ messages: inlineResult.messages as unknown[], tools: tools as unknown[], maxTokens: typeof agentConfig.max_tokens === "number" ? agentConfig.max_tokens : undefined, temperature: typeof agentConfig.temperature === "number" ? agentConfig.temperature : undefined, attachSkipThoughtSignature: resolveGeminiModelQuirks(model).allowsThoughtSignatureSentinel });
      log("provider.request.start", { agentKey: agentConfig.key, transport, requestUrl: nativeEndpoint, model, messageCount: messages.length, toolCount: tools.length, requestedToolNames });
      // gateway session 头是**每调用**的：dialogId 只在 complete() 里可得；同一
      // dialog 的多轮调用必须复用同一个 session（与 canonical 消费者
      // directOpenAiCompatibleTransport 同口径：sessionId = dialogId ?? agentConfig.key）。
      const response = await fetchImpl(nativeEndpoint, { method: "POST", headers: { "Content-Type": "application/json", ...customNativeAuthHeaders("gemini", apiKey, apiKeyHeader), ...buildProviderSessionHeaders({ endpoint, sessionId: options?.dialogId ?? fallbackSessionId }) }, body: JSON.stringify(body), signal: options?.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(options.timeoutMs ?? 120000)]) : AbortSignal.timeout(options?.timeoutMs ?? 120000) });
      if (!response.ok) {
        const errText = await response.text();
        const failure = new Error(`gemini native custom provider failed: HTTP ${response.status} ${errText.slice(0, 500)}`);
        log("provider.request.failed", { agentKey: agentConfig.key, transport, status: response.status, error: errText.slice(0, 200) });
        // 取消不落冷却：调用方取消时上游常以 4xx/5xx（499 / 502「client closed
        // request」）收尾，把它当上游故障记冷却会把同一 endpoint 下所有 agent
        // 一起暂停 5 分钟。判据只认调用方**原始** signal —— 超时走独立的
        // AbortSignal.timeout，不在此豁免（超时必须记账）。
        // 这是本通道唯一的失败记账点：fetch / read 抛错不记账（现状，勿顺手新增，
        // 否则瞬时网络错误会被变成凭证冷却）。
        if (!isCallerCancellation(failure, options?.signal)) await recordAvailability(response.status, errText);
        throw failure;
      }
      const chunks = await readSseDataValues(response, parseSseDataLineJson);
      const { text, toolCalls, usage } = accumulateGeminiChunks(chunks);
      if (text) options?.onTextDelta?.(text);
      const result: AgentRuntimeResult = { content: text, model, tool_calls: toolCalls.length ? toolCalls : undefined, finish_reason: toolCalls.length ? "tool_calls" : "stop", stream_complete: true, ...(usage ? { usage } : {}), trace: messages };
      await recordAvailability(200);
      log("provider.request.result", { agentKey: agentConfig.key, transport, ok: true, contentChars: text.length, toolCallCount: toolCalls.length });
      return result;
    },
  };
}

// ---------------------------------------------------------------------------
// OpenAI Responses
// 搬迁自 packages/cli/client/providerResolution/customNativeTransport.ts 的 openai-responses wire
// （原 openAiResponsesCustomTransport.ts；M1 起三条同构壳合并为这一个 resolver）
// 的 `complete()`。
// ---------------------------------------------------------------------------

function buildOpenAiResponsesCustomNativeProvider(p: ResolvedCustomNative): AgentRuntimeProvider {
  const { model, endpoint, nativeEndpoint, apiKey, apiKeyHeader, agentConfig, tools, fetchImpl, fallbackSessionId, requestedToolNames, transport, log, recordAvailability } = p;
  return {
    model,
    complete: async (messages, options) => {
      const responsesTools = toResponsesTools(tools as any[]);
      const body = {
        model,
        input: convertMessagesToResponsesInput(messages as any),
        stream: true,
        ...(typeof agentConfig.max_tokens === "number" ? { max_output_tokens: agentConfig.max_tokens } : {}),
        ...(responsesTools?.length ? { tools: responsesTools, tool_choice: "auto" } : {}),
      };
      log("provider.request.start", {
        agentKey: agentConfig.key,
        transport,
        requestUrl: nativeEndpoint,
        model,
        messageCount: messages.length,
        toolCount: responsesTools?.length ?? 0,
        requestedToolNames,
      });
      const timeoutSignal = AbortSignal.timeout(options?.timeoutMs ?? 120000);
      let response: Response;
      try {
        response = await fetchImpl(nativeEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...customNativeAuthHeaders("openai-responses", apiKey, apiKeyHeader),
            // gateway session 头是**每调用**的（dialogId 只在 complete() 里可得）；
            // 同一 dialog 的多轮调用必须复用同一个 session，与 canonical 消费者
            // directOpenAiCompatibleTransport 同口径：sessionId = dialogId ?? agentConfig.key。
            ...buildProviderSessionHeaders({ endpoint, sessionId: options?.dialogId ?? fallbackSessionId }),
          },
          body: JSON.stringify(body),
          signal: options?.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal,
        });
      } catch (error) {
        const errText = error instanceof Error ? error.message : String(error);
        log("provider.request.failed", { agentKey: agentConfig.key, transport, error: errText.slice(0, 200) });
        throw error;
      }
      if (!response.ok) {
        const errText = await response.text();
        // 调用方取消时上游可能以错误码收尾（如 499/502）：那不是上游故障，
        // 不落冷却（口径与本文件下方 catch 及 anthropic/gemini 通道一致）。
        if (isCallerCancellation(undefined, options?.signal)) {
          log("provider.request.failed", { agentKey: agentConfig.key, transport, aborted: true, status: response.status, error: errText.slice(0, 200) });
          throw new Error(`OpenAI responses custom provider failed: HTTP ${response.status} ${errText.slice(0, 500)}`);
        }
        log("provider.request.failed", { agentKey: agentConfig.key, transport, status: response.status, error: errText.slice(0, 200) });
        await recordAvailability(response.status, errText);
        throw new Error(`OpenAI responses custom provider failed: HTTP ${response.status} ${errText.slice(0, 500)}`);
      }

      // readResponsesSseCompletion 在遇到 response.failed / response.incomplete /
      // error，或（本通道显式要求的）缺 response.completed 时会自己 throw，并把
      // 分类状态挂在 error.status 上。这里统一落可用性记录后再抛——否则 429/5xx
      // 这类本该冷却上游的失败会被漏记（与 anthropic 通道的语义对齐）。
      let streamed: Awaited<ReturnType<typeof readResponsesSseCompletion>>;
      try {
        streamed = await readResponsesSseCompletion({
          response,
          ...(options?.onTextDelta ? { onTextDelta: options.onTextDelta } : {}),
          ...(options?.onReasoningDelta ? { onReasoningDelta: options.onReasoningDelta } : {}),
          fallbackPrefix: "OpenCode responses",
          requireResponseCompleted: true,
        });
      } catch (error) {
        const errText = error instanceof Error ? error.message : String(error);
        // 调用方取消（Esc/stop）不是上游故障：只记日志、不落可用性冷却。
        // 记冷却的后果是同一个 endpoint（无 apiKeyRef 时冷却键退化为
        // `custom-endpoint:<origin>`）下的所有 agent 一起被暂停 5 分钟。
        // 判据（`isAbortError(error) || callerSignal.aborted`）集中在
        // `agent-runtime/customNativeWire.ts` 的 isCallerCancellation，三条 native
        // 通道同源；必须传入调用方**原始** options.signal —— machine WS 派发用的是
        // `controller.abort(new Error(...))`，而 `AbortSignal.any` 会原样透传 abort
        // reason，此时抛出的错误 `name` 是 "Error" 而非 "AbortError"，单靠
        // isAbortError 会漏判，并把整个 `custom-endpoint:<origin>` 冷却 5 分钟。
        // 超时走独立 timeoutSignal，因此 abort 合成 signal 不算取消（超时应当记账）。
        if (isCallerCancellation(error, options?.signal)) {
          log("provider.request.failed", { agentKey: agentConfig.key, transport, aborted: true, error: errText.slice(0, 200) });
          throw error;
        }
        const status = typeof (error as { status?: unknown })?.status === "number" ? (error as { status: number }).status : 502;
        log("provider.request.failed", { agentKey: agentConfig.key, transport, status, error: errText.slice(0, 200) });
        await recordAvailability(status, errText);
        throw error;
      }

      // 干净 EOF 但没有终局事件（截断）：同样绝不落 200、不给 finish_reason，
      // 否则一次截断会被当成功消费。
      if (!streamed.stream_complete) {
        const failure: ResponsesStreamFailure = {
          code: "response_completed_missing",
          message: "OpenCode responses upstream ended without a terminal event (truncated stream).",
        };
        const status = responsesStreamFailureStatus(failure);
        log("provider.request.failed", { agentKey: agentConfig.key, transport, status, error: failure.message.slice(0, 200) });
        // 取消导致的干净 EOF 不算上游截断故障，不落冷却。
        if (!isCallerCancellation(undefined, options?.signal)) {
          await recordAvailability(status, failure.message);
        }
        throw new Error(`OpenAI responses custom provider failed: ${failure.message}`);
      }

      const toolCalls = streamed.tool_calls ?? [];
      const result: AgentRuntimeResult = {
        content: streamed.content,
        ...(streamed.reasoning_content ? { reasoning_content: streamed.reasoning_content } : {}),
        model,
        tool_calls: toolCalls.length ? toolCalls : undefined,
        finish_reason: streamed.finish_reason ?? (toolCalls.length ? "tool_calls" : "stop"),
        stream_complete: true,
        ...(streamed.usage ? { usage: streamed.usage } : {}),
        trace: messages,
      };
      await recordAvailability(200);
      log("provider.request.result", { agentKey: agentConfig.key, transport, ok: true, contentChars: result.content.length, toolCallCount: toolCalls.length });
      return result;
    },
  };
}

// ---------------------------------------------------------------------------
// Anthropic Messages
// 搬迁自 packages/cli/client/providerResolution/customNativeTransport.ts 的 anthropic-messages wire
// （原 anthropicMessagesCustomTransport.ts；M1 起三条同构壳合并为这一个 resolver）
// 的 `complete()`。
// ---------------------------------------------------------------------------

function buildAnthropicMessagesCustomNativeProvider(p: ResolvedCustomNative): AgentRuntimeProvider {
  const { model, endpoint, nativeEndpoint, apiKey, apiKeyHeader, agentConfig, tools, fetchImpl, fallbackSessionId, requestedToolNames, transport, log, recordAvailability } = p;
  return {
    model,
    complete: async (messages, options) => {
      const body = buildAnthropicMessagesBody({ agentConfig, openAiBody: { model, messages, tools, max_tokens: agentConfig.max_tokens } });
      body.stream = true;
      if (!body.max_tokens) body.max_tokens = 4096; // Anthropic requires max_tokens; conservative fallback if builder input is absent.
      if (Array.isArray(body.tools)) body.tools = body.tools.map((tool: any) => ({ ...tool, cache_control: undefined }));
      // 与 sibling 通道一致：timeoutMs 缺失时兜底 120s，避免直接调用方拿到无界 fetch。
      const timeout = AbortSignal.timeout(options?.timeoutMs ?? 120000);
      const signal = options?.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
      log("provider.request.start", { agentKey: agentConfig.key, transport, requestUrl: nativeEndpoint, model, messageCount: messages.length, toolCount: tools.length, requestedToolNames });
      const response = await fetchImpl(nativeEndpoint, { method: "POST", headers: { "Content-Type": "application/json", ...customNativeAuthHeaders("anthropic-messages", apiKey, apiKeyHeader), ...buildProviderSessionHeaders({ endpoint, sessionId: options?.dialogId ?? fallbackSessionId }) }, body: JSON.stringify(body), signal });
      if (!response.ok || !response.body) {
        const errText = await response.text();
        const failure = new Error(`Anthropic messages custom provider failed: HTTP ${response.status} ${errText.slice(0, 200)}`);
        log("provider.request.failed", { agentKey: agentConfig.key, transport, status: response.status, error: errText.slice(0, 200) });
        // 取消不落冷却（判据只认调用方原始 signal，超时不豁免）。
        if (!isCallerCancellation(failure, options?.signal)) await recordAvailability(response.status, errText);
        throw failure;
      }
      const aggregated = await aggregateAnthropicMessageStream(response.body, () => {}, (delta) => options?.onTextDelta?.(delta));
      if (!aggregated.ok) {
        const errText = JSON.stringify(aggregated.body);
        const failure = new Error(`Anthropic messages custom provider failed: ${errText.slice(0, 200)}`);
        log("provider.request.failed", { agentKey: agentConfig.key, transport, status: aggregated.status, error: errText.slice(0, 200) });
        // 取消不落冷却：调用方取消时上游常以「error 事件」或「无 message_stop 的
        // 干净 EOF」收尾（后者聚合为 502 stream_truncated），把它当上游故障记冷却
        // 会把同一 endpoint 下所有 agent 一起暂停 5 分钟。
        if (!isCallerCancellation(failure, options?.signal)) await recordAvailability(aggregated.status, errText);
        throw failure;
      }
      const mapped = mapAnthropicMessageToOpenAi(aggregated.payload) as any;
      const choice = mapped.choices?.[0] ?? {};
      const content = typeof choice.message?.content === "string" ? choice.message.content : "";
      const result: AgentRuntimeResult = { content, ...(choice.message?.reasoning_content ? { reasoning_content: choice.message.reasoning_content } : {}), model, tool_calls: choice.message?.tool_calls, finish_reason: choice.finish_reason ?? "stop", stream_complete: true, ...(mapped.usage ? { usage: mapped.usage } : {}), trace: messages };
      await recordAvailability(200);
      log("provider.request.result", { agentKey: agentConfig.key, transport, ok: true, contentChars: content.length, toolCallCount: result.tool_calls?.length ?? 0 });
      return result;
    },
  };
}
